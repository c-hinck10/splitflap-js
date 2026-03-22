import {
  createFaceSequence,
  normalizeFace,
  type FlipDirection,
  type ResolvedFlipboardFace
} from './faces';
import type { CellTone, FlipboardCell, FlipboardFace } from './message';

type TileElements = {
  root: HTMLDivElement;
  top: HTMLDivElement;
  bottom: HTMLDivElement;
  flapFront: HTMLDivElement;
  flapBack: HTMLDivElement;
};

function createFace(className: string, char: string): HTMLDivElement {
  const face = document.createElement('div');
  face.className = className;
  const glyph = document.createElement('span');
  glyph.className = 'fb-glyph';
  glyph.textContent = char;
  face.append(glyph);
  return face;
}

export class Tile {
  readonly element: HTMLDivElement;

  private readonly top: HTMLDivElement;
  private readonly bottom: HTMLDivElement;
  private readonly flapFront: HTMLDivElement;
  private readonly flapBack: HTMLDivElement;
  private currentFace: ResolvedFlipboardFace;
  private timeouts: number[] = [];

  constructor(char = ' ') {
    const elements = this.createElements(char);
    this.element = elements.root;
    this.top = elements.top;
    this.bottom = elements.bottom;
    this.flapFront = elements.flapFront;
    this.flapBack = elements.flapBack;
    this.currentFace = normalizeFace({ char, tone: 'default' });
  }

  get value(): string {
    return this.currentFace.char;
  }

  setImmediate(face: FlipboardCell | FlipboardFace): void {
    this.clearTimers();
    this.currentFace = normalizeFace(face);
    this.applyTone(this.currentFace.tone);
    this.syncFaces(this.currentFace.char, this.currentFace.char);
    this.element.classList.remove('is-flipping');
  }

  animateTo(
    targetFace: ResolvedFlipboardFace,
    faceWheel: ResolvedFlipboardFace[],
    delay: number,
    flipDuration: number,
    direction: FlipDirection = 'forward'
  ): Promise<void> {
    if (targetFace.key === this.currentFace.key) {
      return Promise.resolve();
    }

    this.clearTimers();
    const toneChanged = targetFace.tone !== this.currentFace.tone;
    const sequence = createFaceSequence(
      this.currentFace,
      targetFace,
      faceWheel,
      toneChanged,
      direction
    );

    return new Promise((resolve) => {
      const startTimeout = window.setTimeout(() => {
        let stepIndex = 0;

        const runStep = () => {
          const nextFace = sequence[stepIndex];

          if (nextFace === undefined) {
            this.element.classList.remove('is-flipping');
            resolve();
            return;
          }

          this.playStep(nextFace, flipDuration);
          stepIndex += 1;

          const continuation = window.setTimeout(runStep, flipDuration);
          this.timeouts.push(continuation);
        };

        runStep();
      }, delay);

      this.timeouts.push(startTimeout);
    });
  }

  destroy(): void {
    this.clearTimers();
    this.element.remove();
  }

  private createElements(char: string): TileElements {
    const root = document.createElement('div');
    root.className = 'fb-tile';

    const top = createFace('fb-top', char);
    const bottom = createFace('fb-bottom', char);
    const flapFront = createFace('fb-flap fb-flap-front', char);
    const flapBack = createFace('fb-flap fb-flap-back', char);

    root.append(top, bottom, flapFront, flapBack);

    return { root, top, bottom, flapFront, flapBack };
  }

  private syncFaces(current: string, next: string): void {
    this.setFaceText(this.top, current);
    this.setFaceText(this.bottom, next);
    this.setFaceText(this.flapFront, current);
    this.setFaceText(this.flapBack, next);
  }

  private playStep(
    nextFace: ResolvedFlipboardFace,
    flipDuration: number
  ): void {
    const midpoint = Math.max(16, Math.floor(flipDuration / 2));
    const fromFace = this.currentFace;

    this.syncFaces(fromFace.char, nextFace.char);
    this.element.classList.remove('is-flipping');

    // Force a reflow so repeated flips restart the keyframe.
    void this.element.offsetWidth;

    this.element.classList.add('is-flipping');

    const midpointTimeout = window.setTimeout(() => {
      this.applyTone(nextFace.tone);
      this.setFaceText(this.top, nextFace.char);
      this.setFaceText(this.bottom, nextFace.char);
    }, midpoint);

    const endTimeout = window.setTimeout(() => {
      this.currentFace = nextFace;
      this.syncFaces(nextFace.char, nextFace.char);
      this.element.classList.remove('is-flipping');
    }, flipDuration);

    this.timeouts.push(midpointTimeout, endTimeout);
  }

  private clearTimers(): void {
    for (const timeout of this.timeouts) {
      window.clearTimeout(timeout);
    }
    this.timeouts = [];
  }

  private applyTone(tone: CellTone | undefined): void {
    this.element.dataset.tone = tone ?? 'default';
  }

  private setFaceText(face: HTMLDivElement, char: string): void {
    const glyph = face.firstElementChild;

    if (glyph instanceof HTMLElement) {
      glyph.textContent = char;
    }
  }
}
