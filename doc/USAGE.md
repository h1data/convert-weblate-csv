## Usage

This section describes how to use the script for workflow platforms below.

- [GitHub Actions](#github-actions)
- [GitLab CI](#gitlab-ci)
- [Command Line Interface](#command-line-interface)

### GitHub Actions

> [!CAUTION]
> For secure use of your workflow on GitHub, see the official documents, such as [Security reference](https://docs.github.com/en/actions/reference/security).

Create yaml file in `.github/workflows/`. The simplest workflow is as follows.

``` yaml
# Converts original CSV files to Weblate CSV files
on:
  push:
    branches:
      - main
    paths:
      - "localization_*.csv"

jobs:
  convert-job:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Conversion
        id: conversion
        uses: h1data/convert-weblate-csv@v1
        with:
          invert: false
          multi: false
          original_csv: localization_*.csv
          weblate_csv: weblate/localization_*.csv
          columns: context,source,target,developer_comment
```

#### Inputs
- `invert`: Whether inverse conversion from Weblate CSV to the original CSV or not (required, true/false)
- `multi`: Whether input CSV contains multiple languages to translate (required, true/false)
- `original_csv`: Path of the original CSV (required)
- `weblate_csv`: Path of the Weblate CSV (required)<br>
- `output_csv`: Output file path (optional)
> [!NOTE]
> File path options `original_csv`, `weblate_csv`, and  `output_csv` (if specified) can include `*` as placeholder for language code.
> - When `multi` is `false`, `original_csv`, `weblate_csv`, and `output_csv` can have `*`, but it's allowed only if each option must include `*`.
> - When `multi` is `true`, `original_csv` (`output_csv` when `invert: true`) cannot have `*` and `weblate_csv` (`output_csv` when `invert: false`) must have `*`.
- `stats_file`: Output path for stats file (default: stats.txt)<br>
This option is only for compatibility of other platforms and CLI. See [outputs section](#outputs) for the detail of the file.
- `columns`: Column list as Weblate CSV (required)<br>
  Specifies column names in below and listed by comma;<br>
  ex. `context,source,target,developer_comments`
  - `source`: the text in the original language
  - `target`: the translated text<br>
  If the original file has multiple language to translate (`multi: true`), target columns must be specified with `target_[language code]`. ex. `target_ja`
  - `context`: the key . the combination of are used 
  - `ID`, `translator_comments`, `developer_comments`: 

  `location` and `fuzzy` columns are not converted from columns in the original CSV, but set by the conditions automatically.
- `header`: Whether the original CSV has header line (`true`/`false`, default: `true`)
- `encoding`: Specifies encoding of the original CSV (default: utf8)
- `utf_bom`: Whether the CSV has BOM (true/false, default: false)
- `linefeed`: Specifies linefeed (CRLF/LF, default: "CRLF")
- `separator`: Specifies the separator of the original CSV (default: `,`)
- `escape`: Specifies escape character for separators (default: `"`)
- `obsolete`: Whether adding obsoleted rows for CSVs for Weblate (default: true)
- `overwrite`: Whether overwriting existed translations of CSVs for Weblate (true/false, default: false)
- `quoting`: Whether if always quoting every column in the original CSV (true/false, default: false)

#### Outputs
- `stats`: represents converted CSV's information as follows
  * when converting from original CSV to CSV for Weblate
    ```
    in: samples/multi/original/localization.csv
    out: samples/multi/weblate/localization_ja.csv
    new lines: 14
    deleted lines: 3
    ----
    in: samples/multi/original/localization.csv
    out: samples/multi/weblate/localization_ko.csv
    new lines: 14
    deleted lines: 3
    ----
    in: samples/multi/original/localization.csv
    out: samples/multi/weblate/localization_zh.csv
    new lines: 14
    deleted lines: 3
    ```
  * when converting from CSV for Weblate to original CSV (monolingual)
    ```
    in: samples/multi/weblate/localization_ja.csv
    out: samples/multi/original/localization_ja.csv
    updated lines: 1
    ```

### GitLab CI

> [!CAUTION]
> For secure use of your workflow on GitLab, see the official documents such as [Pipeline security](https://docs.gitlab.com/ci/pipeline_security/).


Create `.gitlab-ci.yml` as follows.
``` yaml
convert-csv:
  stage: convert
  image: node:24-alpine3.14
  rules:
    - if: $CI_PIPELINE_SOURCE == "push"
      changes:
        - localization_*.csv

  variables:
    INPUT_INVERT: false
    INPUT_MULTI: false
    INPUT_ORIGINAL_CSV: localization_*.csv
    INPUT_WEBLATE_CSV: weblate/localization_*.csv
    INPUT_COLUMNS: context,source,target,developer_comment
  before_script:
    - apk add --no-cache curl git
    - git checkout origin main
  script:
    - mkdir -p temp
    - |
      curl --header "PRIVATE-TOKEN: $ACCESS_TOKEN" \
      --url "$CI_API_V4_URL/projects/h1data%2Fconvert-weblate-csv/repository/files/dist%2Fgitlab%2Findex%2Ejs/raw?ref=v1" \
      -o temp/index.js
    - node temp/index.js
    - git add weblate/localization_*.csv
    - git commit -m "updated Weblate CSV"
    - git push origin HEAD
```

Set parameters prefixed `INPUT_` with capital letters as environment variables.<br>
See [Inputs](#inputs) parameter section for GitHub.

### CLI

Command line example:
``` sh
# sh
node dist/index.js --original_csv "localization_*.csv" --weblate_CSV "weblate/localization_*.csv" --columns context,source,target,developer_comment
```

#### Options
- `--original_csv`: Path of the original CSV (required)
- `--weblate_csv`: Path of the Weblate CSV (required)
- `--output_csv`: Output file path (optional)
> [!NOTE]
> When use apostrophes `*` for file paths on certain shells, quote them like the example above.
- `--invert`: Executes inverse conversion from Weblate CSV to the original
- `--multi`: Convert as input CSV contains multiple languages to translate
- `--stats_file`: Output path for stats file (default: stats.txt)
- `--columns`: Column list as Weblate CSV (required)
- `--no-header`: Treat CSV as no header
- `--encoding`: Character encoding (default: `utf8`)
- `--utf-bom`: Append BOM
- `--linefeed`: Linefeed (`CRLF` or `LF`, default: `CRLF`)
- `--separator`: Separator (default: `,`)
- `--escape`: Escape character for separators (default: `"`)
- `--quote-always`: Quote every column for the original CSV
- `--no-obsolete`: Does not add obsoleted rows for CSVs for Weblate
- `--overwrite`: Overwrite existed translations of CSVs for Weblate
- `--help`: Print the usage

See description for [GitHub Inputs](#inputs) for details.
