export const POSE_REFERENCE_PROMPT_PREFIX =
  "Use Image 1, the attached 3D mannequin scene, only as a body-pose and camera-angle reference. Preserve the number of figures, each figure's pose and position, their relative spacing, and the framing; do not copy the mannequins' appearance. Use any additional reference images for the characters, clothing or environment as described below.";

export function buildPoseReferencePrompt(value) {
  const prompt = String(value || "").trim();
  if (prompt.startsWith(POSE_REFERENCE_PROMPT_PREFIX)) return prompt;
  const description = prompt || "Describe the characters, clothing, scene, lighting, and style here.";
  return `${POSE_REFERENCE_PROMPT_PREFIX}\n\n${description}`;
}

export async function capturePoseReference({
  canvas,
  beforeCapture,
  afterCapture,
  FileCtor,
}) {
  const ReferenceFile = FileCtor || File;
  try {
    beforeCapture?.();
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("The pose could not be captured."));
      }, "image/png");
    });
    return new ReferenceFile([blob], "seedance-pose-reference.png", { type: "image/png" });
  } finally {
    afterCapture?.();
  }
}
