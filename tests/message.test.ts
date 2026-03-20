import { describe, expect, it } from 'vitest';
import { layoutMessagePages, layoutStructuredPages } from '../src/core/message';

describe('layoutMessagePages', () => {
  it('preserves words and paginates long messages across board pages', () => {
    const pages = layoutMessagePages(
      'WELCOME TO THE HILTON BEAVER CREEK WE APPRECIATE YOUR BUSINESS',
      15,
      3,
      { align: 'center', preserveWords: true }
    );

    expect(pages.length).toBeGreaterThan(1);
    expect(pages[0]?.text).toContain('WELCOME');
    expect(pages[1]?.text).toContain('APPRECIATE');
    expect(pages[0]?.cells).toHaveLength(45);
  });

  it('keeps shorter words intact on each row when possible', () => {
    const pages = layoutMessagePages('TRACK YOUR MEDIA', 15, 3, {
      align: 'center',
      preserveWords: true
    });

    const chars = pages[0]?.cells.map((cell) => cell.char).join('') ?? '';
    expect(chars).toContain('TRACK YOUR');
    expect(chars).toContain('MEDIA');
  });
});

describe('layoutStructuredPages', () => {
  it('supports text rows, decorative cells, and column rows', () => {
    const pages = layoutStructuredPages(
      [
        {
          theme: 'menu',
          rows: [
            {
              text: 'WELCOME TO',
              align: 'center',
              leadingDecor: ['purple', 'blue', 'green'],
              trailingDecor: ['green', 'blue', 'purple']
            },
            {
              kind: 'columns',
              left: 'LATTE',
              right: '5.00/6.00',
              leftTone: 'default',
              rightTone: 'accent'
            },
            { kind: 'spacer' }
          ]
        }
      ],
      18,
      3
    );

    expect(pages).toHaveLength(1);
    expect(pages[0]?.theme).toBe('menu');
    expect(pages[0]?.cells).toHaveLength(54);
    expect(pages[0]?.cells[0]?.tone).toBe('purple');

    const secondRow = pages[0]?.cells
      .slice(18, 36)
      .map((cell) => cell.char)
      .join('');

    expect(secondRow).toContain('LATTE');
    expect(secondRow).toContain('5.00/6.00');
  });
});
