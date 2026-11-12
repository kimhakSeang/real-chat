// Direct (1-to-1) chat for user.html: "Active now" strip with round avatars + chat window.
// Load AFTER board.js.
(() => {
  if (typeof connectHooks === 'undefined' || typeof log === 'undefined') {
    console.error('chat.js: board.js is missing or outdated (no connectHooks). Use the latest board.js and load it before chat.js.');
    return;
  }
  const VALID = /^[A-Za-z0-9_-]{1,20}$/;
  let me = new URLSearchParams(location.search).get('name'), nameSource = 'URL ?name=';   // user.html?name=alice
  if (!VALID.test(me || '')) { nameSource = 'sessionStorage (kept for this tab)'; me = null; try { me = sessionStorage.getItem('chatName'); } catch (e) {} }
  if (!VALID.test(me || '')) { nameSource = 'new random guest name'; me = 'guest-' + (1000 + Math.floor(Math.random() * 9000)); }
  try { sessionStorage.setItem('chatName', me); } catch (e) {}
  window.CHAT_NAME = me;                       // board.js sends it as ?name= when connecting

  let online = [], current = null;
  const threads = {}, unread = {};
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };

  /* ---------- Round avatar (initials + colour from the name) ---------- */
  const hue = (n) => { let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  const initials = (n) => {
    const p = n.split(/[-_]/).filter(Boolean);
    return ((p[0] || '?')[0] + ((p[1] || '')[0] || '')).toUpperCase();
  };
  function avatar(name, small) {
    const a = el('span', 'chat-avatar' + (small ? ' sm' : ''), initials(name));
    a.style.background = `hsl(${hue(name)} 55% 42%)`;
    return a;
  }

  /* ---------- UI ---------- */
  const css = document.createElement('style');
  css.textContent = `
  .chat-strip{margin:20px 0 6px}
  .chat-strip-head{display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:10px}
  .chat-strip-head .myname{color:var(--muted)}
  .chat-strip-head .myname::before{content:'· '}
  .chat-strip-head input{margin:0 0 0 auto;width:200px;max-width:100%;padding:6px 10px}
  .chat-people{display:flex;gap:14px;overflow-x:auto;padding:6px 2px 10px}
  .chat-empty{color:var(--muted);padding:8px 2px}
  .chat-person{flex:0 0 auto;width:64px;background:none;border:0;padding:0;color:var(--ink);font:inherit;font-size:.78rem;text-align:center;cursor:pointer}
  .chat-person .nm{display:block;margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .chat-person:hover .chat-avatar{outline:2px solid var(--accent);outline-offset:2px}
  .chat-avatar{position:relative;width:52px;height:52px;border-radius:50%;margin:0 auto;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:1rem;flex:none}
  .chat-avatar.sm{width:34px;height:34px;font-size:.8rem;margin:0}
  .chat-avatar .dot{position:absolute;right:0;bottom:0;width:14px;height:14px;border-radius:50%;background:var(--live);border:2px solid var(--bg)}
  .chat-badge{background:#c0392b;color:#fff;border-radius:999px;padding:0 7px;font-size:.75rem;line-height:1.4}
  .chat-avatar .chat-badge{position:absolute;top:-4px;right:-4px}

  .chat-window{position:fixed;right:16px;bottom:16px;z-index:50;width:min(340px,calc(100vw - 32px));height:min(440px,calc(100vh - 32px));background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.25);display:flex;flex-direction:column;overflow:hidden;font-size:.92rem}
  .chat-window[hidden]{display:none}
  .chat-window form{background:none;border:0;border-radius:0;padding:8px}
  .chat-top{display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid var(--line)}
  .chat-top b{flex:1}
  .chat-link{background:none;border:0;color:var(--accent);cursor:pointer;font:inherit;padding:2px 6px}
  .chat-msgs{flex:1;overflow:auto;padding:10px;display:flex;flex-direction:column;gap:6px}
  .chat-msg{max-width:80%;padding:7px 10px;border-radius:10px;background:var(--bg);align-self:flex-start;white-space:pre-wrap;word-break:break-word}
  .chat-msg.mine{align-self:flex-end;background:var(--accent);color:var(--accent-ink)}
  .chat-msg small{display:block;opacity:.7;font-size:.72rem}
  .chat-row{display:flex;gap:6px;border-top:1px solid var(--line)}
  .chat-row input{margin:0;flex:1}
  .chat-row button{font:inherit;cursor:pointer}`;
  document.head.append(css);

  // "Active now" strip, placed above the announcements
  const strip = el('section', 'chat-strip');
  strip.setAttribute('aria-label', 'Active users');
  strip.innerHTML = `
    <div class="chat-strip-head"><b>Active now</b><span class="myname"></span>
      <input type="search" class="search" placeholder="Search friend name…" autocomplete="off" aria-label="Search friend name"></div>
    <div class="chat-people"></div>`;
  const feed = document.getElementById('feed');
  feed.parentNode.insertBefore(strip, feed);

  // Chat window (bottom right), opened by clicking an avatar
  const win = el('section', 'chat-window');
  win.hidden = true;
  win.innerHTML = `
    <div class="chat-top"><span class="who"></span><b class="peer"></b><button class="chat-link close" aria-label="Close chat">✕</button></div>
    <div class="chat-msgs" role="log" aria-live="polite"></div>
    <form class="chat-row"><input class="msginput" maxlength="1000" autocomplete="off" aria-label="Message"><button class="primary">Send</button></form>`;
  document.body.append(win);

  const q = (root, s) => root.querySelector(s);
  const peopleEl = q(strip, '.chat-people'), searchEl = q(strip, '.search');
  const whoEl = q(win, '.who'), peerEl = q(win, '.peer'), msgsEl = q(win, '.chat-msgs'), input = q(win, '.msginput');
  q(strip, '.myname').textContent = me;

  /* ---------- Rendering ---------- */
  function renderPeople() {
    peopleEl.replaceChildren();
    const term = searchEl.value.trim();
    const others = online.filter((n) => n !== me);
    const shown = others.filter((n) => n.toLowerCase().includes(term.toLowerCase()));
    log(`Chat: friend list → online=${JSON.stringify(online)}, others=${others.length}, shown=${shown.length}${term ? `, search="${term}"` : ''}`);
    if (!shown.length) {
      peopleEl.append(el('div', 'chat-empty', !others.length
        ? 'No one else is online. Open this page in another tab to try it (each tab gets its own name).'
        : `No friends match “${term}”.`));
      return;
    }
    shown.forEach((n) => {
      const b = el('button', 'chat-person');
      b.title = n;
      b.setAttribute('aria-label', 'Chat with ' + n + (unread[n] ? `, ${unread[n]} unread` : ''));
      const a = avatar(n);
      a.append(el('span', 'dot'));
      if (unread[n]) a.append(el('span', 'chat-badge', unread[n]));
      b.append(a, el('span', 'nm', n));
      b.onclick = () => openThread(n);
      peopleEl.append(b);
    });
  }

  function renderThread() {
    if (!current) { win.hidden = true; return; }
    win.hidden = false;
    peerEl.textContent = current;
    whoEl.replaceChildren(avatar(current, true));
    msgsEl.replaceChildren();
    (threads[current] || []).forEach((m) => {
      const d = el('div', 'chat-msg' + (m.from === me ? ' mine' : ''), m.text);
      d.append(el('small', '', parseTimestamp(m.timestamp).toLocaleTimeString()));
      msgsEl.append(d);
    });
    msgsEl.scrollTop = msgsEl.scrollHeight;
    const ok = connected && online.includes(current);
    input.disabled = !ok;
    input.placeholder = ok ? 'Type a message…' : current + ' is offline';
  }

  function openThread(n) {
    current = n; unread[n] = 0;
    renderPeople(); renderThread(); input.focus();
  }

  /* ---------- Events ---------- */
  searchEl.addEventListener('input', renderPeople);               // filter friends as you type
  q(win, '.close').onclick = () => { current = null; renderThread(); };

  q(win, 'form').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || !current || !connected || !online.includes(current)) return;
    stomp.send('/user-app/chat.private', {}, JSON.stringify({ to: current, text }));  // server fills in "from"
    input.value = '';
  });

  function onPrivate(frame) {
    const m = JSON.parse(frame.body);
    const peer = m.from === me ? m.to : m.from;
    (threads[peer] = threads[peer] || []).push(m);
    log(`Chat ${m.from} → ${m.to} (${m.text.length} chars)`);
    if (current === peer) renderThread();
    else if (m.from !== me) { unread[peer] = (unread[peer] || 0) + 1; renderPeople(); }
  }

  let gotUsers = false, whoTimer = null;

  function onUsers(f) {
    gotUsers = true;
    log(`Chat: received /topic/chat.users → ${f.body}`);
    try { online = JSON.parse(f.body); }
    catch (e) { log('Chat: could not parse the user list: ' + e.message, 'error'); return; }
    if (!Array.isArray(online)) { log('Chat: user list is not an array', 'error'); online = []; }
    if (!online.length) {
      log('Chat: server list is EMPTY. The server sees no named connections: the handshake handler is not registered, ' +
          'or the URL has no ?name= (see the "Connecting to …" line). Look for "Handshake name=" in the server log.', 'error');
    } else if (!online.includes(me)) {
      log(`Chat: "${me}" is not in the server list, so the server does not know this connection under my name.`, 'error');
    } else if (online.every((n) => n === me)) {
      log('Chat: only my own name is online. Tabs made with "Duplicate tab" share one name; open the others with user.html?name=bob', 'error');
    }
    renderPeople(); renderThread();
  }

  connectHooks.push((client) => {
    log(`Chat: subscribing to /user/queue/private and /topic/chat.users as "${me}"`);
    client.subscribe('/user/queue/private', onPrivate);          // my private messages
    client.subscribe('/topic/chat.users', onUsers);              // who is online
    gotUsers = false;
    client.send('/user-app/chat.who', {}, '');                        // ask for the current list
    log('Chat: sent /user-app/chat.who (asking the server for the online list)');
    clearTimeout(whoTimer);
    whoTimer = setTimeout(() => {
      if (!gotUsers) log('Chat: NO reply on /topic/chat.users after 3 s. The server is not publishing the list. Check that ' +
        'DirectChatController and PresenceTracker are Spring beans, that "/chat.who" is mapped, that enableSimpleBroker includes "/topic", ' +
        'and look for errors in the server console.', 'error');
    }, 3000);
    renderThread();
  });
  disconnectHooks.push(() => { log('Chat: disconnected, online list cleared'); online = []; renderPeople(); renderThread(); });

  log(`Chat identity: "${me}" – from ${nameSource}`);
  renderPeople();
})();