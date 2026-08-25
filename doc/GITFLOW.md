## Git Flow Examples

This section describes example how the scripts work and change git repositories on workflows.

### 1. Developer's push

The developer just pushes the original CSV files on the `upstream`, which is the repository that developers and translators share the translation CSV files.

``` mermaid
---
config:
  gitGraph:
    mainBranchName: upstream
    commitLabelFontSize: 11px
---
gitGraph
  commit id: "1. developer's push"
```

### 2. Pulls original CSVs

Updates `main`, which is the main branch of the `upstream`'s fork repository, and `localization` which is the work branch.

``` mermaid
---
config:
  gitGraph:
    mainBranchName: upstream
    commitLabelFontSize: 11px
---
gitGraph
  commit id: "1. developer's push"
  branch main
  commit id: "2. pulls original CSVs"
  branch localization
```

In this example, `main` is intended for the complete mirror of the `upstream` repository's content, and `localization` is the work branch to have converted and modified CSV files.

This process can be done automatically by daily scheduled workflows, or just pressing "Update fork" button on the repository page.

When updated the CSV files in `localization` branch, it could trigger the workflow described in [8. creates release branch](#8-creates-release-branch), but it will be discussed later.

> [!INFO]
> You can also create extra CSV files to aid the translation process in your workflows.<br>
> See [add-csv-index](https://github.com/h1data/add-csv-index) workflow.

### 3. Convert CSVs for Weblate

When original CSV files in `localization` branch are updated, the workflow triggers the script to create CSV files for Weblate. (`INVERT: false`)

``` mermaid
---
config:
  gitGraph:
    mainBranchName: "upstream"
    commitLabelFontSize: 11px
---
gitGraph
  commit id: "1. developer's push"
  branch main
  commit id: "2. pulls original CSVs"
  branch localization
  branch "update-csv-*"
  commit id: "3. convert CSVs for Weblate"
```

The files can be pushed to `localization` branch directly. In this example, the workflow creates a temporary branch `update-csv-*` and make PR/MR for `localization`. This allows the translators/maintainers to check the updates.

> [!INFO]
> You can use IDs of workflow run or commit for branch name to avoid conflict of branch names:
> - [`GITHUB_RUN_ID` or `GITHUB_SHA`](https://docs.github.com/en/actions/reference/workflows-and-actions/variables) (GitHub)
> - [`CI_PIPELINE_ID` or `CI_COMMIT_SHA`](https://docs.gitlab.com/ci/variables/predefined_variables/) (GitLab)

### 4. Merge PR/MR

Just merges the updated CSV for Weblate to `localization`. You can delete the temporary branch when merged.

``` mermaid
---
config:
  gitGraph:
    mainBranchName: "upstream"
    commitLabelFontSize: 11px
---
gitGraph
  commit id: "1. developer's push"
  branch main
  commit id: "2. pulls original CSVs"
  branch localization
  branch "update-csv-*"
  commit id: "3. converts CSVs for Weblate"
  commit id: "(some updates for CSVs)"
  checkout localization
  merge "update-csv-*" id: "4. merge PR/MR"
  checkout "update-csv-*"
  commit id: "delete branch" type: REVERSE
```

Before merged, the translators/maintainers also can check and edit converted CSV files;<br>
i.e. deleting lines marked as `[DELETED]` (when `OBSOLETE: true`) or changing `Fuzzy` flags.

### 5. Updates Weblate

Pulls and updates translations on Weblate from converted CSV files from `localization` branch.

``` mermaid
---
config:
  gitGraph:
    mainBranchName: "upstream"
    commitLabelFontSize: 11px
---
gitGraph
  commit id: "1. developer's push"
  branch "main"
  commit id: "2. pulls original CSVs"
  branch "localization"
  commit id: "3. converts CSVs for Weblate"
  branch "Weblate's internal git"
  commit id: "5. updates Weblate"
```

Merge errors would occur when there were updated entries those have not be pushed in Weblate, but it can be solved by ["Reset and reapply" in repository maintenance](https://docs.weblate.org/en/latest/admin/continuous.html#repository-maintenance) in most cases.

### 6. Updates translation from Weblate

Just pushes or creates PR/MR from Weblate.

``` mermaid
---
config:
  gitGraph:
    mainBranchName: "upstream"
    commitLabelFontSize: 11px
---
gitGraph
  commit id: "1. developer's push"
  branch "main"
  commit id: "2. pulls original CSVs"
  branch "localization"
  commit id: "3. converts CSVs for Weblate"
  branch "Weblate's internal git"
  commit id: "5. updates Weblate"
  checkout "localization"
  merge "Weblate's internal git" id: "6. updates translation from Weblate"
```

### 7. Converts to original CSV

Updating CSV files for Weblate in `localization` branch triggers the workflow to convert them to CSV file in the original format.

``` mermaid
---
config:
  gitGraph:
    mainBranchName: "upstream"
  themeVariables:
    commitLabelFontSize: 11px
---
gitGraph
  commit id: "1. developer's push"
  branch "main"
  commit id: "2. pulls original CSVs"
  branch "localization"
  commit id: "3. converts CSVs for Weblate"
  branch "Weblate's internal git"
  commit id: "5. updates Weblate"
  checkout "localization"
  merge "Weblate's internal git" id: "6. updates translation from Weblate"
  commit id: "7. converts to original CSV"
```

### 8. creates release branch

Creates/recreates `release` branch from `main` and converted files in `localization`, which is to create PR/MR for `upstream`.

``` mermaid
---
config:
  gitGraph:
    mainBranchName: "upstream"
  themeVariables:
    commitLabelFontSize: 11px
---
gitGraph
  commit id: "1. developer's push"
  branch main
  commit id: "2. pulls original CSVs"
  branch localization
  commit id: "3. converts CSVs for Weblate"
  branch "Weblate's internal git"
  commit id: "5. updates Weblate"
  checkout localization
  merge "Weblate's internal git" id: "6. updates translation from Weblate"
  commit id: "7. converts to original CSV"
  checkout main
  branch release
  merge localization type: HIGHLIGHT id: "8. creates release branch"
```

> [!INFO]
> [`git checkout --` (--pathspec-from-file)](https://git-scm.com/docs/git-checkout#Documentation/git-checkout.txt-gitcheckouttree-ish--pathspec) can only pick up CSVs in the original format for PR/MR to `upstream`.
> ``` sh
> # after deleted release branch via API
> git reset --hard origin/main
> git checkout -B release
> git checkout origin/localization -- localization.csv
> git add localization.csv
> git push origin HEAD:release
> ```

### 9. Submits PR/MR for upstream

Et voilà, there is a clean PR/MR for `upstream`!

``` mermaid
---
config:
  gitGraph:
    mainBranchName: "upstream"
---
gitGraph
  commit id: "1. developer's push"
  branch main
  commit id: "2. pulls original CSVs"
  branch localization
  commit id: "3. converts CSVs for Weblate"
  branch "Weblate's internal git"
  commit id: "5. updates Weblate"
  checkout localization
  merge "Weblate's internal git" id: "6. updates translation from Weblate"
  commit id: "7. converts to original CSV"
  checkout main
  branch release
  merge localization type: HIGHLIGHT id: "8. creates release branch"
  checkout upstream
  merge "release" id: "8. submits PR/MR for upstream"
```
