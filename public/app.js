const form = document.getElementById('search-form');
const input = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const statusEl = document.getElementById('status');
const summaryEl = document.getElementById('summary');
const storeStatusEl = document.getElementById('store-status');
const resultsEl = document.getElementById('results');
const comparisonList = document.getElementById('comparison-list');
const resultsMeta = document.getElementById('results-meta');
const emptyEl = document.getElementById('empty');

const STORE_META = {
  'JB Hi-Fi': { className: 'jb', label: 'JB Hi-Fi' },
  'The Good Guys': { className: 'tgg', label: 'The Good Guys' },
  'Harvey Norman': { className: 'hn', label: 'Harvey Norman' },
};

function formatAud(value) {
  if (value == null) return '暂无';
  return `$${Number(value).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function show(el) {
  el.classList.remove('hidden');
}

function hide(el) {
  el.classList.add('hidden');
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle('error', isError);
  show(statusEl);
}

function renderStoreStatus(stores) {
  storeStatusEl.innerHTML = stores
    .map((store) => {
      const cls = store.blocked || store.error ? (store.count ? 'warn' : 'error') : 'ok';
      const meta = store.error
        ? store.error
        : store.count
          ? `抓取成功${store.via ? ` (${store.via})` : ''}`
          : '未找到相关商品';
      return `
        <article class="store-card ${cls}">
          <h3>${store.name}</h3>
          <div class="count">${store.count}</div>
          <div class="meta">${meta}</div>
        </article>
      `;
    })
    .join('');
  show(storeStatusEl);
}

function renderSummary(summary) {
  if (!summary?.message) {
    hide(summaryEl);
    return;
  }
  summaryEl.innerHTML = `<strong>分析结果</strong><div style="margin-top:8px">${summary.message}</div>`;
  show(summaryEl);
}

function renderComparison(data) {
  const rows = data.comparisons || [];
  if (!rows.length) {
    comparisonList.innerHTML = '<div class="empty">未找到可对比的商品，请尝试更精确的关键词。</div>';
    show(resultsEl);
    return;
  }

  comparisonList.innerHTML = rows
    .map((row) => {
      const cells = ['JB Hi-Fi', 'The Good Guys', 'Harvey Norman']
        .map((storeName) => {
          const product = row.stores[storeName];
          const meta = STORE_META[storeName];
          const isBest = row.cheapest === storeName && product?.price != null;

          if (!product) {
            return `
              <div class="price-cell">
                <div class="store-label"><span class="dot ${meta.className}"></span>${meta.label}</div>
                <div class="price-value missing">未匹配 / 未抓取</div>
              </div>
            `;
          }

          return `
            <div class="price-cell">
              <div class="store-label"><span class="dot ${meta.className}"></span>${meta.label}</div>
              <div class="price-value ${isBest ? 'best' : ''}">${formatAud(product.price)}</div>
              ${
                product.originalPrice && product.originalPrice > product.price
                  ? `<div class="price-original">原价 ${formatAud(product.originalPrice)}</div>`
                  : ''
              }
              <a class="price-link" href="${product.url}" target="_blank" rel="noopener">查看商品 →</a>
            </div>
          `;
        })
        .join('');

      const image = row.image
        ? `<img src="${row.image}" alt="" loading="lazy" />`
        : '<div class="placeholder"></div>';

      return `
        <article class="comparison-card">
          <div class="comparison-top">
            ${image}
            <div>
              <h3>${row.title}</h3>
            </div>
            ${
              row.savings
                ? `<div class="savings">最多可省 ${formatAud(row.savings)}<br /><span style="color:var(--muted);font-weight:500">最低价：${row.cheapest || '—'}</span></div>`
                : '<div class="savings" style="color:var(--muted)">仅一家有货</div>'
            }
          </div>
          <div class="price-grid">${cells}</div>
        </article>
      `;
    })
    .join('');

  const time = new Date(data.fetchedAt).toLocaleString('zh-CN');
  resultsMeta.textContent = `关键词「${data.query}」 · 更新时间 ${time}`;
  show(resultsEl);
}

async function runSearch(query) {
  hide(emptyEl);
  hide(summaryEl);
  hide(resultsEl);
  searchBtn.disabled = true;
  searchBtn.textContent = '搜索中...';
  setStatus(`正在实时抓取三家网站：${query}`);

  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || '搜索失败');
    }

    hide(statusEl);
    renderStoreStatus(data.stores || []);
    renderSummary(data.summary);
    renderComparison(data);
  } catch (error) {
    setStatus(error.message || '搜索失败，请稍后重试', true);
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = '搜索比价';
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const query = input.value.trim();
  if (query) runSearch(query);
});

document.querySelectorAll('.tag').forEach((button) => {
  button.addEventListener('click', () => {
    const query = button.dataset.q;
    input.value = query;
    runSearch(query);
  });
});

show(emptyEl);
