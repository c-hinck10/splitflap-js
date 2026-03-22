import {
  createDefaultFaces,
  extendFaceWheel,
  resolveFace,
  resolveFaceWheel,
  type FlipDirection,
  type ResolvedFlipboardFace
} from './faces';
import {
  layoutMessagePages,
  layoutStructuredPages,
  normalizeMessage,
  type CellTone,
  type FlipboardCell,
  type FlipboardFace,
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
export type PerformanceMode = 'auto' | 'off' | 'on';

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
  faces?: FlipboardFace[];
  shadow?: boolean | string;
  tileShadow?: boolean | string;
  loop?: boolean;
  autoplay?: boolean;
  pageDuration?: number;
  paginate?: boolean;
  messages?: string[];
  pages?: FlipboardPage[];
  startIndex?: number;
  respectReducedMotion?: boolean;
  pauseWhenHidden?: boolean;
  responsive?: boolean;
  performanceMode?: PerformanceMode;
  flipDirection?: FlipDirection;
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
  faces: [],
  shadow: true,
  tileShadow: true,
  loop: false,
  autoplay: false,
  pageDuration: 3000,
  paginate: true,
  messages: [''],
  pages: [],
  startIndex: 0,
  respectReducedMotion: true,
  pauseWhenHidden: true,
  responsive: true,
  performanceMode: 'auto',
  flipDirection: 'forward'
};

export class Flipboard {
  private readonly container: HTMLElement;
  private readonly options: Required<Omit<FlipboardOptions, 'onComplete'>> &
    Pick<FlipboardOptions, 'onComplete'>;
  private faceWheel: ResolvedFlipboardFace[] = [];
  private readonly board: HTMLDivElement;
  private readonly srText: HTMLSpanElement;
  private readonly tiles: Tile[] = [];
  private playlist: MessagePage[] = [emptyPage()];
  private disconnectVisibility?: () => void;
  private removeVisibilityListener?: () => void;
  private removeResizeHandling?: () => void;
  private currentIndex: number;
  private currentSignature = '';
  private hasAnimatedCurrentState = false;
  private destroyed = false;
  private isPlaying = false;
  private queuedPlayback?: { page: MessagePage; index: number };
  private autoplayTimer?: number;
  private resumeAutoplayOnVisible = false;

  constructor(container: HTMLElement, options: FlipboardOptions = {}) {
    this.container = container;
    const sanitizedOptions = removeUndefined(options);
    const resolvedSize = resolveBoardSize(sanitizedOptions);
    this.options = { ...DEFAULT_OPTIONS, ...resolvedSize, ...sanitizedOptions };
    this.playlist = this.resolvePlaylist();
    this.refreshFaceWheel();
    this.currentIndex = this.clampIndex(this.options.startIndex);

    this.board = document.createElement('div');
    this.board.className = 'fb-board';
    this.board.setAttribute('role', 'img');
    this.board.style.setProperty('--fb-cols', String(this.options.cols));
    this.board.style.setProperty(
      '--fb-flip-duration',
      `${this.options.flipDuration}ms`
    );
    applyBoardShadow(this.board, this.options.shadow);
    applyTileShadow(this.board, this.options.tileShadow);

    this.srText = document.createElement('span');
    this.srText.className = 'fb-sr-only';

    this.container.replaceChildren();
    this.container.append(this.board, this.srText);

    this.createTiles();
    this.renderBlankState();
    this.installVisibilityHandling();
    this.installResponsiveHandling();
    this.installTrigger();
  }

  setMessage(message: string): void {
    this.options.messages = [message];
    this.options.pages = [];
    this.playlist = this.resolvePlaylist();
    this.refreshFaceWheel();
    this.currentIndex = 0;
    this.clearAutoplayTimer();
    void this.applyPage(this.playlist[0] ?? emptyPage(), true);
  }

  setMessages(messages: string[]): void {
    this.options.messages = messages.length > 0 ? messages : [''];
    this.options.pages = [];
    this.playlist = this.resolvePlaylist();
    this.refreshFaceWheel();
    this.currentIndex = this.clampIndex(this.currentIndex);
    this.clearAutoplayTimer();
    void this.applyPage(this.playlist[this.currentIndex] ?? emptyPage(), false);
  }

  setPages(pages: FlipboardPage[]): void {
    this.options.pages = pages;
    this.playlist = this.resolvePlaylist();
    this.refreshFaceWheel();
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
    this.removeVisibilityListener?.();
    this.removeResizeHandling?.();
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

  private installVisibilityHandling(): void {
    if (!this.options.pauseWhenHidden || typeof document === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        this.resumeAutoplayOnVisible = this.autoplayTimer !== undefined;
        this.clearAutoplayTimer();
        return;
      }

      if (this.resumeAutoplayOnVisible) {
        this.resumeAutoplayOnVisible = false;
        this.scheduleAutoplay();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    this.removeVisibilityListener = () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }

  private installResponsiveHandling(): void {
    this.updateResponsiveState();

    if (!this.options.responsive || typeof window === 'undefined') {
      return;
    }

    const handleResize = () => {
      this.updateResponsiveState();
    };

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        handleResize();
      });
      observer.observe(this.container);
      this.removeResizeHandling = () => observer.disconnect();
      return;
    }

    window.addEventListener('resize', handleResize);
    this.removeResizeHandling = () => {
      window.removeEventListener('resize', handleResize);
    };
  }

  private async applyPage(page: MessagePage, animate: boolean): Promise<void> {
    if (this.destroyed) {
      return;
    }

    const shouldAnimate = animate && !this.shouldReduceMotion();
    const normalized = this.resolveCells(page);
    const resolvedFaces = normalized.map((cell) => resolveFace(cell, this.faceWheel));
    const signature = serializeFaces(resolvedFaces, page.theme ?? this.options.theme);
    const message = page.text;

    this.board.setAttribute('aria-label', message);
    this.board.dataset.theme = page.theme ?? this.options.theme;
    this.updateAccessibleText(message);

    if (!shouldAnimate) {
      for (let index = 0; index < normalized.length; index += 1) {
        this.tiles[index]?.setImmediate(resolvedFaces[index] ?? emptyFace());
      }
      this.currentSignature = signature;
      this.hasAnimatedCurrentState = false;
      this.scheduleAutoplay();
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
      resolvedFaces.map((face, index) =>
        this.tiles[index]?.animateTo(
          face,
          this.faceWheel,
          this.getTileDelay(index),
          this.getEffectiveFlipDuration(),
          this.options.flipDirection
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

  private refreshFaceWheel(): void {
    const baseWheel = resolveFaceWheel(this.options.faces, this.options.charset);
    const encounteredFaces = this.playlist.flatMap((page) => this.resolveCells(page));
    this.faceWheel = extendFaceWheel(baseWheel, encounteredFaces);
  }

  private getTileDelay(index: number): number {
    const stagger = this.getEffectiveStagger();

    switch (this.options.staggerMode) {
      case 'sequence':
        return index * stagger;
      case 'row':
        return Math.floor(index / this.options.cols) * stagger;
      case 'simultaneous':
      default:
        return 0;
    }
  }

  private scheduleAutoplay(): void {
    this.clearAutoplayTimer();

    if (
      !this.options.autoplay ||
      this.playlist.length <= 1 ||
      this.destroyed ||
      (this.options.pauseWhenHidden && typeof document !== 'undefined' && document.hidden)
    ) {
      return;
    }

    this.autoplayTimer = window.setTimeout(() => {
      this.next();
    }, this.options.pageDuration);
  }

  private shouldReduceMotion(): boolean {
    return (
      this.options.respectReducedMotion &&
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  private updateResponsiveState(): void {
    const compact = this.options.responsive && this.shouldUseCompactLayout();
    this.board.dataset.compact = compact ? 'true' : 'false';
    this.board.dataset.performance = this.isPerformanceModeEnabled()
      ? 'true'
      : 'false';
    this.board.style.setProperty(
      '--fb-flip-duration',
      `${this.getEffectiveFlipDuration()}ms`
    );
  }

  private shouldUseCompactLayout(): boolean {
    const width = this.container.clientWidth || this.container.getBoundingClientRect().width;
    const maxTileWidth = width > 0 ? width / Math.max(1, this.options.cols) : 0;

    return (
      this.hasCoarsePointer() ||
      (width > 0 && width <= 640) ||
      (maxTileWidth > 0 && maxTileWidth < 32)
    );
  }

  private hasCoarsePointer(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches
    );
  }

  private isPerformanceModeEnabled(): boolean {
    if (this.options.performanceMode === 'on') {
      return true;
    }

    if (this.options.performanceMode === 'off') {
      return false;
    }

    return this.board.dataset.compact === 'true' || this.hasCoarsePointer();
  }

  private getEffectiveStagger(): number {
    if (!this.isPerformanceModeEnabled()) {
      return this.options.stagger;
    }

    return Math.min(this.options.stagger, 20);
  }

  private getEffectiveFlipDuration(): number {
    if (!this.isPerformanceModeEnabled()) {
      return this.options.flipDuration;
    }

    return Math.min(this.options.flipDuration, 90);
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

function applyBoardShadow(
  board: HTMLDivElement,
  shadow: boolean | string | undefined
): void {
  if (shadow === false) {
    board.style.setProperty('--fb-board-shadow', '0 0 0 rgba(0, 0, 0, 0)');
    return;
  }

  if (typeof shadow === 'string' && shadow.trim().length > 0) {
    board.style.setProperty('--fb-board-shadow', shadow);
    return;
  }

  board.style.removeProperty('--fb-board-shadow');
}

function applyTileShadow(
  board: HTMLDivElement,
  shadow: boolean | string | undefined
): void {
  if (shadow === false) {
    board.style.setProperty('--fb-tile-shadow', 'none');
    return;
  }

  if (typeof shadow === 'string' && shadow.trim().length > 0) {
    board.style.setProperty('--fb-tile-shadow', shadow);
    return;
  }

  board.style.removeProperty('--fb-tile-shadow');
}

function emptyCell(): FlipboardCell {
  return {
    char: ' ',
    tone: 'default'
  };
}

function emptyFace(): ResolvedFlipboardFace {
  return {
    key: ' \u241fdefault',
    char: ' ',
    tone: 'default'
  };
}

function serializeFaces(
  faces: ResolvedFlipboardFace[],
  theme: FlipboardTheme
): string {
  return `${theme}:${faces.map((face) => face.key).join('|')}`;
}

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T;
}
