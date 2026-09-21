// Direction vectors derived from Anyposes' version 7 preset catalog.
// Source pose codes: 5 (crossed arms), 6 (kneeling), 10 (slow run).
export const ANYPOSES_REFERENCE_DIRECTIONS = Object.freeze({
  spine: [0, 0.894427, -0.447214],
  leftArm: [0.122311, -0.985014, -0.121602],
  leftForeArm: [0.118213, -0.983153, 0.139412],
  rightArm: [-0.122311, -0.985014, -0.121602],
  rightForeArm: [-0.118213, -0.983153, 0.139412],
  leftUpLeg: [0.104528, -0.994522, 0],
  leftLeg: [0.104528, -0.994522, 0],
  rightUpLeg: [-0.104528, -0.994522, 0],
  rightLeg: [-0.104528, -0.994522, 0],
});

export const ANYPOSES_PRESETS = Object.freeze([
  {
    key: "crossed-arms",
    label: "Crossed arms",
    sourceCode: 5,
    directions: {
      spine: [0.082619, 0.9343, -0.346783],
      leftArm: [0.011193, -0.922545, 0.385727],
      leftForeArm: [-0.948677, 0.281506, 0.144105],
      rightArm: [0.033185, -0.828828, 0.558518],
      rightForeArm: [0.964783, 0.229163, -0.129144],
      leftUpLeg: [0.16644, -0.947309, 0.273686],
      leftLeg: [0.010916, -0.963587, -0.26717],
      rightUpLeg: [-0.058972, -0.995809, 0.069904],
      rightLeg: [-0.055167, -0.988996, -0.13727],
    },
  },
  {
    key: "kneeling",
    label: "Kneeling",
    sourceCode: 6,
    directions: {
      spine: [0, 0.985601, 0.169091],
      leftArm: [0.006912, -0.99746, 0.070887],
      leftForeArm: [-0.529494, -0.687041, 0.497604],
      rightArm: [-0.265844, -0.945991, -0.185548],
      rightForeArm: [-0.030137, -0.981321, 0.190005],
      leftUpLeg: [0.189252, 0.029986, 0.981471],
      leftLeg: [0.081664, -0.996493, 0.018255],
      rightUpLeg: [-0.081918, -0.995868, 0.039185],
      rightLeg: [-0.049716, 0.139544, -0.988967],
    },
  },
  {
    key: "jogging",
    label: "Jogging",
    sourceCode: 10,
    directions: {
      spine: [0, 0.933173, -0.359428],
      leftArm: [0.301536, -0.881192, 0.364112],
      leftForeArm: [-0.15414, 0.622507, 0.767285],
      rightArm: [-0.133903, -0.445779, -0.885071],
      rightForeArm: [-0.067665, -0.764089, 0.641552],
      leftUpLeg: [-0.013607, -0.895664, -0.444524],
      leftLeg: [-0.024725, -0.257036, -0.966086],
      rightUpLeg: [0.011915, -0.923557, 0.383276],
      rightLeg: [0.009225, -0.938191, 0.345995],
    },
  },
]);
