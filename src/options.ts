import Adapter from './ci/CIAdapter';

export interface Options {
    INVERT: boolean,
    MULTI: boolean,
    ORIGINAL_CSV: string,
    WEBLATE_CSV: string,
    OUTPUT_CSV: string,
    STATS_FILE: string,
    COLUMNS: string[],
    HEADER: boolean,
    ENCODING: string,
    UTF_BOM: boolean,
    CRLF: boolean,
    SEPARATOR: string,
    OBSOLETE: boolean,
    OVERWRITE: boolean,
    IS_QUOTE: boolean
}

export function getOptions(adapter: Adapter) : Options {
    const ret = {
        INVERT: adapter.getInput('INVERT') == 'true',
        MULTI: adapter.getInput('MULTI') == 'true',
        ORIGINAL_CSV: adapter.getInput('ORIGINAL_CSV'),
        WEBLATE_CSV: adapter.getInput('WEBLATE_CSV'),
        OUTPUT_CSV: adapter.getInput('OUTPUT_CSV'),
        STATS_FILE: adapter.getInput('STATS_FILE', 'stats.txt'),
        COLUMNS: adapter.getInput('COLUMNS').split(','),
        HEADER: adapter.getInput('HEADER', 'true') == 'true',
        ENCODING: adapter.getInput('ENCODING', 'utf8'),
        UTF_BOM: adapter.getInput('UTF_BOM', 'false') == 'true',
        CRLF: adapter.getInput('LINEFEED', 'CRLF') == 'CRLF',
        SEPARATOR: adapter.getInput('SEPARATOR', ',') as string,
        OBSOLETE: adapter.getInput('OBSOLETE', 'true') == 'true',
        OVERWRITE: adapter.getInput('OVERWRITE', 'false') == 'true',
        IS_QUOTE: adapter.getInput('QUOTING', 'false') == 'true'
    };

    if ( ret.MULTI == false) {
        if (ret.ORIGINAL_CSV.includes('\*') !== ret.WEBLATE_CSV.includes('\*')) {
            // (original has placeholder) XOR (weblate has placeholder)
            adapter.error(`Invalid use for lang code in file names: ${ret.ORIGINAL_CSV}, ${ret.WEBLATE_CSV}`);
            process.exit(1);
        }
        if ( ret.OUTPUT_CSV && (ret.ORIGINAL_CSV.includes('\*') !== ret.OUTPUT_CSV.includes('\*'))) {
            adapter.error(`Invalid use for lang code in file names: ${ret.ORIGINAL_CSV}, ${ret.WEBLATE_CSV}, ${ret.OUTPUT_CSV}`);
            process.exit(1);
        }
    }

    // TODO other check for INPUTS


    return ret;
}

export const LANG_CODE_PLACEHOLDER : string = '*';
