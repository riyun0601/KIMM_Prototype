# KIMM-CAD Project Guide

## Scope and product goal

Only modify files inside `KIMM-CAD/`. This is a browser-based, FreeCAD-inspired prototype for user testing; it must not use FreeCAD source code or runtime.

The target experience is a minimal, testable bracket-making flow:

1. Activate Part Design
2. Create a sketch and apply horizontal/vertical constraints
3. Draw half of the bracket profile
4. Revolve the profile
5. Select a face and enter sketch editing
6. Draw and align a circle on that face
7. Create a four-instance array
8. Activate Part
9. Add a cylinder
10. Cut object B from object A
11. Repeat operations to finish the bracket

Do not expand the product into a general-purpose CAD application. Implement only interactions required to make this flow credible in user testing.

## UI and asset rules

- `refs/` is read-only reference material. Do not rename, move, or overwrite its files.
- Follow the supplied FreeCAD screenshots for structure, not pixel-perfect reproduction.
- The workbench picker uses the text ordering in `refs/UI/FreeCAD_Workbench.png`.
- Start shows common rows 1 and 2; Part shows 1, 2, and 3; Part Design shows 1, 2, and 4.
- Keep icon ordering from `refs/icons/line1` through `line4` numeric order.
- Sketcher is selectable in the workbench picker. Do not invent a Sketcher-specific icon row until suitable reference assets are provided.

## Folder ownership

```text
src/
  app/                         Shared assembly page and CSS; avoid changing for one workbench only
  cad/                         Shared CAD infrastructure, never a workbench feature home
    model/                     Feature history, editable parameters, selection state
    viewport/                  Three.js scene, picking, transform gizmo, rendering
    geometry/                  Geometry-kernel adapter interface
    operations/                Read-only cross-workbench workflow registry
  workbenches/
    common/                    Shared toolbar definitions
    part/                      Part toolbar and Part command definitions
    part-design/               Part Design toolbar and command definitions
    sketcher/                  Sketcher toolbar and sketch/constraint command definitions
```

## Collaboration boundaries

| Area | Primary responsibility |
| --- | --- |
| `workbenches/sketcher/` | 2D geometry, horizontal/vertical constraints, face-mapped sketch, circle alignment |
| `workbenches/part-design/` | Body features: revolve and array/pattern |
| `workbenches/part/` | Primitive cylinder and Boolean Cut |
| `cad/model`, `cad/viewport`, `cad/geometry` | Shared contracts; change only when all affected workbenches need it |
| `app/` | Shared assembly UI; do not modify as a shortcut for a workbench-only feature |

When adding a workbench feature, first place its command and feature-specific code in that workbench folder. Do not put Part, Part Design, or Sketcher behavior directly under `src/cad/`.

## CAD data and rendering contract

1. `cad/model/cad-document.js` is the source of truth for features, parameters, and selection.
2. Property-panel edits must call `updateFeatureParameter()` (or a successor that preserves the same one-way state flow).
3. A changed feature is rebuilt by a GeometryAdapter implementation; only the resulting geometry/mesh is sent to the Three.js scene.
4. Record Three.js selection as `{ featureId, faceIndex, point, normal }`, rather than using a mesh instance as application state.
5. Store face-to-sketch coordinate transforms in the feature parameters so later rebuilds are deterministic.
6. Rebuild dependent features in history order when an upstream feature changes.

Three.js is for rendering, navigation, selection, and transform handles. It is not the source of CAD topology and should not be used for persistent Boolean or parametric feature calculations. Implement a concrete `GeometryAdapter` before implementing reliable Revolve, Array, or Cut behavior.

## Current status

- The assembly UI and Start / Part / Part Design toolbar transitions work.
- Sketcher now has its own workbench folder, command boundary, and selectable picker state.
- `cad/` provides only shared environment scaffolding. The Three.js viewport is not yet mounted in the assembly page and none of the 11 geometry operations is implemented yet.

## Development order

1. Mount `createThreeViewport()` in the shared viewport and replace the SVG placeholder.
2. Prove the data pipeline with one Box or Cylinder: feature data → rendered mesh → selection → Property edit → rebuilt mesh.
3. Implement Sketcher geometry, constraints, and face mapping.
4. Implement Part Design Revolve and Array.
5. Implement Part Cylinder and Boolean Cut through the concrete GeometryAdapter.
6. Connect every workflow command to the required toolbar/menu interaction and manually complete all 11 steps.

## Commands

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run check
npm.cmd run build
```

Use Node.js 18+. After changing UI or CAD modules, run `npm.cmd run check` and `npm.cmd run build`. For selection, Property, or geometry changes, also exercise the modified interaction in the browser.

See `README.md` for project startup notes and `src/cad/README.md` for the shared CAD infrastructure details.
