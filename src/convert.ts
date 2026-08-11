import * as fs from 'fs';
import csvParser from 'csv-parser';
import csvWriter from 'csvwriter';
import iconv from 'iconv-lite';
import Adapter from './ci/CIAdapter';
import * as Options from './options';

const DELETED_MARKER = '[DELETED]';
const DELETED_PREFIX = ' former ';
const WEBLATE_COLUMNS = [ 'location', 'source', 'target', 'ID', 'fuzzy', 'context', 'translator_comments', 'developer_comments' ];

export async function convert(adapter: Adapter, options: Options.Options, original: string, weblate: string, output: string, targetColumn='target') : Promise<string> {
    
    adapter.info(`Converting from ${original} to ${output} ...`);

    const previousValues = new Map<string, any>();
    if (fs.existsSync(weblate)) {
        await new Promise((resolve, reject) => {
            fs.createReadStream(weblate)
                .pipe(iconv.decodeStream(options.ENCODING as string))
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
        headers: options.HEADER ? undefined : false,
        separator: options.SEPARATOR,
        escape: options.ESCAPE
    };

    await new Promise((resolve, reject) => {
        fs.createReadStream(original)
            .pipe(iconv.decodeStream(options.ENCODING as string))
            .pipe(csvParser(parserOptions))
            .on('data', (data: Object) => {

                lineNumber++;
                const column = Object.values(data);
                const context = column[options.COLUMNS.indexOf('context')] ?? '';
                const source = column[options.COLUMNS.indexOf('source')];
                const target = column[options.COLUMNS.indexOf(targetColumn)];
                const index = context + source;
                const row = {
                    location: `${original}:${lineNumber}`,
                    source: source,
                    target: target,
                    ID: column[options.COLUMNS.indexOf('ID')] ?? '',
                    context: column[options.COLUMNS.indexOf('context')] ?? '',
                    translator_comments: column[options.COLUMNS.indexOf('translator_comments')] ?? '',
                    developer_comments: column[options.COLUMNS.indexOf('developer_comments')]  ?? ''
                };

                if (previousValues.has(index)) {
                    // existed rows -> check for discrepancies (mismatched targets)
                    const previousRow: Object = previousValues.get(index);
                    previousValues.delete(index);

                    row['fuzzy'] = previousRow['fuzzy'];
                    if (previousRow['target'] != target) {
                        if (options.OVERWRITE == false) {
                            row['target'] = previousRow['target'];
                            if (target != '') row['fuzzy'] = 'True';  
                        } 
                        if (target != '') discrepancies.push(`  * ${context}, ${source}: ${target} <> ${previousRow['target']}`.replace('\r\n', '\\n').replace('\r', '\\n'));
                    }

                    if (options.OBSOLETE && String(previousRow['developer_comments']).includes(DELETED_MARKER) ) {
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
        if (options.OBSOLETE) {
            // append deleted rows
            if (!String(value['developer_comments']).includes(DELETED_MARKER) ) {
                deletedCount++;
                if (options.OBSOLETE) {
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
        delimiter: options.SEPARATOR,
        fields: WEBLATE_COLUMNS.join(','),
        header: true,
        quoteMode: 1    // always quote
    };

    await csvWriter(outputValues, csvWriterOptions, (error, csv) => {
        if (error) throw error;
        const dataToWrite = options.UTF_BOM ? '\uFEFF' + csv : csv;
        fs.writeFileSync(output, dataToWrite, { encoding: options.ENCODING } as fs.WriteFileOptions);
    })

    const stats: Array<string> = [];
    stats.push(`- in: ${original}`);
    stats.push(`- out: ${output}`)
    stats.push(`- new lines: ${newCount}`);
    stats.push(`- deleted lines: ${deletedCount}`);
    if (discrepancies.length > 0) {
        stats.push('- discrepancies: ')
        discrepancies.forEach( (discrepancy) => { stats.push(discrepancy) });
    }

    return stats.join('\n')
}

export async function convertInverse(adapter: Adapter, options: Options.Options, original: string, weblate: string, output: string, targetColumn='target') : Promise<string> {

    adapter.info(`Converting from ${weblate} to ${output} ...`);

    const outParserOptions = {
        headers: options.HEADER ? undefined : false,
        separator: options.SEPARATOR
    };

    let contextIndex = '';
    let sourceIndex = '';
    let targetIndex = '';

    let header: Array<string> = [];
    if (!options.HEADER) {
        for (let i=0; i<options.COLUMNS.length; i++) header.push(String(i));
        contextIndex = header[options.COLUMNS.indexOf('context')];
        sourceIndex = header[options.COLUMNS.indexOf('source')];
        targetIndex = header[options.COLUMNS.indexOf(targetColumn)];
    }
    const preValues = new Map<string, Object>();
    if (fs.existsSync(original)) {
        await new Promise((resolve, reject) => {
            fs.createReadStream(original)
                .pipe(iconv.decodeStream(options.ENCODING as string))
                .pipe(csvParser(outParserOptions))
                .on('headers', (head) => {
                    header = head;
                    contextIndex = header[options.COLUMNS.indexOf('context')];
                    sourceIndex = header[options.COLUMNS.indexOf('source')];
                    targetIndex = header[options.COLUMNS.indexOf(targetColumn)];
                })
                .on('data', (data) => {
                    const index = (data[contextIndex] ?? '') + data[sourceIndex];
                    preValues[index] = data;
                })
                .on('end', resolve)
                .on('error', (error) => { reject(error) });
            });
    }

    const columnMap = {};
    WEBLATE_COLUMNS.forEach( (key) => {
        if (options.COLUMNS.includes(key)) {
            columnMap[key] = header[options.COLUMNS.indexOf(key)];
        }
    });

    const parserOptions : csvParser.Options = {
        mapHeaders: ({ header, index }) => columnMap[header],
        separator: options.SEPARATOR
    };

    let updates = 0;
    await new Promise((resolve, reject) => {
        fs.createReadStream(weblate)
            .pipe(iconv.decodeStream(options.ENCODING as string))
            .pipe(csvParser(parserOptions))
            .on('data', (data: Object) => {
                const index = (data[contextIndex] ?? '') + data[sourceIndex];
                if (preValues[index] && preValues[index][targetIndex] != undefined) {
                    // updated translations
                    if (preValues[index][targetIndex] != data[targetIndex]) {
                        updates++;
                        preValues[index][targetIndex] = data[targetIndex];
                    }
                }
            })
            .on('end', resolve)
            .on('error', (error) => { reject(error) });
    });

    const writerOptions = {
        crlf: options.CRLF,
        delimiter: options.SEPARATOR,
        escape: options.ESCAPE,
        quoteMode: options.IS_QUOTE ? 1 : 0,
        header: options.HEADER,
        fields: header.join(',')
    }

    const outputValues : Array<Object> = [];
    for (const key in preValues) {
        outputValues.push(preValues[key]);
    }

    await csvWriter(outputValues, writerOptions, (error, csv) => {
        if (error) throw error;
        const dataToWrite = options.UTF_BOM ? '\uFEFF' + csv : csv;
        fs.writeFileSync(output, dataToWrite, { encoding: options.ENCODING } as fs.WriteFileOptions);
    });

    return `in: ${weblate}
out: ${output}
updated lines: ${updates}`;

}
