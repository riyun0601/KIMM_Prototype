# KIMM-CAM Prototype

KIMM-CAM is a click-through CAM control-panel prototype for user testing. It does not perform CAM calculations, create toolpaths, or render a 3D model in this stage.

## Run

Run the commands from the `KIMM-CAM/` folder.

```powershell
npm.cmd install
npm.cmd run dev
```

Open the local URL printed by Vite (for example, `http://127.0.0.1:5173/`).

This project uses browser ES Modules. Do not open `index.html` directly with `file://`.
If using the VS Code Live Server extension, open `KIMM-CAM/` itself as the server root and launch its `index.html`; the repository root does not contain an entry `index.html`.

## Verify

```powershell
npm.cmd run check
npm.cmd run build
```

## Structure

- `src/app/`: control-window assembly and styling
- `src/common/`: shared tab definitions
- `src/workflows/`: in-memory prototype state and tool-list operations
- `refs/`: read-only UI and icon reference material
