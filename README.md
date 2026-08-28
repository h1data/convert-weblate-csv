# Convert Weblate CSV Workflow

This is a script to convert CSV files between versatile format and Weblate format in workflows.

## Motivation

Among many standards, CSV is one of the most common formats for the translation of software/games.<br>
[Weblate](https://github.com/WeblateOrg/weblate) is an open-source CAT tool that can handle CSV files, however, it can import CSV files only in a [specific format](https://docs.weblate.org/en/latest/formats/csv.html), which must have columns in a specific order.<br>
Besides, when an entry (line) in the original file is deleted, the entry in Weblate will also be deleted, even if it has additional information such as discussion comments or screenshots.

This workflow solves automated CSV conversion jobs and provides much more reliable use with Weblate.

## Features

- Automatically converts CSV files for Weblate.
- Preserves deleted entries as obsoleted in the converted CSV and ensure the obsoleted items do not affect the original CSV.
- Adapts CSV files in any format; having single target language or multiple target languages, and dialects such as separators, line feeds, and quoting.
- Works with GitHub Actions, GitLab CI, and CLI.

## How Conversion Works

This section describes simple examples of CSV conversions.

### From Original CSV to CSV for Weblate

#### 1. Basic

When `invert` option is disabled, the script creates or updates the CSV files for Weblate from the original CSV.<br>
The simplest example is as follows.

The original CSV
``` csv
type,en,ja,comment
GREETING,"Hello, $NAME",こんにちは、$NAME,comment test
GREETING,"Good bye!",さようなら!,
MENU,Start,開始,
MENU,Quit,終了,
```

In this example, set `columns` option as `context,source,target,developer_comments` to convert each column.<br>
(see [Usage](doc/USAGE.md) for the detail of options)

Converted CSV for Weblate
``` csv
"location","source","target","ID","fuzzy","context","translator_comments","developer_comments"
"test/single/original/localization_ja.csv:1","hello","こんにちは","","False","GREETING","","comment test"
"test/single/original/localization_ja.csv:2","Good bye!","さようなら！","","False","GREETING","",""
"test/single/original/localization_ja.csv:3","Start","開始","","False","MENU","",""
"test/single/original/localization_ja.csv:4","Quit","終了","","False","MENU","",""
```

#### 2. Deleted Items

If an existing entry in the Weblate CSV does not exist in the original CSV, it will be marked as `[DELETED]` in the `location` column.
(this behavior can be omitted by setting `obsolete` option to `false`)

``` csv
type,en,ja,comment
GREETING,"Hello, $NAME",こんにちは、$NAME,comment test
GREETING,"Good bye!",さようなら!,
MENU,Quit,終了,
```
(the line `MENU,Start,開始,` was deleted from the example in [1. Basic](#1-basic))

Converted CSV for Weblate
``` csv
"location","source","target","ID","fuzzy","context","translator_comments","developer_comments"
"test/single/original/localization_ja.csv:1","hello","こんにちは","","False","GREETING","","comment test"
"test/single/original/localization_ja.csv:2","Good bye!","さようなら！","","False","GREETING","",""
"test/single/original/localization_ja.csv:3","Quit","終了","","False","MENU","",""
"[DELETED] former test/single/original/localization_ja.csv:3","Start","開始","","False","MENU","","[DELETED]"
```

Those deleted entries are still available in Weblate, but they do not affect the original CSV.

#### 3. Discrepancies

If an entry exists in both the original CSV and Weblate CSV but the translated strings are not equivalent, the script reports the discrepancy in the stats file and the output (GitHub Actions).

The original CSV:
``` csv
type,en,ja,comment
GREETING,"Hello, $NAME",こんにちは、$NAME,comment test
GREETING,"Good bye!",さようなら,
MENU,Start,開始,
MENU,Quit,終了,
```

Converted CSV for Weblate before conversion:

``` csv
"location","source","target","ID","fuzzy","context","translator_comments","developer_comments"
"test/single/original/localization_ja.csv:1","hello","こんにちは","","False","GREETING","","comment test"
"test/single/original/localization_ja.csv:2","Good bye!","さようなら！","","False","GREETING","",""
"test/single/original/localization_ja.csv:3","Start","開始","","False","MENU","",""
"test/single/original/localization_ja.csv:4","Quit","終了","","False","MENU","",""
```

In this case, the script reports as discrepancies like below;
```
- discrepancies: 
  * GREETING, Good bye!: さようなら <> さようなら！
```

By default, the script would not overwrite the existing translations in CSV files for Weblate, but those can be overwritten by enabling `overwrite` option. The combination of `context` and `source` is used for identities for each entry.

### From CSV for Weblate to Original CSV

When `invert` option is enabled, the script updates the translated strings in the original CSV.<br>
The script only updates columns in the original CSV to avoid contamination.<br>
Entries marked as `[DELETED]` are not affected in the original CSV.

## [Usage](doc/USAGE.md)

## [Git Flow Examples](doc/GITFLOW.md)

## When you have difficulties setting up your workflow, or other demands

Please feel free to [contact the author](https://h1data.github.io/contact/).
