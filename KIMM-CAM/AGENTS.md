# KIMM-CAM Project Guide

## Scope

- Only modify files inside `KIMM-CAM/`.
- `refs/` is read-only. Do not rename, move, overwrite, or delete its files.
- Do not implement a real CAM calculation engine in this project.
- Do not implement a visualization area during this stage.
- Keep the control window reusable as the right-side panel of a future integrated screen.

## Quality rules

- Run `npm.cmd run check` and `npm.cmd run build` after UI changes.
- Write all text files in UTF-8.
- Keep workflow state separate from the shared screen assembly code.
