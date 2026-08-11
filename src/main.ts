import Adapter from './ci/CIAdapter'
import * as fs from 'fs';
import * as path from 'path';
import * as Options from './options';
import * as Convert from './convert';

export async function run(adapter: Adapter): Promise<void> {
    try {
        const options = Options.getOptions(adapter);
        if (options.MULTI) {
            __iterateFilesMulti(adapter, options);
        } else if (options.INVERT) {
            __iterateFilesMonoInverse(adapter, options);
        } else {
            __iterateFilesMono(adapter, options);
        }
    } catch (error: any) {
        throw new Error('Failed: ' + error.message);
    }
}

async function __iterateFilesMono(adapter: Adapter, options: Options.Options) {

    const stats: Array<string> = [];
    // build regexp pattern ex. foo/localization_*.csv -> foo/localization_(.+)\.csv
    const INPUT_REGEXP = RegExp(options.ORIGINAL_CSV.replace('.', '\\.').replace(Options.LANG_CODE_PLACEHOLDER, '(?<langCode>.+)'));

    for (const original of fs.globSync(options.ORIGINAL_CSV)) {
        const langMatch = original.match(INPUT_REGEXP);
        let weblate = options.WEBLATE_CSV;
        let output = options.OUTPUT_CSV == '' ? weblate : options.OUTPUT_CSV;
        if (langMatch) {
            weblate = __replacePlaceholder(langMatch, weblate);
            output = __replacePlaceholder(langMatch, output);
        }
        const outputDir = path.dirname(output);
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
        const result = await Convert.convert(adapter, options, original, weblate, output);
        stats.push(result);
    }

    __outputStats(stats, adapter, options.STATS_FILE);
    adapter.info('Done.');
}

async function __iterateFilesMonoInverse(adapter: Adapter, options: Options.Options) {

    const stats: Array<string> = [];
    // build regexp pattern ex. foo/localization_*.csv -> foo/localization_(.+)\.csv
    const INPUT_REGEXP = RegExp(options.WEBLATE_CSV.replace('.', '\\.').replace(Options.LANG_CODE_PLACEHOLDER, '(?<langCode>.+)'));

    for (const weblate of fs.globSync(options.WEBLATE_CSV)) {
        const langMatch = weblate.match(INPUT_REGEXP);
        let original = options.ORIGINAL_CSV;
        let output = options.OUTPUT_CSV == '' ? options.ORIGINAL_CSV : options.OUTPUT_CSV;
        if (langMatch) {
            original = __replacePlaceholder(langMatch, options.ORIGINAL_CSV);
            output = __replacePlaceholder(langMatch, output);
        }
        const outputDir = path.dirname(output);
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
        const result = await Convert.convertInverse(adapter, options, original, weblate, output);
        stats.push(result);
    }

    __outputStats(stats, adapter, options.STATS_FILE);
    adapter.info('Done.');
}

async function __iterateFilesMulti(adapter: Adapter, options: Options.Options) {
    
    const stats: Array<string> = [];
    const convertFunc: Function = options.INVERT ? Convert.convertInverse : Convert.convert;

    for (const column of options.COLUMNS) {
        if (!column.includes('target_[a-zA-Z]+')) continue;
        const language = column.replace('target_', '');
        const weblate = options.WEBLATE_CSV.replace('\*', language);
        const output = options.OUTPUT_CSV == '' ? weblate : options.OUTPUT_CSV.replace('\*', language);
        const result = await convertFunc(adapter, options, options.ORIGINAL_CSV, weblate, output, column);
        stats.push(result);
    }

    __outputStats(stats, adapter, options.STATS_FILE);
    adapter.info('Done.');
}

function __replacePlaceholder(lang: RegExpMatchArray, path: string) : string {
    if (lang.groups && path.includes(Options.LANG_CODE_PLACEHOLDER)) {
        return path.replace(Options.LANG_CODE_PLACEHOLDER, lang.groups.langCode);
    }
    return path;
}

function __outputStats(stats: string[], adapter: Adapter, output: string) {
    const statsString : string = stats.join('\n----\n')
    if (adapter.setOutput) adapter.setOutput('stats', statsString);
    fs.writeFileSync(output, statsString, 'utf8');
}
