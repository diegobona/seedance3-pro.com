import { Matrix4, MathUtils } from "three";

export function captureTransformBasis(model, pivot) {
  model.updateMatrixWorld(true);
  pivot.updateMatrixWorld(true);
  return {
    model: model.matrixWorld.clone(),
    pivotInverse: pivot.matrixWorld.clone().invert(),
    scale: model.scale.x,
  };
}

export function applyPivotTransform(model, pivot, basis, mode, axis = "XYZ") {
  // Mannequins scale uniformly even when an individual axis handle is dragged.
  if (mode === "scale") {
    const component = axis.includes("X") ? "x" : axis.includes("Y") ? "y" : "z";
    const factor = MathUtils.clamp(pivot.scale[component], 0.2 / basis.scale, 4 / basis.scale);
    pivot.scale.setScalar(factor);
  }
  pivot.updateMatrixWorld(true);
  const matrix = new Matrix4().multiplyMatrices(pivot.matrixWorld, basis.pivotInverse).multiply(basis.model);
  if (model.parent) {
    model.parent.updateMatrixWorld(true);
    matrix.premultiply(model.parent.matrixWorld.clone().invert());
  }
  matrix.decompose(model.position, model.quaternion, model.scale);
  model.updateMatrixWorld(true);
}
