# Shared CAD Infrastructure

`src/cad/` is shared infrastructure only. It must not become the home for a Part, Part Design, or Sketcher command.

## Modules

| Folder | Role |
| --- | --- |
| `model/` | Document state, feature history, editable parameters, selection |
| `viewport/` | Three.js renderer, camera, picking, transform controls |
| `geometry/` | Interface to the eventual parametric/solid geometry kernel |
| `operations/` | Read-only registry that composes workbench-owned commands |

## Feature flow

```text
Workbench command
  → cad document feature + parameters
  → GeometryAdapter rebuild
  → Three.js mesh in the viewport
  → Raycaster selection
  → Property edit
  → document update and rebuild
```

Workbench-specific implementation belongs in `src/workbenches/part/`, `part-design/`, or `sketcher/`. The registry in `operations/` imports those definitions so a workflow can be inspected without duplicating command ownership.

## Geometry adapter minimum contract

A production implementation must provide sketch construction/constraints, revolve, cylinder creation, pattern/array, Boolean subtraction, and feature rebuild. Do not persist application state only in a Three.js mesh.
