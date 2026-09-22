# SEEDANCE Pose Demo — Design Reference

## Overview

SEEDANCE Creative Studio uses a near-black, widescreen application shell with a dense but orderly tool layout. The pose editor is the visual center: a large 3D mannequin stage sits between a compact navigation rail and rounded control cards. Bright lime marks active controls and the product's primary action, while orange is reserved for warnings or availability states. The result feels cinematic, technical, and deliberately creator-focused.

## Colors

- **App background**: `#090A0C` — full-frame base.
- **Deep canvas**: `#0D0F12` — 3D stage and recessed surfaces.
- **Panel surface**: `#121419` — control cards.
- **Raised panel**: `#17191F` — secondary controls.
- **Primary text**: `#F5F3ED` — headings and high-priority labels.
- **Muted text**: `#90918C` — explanatory copy.
- **Signature lime**: `#D8FF73` — active states, handles, and primary CTA.
- **Status orange**: `#FF855F` — warnings and launch messaging.
- **Cool handle accent**: `#72D8E8` — secondary IK control family.
- **Violet handle accent**: `#A493FF` — secondary IK control family.

## Typography

- **Product UI**: Inter, weights 400–900. Bold 700–900 headings; regular body copy.
- **Video labels**: Space Mono, weight 700, uppercase with generous tracking; used sparingly to distinguish editorial captions from the captured UI.
- **Scale**: 60–82px for short video statements, 22–28px for supporting labels, and no text below 18px in the rendered video.

## Elevation

Depth comes from one-pixel white borders at low opacity, subtle panel color shifts, and localized lime glows rather than conventional drop shadows. Cards use rounded 18–24px corners. The 3D viewport is darker than surrounding panels and gains depth through its radial stage light and floor grid.

## Components

- **Pose Stage**: widescreen 3D mannequin viewport with a grounded floor grid and colored circular IK handles.
- **Ragdoll Toolbar**: slim top rail with mode indicator, Undo, Redo, and Reset.
- **Preset Strip**: three image-backed pose buttons for Crossed arms, Kneeling, and Jogging.
- **Control Summary Card**: compact list of the 13 draggable body regions.
- **Pose Transfer CTA**: lime `Use this pose` action that exports a clean reference and opens the image workspace.
- **Reference Attachment**: generated mannequin capture presented as an image reference in GPT Image 2.
- **Navigation Rail**: dark left column with product groups and the highlighted Pose to Image signature tool.

## Do's and Don'ts

### Do's

- Keep the captured product interface as the hero visual.
- Use lime only for the active gesture, key caption, and CTA.
- Frame interactions with slow camera pushes and precise cursor movement.
- Preserve subtle borders, rounded panels, and generous black negative space.

### Don'ts

- Do not invent generated results that the user did not create.
- Do not show account identity, email, credits, or login dialogs.
- Do not use rainbow gradients or unrelated decorative imagery.
- Do not overload the frame with explanatory copy; the interaction should explain itself.
