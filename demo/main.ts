import {
  Flipboard,
  type FlipboardPage,
  type FlipboardSize,
  type FlipboardTheme,
  type TriggerMode
} from '../src';
import '../src/styles/flipboard.css';
import './demo.css';

const boardElement = document.getElementById('board');
const statusElement = document.getElementById('demo-status');

if (!boardElement || !statusElement) {
  throw new Error('Demo elements were not found.');
}

const presetInput = document.getElementById('preset') as HTMLSelectElement;
const messagesInput = document.getElementById('messages') as HTMLTextAreaElement;
const sizeInput = document.getElementById('size') as HTMLSelectElement;
const triggerInput = document.getElementById('trigger') as HTMLSelectElement;
const staggerModeInput = document.getElementById(
  'staggerMode'
) as HTMLSelectElement;
const staggerInput = document.getElementById('stagger') as HTMLInputElement;
const flipDurationInput = document.getElementById(
  'flipDuration'
) as HTMLInputElement;
const pageDurationInput = document.getElementById(
  'pageDuration'
) as HTMLInputElement;
const autoplayInput = document.getElementById('autoplay') as HTMLInputElement;

const applyButton = document.getElementById('apply') as HTMLButtonElement;
const playButton = document.getElementById('play') as HTMLButtonElement;
const nextButton = document.getElementById('next') as HTMLButtonElement;
const resetButton = document.getElementById('reset') as HTMLButtonElement;

const boardHost = boardElement as HTMLElement;
const statusHost = statusElement as HTMLElement;

let board = createBoard();
syncPresetUI();

function createMessages(): string[] {
  return messagesInput.value
    .split(/\n\s*\n/g)
    .map((message) => message.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function tones(...tones: Array<
  'default' | 'purple' | 'blue' | 'green' | 'yellow' | 'orange' | 'red'
>) {
  return tones.map((tone) => ({ char: ' ', tone }));
}

function getPresetPages(): FlipboardPage[] {
  switch (presetInput.value) {
    case 'kids':
      return [
        {
          theme: 'playful',
          rows: [
            {
              kind: 'spacer',
              leadingDecor: [
                { char: ' ', tone: 'default' },
                ...tones('purple', 'blue', 'green', 'yellow', 'orange', 'red', 'blue')
              ],
              trailingDecor: [
                ...tones('blue', 'red', 'orange', 'yellow', 'green', 'blue', 'purple'),
                { char: ' ', tone: 'default' }
              ]
            },
            {
              text: 'WELCOME TO',
              align: 'center',
              leadingDecor: [
                { char: ' ', tone: 'default' },
                ...tones('purple', 'blue', 'green', 'yellow', 'orange', 'red'),
                { char: ' ', tone: 'default' }
              ],
              trailingDecor: [
                { char: ' ', tone: 'default' },
                ...tones('red', 'orange', 'yellow', 'green', 'blue', 'purple'),
                { char: ' ', tone: 'default' }
              ]
            },
            {
              text: 'VILLAGE KIDS',
              align: 'center',
              leadingDecor: [
                { char: ' ', tone: 'default' },
                ...tones('blue', 'green', 'yellow', 'orange', 'red'),
                { char: ' ', tone: 'default' }
              ],
              trailingDecor: [
                { char: ' ', tone: 'default' },
                ...tones('red', 'orange', 'yellow', 'green', 'blue'),
                { char: ' ', tone: 'default' }
              ]
            },
            {
              text: 'PEDIATRIC',
              align: 'center',
              leadingDecor: [
                { char: ' ', tone: 'default' },
                ...tones('green', 'yellow', 'orange', 'red', 'blue'),
                { char: ' ', tone: 'default' }
              ],
              trailingDecor: [
                { char: ' ', tone: 'default' },
                ...tones('blue', 'red', 'orange', 'yellow', 'green'),
                { char: ' ', tone: 'default' }
              ]
            },
            {
              text: 'DENTISTRY',
              align: 'center',
              leadingDecor: [
                { char: ' ', tone: 'default' },
                ...tones('blue', 'green', 'yellow', 'orange', 'red', 'blue'),
                { char: ' ', tone: 'default' }
              ],
              trailingDecor: [
                { char: ' ', tone: 'default' },
                ...tones('blue', 'red', 'orange', 'yellow', 'green', 'blue'),
                { char: ' ', tone: 'default' }
              ]
            },
            {
              kind: 'spacer',
              leadingDecor: [
                { char: ' ', tone: 'default' },
                ...tones('purple', 'blue', 'green', 'yellow', 'orange', 'red', 'blue')
              ],
              trailingDecor: [
                ...tones('blue', 'red', 'orange', 'yellow', 'green', 'blue', 'purple'),
                { char: ' ', tone: 'default' }
              ]
            }
          ]
        }
      ];
    case 'event':
      return [
        {
          theme: 'classic',
          rows: [
            { kind: 'spacer' },
            { text: 'OPEN HOUSE TODAY:', align: 'left', offset: 1 },
            { text: 'COCKTAILS SERVED', align: 'left', offset: 1 },
            { text: 'ON ROOFTOP TERRACE', align: 'left', offset: 1 },
            { text: 'AT 6PM', align: 'left', offset: 1 },
            { kind: 'spacer' }
          ]
        }
      ];
    case 'menu':
      return [
        {
          theme: 'menu',
          rows: [
            {
              kind: 'columns',
              left: 'CORTADO',
              right: '4.25',
              leftTone: 'default',
              rightTone: 'accent'
            },
            {
              kind: 'columns',
              left: 'DRIP COFFEE',
              right: '3.00/4.00',
              leftTone: 'default',
              rightTone: 'accent'
            },
            {
              kind: 'columns',
              left: 'LATTE',
              right: '5.00/6.00',
              leftTone: 'default',
              rightTone: 'accent'
            },
            {
              kind: 'columns',
              left: 'ESPRESSO',
              right: '3.50',
              leftTone: 'default',
              rightTone: 'accent'
            },
            {
              kind: 'columns',
              left: 'FLAT WHITE',
              right: '4.75',
              leftTone: 'default',
              rightTone: 'accent'
            },
            {
              kind: 'columns',
              left: 'HOT CHOCOLATE',
              right: '4.50',
              leftTone: 'default',
              rightTone: 'accent'
            }
          ]
        }
      ];
    default:
      return [];
  }
}

function resolveTheme(pages: FlipboardPage[]): FlipboardTheme {
  return pages[0]?.theme ?? 'classic';
}

function createBoard(): Flipboard {
  const pages = getPresetPages();
  const isCustom = presetInput.value === 'custom';

  return new Flipboard(boardHost, {
    size: sizeInput.value as FlipboardSize,
    theme: resolveTheme(pages),
    align: 'center',
    preserveWords: true,
    trigger: triggerInput.value as TriggerMode,
    staggerMode: staggerModeInput.value as 'simultaneous' | 'row' | 'sequence',
    messages: isCustom ? createMessages() : [],
    pages: isCustom ? [] : pages,
    stagger: Number(staggerInput.value),
    flipDuration: Number(flipDurationInput.value),
    autoplay: autoplayInput.checked,
    pageDuration: Number(pageDurationInput.value),
    loop: true,
    onComplete: (message, index) => {
      statusHost.textContent = `Completed "${message}" at index ${index}`;
    }
  });
}

function rebuildBoard(): void {
  board.destroy();
  board = createBoard();
  statusHost.textContent = 'Board rebuilt';
}

function syncPresetUI(): void {
  sizeInput.value =
    presetInput.value === 'menu' || presetInput.value === 'kids' || presetInput.value === 'event'
      ? '6x22'
      : sizeInput.value;
}

applyButton.addEventListener('click', () => {
  if (presetInput.value === 'custom') {
    board.setMessages(createMessages());
    statusHost.textContent = 'Messages updated';
    return;
  }

  board.setPages(getPresetPages());
  statusHost.textContent = 'Preset layout updated';
});

playButton.addEventListener('click', () => {
  board.play();
  statusHost.textContent = 'Playing current page';
});

nextButton.addEventListener('click', () => {
  board.next();
  statusHost.textContent = 'Advancing to next page';
});

resetButton.addEventListener('click', () => {
  board.reset();
  statusHost.textContent = 'Board reset';
});

presetInput.addEventListener('change', () => {
  syncPresetUI();
  rebuildBoard();
});

triggerInput.addEventListener('change', rebuildBoard);
sizeInput.addEventListener('change', rebuildBoard);
staggerModeInput.addEventListener('change', rebuildBoard);
staggerInput.addEventListener('input', rebuildBoard);
flipDurationInput.addEventListener('input', rebuildBoard);
pageDurationInput.addEventListener('input', rebuildBoard);
autoplayInput.addEventListener('change', rebuildBoard);

messagesInput.addEventListener('input', () => {
  if (presetInput.value !== 'custom') {
    presetInput.value = 'custom';
    syncPresetUI();
    rebuildBoard();
    statusHost.textContent = 'Switched to custom playlist';
    return;
  }

  board.setMessages(createMessages());
});
