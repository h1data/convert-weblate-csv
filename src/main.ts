import * as fs from 'fs';
import * as path from 'path';
import * as options from './options';
import * as convert from './convert';

async function run(): Promise<void> {
    try {
        if (options.multi) {
            // TODO
        } else if (options.invert) {
            iterateFilesMonolingual(convert.inverseConvertMonolingual);
        } else {
            iterateFilesMonolingual(convert.convertMonolingual);
        }
    } catch (error: any) {
        console.error('Failed: ' + error.message);
        process.exit(1);
    }
}

/**
 * iterate monolingual files, adopts both invert or not
 * @param options options from workflow inputs
 * @param inputPattern input file pattern, * for language code
 * @param outputPattern output file pattern, * for language code
 * @param callback callback function 
 */
async function iterateFilesMonolingual(callback: Function) {

    const stats: Array<string> = [];
    const hasPlaceholder = options.input.includes(options.LANG_CODE_PLACEHOLDER);
    // build regexp pattern ex. foo/localization_*.csv -> foo/localization_(.+)\.csv
    const INPUT_REGEXP = RegExp(options.input.replace('.', '\\.').replace(options.LANG_CODE_PLACEHOLDER, '(?<langCode>.+)'));
        
    for (const input of fs.globSync(options.input)) {
        let output = options.output;
        if (output.includes(options.LANG_CODE_PLACEHOLDER)) {
            const langMatch = input.match(INPUT_REGEXP);
            if (langMatch?.groups == undefined) {
                console.warn(`language code not found, skipped ${input}`);
                continue;
            }
            output = options.output.replace(options.LANG_CODE_PLACEHOLDER, langMatch.groups.langCode);
        }
        const outputDir = path.dirname(output);
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
        const result = await callback(input, output);
        stats.push(result);
    }
    fs.writeFileSync(process.env.STATS_FILE as string, stats.join('\n----\n'), 'utf8');
    console.info('Done.');
}

run();
