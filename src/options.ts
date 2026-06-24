import * as fs from 'fs';

const self: INPUTS = initOptions();

export const invert = self.invert;
export const multi = self.multi;
export const input = self.input;
export const output = self.output;
export const columns = self.columns;
export const header = self.header;
export const encoding = self.encoding;
export const CRLF = self.CRLF;
export const separator = self.separator;
export const obsolete = self.obsolete;
export const overwrite = self.overwrite;
export const isQuote = self.isQuote;

export const LANG_CODE_PLACEHOLDER : string = '*';

export interface INPUTS {
    readonly invert: boolean,
    readonly multi: boolean,
    readonly input: string,
    readonly output: string,
    readonly columns: Array<string>,
    readonly header: boolean,
    readonly encoding: fs.WriteFileOptions,
    readonly CRLF: boolean,
    readonly separator: string,
    readonly obsolete: boolean,
    readonly overwrite: boolean,
    readonly isQuote: boolean
};

function initOptions() : INPUTS {

    const ret: INPUTS = {
        // invert: false,
        // multi: false,
        // input: 'test/single/original/localization_ja.csv',
        // output: 'test/single/weblate/localization_ja.csv',
        // columns: 'context,source,target,developer_comments'.split(','),
        // header: true,
        // encoding: 'utf8',
        // CRLF: true,
        // separator: ',',
        // obsolete: true,
        // overwrite: false,
        // isQuote: false
        invert: process.env.INVERT == 'true',
        multi: process.env.MULTI == 'true',
        input: process.env.INPUT as string,
        output: process.env.OUTPUT as string,
        columns: (process.env.COLUMNS ?? '').split(','),
        header: process.env.HEADER == 'true',
        encoding: process.env.ENCODING as fs.WriteFileOptions,
        CRLF: process.env.CRLF == 'CRLF',
        separator: process.env.SEPARATOR as string,
        obsolete: process.env.OBSOLETE == 'true',
        overwrite: process.env.OVERWRITE == 'true',
        isQuote: process.env.QUOTING == 'true'
    };

    if ( ret.multi == false && (ret.input.includes('\*') !== ret.output.includes('\*')) ) {
        // (input has placeholder) XOR (output has placeholder)
        console.error(`Invalid use for lang code in file names: ${ret.input}, ${ret.output}`);
        process.exit(1);
    }

    // TODO other check for INPUTS

    return ret;
}
