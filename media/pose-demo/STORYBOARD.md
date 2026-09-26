# Pose Studio ranch workflow — 2026-09-26

1920 × 1080, 30 fps, 22 seconds, silent autoplay.

The real Pose Studio scene contains exactly two characters, one horse, one box and one stool. The box and stool are rendered as wood in the final AI image. The male character receives the Crossed arms preset; the female wrist is then dragged toward the horse. A short camera orbit demonstrates scene depth and returns to the final composition.

| Time | On-screen action |
| --- | --- |
| 0–1.4 s | Establish the complete five-object composition |
| 1.4–3.4 s | Apply Crossed arms using the actual preset button |
| 3.4–4.3 s | Select the second character |
| 4.3–6.7 s | Drag the wrist using the real IK control |
| 6.7–9.8 s | Orbit and settle the camera |
| 9.8–11.2 s | Transfer the scene to the image workspace |
| 11.2–13 s | Show the attached reference and a scene description |
| 13–17 s | Side-by-side 3D scene and AI visualization |
| 17–22 s | Hold the finished ranch image |

## Capture and provenance

Browser screenshots were sampled during actual browser-client interactions. Tool latency and idle gaps between actions are excluded. FFmpeg assembles the captures; captions are separate editorial overlays. There is no fabricated loading screen or generation success UI.

The image provider rejected the direct mannequin-reference requests. The final image was generated with the existing GPT Image 2 API by editing the previously generated ranch photograph: remove the dog, cat and extra box; change the man to crossed arms and the woman to a hand extended toward the horse. This is labeled AI visualization. Exact input provenance and prompt are in ranch-workflow/generation.json and image-edit-prompt.txt.

## Files

- ranch-workflow/pose-ranch-demo.mp4 — master
- ranch-workflow/scene.json — editable final five-object scene
- ranch-workflow/reference.png — actual exported 3D reference
- ranch-workflow/result.png — final AI image
- ranch-workflow/edit.json — edit timing manifest
- render-ranch-demo.mjs — reproducible FFmpeg edit (requires local raw capture directory)
