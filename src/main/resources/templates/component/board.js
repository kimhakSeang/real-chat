// Shared by user.html and admin.html
// ---- Matches your WebSocketConfig and controller ---------------------------
const WS_URL       = 'ws://localhost:8080/connection';  // registry.addEndpoint("/chat")
const TOPIC_EVENTS = '/event/messages';           // @SendTo("/topic/messages")
const APP_PUBLISH  = '/admin-app/send-message';         // "/app" + @MessageMapping("/send-message")
const DEBUG_DEFAULT = false;                        // true = log on, false = log off  (was false: that is why you saw no logs)
// ---------------------------------------------------------------------------

// HTTP origin of your Spring app (used for image upload and for /uploads/... images)
const API_ORIGIN = new URL(WS_URL.replace(/^ws/, 'http')).origin;   // http://localhost:8080

// Logging flag (on-page panel + console + image diagnostics).
// Override per visit with the URL: user.html?debug=off  or  user.html?debug=on
const DEBUG = (() => {
  const v = new URLSearchParams(location.search).get('debug');
  return v === null ? DEBUG_DEFAULT : !['0', 'false', 'off'].includes(v.toLowerCase());
})();

// Log every STOMP frame sent/received (SEND, MESSAGE, ERROR …). Turn off with ?trace=off
const STOMP_TRACE = (() => {
  const v = new URLSearchParams(location.search).get('trace');
  return v === null ? true : !['0', 'false', 'off'].includes(v.toLowerCase());
})();

const $ = (id) => document.getElementById(id);
let stomp = null, connected = false;
const eventHooks = [];                         // functions called for every announcement that arrives (used by home.js)

/* ---------- On-page debug log ---------- */
function initDebugPanel() {
  if (!DEBUG) return;
  const box = document.createElement('details');
  box.open = true;
  box.style.cssText = 'margin-top:32px;border:1px solid var(--line,#d9e0e6);border-radius:8px;' +
                      'background:var(--surface,#fff);padding:10px 14px;font-size:.8rem';
  const sum = document.createElement('summary');
  sum.style.cssText = 'cursor:pointer;font-weight:600';
  sum.textContent = 'Debug log';
  const clear = document.createElement('button');
  clear.type = 'button'; clear.textContent = 'Clear';
  clear.style.cssText = 'margin-left:12px;font:inherit;padding:1px 8px;cursor:pointer';
  clear.onclick = (e) => { e.preventDefault(); $('debug-log').textContent = ''; };
  sum.append(clear);
  const area = document.createElement('div');
  area.id = 'debug-log';
  area.style.cssText = 'margin-top:8px;max-height:260px;overflow:auto;white-space:pre-wrap;' +
                       'word-break:break-all;font-family:ui-monospace,Menlo,Consolas,monospace';
  box.append(sum, area);
  (document.querySelector('.wrap') || document.body).append(box);
}

function log(msg, level = 'info') {          // level: info | ok | error
  if (!DEBUG) return;
  (level === 'error' ? console.error : console.log)('[board]', msg);
  const area = $('debug-log');
  if (!area) return;
  const line = document.createElement('div');
  line.style.color = level === 'error' ? '#c0392b' : level === 'ok' ? '#1f9d55' : 'inherit';
  line.textContent = new Date().toLocaleTimeString() + '  ' + msg;
  area.append(line);
  while (area.childElementCount > 200) area.firstElementChild.remove();
  area.scrollTop = area.scrollHeight;
}

/* ---------- Helpers ---------- */
// LocalDateTime arrives as "2026-11-09T10:15:30" or [2026,11,9,10,15,30]
function parseTimestamp(ts) {
  if (!ts) return new Date();
  if (Array.isArray(ts)) return new Date(ts[0], ts[1] - 1, ts[2], ts[3] || 0, ts[4] || 0, ts[5] || 0);
  return new Date(ts);
}

// A Google Drive "share" link is an HTML page, not an image, so <img> can't show it.
// Convert it to Drive's direct thumbnail URL (file must be shared as "Anyone with the link").
function toImageUrl(url) {
  if (url.startsWith('/')) return API_ORIGIN + url;   // locally stored image, e.g. /uploads/abc.jpg
  const m = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/) ||
            url.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([\w-]+)/);
  return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1200` : url;
}

// Runs only when an image failed: asks the server directly so we can see the HTTP status.
async function diagnoseImage(url) {
  if (!DEBUG) return;
  log(`Checking ${url} with fetch (HEAD)…`);
  try {
    const res = await fetch(url, { method: 'HEAD' });
    log(`HEAD ${res.status} ${res.statusText} | content-type=${res.headers.get('content-type')} | ` +
        `size=${res.headers.get('content-length')} bytes`, res.ok ? 'info' : 'error');
    if (res.status === 404) log('→ 404: Spring is not serving this file. Check the /uploads/** resource handler (needs trailing "/") and that save folder = read folder.', 'error');
    else if (res.status === 401 || res.status === 403) log('→ Blocked: allow /uploads/** in Spring Security (permitAll).', 'error');
    else if (res.ok) log('→ Server returned the file, but the browser could not display it. Check content-type is image/* and the file is not empty or corrupt.', 'error');
  } catch (err) {
    log(`HEAD failed: ${err.message} → server unreachable, or blocked by CORS (add a CORS mapping for /uploads/**).`, 'error');
  }
}

/* ---------- Rendering ---------- */
/* ---------- Saved news (bookmarks, kept in this browser) ---------- */
const SAVED_KEY = 'savedNews';
const loadSaved = () => { try { return JSON.parse(localStorage.getItem(SAVED_KEY)) || []; } catch (e) { return []; } };
const newsKey = (m) => JSON.stringify([m.author, m.tittle, m.timestamp]);
const isSaved = (m) => loadSaved().some((x) => newsKey(x) === newsKey(m));
function toggleSaved(m) {
  let list = loadSaved();
  if (list.some((x) => newsKey(x) === newsKey(m))) list = list.filter((x) => newsKey(x) !== newsKey(m));
  else list.unshift({ author: m.author, tittle: m.tittle, subTitle: m.subTitle, content: m.content, imageUrl: m.imageUrl, timestamp: m.timestamp });
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(list.slice(0, 50))); }
  catch (e) { log('Could not save: ' + e.message, 'error'); }
  document.dispatchEvent(new CustomEvent('news:saved-changed'));
}
function saveButton(msg) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'save-btn';
  b.innerHTML = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>';
  const sync = () => {
    const on = isSaved(msg);
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
    b.setAttribute('aria-label', on ? 'Remove from saved' : 'Save');
    b.title = b.getAttribute('aria-label');
  };
  const onChange = () => {
    if (!b.isConnected) { document.removeEventListener('news:saved-changed', onChange); return; }   // card was removed
    sync();
  };
  b.addEventListener('click', (e) => { e.stopPropagation(); toggleSaved(msg); });      // don't open the pop-up
  b.addEventListener('keydown', (e) => e.stopPropagation());
  document.addEventListener('news:saved-changed', onChange);
  sync();
  return b;
}

function renderEvent(msg) {
  log(`Event: title="${msg.tittle}" subTitle=${JSON.stringify(msg.subTitle || '')} author="${msg.author}" imageUrl=${msg.imageUrl ? JSON.stringify(msg.imageUrl) : '(none)'}`);
  if (!('subTitle' in msg)) log('Event has no "subTitle" key: the server class (ChatMessage) has no subTitle field, so the server dropped it. Add "private String subTitle;" and restart.', 'error');
  $('empty')?.remove();
  const card = buildCard(msg, true);
  $('feed').prepend(card);   // newest first
  eventHooks.forEach((fn) => { try { fn(msg, card); } catch (e) { log('Event hook error: ' + e.message, 'error'); } });
}

// Builds one announcement card (also used for the "Saved" list)
function buildCard(msg, fresh) {
  const card = document.createElement('article');
  card.className = 'event' + (fresh ? ' fresh' : '');
  card.dataset.search = [msg.tittle, msg.subTitle, msg.content, msg.author].join(' ').toLowerCase();
  card.tabIndex = 0;                                   // clickable / keyboard accessible
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', 'Open details: ' + (msg.tittle || ''));
  card.addEventListener('click', () => openDetail(msg));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(msg); }
  });

  if (msg.imageUrl && !/^(https?:\/\/|\/)/i.test(msg.imageUrl)) {
    log('Image ignored: URL must start with http://, https:// or /', 'error');
  }
  const safeImage = msg.imageUrl && /^(https?:\/\/|\/)/i.test(msg.imageUrl) ? toImageUrl(msg.imageUrl) : null;
  if (safeImage) {
    log(`Loading image: ${msg.imageUrl} → ${safeImage}`);
    const img = document.createElement('img');
    img.alt = ''; img.referrerPolicy = 'no-referrer';
    img.onload = () => log(`Image loaded OK (${img.naturalWidth}×${img.naturalHeight})`, 'ok');
    img.onerror = () => {
      log(`Image FAILED to load: ${safeImage}`, 'error');
      const note = document.createElement('div');
      note.className = 'meta';
      note.style.cssText = 'padding:10px;word-break:break-all;font-size:.75rem';
      note.textContent = 'Image could not be loaded: ' + safeImage;
      img.replaceWith(note);
      diagnoseImage(safeImage);
    };
    img.src = safeImage;
    const thumb = document.createElement('div');   // left column
    thumb.className = 'thumb';
    thumb.append(img);
    card.append(thumb);
  }
  const body = document.createElement('div'); body.className = 'body';
  const h = document.createElement('h2'); h.textContent = msg.tittle || '(no title)'; // field is "tittle" in EventMessage
  const sub = document.createElement('p'); sub.className = 'sub'; sub.textContent = msg.subTitle || '';
  const m = document.createElement('div'); m.className = 'meta';
  m.textContent = `${msg.author || 'Unknown'} · ${parseTimestamp(msg.timestamp).toLocaleString()}`;
  if (msg.subTitle) body.append(h, sub, m); else body.append(h, m);   // full content is in the pop-up
  card.append(body);
  if (document.body.dataset.page === 'user') card.append(saveButton(msg));   // bookmark (user page only)
  return card;
}

/* ---------- Detail pop-up (opens when an announcement is clicked) ---------- */
let detail = null;
function ensureDetail() {
  if (detail) return detail;
  const dlg = document.createElement('dialog');
  dlg.className = 'detail';
  dlg.setAttribute('aria-labelledby', 'detail-title');
  dlg.innerHTML = `
    <div class="detail-book">
      <div class="detail-box">
        <button type="button" class="detail-close" aria-label="Close">✕</button>
        <div class="detail-head">
          <img class="detail-img" alt="" hidden>
          <div class="detail-titles"><h2 id="detail-title"></h2><p class="sub"></p><div class="meta"></div></div>
        </div>
        <hr>
        <div class="detail-content"></div>
      </div>
      <div class="detail-cover" aria-hidden="true">
        <img alt="" hidden>
        <div class="cover-text">
          <div class="cover-mast"><span>Event Board</span><span class="cover-date"></span></div>
          <div><div class="cover-title"></div><div class="cover-sub"></div></div>
        </div>
      </div>
    </div>`;
  document.body.append(dlg);
  const q = (s) => dlg.querySelector(s);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });   // click on the dark backdrop
  q('.detail-close').addEventListener('click', () => dlg.close());
  q('.detail-img').addEventListener('error', (e) => { e.target.hidden = true; });
  const book = q('.detail-book'), cover = q('.detail-cover');
  cover.addEventListener('animationend', () => book.classList.remove('opening'));   // cover has swung open
  q('.detail-cover img').addEventListener('error', (e) => { e.target.hidden = true; });
  detail = { dlg, book, img: q('.detail-img'), title: q('h2'), sub: q('.sub'), meta: q('.meta'), content: q('.detail-content'),
             coverImg: q('.detail-cover img'), coverTitle: q('.cover-title'), coverSub: q('.cover-sub'), coverDate: q('.cover-date') };
  return detail;
}

function openDetail(msg) {
  const d = ensureDetail();
  const src = msg.imageUrl && /^(https?:\/\/|\/)/i.test(msg.imageUrl) ? toImageUrl(msg.imageUrl) : null;
  d.img.hidden = !src;
  if (src) d.img.src = src; else d.img.removeAttribute('src');
  d.title.textContent = msg.tittle || '(no title)';
  d.sub.textContent = msg.subTitle || '';
  d.sub.hidden = !msg.subTitle;
  d.meta.textContent = `${msg.author || 'Unknown'} · ${parseTimestamp(msg.timestamp).toLocaleString()}`;
  d.content.textContent = msg.content || '';
  d.dlg.scrollTop = 0;
  d.content.classList.toggle('cols', String(msg.content || '').length > 600);   // long text flows in two columns
  // Magazine effect: a cover (image + headline) swings open like a magazine to reveal the page
  d.coverTitle.textContent = msg.tittle || '(no title)';
  d.coverSub.textContent = msg.subTitle || '';
  d.coverDate.textContent = parseTimestamp(msg.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  d.coverImg.hidden = !src;
  if (src) d.coverImg.src = src; else d.coverImg.removeAttribute('src');
  d.book.classList.remove('opening');
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) { void d.book.offsetWidth; d.book.classList.add('opening'); }
  if (!d.dlg.open) d.dlg.showModal();
  log(`Detail opened: "${msg.tittle}" (image=${src || 'none'}, content ${String(msg.content || '').length} chars)`);
}

/* ---------- WebSocket (STOMP, native WebSocket) ---------- */
function setStatus(on, text) {
  connected = on;
  $('status').classList.toggle('on', on);
  $('status').lastElementChild.textContent = text;
}

// Extension points used by chat.js
const connectHooks = [], disconnectHooks = [];
let retryTimer = null;

function connect() {
  if (window.CHAT_REDIRECTING) return;        // chat.js is sending the visitor to login.html
  clearTimeout(retryTimer);
  // window.CHAT_NAME (set by chat.js) identifies this user to the server: ws://…/chat?name=alice
  const url = WS_URL + (window.CHAT_NAME
    ? '?name=' + encodeURIComponent(window.CHAT_NAME) + '&cid=' + encodeURIComponent(window.CHAT_CLIENT_ID || '')
    : '');
  log(`Config: WS_URL=${WS_URL} TOPIC_EVENTS=${TOPIC_EVENTS} APP_PUBLISH=${APP_PUBLISH}`);
  log(`Connecting to ${url} …`);
  const client = Stomp.client(url);
  stomp = client;
  client.debug = (STOMP_TRACE && DEBUG)
    ? (str) => { if (!/PING|PONG/.test(str)) log('STOMP ' + String(str).slice(0, 400)); }
    : null;
  if (client.ws) {
    client.ws.addEventListener('open',  () => log('WebSocket open'));
    client.ws.addEventListener('close', (ev) => log(`WebSocket closed: code=${ev.code} reason="${ev.reason}" clean=${ev.wasClean}`, 'error'));
    client.ws.addEventListener('error', () => log('WebSocket error event', 'error'));
  }
  client.connect({}, () => {
    setStatus(true, 'Live');
    log(`Connected. Subscribed to ${TOPIC_EVENTS}`, 'ok');
    client.subscribe(TOPIC_EVENTS, (frame) => {
      try { renderEvent(JSON.parse(frame.body)); }
      catch (err) { log('Could not parse message: ' + frame.body, 'error'); }
    });
    connectHooks.forEach((fn) => { try { fn(client); } catch (e) { log('Hook error: ' + e.message, 'error'); } });
  }, (err) => {
    if (stomp !== client) return;            // an old connection we already replaced
    log('STOMP error/closed: ' + (err && err.headers ? err.headers.message : (err && err.reason) || err), 'error');
    setStatus(false, 'Offline – retrying…');
    disconnectHooks.forEach((fn) => fn());
    log('WebSocket disconnected. Retrying in 3 s…', 'error');
    retryTimer = setTimeout(connect, 3000);
  });
}

// Reconnect now (e.g. after the chat name changed)
function reconnect() {
  clearTimeout(retryTimer);
  const old = stomp;
  setStatus(false, 'Connecting…');
  disconnectHooks.forEach((fn) => fn());
  if (old && old.connected) old.disconnect(connect); else connect();
}

// Returns true if sent to the server; false if offline (demo: shown locally)
function publishEvent(payload) {
  if (connected) {
    stomp.send(APP_PUBLISH, {}, JSON.stringify(payload));
    log(`Sent to ${APP_PUBLISH}: subTitle=${JSON.stringify(payload.subTitle || '')} imageUrl=${payload.imageUrl ? JSON.stringify(payload.imageUrl) : '(none)'}`, 'ok');
    return true;
  }
  log('Not connected – showing locally only', 'error');
  renderEvent({ ...payload, timestamp: new Date().toISOString() });
  return false;
}

initDebugPanel();
// Wait for DOMContentLoaded so chat.js (loaded after this file) can set CHAT_NAME first
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', connect);
else connect();