import './app.css';

import {
    containsKhmer,
    isKhmerText,
    normalizeKhmer,
    splitClusters,
    countClusters,
    segmentWords,
    createDictionary,
    getCaretBoundaries,
    compareTyping,
    computeTypingMetrics,
} from 'khmer-segment';
import {
    getDefaultDictionary,
    loadFrequencyDictionary,
} from 'khmer-segment/dictionary';

const THEME_KEY = 'khmer-segment-theme';

function getStoredTheme(): 'light' | 'dark' | null {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'light' || v === 'dark') return v;
    return null;
}

function applyThemeClass(dark: boolean) {
    document.documentElement.classList.toggle('dark', dark);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.setAttribute('aria-pressed', String(dark));
}

function syncThemeUi() {
    applyThemeClass(document.documentElement.classList.contains('dark'));
}

const inputEl = document.getElementById('khmer-input') as HTMLTextAreaElement;
const dictEl = document.getElementById('dict-input') as HTMLTextAreaElement;
const strategyBtns = document.querySelectorAll(
    '.strategy-btns button:not([disabled])'
);
const normalizeBtns = document.querySelectorAll('.normalize-btns button');
const copyBtn = document.getElementById('copy-json') as HTMLButtonElement;

const tabs = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.tablist [role="tab"]')
);
const tabPanels = [
    document.getElementById('tab-panel-summary')!,
    document.getElementById('tab-panel-clusters')!,
    document.getElementById('tab-panel-json')!,
];

let normalize = true;
let strategy = 'viterbi';

function activateTab(index: number) {
    const i = Math.max(0, Math.min(index, tabs.length - 1));
    tabs.forEach((tab, j) => {
        const selected = j === i;
        tab.setAttribute('aria-selected', String(selected));
        tab.setAttribute('data-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
    });
    tabPanels.forEach((panel, j) => {
        panel.hidden = j !== i;
    });
}

tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
        activateTab(index);
        tab.focus();
    });
});

const tablistEl = document.querySelector('.tablist');
tablistEl?.addEventListener('keydown', e => {
    const key = e.key;
    if (
        key !== 'ArrowRight' &&
        key !== 'ArrowLeft' &&
        key !== 'Home' &&
        key !== 'End'
    ) {
        return;
    }
    const current = tabs.findIndex(
        t => t.getAttribute('aria-selected') === 'true'
    );
    if (current < 0) return;
    e.preventDefault();
    let next = current;
    if (key === 'ArrowRight') next = (current + 1) % tabs.length;
    else if (key === 'ArrowLeft')
        next = (current - 1 + tabs.length) % tabs.length;
    else if (key === 'Home') next = 0;
    else if (key === 'End') next = tabs.length - 1;
    activateTab(next);
    tabs[next].focus();
});

for (const btn of normalizeBtns) {
    btn.addEventListener('click', () => {
        normalize = (btn as HTMLElement).dataset.norm === 'on';
        for (const b of normalizeBtns) {
            b.setAttribute('data-active', 'false');
        }
        btn.setAttribute('data-active', 'true');
        update();
    });
}

for (const btn of strategyBtns) {
    btn.addEventListener('click', () => {
        for (const b of strategyBtns) {
            b.setAttribute('data-active', 'false');
        }
        btn.setAttribute('data-active', 'true');
        strategy = (btn as HTMLElement).dataset.strategy!;
        update();
    });
}

document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const nextDark = !document.documentElement.classList.contains('dark');
    localStorage.setItem(THEME_KEY, nextDark ? 'dark' : 'light');
    applyThemeClass(nextDark);
});

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getStoredTheme() !== null) return;
    applyThemeClass(matchMedia('(prefers-color-scheme: dark)').matches);
});

syncThemeUi();

copyBtn.addEventListener('click', () => {
    const jsonText = document.getElementById('json-output')!.textContent;
    navigator.clipboard.writeText(jsonText!).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyBtn.textContent = 'Copy';
        }, 1500);
    });
});

inputEl.addEventListener('input', update);
dictEl.addEventListener('input', update);

function escapeHtml(str: string) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function update() {
    const text = inputEl.value;
    if (!text.trim()) {
        renderEmpty();
        return;
    }

    const builtInDict = getDefaultDictionary();

    const customWords = dictEl.value
        .split('\n')
        .map(w => w.trim())
        .filter(Boolean);

    const freqData = loadFrequencyDictionary();
    const allWords = [...freqData.words, ...customWords];
    const dict = createDictionary(allWords, freqData.frequencies);

    const hasKhmer = containsKhmer(text);
    const isKhmer = isKhmerText(text);
    const normalized = normalizeKhmer(text);
    const clusters = splitClusters(normalize ? normalized : text);
    const clusterCount = countClusters(normalize ? normalized : text);
    const result = segmentWords(text, {
        dictionary: dict,
        normalize,
        strategy,
    });

    renderStats(
        hasKhmer,
        isKhmer,
        clusterCount,
        result.tokens.length,
        builtInDict.size,
        customWords.length
    );
    renderDetection(hasKhmer, isKhmer);
    renderNormalization(text, normalized);
    renderClusters(clusters);
    renderCaretBoundaries(normalize ? normalized : text);
    renderSegmentation(result.tokens);
    renderJson(result);
}

function renderEmpty() {
    activateTab(0);
    document.getElementById('stats-row')!.innerHTML = '';
    document.getElementById('detect-result')!.innerHTML =
        '<div class="py-1 text-sm italic text-neutral-500 dark:text-neutral-400">Type some text to see results…</div>';
    const normalizeSection = document.getElementById('normalize-section')!;
    normalizeSection.hidden = true;
    document.getElementById('normalize-result')!.innerHTML = '';
    document.getElementById('cluster-result')!.innerHTML = '';
    document.getElementById('caret-boundaries')!.innerHTML = '';
    document.getElementById('segment-result')!.innerHTML = '';
    document.getElementById('json-output')!.textContent = '';
    document.getElementById('cluster-count')!.textContent = '';
    document.getElementById('token-count')!.textContent = '';
}

function chip(label: string, value: string) {
    return `<span class="inline-flex items-baseline gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-neutral-500 dark:text-neutral-400"><span class="font-normal">${label}</span><span class="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">${escapeHtml(value)}</span></span>`;
}

function renderStats(
    hasKhmer: boolean,
    isKhmer: boolean,
    clusterCount: number,
    tokenCount: number,
    dictSize: number,
    customWordCount: number
) {
    const parts = [
        chip('Khmer', hasKhmer ? 'Yes' : 'No'),
        chip('Pure', isKhmer ? 'Yes' : 'No'),
        chip('Clusters', String(clusterCount)),
        chip('Tokens', String(tokenCount)),
        chip('Dict', dictSize.toLocaleString()),
    ];
    if (customWordCount > 0) {
        parts.push(chip('Custom', `+${customWordCount}`));
    }
    document.getElementById('stats-row')!.innerHTML = parts.join('');
}

function renderDetection(hasKhmer: boolean, isKhmer: boolean) {
    document.getElementById('detect-result')!.innerHTML = `
      <dl class="flex flex-wrap gap-2 text-sm">
        <div class="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1">
          <dt class="text-neutral-500 dark:text-neutral-400">containsKhmer</dt>
          <dd class="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">${hasKhmer}</dd>
        </div>
        <div class="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1">
          <dt class="text-neutral-500 dark:text-neutral-400">isKhmerText</dt>
          <dd class="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">${isKhmer}</dd>
        </div>
      </dl>
    `;
}

function renderNormalization(original: string, normalized: string) {
    const section = document.getElementById('normalize-section')!;
    if (original !== normalized && normalize) {
        section.hidden = false;
        document.getElementById('normalize-result')!.innerHTML = `
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span class="font-khmer text-sm text-neutral-500 line-through decoration-neutral-400 decoration-2 dark:text-neutral-500 dark:decoration-neutral-500">${escapeHtml(original)}</span>
          <span class="text-neutral-300 dark:text-neutral-600" aria-hidden="true">&rarr;</span>
          <span class="font-khmer text-sm font-semibold text-neutral-900 dark:text-neutral-100">${escapeHtml(normalized)}</span>
        </div>
      `;
    } else {
        section.hidden = true;
        document.getElementById('normalize-result')!.innerHTML = '';
    }
}

function renderClusters(clusters: string[]) {
    document.getElementById('cluster-count')!.textContent =
        `${clusters.length} clusters`;
    const html = clusters
        .map(
            c =>
                `<span class="inline-block rounded-md border border-border bg-neutral-100 px-1.5 py-0.5 font-khmer text-[15px] leading-snug text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100">${escapeHtml(c)}</span>`
        )
        .join(
            '<span class="mx-0.5 select-none text-xs font-medium tracking-wider text-neutral-400 dark:text-neutral-500">|</span>'
        );
    document.getElementById('cluster-result')!.innerHTML = html;
}

function renderCaretBoundaries(text: string) {
    const boundaries = getCaretBoundaries(text);
    const container = document.getElementById('caret-boundaries')!;
    if (boundaries.length <= 2 && text.length <= 1) {
        container.innerHTML =
            '<span class="text-xs text-neutral-400 dark:text-neutral-500">Type more text to see caret boundaries…</span>';
        return;
    }
    const positions = boundaries.map(i => String(i)).join(' ');
    container.innerHTML = `<span class="font-mono text-xs tabular-nums tracking-wider text-neutral-500 dark:text-neutral-400">${escapeHtml(positions)}</span>`;
}

function renderSegmentation(
    tokens: Array<{
        value: string;
        start: number;
        end: number;
        isKnown: boolean;
    }>
) {
    const known = tokens.filter(t => t.isKnown).length;
    const unknown = tokens.length - known;
    document.getElementById('token-count')!.textContent =
        `${tokens.length} tokens (${known} known, ${unknown} unknown)`;

    const html = tokens
        .map(t => {
            const cls = t.isKnown
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                : 'border border-border bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200';
            const metaCls = t.isKnown
                ? 'text-[9px] font-medium uppercase tracking-wide text-white/85 dark:text-neutral-600'
                : 'text-[9px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400';
            const rangeCls = t.isKnown
                ? 'font-sans text-[10px] text-white/50 dark:text-neutral-500'
                : 'font-sans text-[10px] text-neutral-400 dark:text-neutral-500';
            return `<span class="mx-0.5 my-0.5 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-khmer text-[15px] leading-snug transition-colors duration-150 ${cls}">
          ${escapeHtml(t.value)}
          <span class="${metaCls}">${t.isKnown ? 'known' : 'unknown'}</span>
          <span class="${rangeCls} tabular-nums">${t.start}:${t.end}</span>
        </span>`;
        })
        .join('');
    document.getElementById('segment-result')!.innerHTML = html;
}

function renderJson(result: object) {
    const json = JSON.stringify(result, null, 2);
    document.getElementById('json-output')!.textContent = json;
}

// --- Typing game demo (compareTyping + computeTypingMetrics) ---
const TYPING_PROMPT = 'សួស្តីអ្នកទាំងអស់គ្នា';
let typingStartedAt: number | null = null;

const typingPromptEl = document.getElementById('typing-prompt-render')!;
const typingInputEl = document.getElementById(
    'typing-input'
) as HTMLTextAreaElement;
const typingStatsEl = document.getElementById('typing-stats')!;

function renderTypingPromptNeutral() {
    const normalized = normalizeKhmer(TYPING_PROMPT);
    const clusters = splitClusters(normalized);
    const html = clusters
        .map(
            c =>
                `<span class="inline-block rounded px-0.5 text-neutral-800 dark:text-neutral-100">${escapeHtml(c)}</span>`
        )
        .join(
            '<span class="mx-0.5 select-none text-neutral-300 dark:text-neutral-600">|</span>'
        );
    typingPromptEl.innerHTML = html;
}

function renderTypingDemo() {
    const typed = typingInputEl.value;
    if (typed.length > 0 && typingStartedAt === null) {
        typingStartedAt = performance.now();
    }

    if (!typed) {
        typingStartedAt = null;
        renderTypingPromptNeutral();
        typingStatsEl.innerHTML =
            '<span class="text-neutral-500 dark:text-neutral-400">Type to start the timer…</span>';
        return;
    }

    const cmp = compareTyping(TYPING_PROMPT, typed);
    const promptHtml = cmp.unitStates
        .map(u => {
            const cls = u.correct
                ? 'bg-emerald-600/20 text-emerald-950 dark:bg-emerald-500/25 dark:text-emerald-50'
                : 'bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100';
            return `<span class="inline-block rounded px-0.5 font-khmer ${cls}">${escapeHtml(u.value)}</span>`;
        })
        .join(
            '<span class="mx-0.5 select-none text-neutral-300 dark:text-neutral-600">|</span>'
        );
    typingPromptEl.innerHTML = promptHtml;

    const elapsedMs =
        typingStartedAt !== null ? performance.now() - typingStartedAt : 0;
    const metrics = computeTypingMetrics({
        correctCharCount: cmp.correctPrefixLength,
        totalTypedCharCount: cmp.normalizedTyped.length,
        elapsedMs: Math.max(elapsedMs, 1),
    });

    typingStatsEl.innerHTML = [
        `<span class="text-neutral-500 dark:text-neutral-400">complete</span> ${cmp.isComplete}`,
        `<span class="text-neutral-500 dark:text-neutral-400">units</span> ${cmp.correctUnits}/${cmp.totalUnits}`,
        `<span class="text-neutral-500 dark:text-neutral-400">wpm</span> ${metrics.wpm.toFixed(1)}`,
        `<span class="text-neutral-500 dark:text-neutral-400">cpm</span> ${metrics.cpm.toFixed(0)}`,
        `<span class="text-neutral-500 dark:text-neutral-400">accuracy</span> ${metrics.accuracy.toFixed(1)}%`,
    ].join(' &nbsp;·&nbsp; ');
}

document.getElementById('typing-reset')!.addEventListener('click', () => {
    typingInputEl.value = '';
    typingStartedAt = null;
    renderTypingDemo();
});

typingInputEl.addEventListener('input', renderTypingDemo);
renderTypingDemo();

update();
