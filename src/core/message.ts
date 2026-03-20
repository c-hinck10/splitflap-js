export type MessageAlign = 'left' | 'center' | 'right';
export type CellTone =
  | 'default'
  | 'muted'
  | 'accent'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple';
export type FlipboardTheme = 'classic' | 'menu' | 'playful';

export type FlipboardCell = {
  char?: string;
  tone?: CellTone;
};

export type FlipboardFace = {
  id?: string;
  char?: string;
  tone?: CellTone;
  label?: string;
};

export type FlipboardDecor =
  | string
  | CellTone[]
  | FlipboardCell[]
  | {
      cells: FlipboardCell[];
    };

export type MessageLayoutOptions = {
  align?: MessageAlign;
  preserveWords?: boolean;
  tone?: CellTone;
};

export type FlipboardTextRow = {
  kind?: 'text';
  text: string;
  align?: MessageAlign;
  offset?: number;
  insetLeft?: number;
  insetRight?: number;
  maxWidth?: number;
  tone?: CellTone;
  leadingDecor?: FlipboardDecor;
  trailingDecor?: FlipboardDecor;
};

export type FlipboardColumnsRow = {
  kind: 'columns';
  left: string;
  right: string;
  gapMin?: number;
  offset?: number;
  insetLeft?: number;
  insetRight?: number;
  leadingDecor?: FlipboardDecor;
  trailingDecor?: FlipboardDecor;
  leftTone?: CellTone;
  rightTone?: CellTone;
};

export type FlipboardSpacerRow = {
  kind: 'spacer';
  leadingDecor?: FlipboardDecor;
  trailingDecor?: FlipboardDecor;
};

export type FlipboardRow =
  | FlipboardTextRow
  | FlipboardColumnsRow
  | FlipboardSpacerRow;

export type FlipboardPage = {
  label?: string;
  theme?: FlipboardTheme;
  rows: FlipboardRow[];
};

export type MessagePage = {
  cells: FlipboardCell[];
  text: string;
  theme?: FlipboardTheme;
  label?: string;
};

const DEFAULT_LAYOUT_OPTIONS: Required<MessageLayoutOptions> = {
  align: 'center',
  preserveWords: true,
  tone: 'default'
};

export function normalizeMessage(
  message: string,
  cols: number,
  rows: number,
  options: MessageLayoutOptions = {}
): FlipboardCell[] {
  return (
    layoutMessagePages(message, cols, rows, options)[0]?.cells ??
    Array.from({ length: cols * rows }, () => emptyCell())
  );
}

export function layoutMessagePages(
  message: string,
  cols: number,
  rows: number,
  options: MessageLayoutOptions = {}
): MessagePage[] {
  const resolved = { ...DEFAULT_LAYOUT_OPTIONS, ...options };
  const lines = resolved.preserveWords
    ? wrapMessage(cleanText(message), cols)
    : chunkMessage(cleanText(message), cols);

  if (lines.length === 0) {
    return [createSimplePage([], cols, rows, resolved.align, resolved.tone)];
  }

  const pages: MessagePage[] = [];

  for (let index = 0; index < lines.length; index += rows) {
    const pageLines = lines.slice(index, index + rows);
    pages.push(
      createSimplePage(pageLines, cols, rows, resolved.align, resolved.tone)
    );
  }

  return pages;
}

export function layoutStructuredPages(
  pages: FlipboardPage[],
  cols: number,
  rows: number
): MessagePage[] {
  const resolvedPages = pages.length > 0 ? pages : [{ rows: [] }];

  return resolvedPages.map((page) => {
    const cells = Array.from({ length: cols * rows }, () => emptyCell());
    const rowTexts: string[] = [];

    for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
      const row = page.rows[rowIndex];

      if (!row) {
        continue;
      }

      const rowCells = layoutRow(row, cols);

      for (let colIndex = 0; colIndex < cols; colIndex += 1) {
        cells[rowIndex * cols + colIndex] = rowCells[colIndex] ?? emptyCell();
      }

      const readable = extractReadableRow(row);
      if (readable) {
        rowTexts.push(readable);
      }
    }

    return {
      cells,
      text: page.label ?? rowTexts.join(' ').replace(/\s+/g, ' ').trim(),
      theme: page.theme,
      label: page.label
    };
  });
}

function createSimplePage(
  lines: string[],
  cols: number,
  rows: number,
  align: MessageAlign,
  tone: CellTone
): MessagePage {
  const paddedLines = Array.from({ length: rows }, (_, index) =>
    alignLine(lines[index] ?? '', cols, align)
  );

  return {
    cells: paddedLines.join('').slice(0, cols * rows).split('').map((char) => ({
      char,
      tone
    })),
    text: lines.join(' ').replace(/\s+/g, ' ').trim()
  };
}

function layoutRow(row: FlipboardRow, cols: number): FlipboardCell[] {
  const cells = Array.from({ length: cols }, () => emptyCell());
  const leading = decorToCells(row.leadingDecor);
  const trailing = decorToCells(row.trailingDecor);

  placeDecor(cells, leading, 0);
  placeDecor(cells, trailing, cols - trailing.length);

  const insetLeft = 'insetLeft' in row ? row.insetLeft ?? 0 : 0;
  const insetRight = 'insetRight' in row ? row.insetRight ?? 0 : 0;
  const contentStart = Math.min(cols, leading.length + insetLeft);
  const contentEnd = Math.max(contentStart, cols - trailing.length - insetRight);
  const contentWidth = Math.max(0, contentEnd - contentStart);

  if (row.kind === 'spacer' || contentWidth === 0) {
    return cells;
  }

  if (row.kind === 'columns') {
    placeColumnsRow(cells, row, contentStart, contentWidth);
    return cells;
  }

  placeTextRow(cells, row, contentStart, contentWidth);
  return cells;
}

function placeTextRow(
  cells: FlipboardCell[],
  row: FlipboardTextRow,
  contentStart: number,
  contentWidth: number
): void {
  const text = cleanText(row.text);
  const tone = row.tone ?? 'default';
  const maxWidth = row.maxWidth ? Math.min(row.maxWidth, contentWidth) : contentWidth;
  const clipped = text.slice(0, Math.max(0, maxWidth));
  const align = row.align ?? 'center';
  const offset = row.offset ?? 0;
  const start = computeAlignedStart(clipped.length, contentStart, maxWidth, align, offset);

  placeCells(cells, start, textToCells(clipped, tone));
}

function placeColumnsRow(
  cells: FlipboardCell[],
  row: FlipboardColumnsRow,
  contentStart: number,
  contentWidth: number
): void {
  const left = cleanText(row.left);
  const right = cleanText(row.right);
  const gapMin = row.gapMin ?? 2;
  const offset = row.offset ?? 0;

  let leftText = left;
  let rightText = right;

  if (leftText.length + rightText.length + gapMin > contentWidth) {
    const availableForLeft = Math.max(0, contentWidth - rightText.length - gapMin);
    leftText = leftText.slice(0, availableForLeft);
  }

  if (leftText.length + rightText.length + gapMin > contentWidth) {
    const availableForRight = Math.max(0, contentWidth - leftText.length - gapMin);
    rightText = rightText.slice(Math.max(0, rightText.length - availableForRight));
  }

  const leftCells = textToCells(leftText, row.leftTone ?? 'default');
  const rightCells = textToCells(rightText, row.rightTone ?? 'default');
  const baseStart = clamp(
    contentStart + offset,
    contentStart,
    contentStart + contentWidth - (leftCells.length + rightCells.length + gapMin)
  );
  const rightStart = contentStart + contentWidth - rightCells.length;

  placeCells(cells, baseStart, leftCells);
  placeCells(cells, rightStart, rightCells);
}

function placeDecor(
  cells: FlipboardCell[],
  decor: FlipboardCell[],
  start: number
): void {
  placeCells(cells, start, decor);
}

function placeCells(
  target: FlipboardCell[],
  start: number,
  cells: FlipboardCell[]
): void {
  for (let index = 0; index < cells.length; index += 1) {
    const position = start + index;

    if (position < 0 || position >= target.length) {
      continue;
    }

    target[position] = normalizeCell(cells[index]);
  }
}

function decorToCells(decor?: FlipboardDecor): FlipboardCell[] {
  if (!decor) {
    return [];
  }

  if (typeof decor === 'string') {
    return decor.split('').map((char) => ({ char, tone: 'accent' }));
  }

  if (Array.isArray(decor)) {
    return decor.map((entry) =>
      typeof entry === 'string' ? { char: ' ', tone: entry } : normalizeCell(entry)
    );
  }

  return decor.cells.map(normalizeCell);
}

function textToCells(text: string, tone: CellTone): FlipboardCell[] {
  return text.split('').map((char) => ({ char, tone }));
}

function extractReadableRow(row: FlipboardRow): string {
  if (row.kind === 'columns') {
    return `${row.left} ${row.right}`.replace(/\s+/g, ' ').trim();
  }

  if (row.kind === 'spacer') {
    return '';
  }

  return row.text;
}

function computeAlignedStart(
  textLength: number,
  contentStart: number,
  contentWidth: number,
  align: MessageAlign,
  offset: number
): number {
  const maxStart = contentStart + Math.max(0, contentWidth - textLength);

  if (align === 'left') {
    return clamp(contentStart + offset, contentStart, maxStart);
  }

  if (align === 'right') {
    return clamp(maxStart + offset, contentStart, maxStart);
  }

  const centered = contentStart + Math.floor((contentWidth - textLength) / 2);
  return clamp(centered + offset, contentStart, maxStart);
}

function alignLine(line: string, cols: number, align: MessageAlign): string {
  const trimmed = line.slice(0, cols);
  const spare = Math.max(0, cols - trimmed.length);

  if (align === 'left') {
    return trimmed.padEnd(cols, ' ');
  }

  if (align === 'right') {
    return trimmed.padStart(cols, ' ');
  }

  const leftPad = Math.floor(spare / 2);
  const rightPad = spare - leftPad;
  return `${' '.repeat(leftPad)}${trimmed}${' '.repeat(rightPad)}`;
}

function wrapMessage(message: string, cols: number): string[] {
  if (!message) {
    return [];
  }

  const words = message.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (!word) {
      continue;
    }

    if (word.length > cols) {
      if (current) {
        lines.push(current);
        current = '';
      }

      lines.push(...splitLongWord(word, cols));
      continue;
    }

    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length <= cols) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function chunkMessage(message: string, cols: number): string[] {
  if (!message) {
    return [];
  }

  const lines: string[] = [];

  for (let index = 0; index < message.length; index += cols) {
    lines.push(message.slice(index, index + cols).trimEnd());
  }

  return lines;
}

function splitLongWord(word: string, cols: number): string[] {
  const segments: string[] = [];

  for (let index = 0; index < word.length; index += cols) {
    segments.push(word.slice(index, index + cols));
  }

  return segments;
}

function cleanText(message: string): string {
  return message.toUpperCase().replace(/\s+/g, ' ').trim();
}

function normalizeCell(cell?: FlipboardCell): FlipboardCell {
  return {
    char: cell?.char?.slice(0, 1) ?? ' ',
    tone: cell?.tone ?? 'default'
  };
}

function emptyCell(): FlipboardCell {
  return {
    char: ' ',
    tone: 'default'
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
