import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Flipboard } from '../src/core/Flipboard';
import { Tile } from '../src/core/Tile';

describe('Flipboard', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('uses simultaneous flip starts by default', async () => {
    const container = document.createElement('div');
    document.body.append(container);

    const animateSpy = vi
      .spyOn(Tile.prototype, 'animateTo')
      .mockResolvedValue(undefined);

    const board = new Flipboard(container, {
      rows: 2,
      cols: 4,
      trigger: 'manual',
      messages: ['']
    });

    board.setMessage('TEST');
    await Promise.resolve();

    const delays = animateSpy.mock.calls.map((call) => call[2]);
    expect(delays.every((delay) => delay === 0)).toBe(true);

    animateSpy.mockRestore();
    board.destroy();
  });

  it('supports row stagger mode when requested', async () => {
    const container = document.createElement('div');
    document.body.append(container);

    const animateSpy = vi
      .spyOn(Tile.prototype, 'animateTo')
      .mockResolvedValue(undefined);

    const board = new Flipboard(container, {
      rows: 2,
      cols: 3,
      trigger: 'manual',
      staggerMode: 'row',
      stagger: 50,
      messages: ['']
    });

    board.setMessage('ABC DEF');
    await Promise.resolve();

    const delays = animateSpy.mock.calls.map((call) => call[2]);
    expect(delays.slice(0, 3)).toEqual([0, 0, 0]);
    expect(delays.slice(3, 6)).toEqual([50, 50, 50]);

    animateSpy.mockRestore();
    board.destroy();
  });

  it('applies page themes to the board element', async () => {
    const container = document.createElement('div');
    document.body.append(container);

    const board = new Flipboard(container, {
      rows: 3,
      cols: 15,
      trigger: 'manual',
      pages: [
        {
          theme: 'playful',
          rows: [{ text: 'WELCOME', align: 'center' }]
        }
      ]
    });

    board.play();
    await Promise.resolve();

    const renderedBoard = container.querySelector('.fb-board');
    expect(renderedBoard?.getAttribute('data-theme')).toBe('playful');
    expect(renderedBoard?.getAttribute('aria-label')).toBe('WELCOME');

    board.destroy();
  });

  it('animates the first play call after prerendering a structured page', async () => {
    const container = document.createElement('div');
    document.body.append(container);

    const animateSpy = vi
      .spyOn(Tile.prototype, 'animateTo')
      .mockResolvedValue(undefined);

    const board = new Flipboard(container, {
      rows: 3,
      cols: 15,
      trigger: 'manual',
      pages: [
        {
          theme: 'playful',
          rows: [{ text: 'WELCOME', align: 'center' }]
        }
      ]
    });

    animateSpy.mockClear();
    board.play();
    await Promise.resolve();

    expect(animateSpy).toHaveBeenCalled();

    animateSpy.mockRestore();
    board.destroy();
  });

  it('starts from blank tiles before the first play for structured pages', () => {
    const container = document.createElement('div');
    document.body.append(container);

    const board = new Flipboard(container, {
      rows: 3,
      cols: 15,
      trigger: 'manual',
      pages: [
        {
          theme: 'playful',
          rows: [{ text: 'WELCOME', align: 'center' }]
        }
      ]
    });

    const tileText = Array.from(container.querySelectorAll('.fb-glyph'))
      .map((glyph) => glyph.textContent)
      .join('');

    expect(tileText.trim()).toBe('');

    board.destroy();
  });

  it('keeps the default charset when charset is explicitly undefined', () => {
    const container = document.createElement('div');
    document.body.append(container);

    expect(() => {
      const board = new Flipboard(container, {
        rows: 2,
        cols: 4,
        trigger: 'manual',
        charset: undefined,
        messages: ['TEST']
      });

      board.destroy();
    }).not.toThrow();
  });

  it('animates decorative tiles when only the tone changes', async () => {
    vi.useFakeTimers();

    const container = document.createElement('div');
    document.body.append(container);

    const board = new Flipboard(container, {
      rows: 1,
      cols: 4,
      trigger: 'manual',
      pages: [
        {
          theme: 'playful',
          rows: [
            {
              kind: 'spacer',
              leadingDecor: ['purple', 'blue'],
              trailingDecor: ['blue', 'purple']
            }
          ]
        }
      ]
    });

    board.play();
    await vi.runAllTimersAsync();

    const tones = Array.from(container.querySelectorAll('.fb-tile')).map((tile) =>
      tile.getAttribute('data-tone')
    );

    expect(tones).toEqual(['purple', 'blue', 'blue', 'purple']);

    board.destroy();
  });

  it('animates on first visibility for structured pages', async () => {
    const container = document.createElement('div');
    document.body.append(container);

    const observe = vi.fn();
    const disconnect = vi.fn();
    const animateSpy = vi.spyOn(Tile.prototype, 'animateTo');

    class MockIntersectionObserver {
      constructor(
        private readonly callback: IntersectionObserverCallback
      ) {}

      observe = observe.mockImplementation((element: Element) => {
        this.callback(
          [{ isIntersecting: true, target: element } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver
        );
      });

      disconnect = disconnect;
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

    const board = new Flipboard(container, {
      rows: 3,
      cols: 22,
      trigger: 'visible',
      pages: [
        {
          theme: 'playful',
          rows: [
            {
              kind: 'spacer',
              leadingDecor: ['purple', 'blue', 'green', 'yellow'],
              trailingDecor: ['yellow', 'green', 'blue', 'purple']
            },
            { text: 'WELCOME', align: 'center' },
            {
              kind: 'spacer',
              leadingDecor: ['purple', 'blue', 'green', 'yellow'],
              trailingDecor: ['yellow', 'green', 'blue', 'purple']
            }
          ]
        }
      ]
    });

    await Promise.resolve();

    expect(observe).toHaveBeenCalled();
    expect(animateSpy).toHaveBeenCalled();
    expect(
      animateSpy.mock.calls.some(
        ([cell]) => cell.char === ' ' && cell.tone && cell.tone !== 'default'
      )
    ).toBe(true);

    board.destroy();
    animateSpy.mockRestore();
  });

  it('applies tone changes at flip time for blank decor tiles', async () => {
    vi.useFakeTimers();

    const tile = new Tile(' ');
    tile.setImmediate({ char: ' ', tone: 'default' });

    const animation = tile.animateTo(
      { char: ' ', tone: 'purple' },
      [' '],
      0,
      100
    );

    expect(tile.element.getAttribute('data-tone')).toBe('default');

    await vi.advanceTimersByTimeAsync(50);
    expect(tile.element.getAttribute('data-tone')).toBe('purple');

    await vi.advanceTimersByTimeAsync(100);
    await animation;
  });

  it('allows the board drop shadow to be disabled', () => {
    const container = document.createElement('div');
    document.body.append(container);

    const board = new Flipboard(container, {
      rows: 1,
      cols: 1,
      trigger: 'manual',
      shadow: false
    });

    const renderedBoard = container.querySelector('.fb-board') as HTMLDivElement;
    expect(renderedBoard.style.getPropertyValue('--fb-board-shadow')).toBe(
      '0 0 0 rgba(0, 0, 0, 0)'
    );

    board.destroy();
  });

  it('allows the board drop shadow to be customized', () => {
    const container = document.createElement('div');
    document.body.append(container);

    const board = new Flipboard(container, {
      rows: 1,
      cols: 1,
      trigger: 'manual',
      shadow: '0 12px 24px rgba(0, 0, 0, 0.18)'
    });

    const renderedBoard = container.querySelector('.fb-board') as HTMLDivElement;
    expect(renderedBoard.style.getPropertyValue('--fb-board-shadow')).toBe(
      '0 12px 24px rgba(0, 0, 0, 0.18)'
    );

    board.destroy();
  });

  it('allows the tile shadow to be disabled', () => {
    const container = document.createElement('div');
    document.body.append(container);

    const board = new Flipboard(container, {
      rows: 1,
      cols: 1,
      trigger: 'manual',
      tileShadow: false
    });

    const renderedBoard = container.querySelector('.fb-board') as HTMLDivElement;
    expect(renderedBoard.style.getPropertyValue('--fb-tile-shadow')).toBe('none');

    board.destroy();
  });

  it('allows the tile shadow to be customized', () => {
    const container = document.createElement('div');
    document.body.append(container);

    const board = new Flipboard(container, {
      rows: 1,
      cols: 1,
      trigger: 'manual',
      tileShadow:
        'inset 0 1px 0 rgba(255, 255, 255, 0.04), inset 0 -1px 0 rgba(0, 0, 0, 0.18)'
    });

    const renderedBoard = container.querySelector('.fb-board') as HTMLDivElement;
    expect(renderedBoard.style.getPropertyValue('--fb-tile-shadow')).toBe(
      'inset 0 1px 0 rgba(255, 255, 255, 0.04), inset 0 -1px 0 rgba(0, 0, 0, 0.18)'
    );

    board.destroy();
  });

  it('continues from the last visible page state instead of resetting between pages', async () => {
    vi.useFakeTimers();

    const container = document.createElement('div');
    document.body.append(container);

    const setImmediateSpy = vi.spyOn(Tile.prototype, 'setImmediate');

    const board = new Flipboard(container, {
      rows: 1,
      cols: 1,
      trigger: 'manual',
      autoplay: false,
      faces: [
        { char: ' ', tone: 'default' },
        { char: 'A', tone: 'default' },
        { char: 'B', tone: 'default' }
      ],
      pages: [
        {
          rows: [{ text: 'A' }]
        },
        {
          rows: [{ text: 'B' }]
        }
      ]
    });

    // Initial blank render is allowed during construction.
    setImmediateSpy.mockClear();

    board.play(0);
    await vi.runAllTimersAsync();

    expect(container.querySelector('.fb-glyph')?.textContent).toBe('A');
    expect(setImmediateSpy).not.toHaveBeenCalled();

    board.next();
    await vi.runAllTimersAsync();

    expect(container.querySelector('.fb-glyph')?.textContent).toBe('B');
    expect(setImmediateSpy).not.toHaveBeenCalled();

    setImmediateSpy.mockRestore();
    board.destroy();
  });
});
