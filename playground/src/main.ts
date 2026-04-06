import './style.css';

import {
    containsKhmer,
    isKhmerText,
    normalizeKhmer,
    splitClusters,
    countClusters,
    segmentWords,
    createDictionary,
} from 'khmer-segment';
import {
    getDefaultDictionary,
    loadFrequencyDictionary,
} from 'khmer-segment/dictionary';

const inputEl = document.getElementById('khmer-input') as HTMLTextAreaElement;
const dictEl = document.getElementById('dict-input') as HTMLTextAreaElement;
const strategyBtns = document.querySelectorAll(
    '.strategy-btns button:not([disabled])'
);
const normalizeBtns = document.querySelectorAll('.normalize-btns button');
const copyBtn = document.getElementById('copy-json') as HTMLButtonElement;

let normalize = true;
let strategy = 'fmm';

for (const btn of normalizeBtns) {
    btn.addEventListener('click', () => {
        normalize = (btn as HTMLElement).dataset.norm === 'on';
        for (const b of normalizeBtns) b.classList.remove('active');
        btn.classList.add('active');
        update();
    });
}

for (const btn of strategyBtns) {
    btn.addEventListener('click', () => {
        for (const b of strategyBtns) b.classList.remove('active');
        btn.classList.add('active');
        strategy = (btn as HTMLElement).dataset.strategy!;
        update();
    });
}

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
    renderSegmentation(result.tokens);
    renderJson(result);
}

function renderEmpty() {
    document.getElementById('stats-row')!.innerHTML = '';
    document.getElementById('detect-result')!.innerHTML =
        '<div class="empty-state">Type some text to see results...</div>';
    document.getElementById('normalize-section')!.style.display = 'none';
    document.getElementById('cluster-result')!.innerHTML = '';
    document.getElementById('segment-result')!.innerHTML = '';
    document.getElementById('json-output')!.textContent = '';
    document.getElementById('cluster-count')!.textContent = '';
    document.getElementById('token-count')!.textContent = '';
}

function renderStats(
    hasKhmer: boolean,
    isKhmer: boolean,
    clusterCount: number,
    tokenCount: number,
    dictSize: number,
    customWordCount: number
) {
    document.getElementById('stats-row')!.innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${hasKhmer ? 'Yes' : 'No'}</div>
        <div class="stat-label">Contains Khmer</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${isKhmer ? 'Yes' : 'No'}</div>
        <div class="stat-label">Pure Khmer</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${clusterCount}</div>
        <div class="stat-label">Clusters</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${tokenCount}</div>
        <div class="stat-label">Tokens</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${dictSize.toLocaleString()}</div>
        <div class="stat-label">Dict Words</div>
      </div>
      ${
          customWordCount > 0
              ? `
      <div class="stat-card">
        <div class="stat-value">+${customWordCount}</div>
        <div class="stat-label">Custom Words</div>
      </div>`
              : ''
      }
    `;
}

function renderDetection(hasKhmer: boolean, isKhmer: boolean) {
    document.getElementById('detect-result')!.innerHTML = `
      <div class="detect-row">
        <span>containsKhmer: <strong>${hasKhmer}</strong></span>
        <span>isKhmerText: <strong>${isKhmer}</strong></span>
      </div>
    `;
}

function renderNormalization(original: string, normalized: string) {
    const section = document.getElementById('normalize-section')!;
    if (original !== normalized && normalize) {
        section.style.display = '';
        document.getElementById('normalize-result')!.innerHTML = `
        <div class="comparison">
          <span class="before">${escapeHtml(original)}</span>
          <span class="arrow">&rarr;</span>
          <span class="after">${escapeHtml(normalized)}</span>
        </div>
      `;
    } else {
        section.style.display = 'none';
    }
}

function renderClusters(clusters: string[]) {
    document.getElementById('cluster-count')!.textContent =
        `${clusters.length} clusters`;
    const html = clusters
        .map(c => `<span>${escapeHtml(c)}</span>`)
        .join('<span class="cluster-separator">|</span>');
    document.getElementById('cluster-result')!.innerHTML = html;
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
            const cls = t.isKnown ? 'known' : 'unknown';
            return `<span class="token-pill ${cls}">
          ${escapeHtml(t.value)}
          <span class="token-status">${t.isKnown ? 'known' : 'unknown'}</span>
          <span class="token-meta">${t.start}:${t.end}</span>
        </span>`;
        })
        .join('');
    document.getElementById('segment-result')!.innerHTML = html;
}

function renderJson(result: object) {
    const json = JSON.stringify(result, null, 2);
    document.getElementById('json-output')!.textContent = json;
}

update();
