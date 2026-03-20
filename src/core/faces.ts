import type { CellTone, FlipboardCell, FlipboardFace } from './message';

export type ResolvedFlipboardFace = {
  key: string;
  char: string;
  tone: CellTone;
  label?: string;
};

const DECOR_TONES: CellTone[] = [
  'muted',
  'accent',
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple'
];

export function createDefaultFaces(charset: string): FlipboardFace[] {
  const chars = [...new Set(charset.split(''))];
  const faces: FlipboardFace[] = chars.map((char) => ({
    char,
    tone: 'default'
  }));

  for (const tone of DECOR_TONES) {
    faces.push({
      char: ' ',
      tone
    });
  }

  return faces;
}

export function resolveFaceWheel(
  faces: FlipboardFace[] | undefined,
  charset: string
): ResolvedFlipboardFace[] {
  const source = faces && faces.length > 0 ? faces : createDefaultFaces(charset);
  const resolved: ResolvedFlipboardFace[] = [];
  const seen = new Set<string>();

  for (const face of source) {
    const normalized = normalizeFace(face);

    if (seen.has(normalized.key)) {
      continue;
    }

    seen.add(normalized.key);
    resolved.push(normalized);
  }

  return resolved;
}

export function resolveFace(
  cell: FlipboardCell,
  faceWheel: ResolvedFlipboardFace[]
): ResolvedFlipboardFace {
  const normalized = normalizeFace(cell);
  const exact = faceWheel.find((face) => face.key === normalized.key);

  if (exact) {
    return exact;
  }

  const sameChar = faceWheel.find((face) => face.char === normalized.char);
  if (sameChar) {
    return {
      ...sameChar,
      tone: normalized.tone,
      key: createFaceKey(sameChar.char, normalized.tone)
    };
  }

  return normalized;
}

export function createFaceSequence(
  currentFace: ResolvedFlipboardFace,
  targetFace: ResolvedFlipboardFace,
  faceWheel: ResolvedFlipboardFace[],
  forceSingleFlip = false
): ResolvedFlipboardFace[] {
  if (currentFace.key === targetFace.key && !forceSingleFlip) {
    return [];
  }

  const currentIndex = faceWheel.findIndex((face) => face.key === currentFace.key);
  const targetIndex = faceWheel.findIndex((face) => face.key === targetFace.key);

  if (currentIndex === -1 || targetIndex === -1) {
    return [targetFace];
  }

  const sequence: ResolvedFlipboardFace[] = [];
  let index = currentIndex;

  while (index !== targetIndex) {
    index = (index + 1) % faceWheel.length;
    sequence.push(faceWheel[index] ?? targetFace);
  }

  if (sequence.length === 0 && forceSingleFlip) {
    return [targetFace];
  }

  return sequence;
}

export function normalizeFace(
  face: FlipboardFace | FlipboardCell
): ResolvedFlipboardFace {
  const char = face.char?.slice(0, 1) ?? ' ';
  const tone = face.tone ?? 'default';
  const id = 'id' in face ? face.id : undefined;

  return {
    key: id ?? createFaceKey(char, tone),
    char,
    tone,
    label: 'label' in face ? face.label : undefined
  };
}

function createFaceKey(char: string, tone: CellTone): string {
  return `${char}\u241f${tone}`;
}
