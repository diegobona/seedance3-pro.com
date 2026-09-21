# Pose Studio IK Implementation Plan

> **For agentic workers:** Implement inline on `main`. Do not create branches or Git commits. Pause for user confirmation after each major node.

**Goal:** Add a pose-first workflow whose first usable milestone is a simple 3D mannequin controlled only through ragdoll-style IK.

**Architecture:** Keep the existing TanStack studio shell and model routing. Add a focused Three.js pose editor that owns its canvas and teardown lifecycle, using the Anyposes bound mannequin asset and its 13-point ragdoll joint-chain design. Later nodes will pass a clean mannequin render into the existing image generation flow and then into image-to-video.

**Tech Stack:** React shell, existing browser JavaScript modules, Three.js, Node test runner.

---

### Node 1: Interactive ragdoll IK pose editor

**Files:**
- Create: `app/pose-ragdoll-config.mjs`
- Create: `app/pose-studio.mjs`
- Create: `app/pose-assets/anyposes-female-rig.fbx`
- Create: `tests/pose-ragdoll.test.mjs`
- Modify: `src/routes/app.tsx`
- Modify: `app/studio.js`
- Modify: `app/studio.css`
- Modify: `tests/studio-routing.test.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`

- [x] Add failing tests for the Anyposes 13-point joint-chain contract.
- [x] Reuse the bound Anyposes mannequin asset and implement iterative joint-chain solving.
- [ ] Add failing structural tests for an enabled Pose Studio entry and editor controls.
- [ ] Add the responsive Pose Studio workspace and lifecycle integration.
- [x] Add draggable head, chest, pelvis, shoulder, elbow, hand, knee, and foot handles.
- [x] Add camera controls, presets, undo, redo, and reset.
- [ ] Run the focused tests, build, and one short browser smoke test.
- [ ] Pause for user confirmation.

### Node 2: Clean pose capture and pose-to-image

- [ ] Capture a clean mannequin PNG without handles or grid.
- [ ] Attach it automatically as the GPT Image 2 reference.
- [ ] Add the pose-specific prompt guardrail and generation result state.
- [ ] Verify one end-to-end pose-to-image request, then pause for confirmation.

### Node 3: Pose-led video flow and homepage demonstration

- [ ] Add image-to-video provider wiring after the generated still is approved.
- [ ] Add the concise homepage interaction demo/GIF.
- [ ] Verify the primary path and mobile layout, then pause for confirmation.
