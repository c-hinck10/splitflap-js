import React, { act, createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { createRoot } from 'react-dom/client';
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
});
