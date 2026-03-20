# @c-hinck10/splitflap-js

A lightweight split-flap display for the web.

It is built as a framework-agnostic DOM core with a tiny React wrapper, so the package stays embeddable and easy to extend to more frameworks later.

## Features

- Fixed-grid split-flap board
- Word-aware row layout that avoids splitting words when possible
- Long-message pagination into multiple board pages
- Advanced `pages` API for row offsets, columns, decorators, and tones
- Face-wheel model for authentic flap progression with optional custom ordering
- DOM-driven animation core
- `load`, `visible`, and `manual` trigger modes
- Optional autoplay page rotation
- Imperative controls like `setMessage()`, `play()`, `next()`, and `reset()`
- Themeable via CSS variables
- React wrapper that mounts the core without managing per-tile React state

## Install

```bash
npm install @c-hinck10/splitflap-js
```

## Local Demo

```bash
npm install
npm run dev
```

That opens a small playground from `demo/` so you can tune timing, trigger behavior, and message changes against the real DOM animation.

## Vanilla Usage

```ts
import { Flipboard } from '@c-hinck10/splitflap-js';
import '@c-hinck10/splitflap-js/styles.css';

const board = new Flipboard(document.getElementById('board')!, {
  size: '3x15',
  align: 'center',
  preserveWords: true,
  trigger: 'visible',
  autoplay: true,
  pageDuration: 3500,
  staggerMode: 'simultaneous',
  messages: [
    'WELCOME TO THE HILTON BEAVER CREEK, WE APPRECIATE YOUR BUSINESS, CHECK THE FRONT DESK FOR EVENTS'
  ],
  stagger: 35,
  flipDuration: 120
});

board.play();
```

## React Usage

```tsx
import { Flipboard } from '@c-hinck10/splitflap-js/react';
import '@c-hinck10/splitflap-js/styles.css';

export function HeroBoard() {
  return (
    <Flipboard
      size="6x22"
      align="center"
      autoplay
      pageDuration={4000}
      trigger="visible"
      messages={[
        'WELCOME TO THE HILTON BEAVER CREEK, WE APPRECIATE YOUR BUSINESS, CHECK THE FRONT DESK FOR EVENTS'
      ]}
    />
  );
}
```

## Core API

```ts
type TriggerMode = 'load' | 'visible' | 'manual';

type FlipboardOptions = {
  size?: '3x15' | '6x22';
  rows?: number;
  cols?: number;
  align?: 'left' | 'center' | 'right';
  preserveWords?: boolean;
  tone?: 'default' | 'muted' | 'accent' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';
  theme?: 'classic' | 'menu' | 'playful';
  trigger?: TriggerMode;
  stagger?: number;
  staggerMode?: 'simultaneous' | 'row' | 'sequence';
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
  onComplete?: (message: string, index: number) => void;
};

class Flipboard {
  constructor(container: HTMLElement, options?: FlipboardOptions);

  setMessage(message: string): void;
  setMessages(messages: string[]): void;
  play(index?: number): void;
  next(): void;
  reset(): void;
  destroy(): void;
}
```

`preserveWords` is enabled by default, so messages are wrapped per row when possible instead of being sliced through the middle of a word. For classic board composition, `align: 'center'` is also the default.

`paginate` is also enabled by default, so one long message can automatically become multiple board pages. Pair that with `autoplay: true` and `pageDuration` to rotate through those pages on a timer.

`shadow` controls the outer board drop shadow:

- `true` keeps the package default
- `false` disables it
- a CSS `box-shadow` string overrides it, for example `0 12px 24px rgba(0, 0, 0, 0.18)`

`tileShadow` controls the per-tile shadow:

- `true` keeps the package default
- `false` disables it
- a CSS `box-shadow` string overrides it

If you want to override the shadow from your own page CSS, set `--fb-board-shadow` on the board container or a parent wrapper:

```css
.hero-board-wrap {
  --fb-board-shadow: 0 0 0 rgba(0, 0, 0, 0);
  --fb-tile-shadow: none;
}
```

For flatter or more custom boards, you can also override the packaged gloss and fill layers directly:

```css
.hero-board-wrap {
  --fb-board-background: #f7f7f5;
  --fb-board-inset-shadow: none;
  --fb-tile-background: var(--fb-tile-bg);
  --fb-tile-inset-shadow: none;
  --fb-tile-shadow: none;
  --fb-flap-background: var(--fb-tile-background);
}
```

## Face Wheel

The simple API still works with `charset`, but the animation model now treats a flap face as a full visual state, not just a character.

That means a face can include:

- `char`
- `tone`
- optional `id`
- optional `label`

For most boards, you can keep using `charset` and let the package build a default face wheel for you. That default wheel preserves normal character flips and includes blank-tone decor faces for colored spacer rows.

If you want explicit control over flap ordering, pass `faces`:

```ts
import { Flipboard, createDefaultFaces } from '@c-hinck10/splitflap-js';

const faces = [
  ...createDefaultFaces(' ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
  { id: 'rainbow-start', char: '*', tone: 'accent' },
  { id: 'purple-blank', char: ' ', tone: 'purple' }
];

const board = new Flipboard(container, {
  size: '6x22',
  faces,
  pages: [
    {
      rows: [
        {
          kind: 'spacer',
          leadingDecor: [{ char: ' ', tone: 'purple' }]
        }
      ]
    }
  ]
});
```

Order in `faces` defines rotation order. That gives you a path to authentic boards where decorative symbols, letters, blanks, and tone variants all exist as real flap faces.

## Size Presets

Two board presets are built in:

- `3x15`
- `6x22`

You can use `size` directly, or still pass custom `rows` and `cols` when you want a non-preset board.

## Advanced Pages

For signage-style compositions, use `pages` instead of plain `messages`.

```ts
const pages = [
  {
    theme: 'playful',
    rows: [
      {
        kind: 'spacer',
        leadingDecor: ['purple', 'blue', 'green', 'yellow', 'orange', 'red'],
        trailingDecor: ['red', 'orange', 'yellow', 'green', 'blue', 'purple']
      },
      {
        text: 'WELCOME TO',
        align: 'center',
        leadingDecor: ['purple', 'blue', 'green', 'yellow'],
        trailingDecor: ['yellow', 'green', 'blue', 'purple']
      },
      {
        kind: 'columns',
        left: 'LATTE',
        right: '5.00/6.00',
        leftTone: 'default',
        rightTone: 'accent'
      }
    ]
  }
];

const board = new Flipboard(container, {
  size: '6x22',
  pages,
  autoplay: true,
  pageDuration: 4000
});
```

That advanced layer is what supports:

- row offsets
- left/center/right alignment
- decorative edge tiles
- menu-style left/right columns
- theme presets and per-cell color tones

## Styling

Import `@c-hinck10/splitflap-js/styles.css`, then override the board variables on the container or a parent element:

```css
.hero-board {
  --fb-bg: #101010;
  --fb-tile-bg: #191919;
  --fb-text: #f5f2e8;
  --fb-gap: 8px;
  --fb-radius: 8px;
  --fb-font-size: 28px;
  --fb-font-weight: 500;
  --fb-letter-spacing: 0.03em;
  --fb-tile-aspect: 1 / 1;
  --fb-board-shadow: 0 12px 24px rgba(0, 0, 0, 0.18);
  --fb-board-inset-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  --fb-tile-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  --fb-tile-inset-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), inset 0 -1px 0 rgba(0, 0, 0, 0.18);
  --fb-board-background: #111;
  --fb-tile-background: var(--fb-tile-bg);
  --fb-flap-background: var(--fb-tile-background);
}
```

Useful visual-tuning variables:

- `--fb-font-family`
- `--fb-font-size`
- `--fb-font-weight`
- `--fb-letter-spacing`
- `--fb-tile-aspect`
- `--fb-radius`
- `--fb-gap`
- `--fb-board-inset-shadow`
- `--fb-board-shadow`
- `--fb-tile-shadow`
- `--fb-tile-inset-shadow`
- `--fb-board-background`
- `--fb-tile-background`
- `--fb-flap-background`
