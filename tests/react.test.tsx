import React, { act, createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { Tile } from '../src/core/Tile';
import {
  Flipboard,
  type FlipboardHandle
} from '../src/react/FlipboardReact';

describe('React Flipboard wrapper', () => {
  it('exposes imperative methods and renders structured pages', async () => {
    const container = document.createElement('div');
    document.body.append(container);

    const ref = createRef<FlipboardHandle>();
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <Flipboard
          ref={ref}
          rows={3}
          cols={15}
          trigger="manual"
          pages={[
            {
              theme: 'playful',
              rows: [{ text: 'WELCOME', align: 'center' }]
            }
          ]}
        />
      );
    });

    expect(ref.current).not.toBeNull();

    await act(async () => {
      ref.current?.play();
    });

    const board = container.querySelector('.fb-board');
    expect(board?.getAttribute('data-theme')).toBe('playful');
    expect(board?.getAttribute('aria-label')).toBe('WELCOME');

    await act(async () => {
      root.unmount();
    });
  });

  it('passes staggerMode through to the core board', async () => {
    const container = document.createElement('div');
    document.body.append(container);

    const animateSpy = vi
      .spyOn(Tile.prototype, 'animateTo')
      .mockResolvedValue(undefined);

    const root = createRoot(container);
    const ref = createRef<FlipboardHandle>();

    await act(async () => {
      root.render(
        <Flipboard
          ref={ref}
          rows={2}
          cols={3}
          trigger="manual"
          stagger={40}
          staggerMode="row"
          messages={['ABC DEF']}
        />
      );
    });

    animateSpy.mockClear();

    await act(async () => {
      ref.current?.play();
    });

    const delays = animateSpy.mock.calls.map((call) => call[2]);
    expect(delays.slice(0, 3)).toEqual([0, 0, 0]);
    expect(delays.slice(3, 6)).toEqual([40, 40, 40]);

    animateSpy.mockRestore();

    await act(async () => {
      root.unmount();
    });
  });

  it('passes flipDirection through to the core board', async () => {
    const container = document.createElement('div');
    document.body.append(container);

    const animateSpy = vi
      .spyOn(Tile.prototype, 'animateTo')
      .mockResolvedValue(undefined);

    const root = createRoot(container);
    const ref = createRef<FlipboardHandle>();

    await act(async () => {
      root.render(
        <Flipboard
          ref={ref}
          rows={1}
          cols={1}
          trigger="manual"
          flipDirection="shortest"
          faces={[
            { char: 'A', tone: 'default' },
            { char: 'B', tone: 'default' },
            { char: 'C', tone: 'default' },
            { char: 'D', tone: 'default' }
          ]}
          pages={[{ rows: [{ text: 'D' }] }]}
        />
      );
    });

    animateSpy.mockClear();

    await act(async () => {
      ref.current?.play();
    });

    expect(animateSpy.mock.calls[0]?.[4]).toBe('shortest');

    animateSpy.mockRestore();

    await act(async () => {
      root.unmount();
    });
  });
});
