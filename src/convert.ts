import * as fs from 'fs';
import csvParser from 'csv-parser';
import csvWriter from 'csvwriter';
import * as options from './options';

const DELETED_MARKER = '[DELETED]';
const DELETED_PREFIX = ' former ';
const WEBLATE_COLUMNS = [ 'location', 'source', 'target', 'ID', 'fuzzy', 'context', 'translator_comments', 'developer_comments' ];

export async function convertMonolingual(input: string, output: string) : Promise<string> {
    
    console.info(`Converting from ${input} to ${output} ...`);

    const previousValues = new Map<string, any>();
    if (fs.existsSync(output)) {
        await new Promise((resolve, reject) => {
            fs.createReadStream(output)
                .pipe(csvParser())
                .on('data', (data) => {
                    if (data['context'] && data['source']) {
                        previousValues.set(data['context'] + data['source'], data);
                    }
                })
                .on('end', resolve)
                .on('error', (error) => { reject(error) });
        });
    }

    let lineNumber = 0;
    let newCount = 0;
    let deletedCount = 0;
    const outputValues = new Array<Object>;
    const discrepancies = new Array<string>;

    const parserOptions : csvParser.Options = {
        headers: options.header ? undefined : false,
        mapHeaders: ({ header, index }) => options.columns[index],
        separator: options.separator
    };

    await new Promise((resolve, reject) => {
        fs.createReadStream(input)
            .pipe(csvParser(parserOptions))
            .on('data', (data: Object) => {

                lineNumber++;
                const index = (data['context'] ?? '') + data['source'];
                const row = {
                    location: `${input}:${lineNumber}`,
                    source: data['source'],
                    target: data['target'],
                    ID: data['ID'] ?? '',
                    context: data['context'] ?? '',
                    translator_comments: data['translator_comments'] ?? '',
                    developer_comments: data['developer_comments'] ?? ''
                };

                if (previousValues.has(index)) {
                    // existed rows -> check for discrepancies (mismatched targets)
                    const previousRow: Object = previousValues.get(index);
                    previousValues.delete(index);

                    if (previousRow['target'] != data['target']) {
                        if (options.overwrite == false) row['target'] = previousRow['target'];
                        discrepancies.push(`  * ${data['context']}, ${data['source']}: ${data['target']} <> ${previousRow['target']}`.replace('\r\n', '\\n').replace('\r', '\\n'));
                        row['fuzzy'] = 'True';
                    } else {
                        row['fuzzy'] = previousRow['fuzzy'];
                    }

                    if (options.obsolete && String(previousRow['developer_comments']).includes(DELETED_MARKER) ) {
                        // returned from obsolete
                        newCount++;
                    }
                } else {
                    // new rows
                    newCount++;
                    row['fuzzy'] = 'True';
                }

                outputValues.push(row);
            })
            .on('end', resolve)
            .on('error', (error) => { reject(error) });
        });

    for (const value of previousValues.values()) {
        if (options.obsolete) {
            // append deleted rows
            if (!String(value['developer_comments']).includes(DELETED_MARKER) ) {
                deletedCount++;
                if (options.obsolete) {
                    value['fuzzy'] = 'True';
                    value['location'] = DELETED_MARKER + DELETED_PREFIX + value['location'];
                    value['developer_comments'] = DELETED_MARKER + ' ' + value['developer_comments'];
                }
            } 
            outputValues.push(value);
        } else {
            deletedCount++;
        }
    }

    const csvWriterOptions = {
        crlf: true,
        delimiter: options.separator,
        fields: WEBLATE_COLUMNS.join(','),
        header: options.header,
        quoteMode: 1    // always quote
    };

    await csvWriter(outputValues, csvWriterOptions, (error, csv) => {
        if (error) throw error;
        const dataToWrite = options.utf_bom ? '\uFEFF' + csv : csv;
        fs.writeFileSync(output, dataToWrite, options.encoding);
    })

    const stats: Array<string> = [];
    stats.push(`- in: ${input}`);
    stats.push(`- out: ${output}`)
    stats.push(`- new lines: ${newCount}`);
    stats.push(`- deleted lines: ${deletedCount}`);
    if (discrepancies.length > 0) {
        stats.push('- discrepancies: ')
        discrepancies.forEach( (discrepancy) => { stats.push(discrepancy) });
    }

    return stats.join('\n')
}

export async function inverseConvertMonolingual(input: string, output: string) : Promise<string> {

    console.info(`Converting from ${input} to ${output} ...`);

    const outParserOptions = {
        headers: options.header ? undefined : false,
        separator: options.separator
    };

    let contextColumn = '';
    let sourceColumn = '';
    let targetColumn = '';

    let header: Array<string> = [];
    const preValues = new Map<string, Object>();
    if (options.header && fs.existsSync(output)) {
        await new Promise((resolve, reject) => {
            fs.createReadStream(output)
                .pipe(csvParser(outParserOptions))
                .on('headers', (head) => {
                    header = head;
                    contextColumn = header[options.columns.indexOf('context')];
                    sourceColumn = header[options.columns.indexOf('source')];
                    targetColumn = header[options.columns.indexOf('target')];
                })
                .on('data', (data) => { 
                    const index = (data[contextColumn] ?? '') + data[sourceColumn];
                    preValues[index] = data;
                })
                .on('end', resolve)
                .on('error', (error) => { reject(error) });
            });
    } else {
        for (let i=0; i<options.columns.length; i++) header.push(String(i));
        contextColumn = header[options.columns.indexOf('context')];
        sourceColumn = header[options.columns.indexOf('source')];
        targetColumn = header[options.columns.indexOf('target')];
    }

    contextColumn = header[options.columns.indexOf('context')];
    sourceColumn = header[options.columns.indexOf('source')];
    targetColumn = header[options.columns.indexOf('target')];

    const columnMap = {};
    WEBLATE_COLUMNS.forEach( (key) => {
        if (options.columns.includes(key)) {
            columnMap[key] = header[options.columns.indexOf(key)];
        }
    });

    const parserOptions : csvParser.Options = {
        mapHeaders: ({ header, index }) => columnMap[header],
        separator: options.separator
    };

    let lines = 0;
    await new Promise((resolve, reject) => {
        fs.createReadStream(input)
            .pipe(csvParser(parserOptions))
            .on('data', (data: Object) => {
                const index = (data[contextColumn] ?? '') + data[sourceColumn];
                if (preValues[index] && preValues[index][targetColumn]) {
                    // updated translations
                    if (preValues[index][targetColumn] != data[targetColumn]) {
                        lines++;
                        preValues[index][targetColumn] = data[targetColumn];
                    }
                }
            })
            .on('end', resolve)
            .on('error', (error) => { reject(error) });
        });

    const writerOptions = {
        crlf: options.CRLF,
        delimiter: options.separator,
        quoteMode: options.isQuote ? 1 : 0,
        header: options.header,
        fields: header.join(',')
    }

    const outputValues : Array<Object> = [];
    for (const key in preValues) {
        outputValues.push(preValues[key]);
    }

    await csvWriter(outputValues, writerOptions, (error, csv) => {
        if (error) throw error;
        const dataToWrite = options.utf_bom ? '\uFEFF' + csv : csv;
        fs.writeFileSync(output, dataToWrite, options.encoding);
    });

    return `in: ${input}
out: ${output}
updated lines: ${lines}`;

}
