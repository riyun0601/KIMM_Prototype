"""Convert the bundled binary OpenFOAM polyMesh boundary into browser assets."""

from __future__ import annotations

import json
import re
import struct
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
POLYMESH = ROOT / "polyMesh"
OUTPUT = ROOT / "public" / "models" / "polyMesh"


def binary_list(path: Path, value_format: str, components: int = 1):
    data = path.read_bytes()
    match = re.search(rb"\n\n(\d+)\n\(", data)
    if not match:
        raise ValueError(f"Cannot find binary list header in {path.name}")
    count = int(match.group(1))
    start = match.end()
    size = struct.calcsize(value_format) * components * count
    values = struct.unpack_from(f"<{count * components}{value_format}", data, start)
    return count, values, start + size, data


def read_points():
    count, values, _, _ = binary_list(POLYMESH / "points", "d", 3)
    return count, [values[index : index + 3] for index in range(0, len(values), 3)]


def read_faces():
    offset_count, offsets, after_offsets, data = binary_list(POLYMESH / "faces", "i")
    values_match = re.search(rb"(\d+)\n\(", data[after_offsets:])
    if not values_match:
        raise ValueError("Cannot find compact face vertex list")
    value_count = int(values_match.group(1))
    value_start = after_offsets + values_match.end()
    values = struct.unpack_from(f"<{value_count}i", data, value_start)
    if offsets[-1] != value_count:
        raise ValueError("Compact face offsets do not match vertex list")
    return offset_count - 1, offsets, values


def read_boundaries():
    text = (POLYMESH / "boundary").read_text(encoding="utf-8", errors="ignore")
    list_start = re.search(r"\n\s*\d+\s*\n\s*\(", text)
    if not list_start:
        raise ValueError("Cannot find boundary list")
    body = text[list_start.end() :]
    result = []
    for match in re.finditer(r"^\s{4}([\w-]+)\s*\n\s*\{(.*?)^\s{4}\}", body, re.M | re.S):
        name, block = match.groups()
        n_faces = int(re.search(r"\bnFaces\s+(\d+);", block).group(1))
        start_face = int(re.search(r"\bstartFace\s+(\d+);", block).group(1))
        result.append({"name": name, "nFaces": n_faces, "startFace": start_face})
    return result


def convert():
    point_count, points = read_points()
    face_count, offsets, face_vertices = read_faces()
    boundaries = read_boundaries()

    used_point_ids = set()
    patch_faces = {}
    for patch in boundaries:
        faces = []
        for face_index in range(patch["startFace"], patch["startFace"] + patch["nFaces"]):
            if face_index >= face_count:
                raise ValueError(f"Face {face_index} is outside the face list")
            vertices = face_vertices[offsets[face_index] : offsets[face_index + 1]]
            if len(vertices) < 3:
                continue
            faces.append(vertices)
            used_point_ids.update(vertices)
        patch_faces[patch["name"]] = faces

    ordered_point_ids = sorted(used_point_ids)
    remap = {point_id: new_index for new_index, point_id in enumerate(ordered_point_ids)}
    compact_points = [points[point_id] for point_id in ordered_point_ids]

    indices = []
    patch_metadata = {}
    for patch in boundaries:
        start = len(indices)
        triangle_count = 0
        for face in patch_faces[patch["name"]]:
            first = remap[face[0]]
            for index in range(1, len(face) - 1):
                indices.extend((first, remap[face[index]], remap[face[index + 1]]))
                triangle_count += 1
        patch_metadata[patch["name"]] = {
            "indexOffset": start,
            "indexCount": len(indices) - start,
            "faceCount": patch["nFaces"],
            "triangleCount": triangle_count,
        }

    xs, ys, zs = zip(*compact_points)
    metadata = {
        "source": "OpenFOAM polyMesh",
        "sourcePointCount": point_count,
        "surfacePointCount": len(compact_points),
        "triangleCount": len(indices) // 3,
        "bounds": {"min": [min(xs), min(ys), min(zs)], "max": [max(xs), max(ys), max(zs)]},
        "patches": patch_metadata,
    }

    OUTPUT.mkdir(parents=True, exist_ok=True)
    with (OUTPUT / "points.bin").open("wb") as stream:
        for point in compact_points:
            stream.write(struct.pack("<3f", *point))
    with (OUTPUT / "indices.bin").open("wb") as stream:
        stream.write(struct.pack(f"<{len(indices)}I", *indices))
    (OUTPUT / "metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    convert()
