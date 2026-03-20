import type { CellTone, FlipboardCell } from './message';

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
  private currentChar: string;
  private currentTone: CellTone = 'default';
  private timeouts: number[] = [];

  constructor(char = ' ') {
    const elements = this.createElements(char);
    this.element = elements.root;
    this.top = elements.top;
    this.bottom = elements.bottom;
    this.flapFront = elements.flapFront;
    this.flapBack = elements.flapBack;
    this.currentChar = char;
  }

  get value(): string {
    return this.currentChar;
  }

  setImmediate(cell: FlipboardCell): void {
    this.clearTimers();
    this.currentChar = cell.char ?? ' ';
    this.currentTone = cell.tone ?? 'default';
    this.applyTone(this.currentTone);
    this.syncFaces(this.currentChar, this.currentChar);
    this.element.classList.remove('is-flipping');
  }

  animateTo(
    targetCell: FlipboardCell,
    charset: string[],
    delay: number,
    flipDuration: number
  ): Promise<void> {
    const target = targetCell.char ?? ' ';
    const targetTone = targetCell.tone ?? 'default';
    const toneChanged = targetTone !== this.currentTone;

    if (target === this.currentChar && !toneChanged) {
      return Promise.resolve();
    }

    this.clearTimers();
    const sequence = this.buildSequence(target, charset, toneChanged);

    return new Promise((resolve) => {
      const startTimeout = window.setTimeout(() => {
        let stepIndex = 0;

        const runStep = () => {
          const nextChar = sequence[stepIndex];

          if (nextChar === undefined) {
            this.element.classList.remove('is-flipping');
            resolve();
            return;
          }

          const isFinalStep = stepIndex === sequence.length - 1;
          this.playStep(
            nextChar,
            flipDuration,
            isFinalStep && toneChanged ? targetTone : undefined
          );
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
    nextChar: string,
    flipDuration: number,
    nextTone?: CellTone
  ): void {
    const midpoint = Math.max(16, Math.floor(flipDuration / 2));
    const fromChar = this.currentChar;

    this.syncFaces(fromChar, nextChar);
    this.element.classList.remove('is-flipping');

    // Force a reflow so repeated flips restart the keyframe.
    void this.element.offsetWidth;

    this.element.classList.add('is-flipping');

    const midpointTimeout = window.setTimeout(() => {
      if (nextTone) {
        this.currentTone = nextTone;
        this.applyTone(nextTone);
      }
      this.setFaceText(this.top, nextChar);
      this.setFaceText(this.bottom, nextChar);
    }, midpoint);

    const endTimeout = window.setTimeout(() => {
      this.currentChar = nextChar;
      this.currentTone = nextTone ?? this.currentTone;
      this.syncFaces(nextChar, nextChar);
      this.element.classList.remove('is-flipping');
    }, flipDuration);

    this.timeouts.push(midpointTimeout, endTimeout);
  }

  private buildSequence(
    target: string,
    charset: string[],
    forceSingleFlip = false
  ): string[] {
    const currentIndex = charset.indexOf(this.currentChar);
    const targetIndex = charset.indexOf(target);

    if (currentIndex === -1 || targetIndex === -1) {
      return [target];
    }

    const sequence: string[] = [];
    let index = currentIndex;

    while (index !== targetIndex) {
      index = (index + 1) % charset.length;
      sequence.push(charset[index] ?? target);
    }

    if (sequence.length === 0 && forceSingleFlip) {
      return [target];
    }

    return sequence;
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
