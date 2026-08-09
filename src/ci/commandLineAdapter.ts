import CIAdapter from './CIAdapter';
import commandLineArgs from 'command-line-args';
import commandLineUsage from 'command-line-usage';

export const optionDefinitions = {
    INPUT: { name: 'input', description: 'Input file path (required)' },
    OUTPUT: { name: 'output', description: 'Output file path (required)' },
    COLUMNS: { name: 'columns', description: 'Index of columns to add line numbers (starts with 0, separated by comma if multiple, required)' },
    SOURCE: { name: 'source', description: 'Fill with the specified column when the target columns are empty (starts with 0)', type: Number, defaultValue: -1 },
    HEADER: { name: 'no-header', description: 'Treat CSV as no header', type: Boolean, inverse: true},
    ENCODING: { name: 'encoding', description: 'Character encoding (default: utf8)', defaultValue: 'utf8' },
    UTF_BOM: { name: 'utf-bom', description: 'Append BOM', type: Boolean }, 
    LINEFEED: { name: 'linefeed', description: 'Linefeed (default: CRLF)', typeLabel: '{underline CRLF or LF}', defaultValue: 'CRLF' },
    SEPARATOR: { name: 'separator', description: 'Separator (default: ",")', defaultValue: ',' },
    ESCAPE: { name: 'escape', description: 'Escape character for separators (default: ")', defaultValue: '"'},
    QUOTE_ALWAYS: { name: 'quote-always', description: 'Quote every column', type: Boolean },
    HELP: {name: 'help', description: 'Print this usage', type: Boolean}
};

const options = commandLineArgs(Object.values(optionDefinitions));

if (options.help) {
    showUsage();
    process.exit(0);
}

const self : CIAdapter = {
    getInput: function (key, defaultValue:string|undefined=undefined): string {
        const option = optionDefinitions[key];
        let value : any = undefined;
        if (option.type == Boolean) {
            if (option.inverse) {
                value = options[option.name] ? 'false' : 'true';
            } else {
                value = options[option.name] ? 'true' : 'false';
            }
        } else {
            value = options[option.name];
        }
        if (defaultValue == undefined && value === undefined) {
            showUsage();
            process.exit(1);
        }
        return (value ?? defaultValue) as string;
    },
    info: (message) => { console.log(message); },
    warn: (message) => { console.warn(message); },
    error: (message) => { console.error(message); }
};

function showUsage() {
    console.log(
        commandLineUsage(
            [
                {
                    header: 'Add CSV Index',
                    content: 'adding line numbers to specific columns in CSV files'
                },
                {
                    header: 'Options',
                    optionList: Object.values(optionDefinitions)
                }
            ]
        )
    );
}

export default self;
