"""Render selection thumbnails directly from the shipped GLBs with Blender.

blender --background --factory-startup --python scripts/render-animal-thumbnails.py
"""
from pathlib import Path
import bpy
from mathutils import Vector

assets = Path(__file__).resolve().parent.parent / "app" / "pose-assets" / "animals"
for kind in ("cat", "dog", "horse"):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(assets / (kind + ".glb")))
    bpy.context.view_layer.update()
    corners = [obj.matrix_world @ Vector(corner)
               for obj in bpy.context.scene.objects if obj.type == "MESH"
               for corner in obj.bound_box]
    low = Vector(tuple(min(p[i] for p in corners) for i in range(3)))
    high = Vector(tuple(max(p[i] for p in corners) for i in range(3)))
    center, extent = (low + high) / 2, (high - low).length
    bpy.ops.object.camera_add(location=center + Vector((3, -2, 1.3)) * extent)
    camera = bpy.context.object
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.type = "ORTHO"
    bpy.context.view_layer.update()
    projected = [camera.matrix_world.inverted() @ p for p in corners]
    width = max(p.x for p in projected) - min(p.x for p in projected)
    height = max(p.y for p in projected) - min(p.y for p in projected)
    camera.data.ortho_scale = max(width, height * 4 / 3) * 1.10
    scene = bpy.context.scene
    scene.camera = camera
    scene.render.engine = "BLENDER_EEVEE"
    scene.eevee.use_gtao = True
    scene.eevee.gtao_distance = extent * .08
    scene.eevee.gtao_factor = 1.25
    scene.eevee.taa_render_samples = 64
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs[0].default_value = (.75, .78, .8, 1)
    scene.world.node_tree.nodes["Background"].inputs[1].default_value = .25
    for position, energy, size in [((-2, -3, 4), 160, 2.5), ((3, 1, 2), 100, 2)]:
        bpy.ops.object.light_add(type="AREA", location=center + Vector(position) * extent)
        light = bpy.context.object
        light.rotation_euler = (center - light.location).to_track_quat("-Z", "Y").to_euler()
        light.data.energy = energy * extent * extent
        light.data.size = size * extent
    scene.render.resolution_x = 256
    scene.render.resolution_y = 192
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "Standard"
    scene.render.filepath = str(assets / (kind + "-preview.png"))
    bpy.ops.render.render(write_still=True)

