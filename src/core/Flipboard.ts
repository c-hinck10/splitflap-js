import {
  layoutMessagePages,
  layoutStructuredPages,
  normalizeMessage,
  type CellTone,
  type FlipboardCell,
  type FlipboardPage,
  type FlipboardTheme,
  type MessageAlign,
  type MessageLayoutOptions,
  type MessagePage
} from './message';
import { Tile } from './Tile';
import { observeOnce } from './visibility';

export type TriggerMode = 'load' | 'visible' | 'manual';
export type FlipboardSize = '3x15' | '6x22';
export type StaggerMode = 'simultaneous' | 'sequence' | 'row';

export const FLIPBOARD_SIZES: Record<FlipboardSize, { rows: number; cols: number }> = {
  '3x15': { rows: 3, cols: 15 },
  '6x22': { rows: 6, cols: 22 }
};

export type FlipboardOptions = {
  size?: FlipboardSize;
  rows?: number;
  cols?: number;
  align?: MessageAlign;
  preserveWords?: boolean;
  tone?: CellTone;
  theme?: FlipboardTheme;
  trigger?: TriggerMode;
  stagger?: number;
  staggerMode?: StaggerMode;
  flipDuration?: number;
  charset?: string;
  loop?: boolean;
  autoplay?: boolean;
  pageDuration?: number;
  paginate?: boolean;
  messages?: string[];
  pages?: FlipboardPage[];
  startIndex?: number;
  onComplete?: (message: string, index: number) => void;
};

export const DEFAULT_CHARSET =
  ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?-:/&@';

export const DEFAULT_OPTIONS: Required<Omit<FlipboardOptions, 'onComplete'>> = {
  size: '3x15',
  rows: 3,
  cols: 15,
  align: 'center',
  preserveWords: true,
  tone: 'default',
  theme: 'classic',
  trigger: 'load',
  stagger: 35,
  staggerMode: 'simultaneous',
  flipDuration: 120,
  charset: DEFAULT_CHARSET,
  loop: false,
  autoplay: false,
  pageDuration: 3000,
  paginate: true,
  messages: [''],
  pages: [],
  startIndex: 0
};

export class Flipboard {
  private readonly container: HTMLElement;
  private readonly options: Required<Omit<FlipboardOptions, 'onComplete'>> &
    Pick<FlipboardOptions, 'onComplete'>;
  private readonly charsetList: string[];
  private readonly board: HTMLDivElement;
  private readonly srText: HTMLSpanElement;
  private readonly tiles: Tile[] = [];
  private playlist: MessagePage[] = [emptyPage()];
  private disconnectVisibility?: () => void;
  private currentIndex: number;
  private currentSignature = '';
  private hasAnimatedCurrentState = false;
  private destroyed = false;
  private isPlaying = false;
  private queuedPlayback?: { page: MessagePage; index: number };
  private autoplayTimer?: number;

  constructor(container: HTMLElement, options: FlipboardOptions = {}) {
    this.container = container;
    const sanitizedOptions = removeUndefined(options);
    const resolvedSize = resolveBoardSize(sanitizedOptions);
    this.options = { ...DEFAULT_OPTIONS, ...resolvedSize, ...sanitizedOptions };
    this.charsetList = [...new Set(this.options.charset.split(''))];
    this.playlist = this.resolvePlaylist();
    this.currentIndex = this.clampIndex(this.options.startIndex);

    this.board = document.createElement('div');
    this.board.className = 'fb-board';
    this.board.setAttribute('role', 'img');
    this.board.style.setProperty('--fb-cols', String(this.options.cols));
    this.board.style.setProperty(
      '--fb-flip-duration',
      `${this.options.flipDuration}ms`
    );

    this.srText = document.createElement('span');
    this.srText.className = 'fb-sr-only';

    this.container.replaceChildren();
    this.container.append(this.board, this.srText);

    this.createTiles();
    this.renderBlankState();
    this.installTrigger();
  }

  setMessage(message: string): void {
    this.options.messages = [message];
    this.options.pages = [];
    this.playlist = this.resolvePlaylist();
    this.currentIndex = 0;
    this.clearAutoplayTimer();
    void this.applyPage(this.playlist[0] ?? emptyPage(), true);
  }

  setMessages(messages: string[]): void {
    this.options.messages = messages.length > 0 ? messages : [''];
    this.options.pages = [];
    this.playlist = this.resolvePlaylist();
    this.currentIndex = this.clampIndex(this.currentIndex);
    this.clearAutoplayTimer();
    void this.applyPage(this.playlist[this.currentIndex] ?? emptyPage(), false);
  }

  setPages(pages: FlipboardPage[]): void {
    this.options.pages = pages;
    this.playlist = this.resolvePlaylist();
    this.currentIndex = this.clampIndex(this.currentIndex);
    this.clearAutoplayTimer();
    void this.applyPage(this.playlist[this.currentIndex] ?? emptyPage(), false);
  }

  play(index = this.currentIndex): void {
    const nextIndex = this.clampIndex(index);
    this.currentIndex = nextIndex;
    const page = this.playlist[nextIndex] ?? emptyPage();
    this.clearAutoplayTimer();
    void this.applyPage(page, true);
  }

  next(): void {
    const lastIndex = this.playlist.length - 1;

    if (lastIndex < 0) {
      return;
    }

    if (this.currentIndex >= lastIndex) {
      if (!this.options.loop) {
        this.play(lastIndex);
        return;
      }

      this.play(0);
      return;
    }

    this.play(this.currentIndex + 1);
  }

  reset(): void {
    this.isPlaying = false;
    this.queuedPlayback = undefined;
    this.currentSignature = '';
    this.hasAnimatedCurrentState = false;
    this.clearAutoplayTimer();
    this.currentIndex = this.clampIndex(this.options.startIndex);
    this.renderBlankState();
  }

  destroy(): void {
    this.destroyed = true;
    this.disconnectVisibility?.();
    this.clearAutoplayTimer();

    for (const tile of this.tiles) {
      tile.destroy();
    }

    this.tiles.length = 0;
    this.container.replaceChildren();
  }

  private createTiles(): void {
    const count = this.options.rows * this.options.cols;

    for (let index = 0; index < count; index += 1) {
      const tile = new Tile(' ');
      this.tiles.push(tile);
      this.board.append(tile.element);
    }
  }

  private renderBlankState(): void {
    for (let index = 0; index < this.tiles.length; index += 1) {
      this.tiles[index]?.setImmediate(emptyCell());
    }

    this.updateAccessibleText('');
    this.board.setAttribute('aria-label', '');
    this.board.dataset.theme = this.options.theme;
  }

  private installTrigger(): void {
    switch (this.options.trigger) {
      case 'load':
        window.requestAnimationFrame(() => this.play(this.currentIndex));
        break;
      case 'visible':
        this.disconnectVisibility = observeOnce(this.container, () => {
          this.play(this.currentIndex);
        });
        break;
      case 'manual':
      default:
        break;
    }
  }

  private async applyPage(page: MessagePage, animate: boolean): Promise<void> {
    if (this.destroyed) {
      return;
    }

    const normalized = this.resolveCells(page);
    const signature = serializeCells(normalized, page.theme ?? this.options.theme);
    const message = page.text;

    this.board.setAttribute('aria-label', message);
    this.board.dataset.theme = page.theme ?? this.options.theme;
    this.updateAccessibleText(message);

    if (!animate) {
      for (let index = 0; index < normalized.length; index += 1) {
        this.tiles[index]?.setImmediate(normalized[index] ?? emptyCell());
      }
      this.currentSignature = signature;
      this.hasAnimatedCurrentState = false;
      return;
    }

    if (signature === this.currentSignature && this.hasAnimatedCurrentState) {
      return;
    }

    if (this.isPlaying) {
      this.queuedPlayback = {
        page,
        index: this.currentIndex
      };
      return;
    }

    this.isPlaying = true;

    await Promise.all(
      normalized.map((cell, index) =>
        this.tiles[index]?.animateTo(
          cell,
          this.charsetList,
          this.getTileDelay(index),
          this.options.flipDuration
        ) ?? Promise.resolve()
      )
    );

    this.isPlaying = false;
    this.currentSignature = signature;
    this.hasAnimatedCurrentState = true;
    this.options.onComplete?.(message, this.currentIndex);
    this.scheduleAutoplay();

    if (this.queuedPlayback) {
      const queued = this.queuedPlayback;
      this.queuedPlayback = undefined;
      this.currentIndex = queued.index;
      void this.applyPage(queued.page, true);
    }
  }

  private updateAccessibleText(message: string): void {
    this.srText.textContent = message;
  }

  private clampIndex(index: number): number {
    if (this.playlist.length === 0) {
      return 0;
    }

    if (index < 0) {
      return 0;
    }

    if (index >= this.playlist.length) {
      return this.playlist.length - 1;
    }

    return index;
  }

  private resolvePlaylist(): MessagePage[] {
    if (this.options.pages.length > 0) {
      return layoutStructuredPages(
        this.options.pages,
        this.options.cols,
        this.options.rows
      );
    }

    if (!this.options.paginate) {
      const pages = (this.options.messages.length > 0
        ? this.options.messages
        : ['']
      ).map((message) => ({
        cells: normalizeMessage(message, this.options.cols, this.options.rows, {
          align: this.options.align,
          preserveWords: this.options.preserveWords,
          tone: this.options.tone
        }),
        text: message
      }));

      return pages.length > 0 ? pages : [emptyPage()];
    }

    const layoutOptions: MessageLayoutOptions = {
      align: this.options.align,
      preserveWords: this.options.preserveWords,
      tone: this.options.tone
    };

    const pages = this.options.messages.flatMap((message) =>
      layoutMessagePages(
        message,
        this.options.cols,
        this.options.rows,
        layoutOptions
      )
    );

    return pages.length > 0 ? pages : [emptyPage()];
  }

  private resolveCells(page: MessagePage): FlipboardCell[] {
    if (page.cells.length > 0) {
      return page.cells;
    }

    return normalizeMessage(page.text, this.options.cols, this.options.rows, {
      align: this.options.align,
      preserveWords: this.options.preserveWords,
      tone: this.options.tone
    });
  }

  private getTileDelay(index: number): number {
    switch (this.options.staggerMode) {
      case 'sequence':
        return index * this.options.stagger;
      case 'row':
        return Math.floor(index / this.options.cols) * this.options.stagger;
      case 'simultaneous':
      default:
        return 0;
    }
  }

  private scheduleAutoplay(): void {
    this.clearAutoplayTimer();

    if (!this.options.autoplay || this.playlist.length <= 1 || this.destroyed) {
      return;
    }

    this.autoplayTimer = window.setTimeout(() => {
      this.next();
    }, this.options.pageDuration);
  }

  private clearAutoplayTimer(): void {
    if (this.autoplayTimer !== undefined) {
      window.clearTimeout(this.autoplayTimer);
      this.autoplayTimer = undefined;
    }
  }
}

function resolveBoardSize(
  options: FlipboardOptions
): Pick<Required<FlipboardOptions>, 'size' | 'rows' | 'cols'> {
  const size = options.size ?? DEFAULT_OPTIONS.size;
  const preset = FLIPBOARD_SIZES[size];

  return {
    size,
    rows: options.rows ?? preset.rows,
    cols: options.cols ?? preset.cols
  };
}

function emptyPage(): MessagePage {
  return {
    cells: [],
    text: ''
  };
}

function emptyCell(): FlipboardCell {
  return {
    char: ' ',
    tone: 'default'
  };
}

function serializeCells(cells: FlipboardCell[], theme: FlipboardTheme): string {
  return `${theme}:${cells.map((cell) => `${cell.char ?? ' '}:${cell.tone ?? 'default'}`).join('|')}`;
}

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T;
}
