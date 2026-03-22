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
const previewStyleInput = document.getElementById(
  'previewStyle'
) as HTMLSelectElement;
const responsiveInput = document.getElementById(
  'responsive'
) as HTMLSelectElement;
const performanceModeInput = document.getElementById(
  'performanceMode'
) as HTMLSelectElement;
const flipDirectionInput = document.getElementById(
  'flipDirection'
) as HTMLSelectElement;
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
const shellElement = document.querySelector('.demo-shell') as HTMLElement;
const panelElement = document.querySelector('.demo-panel') as HTMLElement;

let board = createBoard();
syncPresetUI();
applyPreviewStyle();

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
    responsive: responsiveInput.value === 'on',
    performanceMode: performanceModeInput.value as 'auto' | 'off' | 'on',
    flipDirection: flipDirectionInput.value as 'forward' | 'shortest',
    staggerMode: staggerModeInput.value as 'simultaneous' | 'row' | 'sequence',
    messages: isCustom ? createMessages() : [],
    pages: isCustom ? [] : pages,
    stagger: Number(staggerInput.value),
    flipDuration: Number(flipDurationInput.value),
    autoplay: autoplayInput.checked,
    pageDuration: Number(pageDurationInput.value),
    shadow: previewStyleInput.value === 'page-light' ? false : true,
    tileShadow:
      previewStyleInput.value === 'page-light'
        ? 'inset 0 1px 0 rgba(255, 255, 255, 0.04), inset 0 -1px 0 rgba(0, 0, 0, 0.14)'
        : true,
    loop: true,
    onComplete: (message, index) => {
      statusHost.textContent = `Completed "${message}" at index ${index}`;
    }
  });
}

function rebuildBoard(): void {
  board.destroy();
  applyPreviewStyle();
  board = createBoard();
  statusHost.textContent = 'Board rebuilt';
}

function syncPresetUI(): void {
  sizeInput.value =
    presetInput.value === 'menu' || presetInput.value === 'kids' || presetInput.value === 'event'
      ? '6x22'
      : sizeInput.value;
}

function applyPreviewStyle(): void {
  const lightMode = previewStyleInput.value === 'page-light';
  shellElement.dataset.previewStyle = previewStyleInput.value;
  panelElement.dataset.previewStyle = previewStyleInput.value;
  boardHost.dataset.previewStyle = previewStyleInput.value;

  if (lightMode) {
    boardHost.style.setProperty('--fb-bg', '#f7f7f5');
    boardHost.style.setProperty('--fb-tile-bg', '#efefed');
    boardHost.style.setProperty('--fb-tile-blank', '#efefed');
    boardHost.style.setProperty('--fb-text', '#171717');
    boardHost.style.setProperty('--fb-line-color', 'rgba(0, 0, 0, 0.12)');
    boardHost.style.setProperty('--fb-gap', '2px');
    boardHost.style.setProperty('--fb-radius', '0px');
    boardHost.style.setProperty('--fb-font-size', 'clamp(18px, 2vw, 28px)');
    boardHost.style.setProperty('--fb-board-shadow', 'none');
    boardHost.style.setProperty(
      '--fb-tile-shadow',
      'inset 0 1px 0 rgba(255, 255, 255, 0.06), inset 0 -1px 0 rgba(0, 0, 0, 0.14)'
    );
    return;
  }

  boardHost.style.setProperty('--fb-bg', '#15130f');
  boardHost.style.setProperty('--fb-tile-bg', '#201c16');
  boardHost.style.removeProperty('--fb-tile-blank');
  boardHost.style.setProperty('--fb-text', '#f6f0df');
  boardHost.style.removeProperty('--fb-line-color');
  boardHost.style.setProperty('--fb-gap', '10px');
  boardHost.style.setProperty('--fb-radius', '10px');
  boardHost.style.setProperty('--fb-font-size', 'clamp(22px, 2.7vw, 34px)');
  boardHost.style.removeProperty('--fb-board-shadow');
  boardHost.style.removeProperty('--fb-tile-shadow');
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

previewStyleInput.addEventListener('change', rebuildBoard);
triggerInput.addEventListener('change', rebuildBoard);
responsiveInput.addEventListener('change', rebuildBoard);
performanceModeInput.addEventListener('change', rebuildBoard);
flipDirectionInput.addEventListener('change', rebuildBoard);
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
