import Adapter from './ci/CIAdapter'
import * as fs from 'fs';
import * as path from 'path';
import * as Options from './options';
import * as convert from './convert';

export async function run(adapter: Adapter): Promise<void> {
    try {
        const options = Options.getOptions(adapter);
        if (options.MULTI) {
            // TODO
        } else {
            iterateFilesMonolingual(adapter, options, options.INVERT ? convert.inverseConvertMonolingual : convert.convertMonolingual);
        }
    } catch (error: any) {
        throw new Error('Failed: ' + error.message);
    }
}

async function iterateFilesMonolingual(adapter: Adapter, options: Options.Options, callback: Function) {

    const stats: Array<string> = [];
    const inputs = options.INVERT ? options.WEBLATE_CSV : options.ORIGINAL_CSV;
    const hasPlaceholder = inputs.includes(Options.LANG_CODE_PLACEHOLDER);
    // build regexp pattern ex. foo/localization_*.csv -> foo/localization_(.+)\.csv
    const INPUT_REGEXP = RegExp(inputs.replace('.', '\\.').replace(Options.LANG_CODE_PLACEHOLDER, '(?<langCode>.+)'));

    for (const input of fs.globSync(inputs)) {
        const langMatch = input.match(INPUT_REGEXP);
        let outputRef: string|null = options.INVERT ? options.ORIGINAL_CSV : options.WEBLATE_CSV;
        let output: string|null = options.OUTPUT_CSV == '' ? options.OUTPUT_CSV : outputRef;
        if (langMatch) {
            outputRef = replacePlaceholder(langMatch, outputRef);
            output = replacePlaceholder(langMatch, output);
            if (outputRef == null || output == null) {
                adapter.warn(`language code not found, skipped ${input}`);
                continue;
            }
        }
        const outputDir = path.dirname(output);
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
        const result = await callback(adapter, options, input, outputRef, output);
        stats.push(result);
    }
    fs.writeFileSync(options.STATS_FILE, stats.join('\n----\n'), 'utf8');
    adapter.info('Done.');

    function replacePlaceholder(lang: RegExpMatchArray, path: string) : string|null {
        if (lang.groups && path.includes(Options.LANG_CODE_PLACEHOLDER)) {
            return path.replace(Options.LANG_CODE_PLACEHOLDER, lang.groups.langCode);
        }
        return path;
    }
}