const BASE = 'https://lnkr-69a9.onrender.com'; // same origin; change to 'http://localhost:5000' if serving separately
let currentShortUrl = '';

// ── Shorten URL ──────────────────────────────────────────────────────────────
async function shortenUrl() {
  const originalUrl = document.getElementById('longUrl').value.trim();
  const customSlug  = document.getElementById('customSlug').value.trim();
  const btn         = document.getElementById('shortenBtn');

  hideError();
  if (!originalUrl) { showError('Please enter a URL.'); return; }

  btn.disabled    = true;
  btn.textContent = 'Shortening...';

  try {
    const res  = await fetch(`${BASE}/api/shorten`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ originalUrl, customSlug: customSlug || undefined }),
    });
    const data = await res.json();

    if (!data.success) { showError(data.error); return; }

    // Populate result card
    currentShortUrl = data.shortUrl;
    document.getElementById('shortUrlLink').href        = data.shortUrl;
    document.getElementById('shortUrlLink').textContent = data.shortUrl;
    document.getElementById('originalUrlPreview').textContent = data.originalUrl;
    document.getElementById('clickCount').textContent   = data.clicks;
    document.getElementById('createdAt').textContent    = new Date(data.createdAt).toLocaleDateString();

    const cached = document.getElementById('cachedBadge');
    cached.style.display = data.cached ? 'inline' : 'none';

    document.getElementById('resultCard').style.display = 'block';

    // Update rate limit bar
    if (data.rateLimitInfo) updateRateBar(data.rateLimitInfo);

    // Refresh history list
    loadUrls();
  } catch (err) {
    showError('Could not reach the server. Is it running?');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Shorten URL';
  }
}

// ── Rate Limit Bar ───────────────────────────────────────────────────────────
function updateRateBar(info) {
  const used = info.requestCount;
  const max  = 10;
  const pct  = Math.min((used / max) * 100, 100);

  document.getElementById('rateLimitBar').style.display  = 'block';
  document.getElementById('rateLimitText').textContent   = `${used} / ${max} requests used`;
  document.getElementById('rateFill').style.width        = `${pct}%`;

  const fill = document.getElementById('rateFill');
  fill.style.background = pct >= 80 ? '#ff4444' : pct >= 50 ? '#ffaa00' : 'var(--accent)';
}

// ── Copy to Clipboard ────────────────────────────────────────────────────────
function copyUrl() {
  if (!currentShortUrl) return;
  navigator.clipboard.writeText(currentShortUrl).then(() => showToast());
}

function showToast() {
  const t = document.getElementById('toast');
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 2000);
}

// ── Load URL History ─────────────────────────────────────────────────────────
async function loadUrls() {
  try {
    const res  = await fetch(`${BASE}/api/urls?limit=8`);
    const data = await res.json();
    const list = document.getElementById('urlList');

    if (!data.urls || data.urls.length === 0) {
      list.innerHTML = `<p class="mono text-sm text-center py-8" style="color:var(--muted)">No URLs yet.</p>`;
      return;
    }

    list.innerHTML = data.urls.map(u => `
      <div class="url-row rounded-lg px-4 py-3 mb-2">
        <div class="flex items-center justify-between gap-3">
          <a href="${u.shortUrl}" target="_blank"
             class="mono text-sm font-bold" style="color:var(--accent)">${u.shortUrl}</a>
          <span class="mono text-xs" style="color:var(--muted)">${u.clicks} clicks</span>
        </div>
        <p class="mono text-xs truncate mt-1" style="color:var(--muted)">${u.originalUrl}</p>
      </div>
    `).join('');
  } catch (err) {
    // Server not running yet — fail silently
  }
}

// ── Stats Lookup ─────────────────────────────────────────────────────────────
async function lookupStats() {
  const code = document.getElementById('statsCode').value.trim();
  const box  = document.getElementById('statsResult');

  if (!code) {
    box.innerHTML = `<p class="mono text-sm" style="color:#ff6666">Enter a short code.</p>`;
    return;
  }

  try {
    const res  = await fetch(`${BASE}/api/stats/${code}`);
    const data = await res.json();

    if (!data.success) {
      box.innerHTML = `<p class="mono text-sm" style="color:#ff6666">${data.error}</p>`;
      return;
    }

    box.innerHTML = `
      <div class="rounded-lg p-5" style="background:var(--surface);border:1px solid var(--border)">
        <div class="grid grid-cols-2 gap-4 mono text-sm">
          <div>
            <p style="color:var(--muted)" class="text-xs mb-1">SHORT URL</p>
            <a href="${data.shortUrl}" target="_blank" style="color:var(--accent)">${data.shortUrl}</a>
          </div>
          <div>
            <p style="color:var(--muted)" class="text-xs mb-1">TOTAL CLICKS</p>
            <p class="font-bold text-xl">${data.clicks}</p>
          </div>
          <div class="col-span-2">
            <p style="color:var(--muted)" class="text-xs mb-1">ORIGINAL URL</p>
            <p class="truncate text-xs">${data.originalUrl}</p>
          </div>
          <div>
            <p style="color:var(--muted)" class="text-xs mb-1">CREATED</p>
            <p>${new Date(data.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <p style="color:var(--muted)" class="text-xs mb-1">LAST ACCESSED</p>
            <p>${data.lastAccessed ? new Date(data.lastAccessed).toLocaleString() : 'Never'}</p>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    box.innerHTML = `<p class="mono text-sm" style="color:#ff6666">Server error.</p>`;
  }
}

// ── Tab Switching ─────────────────────────────────────────────────────────────
function switchTab(name) {
  ['history', 'stats'].forEach(t => {
    document.getElementById(`tab-${t}`).classList.toggle('active', t === name);
    document.getElementById(`panel-${t}`).style.display = t === name ? 'block' : 'none';
  });
}

// ── Error Helpers ─────────────────────────────────────────────────────────────
function showError(msg) {
  const b = document.getElementById('errorBanner');
  b.textContent    = '⚠ ' + msg;
  b.style.display  = 'block';
}

function hideError() {
  document.getElementById('errorBanner').style.display = 'none';
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('longUrl').addEventListener('keydown', e => {
    if (e.key === 'Enter') shortenUrl();
  });
  document.getElementById('statsCode').addEventListener('keydown', e => {
    if (e.key === 'Enter') lookupStats();
  });
  loadUrls();
});