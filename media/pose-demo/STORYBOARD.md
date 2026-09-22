# SEEDANCE Pose Reference — Homepage Demo Storyboard

**Format:** 1920×1080, 30fps, approximately 14 seconds
**Audio:** none; optimized for muted autoplay
**Style basis:** `DESIGN.md`

## Global direction

The product itself is the hero. Start inside the real Pose Studio, keep the camera moving with restrained pushes, and let a clean lime cursor spotlight the exact action. Captions are short, large, and timed after the viewer has already begun to understand the action. Use the captured interface at full fidelity; avoid unrelated decoration and fabricated image results.

## Asset audit

| Asset | Type | Assign to beat | Role |
| --- | --- | --- | --- |
| `capture/screenshots/scroll-000.png` | Product screenshot | Beat 1 / fallback | Establishes the complete Pose Studio layout |
| `capture/assets/svgs/logo-c563d526.svg` | Brand mark | Beat 1 and 4 | SEEDANCE identity |
| `recordings/pose-workflow.webm` | Live product recording | Beats 1–3 | Real preset, IK drag, and pose-transfer operation |
| `capture/assets/svgs/contact-sheet.jpg` | Capture artifact | SKIP | Not a user-facing visual |

## Beat 1 — Direct the body (0:00–0:03)

**Concept:** We begin already inside the creator workspace. The interface settles into focus while the pointer glides toward a recognizable pose preset, making this feel like a real tool rather than a promotional mockup.

**Visual:** Full-frame product recording with a gentle 1.00→1.035 camera push. A thin lime progress rail grows at the bottom. The `Direct the body.` caption rises from the lower-left after the interface is visible.

**Choreography:** Interface FADES from deep black; cursor GLIDES to `Jogging`; the preset CLICKS and the mannequin SNAPS naturally into pose; caption RISES with slight blur clear.

**Transition:** smooth push/zoom into the 3D viewport.

**Depth:** BG app shell; MG pose viewport; FG caption, cursor halo, and progress rail.

## Beat 2 — Ragdoll IK (0:03–0:07)

**Concept:** The proof is a single unmistakable edit. The cursor grabs a wrist handle and the whole arm follows, showing the value of ragdoll IK without requiring explanation.

**Visual:** Crop favors the mannequin and colored handles. A soft lime ring blooms around the selected wrist. `13-point ragdoll IK` types on above the lower rail while the live drag happens.

**Choreography:** Camera DRIFTS closer; cursor LOCKS onto the wrist; handle DRAGS upward and outward; connected joints FOLLOW; label TYPES on; the active ring PULSES once.

**Transition:** velocity-matched push to the right-side action panel.

**Depth:** BG floor grid; MG mannequin and handles; FG cursor halo and label.

## Beat 3 — Pose becomes reference (0:07–0:11)

**Concept:** The edit becomes useful. The viewer follows the cursor to `Use this pose`, then sees the clean mannequin capture arrive in the image-generation workspace as an actual reference attachment.

**Visual:** The action card and lime button fill more of the frame. On click, a brief lime overexposure bridges into GPT Image 2, where the reference thumbnail and pose-specific prompt are visible.

**Choreography:** Cursor GLIDES to the CTA; button PRESSES; lime light SWEEPS across frame; workspace SLIDES into place; reference thumbnail LANDS; `Use the pose as your reference.` DRAWS on.

**Transition:** lime overexposure into the image workspace, then blur crossfade to the final statement.

**Depth:** BG app shell; MG action card/workspace; FG cursor, flash, and caption.

## Beat 4 — Product thesis (0:11–0:14)

**Concept:** End on the controlled-generation idea rather than a generic logo card. The reference stays visible so the last claim is supported by the product state on screen.

**Visual:** Darkened image workspace remains behind a subtle radial lime glow. The SEEDANCE mark appears above `Pose it. Describe it. Create it.` with a small `TRY POSE STUDIO` pill.

**Choreography:** Background SETTLES; mark FADES up; words CASCADE in three short steps; CTA pill FILLS lime; final frame HOLDS long enough to read before dipping to black for the loop.

**Transition:** final color dip to `#090A0C`.

**Depth:** BG darkened live workspace; MG radial glow; FG logo, thesis, and CTA.

## Production architecture

```text
media/pose-demo/
├── index.html
├── DESIGN.md
├── SCRIPT.md
├── STORYBOARD.md
├── capture/
├── recordings/
│   └── pose-workflow.webm
├── compositions/
│   ├── beat-1-direct.html
│   ├── beat-2-ragdoll.html
│   ├── beat-3-reference.html
│   └── beat-4-thesis.html
├── renders/
└── snapshots/
```
