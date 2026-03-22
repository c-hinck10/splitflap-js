import { describe, expect, it } from 'vitest';
import {
  createDefaultFaces,
  createFaceSequence,
  extendFaceWheel,
  normalizeFace,
  resolveFace,
  resolveFaceWheel
} from '../src/core/faces';

describe('face wheel helpers', () => {
  it('creates default faces from charset plus blank tone variants', () => {
    const faces = createDefaultFaces(' AB');

    expect(faces).toEqual(
      expect.arrayContaining([
        { char: ' ', tone: 'default' },
        { char: 'A', tone: 'default' },
        { char: 'B', tone: 'default' },
        { char: ' ', tone: 'purple' }
      ])
    );
  });

  it('resolves exact tone variants when present in the face wheel', () => {
    const wheel = resolveFaceWheel(
      [
        { char: ' ', tone: 'default' },
        { char: ' ', tone: 'purple' }
      ],
      ' '
    );

    const resolved = resolveFace({ char: ' ', tone: 'purple' }, wheel);
    expect(resolved.tone).toBe('purple');
  });

  it('honors custom face ordering when building a flip sequence', () => {
    const wheel = resolveFaceWheel(
      [
        { char: 'A', tone: 'default' },
        { char: '*', tone: 'accent' },
        { char: 'B', tone: 'default' }
      ],
      'AB*'
    );

    const sequence = createFaceSequence(
      normalizeFace({ char: 'A', tone: 'default' }),
      normalizeFace({ char: 'B', tone: 'default' }),
      wheel
    );

    expect(sequence.map((face) => `${face.char}:${face.tone}`)).toEqual([
      '*:accent',
      'B:default'
    ]);
  });

  it('extends the wheel with encountered faces so they can roll forward', () => {
    const baseWheel = resolveFaceWheel(
      [
        { char: ' ', tone: 'default' },
        { char: 'A', tone: 'default' },
        { char: 'B', tone: 'default' }
      ],
      ' AB'
    );

    const wheel = extendFaceWheel(baseWheel, [{ char: ' ', tone: 'purple' }]);
    const sequence = createFaceSequence(
      normalizeFace({ char: ' ', tone: 'default' }),
      normalizeFace({ char: ' ', tone: 'purple' }),
      wheel
    );

    expect(sequence.map((face) => `${face.char}:${face.tone}`)).toEqual([
      'A:default',
      'B:default',
      ' :purple'
    ]);
  });

  it('can choose the shortest path through the wheel', () => {
    const wheel = resolveFaceWheel(
      [
        { char: 'A', tone: 'default' },
        { char: 'B', tone: 'default' },
        { char: 'C', tone: 'default' },
        { char: 'D', tone: 'default' }
      ],
      'ABCD'
    );

    const sequence = createFaceSequence(
      normalizeFace({ char: 'A', tone: 'default' }),
      normalizeFace({ char: 'D', tone: 'default' }),
      wheel,
      false,
      'shortest'
    );

    expect(sequence.map((face) => `${face.char}:${face.tone}`)).toEqual([
      'D:default'
    ]);
  });

  it('keeps forward traversal when shortest mode ties', () => {
    const wheel = resolveFaceWheel(
      [
        { char: 'A', tone: 'default' },
        { char: 'B', tone: 'default' },
        { char: 'C', tone: 'default' },
        { char: 'D', tone: 'default' }
      ],
      'ABCD'
    );

    const sequence = createFaceSequence(
      normalizeFace({ char: 'A', tone: 'default' }),
      normalizeFace({ char: 'C', tone: 'default' }),
      wheel,
      false,
      'shortest'
    );

    expect(sequence.map((face) => `${face.char}:${face.tone}`)).toEqual([
      'B:default',
      'C:default'
    ]);
  });
});
