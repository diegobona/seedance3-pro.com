"""Generate four-influence skin weights with Blender's bone-heat solver.

Usage:
  blender --background --factory-startup --python scripts/skin-animal-assets.py \
      -- input-rig.json output-weights.json

The input contains flat XYZ positions, triangle indices, and an ordered bone list
of {name, parent, position}. Both mesh and bone coordinates remain unchanged.
"""

import json
import hashlib
import math
import os
import sys

import bpy
from mathutils import Vector


def main(input_path, output_path):
    with open(input_path, "rb") as stream:
        input_bytes = stream.read()
    source = json.loads(input_bytes.decode("utf-8"))
    input_hash = hashlib.sha256(input_bytes).hexdigest()
    flat_positions = source["positions"]
    flat_indices = source["indices"]
    bones = source["bones"]
    if len(flat_positions) % 3 or len(flat_indices) % 3 or not bones:
        raise ValueError("Expected XYZ positions, triangle indices and bones")
    vertices = [tuple(flat_positions[i:i + 3]) for i in range(0, len(flat_positions), 3)]
    faces = [tuple(flat_indices[i:i + 3]) for i in range(0, len(flat_indices), 3)]
    if any(not math.isfinite(value) for value in flat_positions):
        raise ValueError("Positions contain non-finite values")
    if any(index < 0 or index >= len(vertices) for index in flat_indices):
        raise ValueError("Triangle indices reference missing vertices")
    by_name = {bone["name"]: bone for bone in bones}
    if len(by_name) != len(bones):
        raise ValueError("Bone names must be unique")
    height = max(v[1] for v in vertices) - min(v[1] for v in vertices)
    children = {bone["name"]: [] for bone in bones}
    for bone in bones:
        if bone["parent"]:
            children[bone["parent"]].append(bone)

    # Start from an empty scene; mesh vertex order survives ARMATURE_AUTO.
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    mesh_data = bpy.data.meshes.new("AnimalReferenceGeometry")
    mesh_data.from_pydata(vertices, [], faces)
    mesh_data.update()
    mesh = bpy.data.objects.new("AnimalReference", mesh_data)
    bpy.context.collection.objects.link(mesh)

    armature_data = bpy.data.armatures.new("AnimalReferenceRig")
    armature = bpy.data.objects.new("AnimalReferenceRig", armature_data)
    bpy.context.collection.objects.link(armature)
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode="EDIT")
    for bone in bones:
        name = bone["name"]
        head = Vector(bone["position"])
        if name == "AnimalRoot":
            # A quadruped's torso runs from pelvis to shoulder. Averaging its
            # five branch roots would place this bone outside the trunk.
            tail = Vector((0, head.y, by_name["AnimalNeck"]["position"][2] * 0.8))
        elif name == "AnimalHead":
            tail = head + Vector((0, -height * 0.035, height * 0.10))
        elif name.endswith("Paw"):
            tail = head + Vector((0, 0, height * 0.04))
        elif name == "TailTip":
            direction = head - Vector(by_name[bone["parent"]]["position"])
            tail = head + direction.normalized() * height * 0.05
        elif len(children[name]) == 1:
            tail = Vector(children[name][0]["position"])
        elif children[name]:
            raise ValueError("Unexpected branching bone: " + name)
        else:
            tail = head + Vector((0, height * 0.05, 0))
        if (tail - head).length < 1e-6:
            raise ValueError("Zero length bone: " + name)
        edit_bone = armature_data.edit_bones.new(name)
        edit_bone.head = head
        edit_bone.tail = tail
        edit_bone.use_deform = True
    for bone in bones:
        if bone["parent"]:
            edit_bone = armature_data.edit_bones[bone["name"]]
            edit_bone.parent = armature_data.edit_bones[bone["parent"]]
            edit_bone.use_connect = False
    bpy.ops.object.mode_set(mode="OBJECT")

    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    status = bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    if "FINISHED" not in status:
        raise RuntimeError("Blender bone-heat skinning failed: " + str(status))

    bone_order = {bone["name"]: i for i, bone in enumerate(bones)}
    group_bones = {
        group.index: bone_order[group.name]
        for group in mesh.vertex_groups
        if group.name in bone_order
    }
    skin_indices, skin_weights, unweighted = [], [], []
    counts = [0] * len(bones)
    for vertex in mesh_data.vertices:
        weighted = [
            (group_bones[group.group], group.weight)
            for group in vertex.groups
            if group.group in group_bones and math.isfinite(group.weight) and group.weight > 0
        ]
        weighted.sort(key=lambda pair: pair[1], reverse=True)
        weighted = weighted[:4]
        total = sum(weight for _, weight in weighted)
        if total <= 0:
            unweighted.append(vertex.index)
            continue
        counts[weighted[0][0]] += 1
        skin_indices.extend([index for index, _ in weighted] + [0] * (4 - len(weighted)))
        skin_weights.extend([weight / total for _, weight in weighted] + [0] * (4 - len(weighted)))
    if unweighted:
        raise RuntimeError(
            "Bone heat left {}/{} vertices unweighted; first indices {}".format(
                len(unweighted), len(vertices), unweighted[:20]
            )
        )
    if len(mesh_data.vertices) != len(vertices):
        raise RuntimeError("Solver changed mesh vertex order/count")
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as stream:
        json.dump({"inputHash": input_hash, "vertexCount": len(vertices), "indices": skin_indices, "weights": skin_weights}, stream, separators=(",", ":"))
    print("ANIMAL_SKIN_RESULT", json.dumps({
        "kind": source.get("kind"), "vertexCount": len(vertices),
        "triangleCount": len(faces), "unweighted": len(unweighted),
        "dominantVertexCounts": {bone["name"]: counts[i] for i, bone in enumerate(bones)},
        "output": os.path.abspath(output_path),
    }))


if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if len(args) != 2:
        raise SystemExit("Expected input-rig.json output-weights.json after --")
    main(args[0], args[1])
