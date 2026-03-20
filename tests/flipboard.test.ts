import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Flipboard } from '../src/core/Flipboard';
import { Tile } from '../src/core/Tile';

describe('Flipboard', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
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
});
