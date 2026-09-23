# Pose Studio animal assets

`cat.glb`, `dog.glb` and `horse.glb` contain continuous, skinned meshes with the editor's joint hierarchy. They are built offline; the browser loads and poses the GLBs without generating or subdividing their geometry at runtime. Source credits and licenses are in [CREDITS.md](CREDITS.md).

## Rebuild

Run from the repository root with Node.js and Blender installed. The commands below use PowerShell; replace `blender` with its executable path if it is not on `PATH`.

```powershell
npm ci
New-Item -ItemType Directory -Force .animal-asset-work/sources | Out-Null
Invoke-WebRequest 'https://opengameart.org/sites/default/files/OBJ.zip' -OutFile .animal-asset-work/sources/dog-jack-russell-obj.zip
node scripts/prepare-dog-reference.mjs .animal-asset-work/sources/dog-jack-russell-obj.zip .animal-asset-work/sources/dog-smooth.obj
node scripts/build-animal-assets.mjs --prepare
foreach ($kind in @('cat', 'dog', 'horse')) {
  blender --background --factory-startup --disable-autoexec --python scripts/skin-animal-assets.py -- ".animal-asset-work/$kind-rig-input.json" ".animal-asset-work/$kind-weights.json"
}
node scripts/build-animal-assets.mjs
```

`--prepare` downloads the credited cat and horse FBX sources when absent and writes the three rig-input JSON files. The Blender step computes bone-heat skin weights. The final build requires weights matching both the geometry's vertex count and the rig-input hash; rerun skinning after changing geometry or joint positions. Temporary sources and intermediate files stay in `.animal-asset-work/`; publish the generated GLBs and license notices.

Regenerate the character selection thumbnails from the final GLBs with `blender --background --factory-startup --disable-autoexec --python scripts/render-animal-thumbnails.py`. This writes the three 256×192 PNG previews beside their models.

## Compatibility and checks

Animal rig version 2 keeps the published joint order and hierarchy while improving anatomical rest positions. Scene restore migrates version 1 animal bone positions relative to their old rest positions; new scenes carry `rigVersion: 2`. Keep the legacy rest-position definitions stable so existing shared scenes continue to work.

```powershell
node --test tests/pose-animal-assets.test.mjs tests/pose-animal-rig.test.mjs tests/pose-animals.test.mjs tests/pose-share.test.mjs
```

These regression tests cover joint compatibility, skin deformation, cached-instance independence, and saved/shared pose restoration. After rebuilding, also inspect the three animals in the editor at rest and with head/limb edits before publishing.
