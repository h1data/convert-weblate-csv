import * as fs from 'fs';

const self = initOptions();

export const INVERT = self.invert;
export const MULTI = self.multi;
export const INPUT = self.input;
export const OUTPUT = self.output;
export const STATS_FILE = self.stats_file;
export const COLUMNS = self.columns;
export const HEADER = self.header;
export const ENCODING = self.encoding;
export const UTF_BOM = self.utf_bom;
export const CRLF = self.linefeed;
export const SEPARATOR = self.separator;
export const OBSOLETE = self.obsolete;
export const OVERWRITE = self.overwrite;
export const IS_QUOTE = self.isQuote;

export const LANG_CODE_PLACEHOLDER : string = '*';

function initOptions() {

    const ret = {
        invert: getInput('INVERT') == 'true',
        multi: getInput('MULTI') == 'true',
        input: getInput('INPUT'),
        output: getInput('OUTPUT'),
        stats_file: getInput('STATS_FILE', 'stats.txt'),
        columns: getInput('COLUMNS').split(','),
        header: getInput('HEADER', 'true') == 'true',
        encoding: getInput('ENCODING') as fs.WriteFileOptions,
        utf_bom: getInput('UTF_BOM') == 'true',
        linefeed: getInput('LINEFEED', 'CRLF') == 'CRLF',
        separator: getInput('SEPARATOR', ',') as string,
        obsolete: getInput('OBSOLETE') == 'true',
        overwrite: getInput('OVERWRITE') == 'true',
        isQuote: getInput('QUOTING', 'false') == 'true'
    };

    if ( ret.multi == false && (ret.input.includes('\*') !== ret.output.includes('\*')) ) {
        // (input has placeholder) XOR (output has placeholder)
        console.error(`Invalid use for lang code in file names: ${ret.input}, ${ret.output}`);
        process.exit(1);
    }

    // TODO other check for INPUTS

    return ret;
}

function getInput(key: string, defaultValue: string|undefined = undefined) : string {
    const envKey = 'INPUT_' + key
    const value = process.env[envKey];
    if (defaultValue !== undefined && value === undefined) {
        throw new Error(`environment ${envKey} is not defined!`);
    }
    return value ?? defaultValue as string;
}
