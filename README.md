# Convert Weblate CSV GitHub Action

This is a script to convert between versatile CSVs and ones for Weblate.

## Motivation

Weblate is an open source CAT and can handle CSV files.

However, Weblate can only CSV files with the specific format.[^1]<br>
Besides, when an item of original file was deleted, the entry of Weblate would also be deleted, even if it has additional information such as comments of discussion or screenshots. The discussion in the official concluded to delete entries automatically.

This GitHub Action solves automated CSV conversion jobs and provide much more reliable workflow with Weblate.

## Goals

- To automate CSV conversion with GitHub Actions
- To preserve deleted items as obsoleted in converted CSV, and the obsoleted items do not affect original CSV
- To adapt CSVs of any format in both monolingual and multilingual CSV, and quoting dialects.

## Workflow Example

``` mermaid
---
config:
  gitGraph:
    mainBranchName: "upstream"
---
gitGraph
  commit id: "Developer push"
  branch "main"
  commit id: "pull original CSV"
  branch "localization"
  branch "* convert-csv"
  commit id: "converted csv for Weblate"
  checkout "localization"
  merge "* convert-csv"
  commit id: "merged PR"
  branch weblate
  commit id: "updated translations"
  checkout "localization"
  merge weblate
  commit id: "merged PR (or push directly)"
  checkout main
  branch "* create-pr"
  merge localization type: HIGHLIGHT
  commit id: "converted to original CSV"
  checkout upstream
  merge "* create-pr"
```
`*` created by GitHub Actions<br>
This GitHub Action works for "converted csv for Weblate" and "converted to original CSV" from Weblate-style-CSV.

## Usage

for details, see sample

### inputs
- `mode`: Conversion mode - true: original to Weblate, false: Weblate to original (required)
- `multi`: Whether input CSV contains multiple languages to translate (required, true/false)
- `input`: Input file pattern (required)
- `output`: Output file patter (required, ** with language code)
- `columns`: Column mapping in Python dict format (required)
- `header`: Header of the original CSV, false for no header ()
- `quoting`: CSV quotation style (default = `QUOTE_MINIMAL`, see https://docs.python.org/3.14/library/csv.html#csv.QUOTE_ALL)
- `obsolete`

### outputs
- `stats`: represents converted CSV's information as follows
  * when converting from original CSV to CSV for Weblate
    ``` md
    in: samples/multi/original/localization.csv
    out: samples/multi/weblate/localization_ja.csv
    new lines: 14
    deleted lines: 3
    ----
    in: samples/multi/original/localization.csv
    out: samples/multi/weblate/localization_zh.csv
    new lines: 14
    deleted lines: 3
    ```
  * when converting from CSV for Weblate to original CSV (monolingual)
    ``` md
    in: samples/multi/weblate/localization_ja.csv
    out: samples/multi/original/localization_ja.csv
    updated lines: 1
    ```

^1 https://docs.weblate.org/en/latest/formats/csv.html
