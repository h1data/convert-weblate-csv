import CIAdapter from './CIAdapter';
import commandLineArgs from 'command-line-args';
import commandLineUsage from 'command-line-usage';

export const optionDefinitions = {
    ORIGINAL_CSV: { name: 'original-csv', description: 'Path of the original CSV (required)' }, 
    WEBLATE_CSV: { name: 'weblate-csv', description: 'Path of the Weblate CSV (required)' },
    OUTPUT_CSV: { name: 'output-csv', description: 'Output file path (optional)' },
    INVERT: { name: 'invert', description: 'Executes inverse conversion from Weblate CSV to the original', type: Boolean },
    MULTI: { name: 'multi', description: 'Convert as input CSV contains multiple languages to translate', type: Boolean },
    STATS_FILE: { name: 'stats-file', description: 'Output path for stats file (default: stats.txt)', defaultValue: 'stats.txt' },
    COLUMNS: { name: 'columns', description: 'Column list as Weblate CSV (required)' },
    HEADER: { name: 'no-header', description: 'Treat CSV as no header', type: Boolean, inverse: true},
    ENCODING: { name: 'encoding', description: 'Character encoding (default: utf8)', defaultValue: 'utf8' },
    UTF_BOM: { name: 'utf-bom', description: 'Append BOM', type: Boolean }, 
    LINEFEED: { name: 'linefeed', description: 'Linefeed (default: CRLF)', typeLabel: '{underline CRLF or LF}', defaultValue: 'CRLF' },
    SEPARATOR: { name: 'separator', description: 'Separator (default: ",")', defaultValue: ',' },
    ESCAPE: { name: 'escape', description: 'Escape character for separators (default: ")', defaultValue: '"' },
    QUOTING : { name: 'quote-always', description: 'Quote every column for the original CSV', type: Boolean },
    OBSOLETE: { name: 'obsolete', description: 'Does not add obsoleted rows for CSVs for Weblate', type: Boolean },
    OVERWRITE: { name: 'overwrite', description: 'Overwrite existed translations of CSVs for Weblate', type: Boolean },
    HELP: {name: 'help', description: 'Print this usage', type: Boolean}
};

let options;
try {
    options = commandLineArgs(Object.values(optionDefinitions));
} catch(e) {
    showUsage();
    process.exit(1);
}

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
                    header: 'Convert Weblate CSV',
                    content: 'Convert between any-format CSV and Weblate style (translation-toolkit)'
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
