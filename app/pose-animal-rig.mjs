// Published v1 rig dimensions. Keep these stable when authoring new anatomy:
// old share links contain local bone positions but no rest-pose metadata.
const LEGACY_RIGS = {
  cat: { width: .42, depth: .49, length: 1, leg: 1.05, neck: [.28, .38] },
  dog: { width: .52, depth: .62, length: 1.22, leg: 1.4, neck: [.4, .46] },
  horse: { width: .68, depth: .93, length: 1.7, leg: 2.65, neck: [1.1, .75] },
};

export function legacyAnimalRestPositions(kind) {
  const spec = LEGACY_RIGS[kind];
  if (!spec) throw new Error('Unknown animal rig');
  const { width, depth, length, leg, neck } = spec;
  const positions = [
    [0, leg + (kind === 'horse' ? .19 : .13), 0],
    [0, depth * .46, length * .73],
    [0, ...neck],
  ];
  for (const front of [true, false]) for (const side of [-1, 1]) {
    const bend = front ? .02 : -.18;
    positions.push(
      [side * width * .72, 0, (front ? .68 : -.68) * length],
      [0, -leg * .52, bend],
      [0, -leg * .48, -bend],
    );
  }
  positions.push(
    [0, depth * .35, -length * .86],
    kind === 'cat' ? [0, .35, -.85] : kind === 'dog' ? [0, .3, -.8] : [0, -.75, -.45],
    kind === 'horse' ? [0, -.8, -.1] : [0, .3, -.55],
  );
  return positions;
}

export function migrateLegacyAnimalBones(kind, savedBones, currentRestBones) {
  const legacyRest = legacyAnimalRestPositions(kind);
  const currentRest = new Map(currentRestBones.map(bone => [bone.index, bone.position]));
  return savedBones.map(saved => {
    const oldPosition = legacyRest[saved.index];
    const newPosition = currentRest.get(saved.index);
    if (!oldPosition || !newPosition) return saved;
    return {
      ...saved,
      position: newPosition.map((value, axis) => value + saved.position[axis] - oldPosition[axis]),
    };
  });
}
