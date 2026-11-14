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
  .chat-person.active .nm{font-weight:600}
  .chat-person .nm{display:block;margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .chat-person.active .chat-avatar,.chat-person:hover .chat-avatar{outline:2px solid var(--accent);outline-offset:2px}
  .chat-avatar{position:relative;width:52px;height:52px;border-radius:50%;margin:0 auto;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:1rem;flex:none}
  .chat-avatar.sm{width:34px;height:34px;font-size:.8rem;margin:0}
  .chat-avatar .dot{position:absolute;right:0;bottom:0;width:14px;height:14px;border-radius:50%;background:var(--live);border:2px solid var(--bg)}
  .chat-badge{background:#c0392b;color:#fff;border-radius:999px;padding:0 7px;font-size:.75rem;line-height:1.4}
  .chat-avatar .chat-badge{position:absolute;top:-4px;right:-4px}

  .chat-window{width:100%;height:380px;max-height:70vh;margin:4px 0 10px;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,.12);display:flex;flex-direction:column;overflow:hidden;font-size:.92rem}
  .chat-window[hidden]{display:none}
  .chat-window form{background:none;border:0;border-radius:0;padding:8px}
  .chat-top{display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid var(--line)}
  .chat-top b{flex:1}
  .chat-link{background:none;border:0;color:var(--accent);cursor:pointer;font:inherit;padding:2px 6px}
  .chat-msgs{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column}
  .chat-time{align-self:center;color:var(--muted);font-size:.72rem;margin:10px 0 4px}
  .chat-line{display:flex;align-items:flex-end;gap:6px;margin-top:2px}
  .chat-line.first{margin-top:8px}
  .chat-line.mine{justify-content:flex-end}
  .chat-slot{width:28px;flex:none}
  .chat-slot .chat-avatar.sm{width:28px;height:28px;font-size:.7rem}
  .chat-msg{max-width:75%;padding:7px 12px;border-radius:18px;background:var(--bg);white-space:pre-wrap;word-break:break-word;line-height:1.35}
  .chat-line.mine .chat-msg{background:var(--accent);color:var(--accent-ink)}
  .chat-line.theirs:not(.first) .chat-msg{border-top-left-radius:5px}
  .chat-line.theirs:not(.last) .chat-msg{border-bottom-left-radius:5px}
  .chat-line.mine:not(.first) .chat-msg{border-top-right-radius:5px}
  .chat-line.mine:not(.last) .chat-msg{border-bottom-right-radius:5px}
  .chat-line.pending .chat-msg{opacity:.6}
  .chat-status{align-self:flex-end;font-size:.7rem;color:var(--muted);margin:2px 4px 0}
  .chat-status.err{color:#c0392b}
  .chat-hello{margin:auto;text-align:center;color:var(--muted)}
  .chat-hello .chat-avatar{width:64px;height:64px;font-size:1.3rem;margin-bottom:8px}
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

  // Chat area: shown right below the avatar row when an avatar is clicked
  const win = el('section', 'chat-window');
  win.hidden = true;
  win.innerHTML = `
    <div class="chat-top"><span class="who"></span><b class="peer"></b><button class="chat-link close" aria-label="Close chat">✕</button></div>
    <div class="chat-msgs" role="log" aria-live="polite"></div>
    <form class="chat-row"><input class="msginput" maxlength="1000" autocomplete="off" aria-label="Message"><button class="primary">Send</button></form>`;
  strip.append(win);

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
      const b = el('button', 'chat-person' + (n === current ? ' active' : ''));
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
    const list = threads[current] || [];
    if (!list.length) {
      const hello = el('div', 'chat-hello');
      hello.append(avatar(current), el('div', '', `Say hi to ${current} 👋`));
      msgsEl.append(hello);
    }
    const GAP = 15 * 60 * 1000;                                   // show a time label after 15 min of silence
    const when = (d) => d.toLocaleString([], d.toDateString() === new Date().toDateString()
      ? { hour: 'numeric', minute: '2-digit' } : { dateStyle: 'medium', timeStyle: 'short' });
    let lastMine = -1;
    list.forEach((m, i) => { if (m.from === me) lastMine = i; });
    list.forEach((m, i) => {
      const prev = list[i - 1], next = list[i + 1];
      const t = parseTimestamp(m.timestamp);
      const newBlock = !prev || t - parseTimestamp(prev.timestamp) > GAP;
      if (newBlock) msgsEl.append(el('div', 'chat-time', when(t)));
      const mine = m.from === me;
      const first = newBlock || prev.from !== m.from;
      const last = !next || next.from !== m.from || parseTimestamp(next.timestamp) - t > GAP;
      const line = el('div', `chat-line ${mine ? 'mine' : 'theirs'}${first ? ' first' : ''}${last ? ' last' : ''}${m.pending ? ' pending' : ''}`);
      if (!mine) {                                                // their avatar beside the last bubble of a group
        const slot = el('span', 'chat-slot');
        if (last) slot.append(avatar(m.from, true));
        line.append(slot);
      }
      const bubble = el('div', 'chat-msg', m.text);
      bubble.title = t.toLocaleString();
      line.append(bubble);
      msgsEl.append(line);
      if (i === lastMine) {
        msgsEl.append(el('div', 'chat-status' + (m.failed ? ' err' : ''),
          m.failed ? 'Not delivered' : m.pending ? 'Sending…' : 'Sent'));
      }
    });
    msgsEl.scrollTop = msgsEl.scrollHeight;
    const ok = connected && online.includes(current);
    if (input.disabled === ok) input.disabled = !ok;
    input.placeholder = ok ? 'Aa' : current + ' is offline';
  }

  function openThread(n) {
    current = n; unread[n] = 0;
    renderPeople(); renderThread(); input.focus();
    win.scrollIntoView({ block: 'nearest' });
  }

  /* ---------- Events ---------- */
  searchEl.addEventListener('input', renderPeople);               // filter friends as you type
  q(win, '.close').onclick = () => { current = null; renderThread(); renderPeople(); };

  // One-line snapshot of the connection state, used in log messages
  const snapshot = () => `connected=${connected} stomp.connected=${stomp && stomp.connected} ` +
    `ws.readyState=${stomp && stomp.ws ? stomp.ws.readyState : 'n/a'} (1=OPEN) me="${me}" online=${JSON.stringify(online)}`;
  let sendSeq = 0;
  const receipts = {};

  q(win, 'form').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    if (!current) { log('Chat: send ignored – no conversation is open', 'error'); return; }
    if (!connected || !stomp || !stomp.connected) { log('Chat: send BLOCKED – not connected. ' + snapshot(), 'error'); return; }
    if (!online.includes(current)) { log(`Chat: send BLOCKED – "${current}" is not in the online list. ` + snapshot(), 'error'); return; }

    const peer = current, id = 'msg-' + (++sendSeq);
    const msg = { id, from: me, to: peer, text, timestamp: new Date().toISOString(), pending: true };
    (threads[peer] = threads[peer] || []).push(msg);              // appears right away, like Messenger
    const payload = JSON.stringify({ to: peer, text });           // server fills in "from"
    log(`Chat: [${id}] SEND → /user-app/chat.private payload=${payload}`);
    log(`Chat: [${id}] state: ${snapshot()}`);
    receipts[id] = Date.now();
    try { stomp.send('/user-app/chat.private', { receipt: id }, payload); }
    catch (err) {                                                 // e.g. the socket closed a moment ago
      msg.pending = false; msg.failed = true;
      log(`Chat: [${id}] stomp.send THREW: ${err.message}`, 'error');
    }
    input.value = '';
    renderThread();
    input.focus();
    if (msg.failed) return;
    setTimeout(() => {
      if (!msg.pending) return;
      msg.pending = false; msg.failed = true;
      log(`Chat: [${id}] NO echo on /user/queue/private after 6 s → "Not delivered". ${snapshot()}. Check: ` +
          '(1) STOMP error / WebSocket closed lines above; ' +
          '(2) server log: did /chat.private run, and is the sender Principal null (silently ignored)? ' +
          '(3) the "subscribed to /user/queue/private" line after connecting; ' +
          '(4) "/queue" in enableSimpleBroker; ' +
          '(5) the receiver name must equal ?name= exactly.', 'error');
      if (current === peer) renderThread();
    }, 6000);
  });

  function onPrivate(frame) {
    log(`Chat: received on /user/queue/private headers=${JSON.stringify(frame.headers)} body=${frame.body}`);
    let m;
    try { m = JSON.parse(frame.body); }
    catch (err) { log('Chat: cannot parse private message: ' + err.message, 'error'); return; }
    if (!m.from || !m.to || typeof m.text !== 'string') {
      log('Chat: private message is missing from/to/text → ignored. Check the DirectMessage fields on the server.', 'error');
      return;
    }
    if (m.from !== me && m.to !== me) log(`Chat: WARNING message is neither from nor to "${me}" (from="${m.from}", to="${m.to}")`, 'error');
    const peer = m.from === me ? m.to : m.from;
    const list = (threads[peer] = threads[peer] || []);
    const mine = m.from === me && list.find((x) => x.from === me && (x.pending || x.failed) && x.text === m.text);
    if (mine) { mine.pending = false; mine.failed = false; }      // server confirmed my message
    else list.push(m);
    log(`Chat: ${m.from} → ${m.to} (${m.text.length} chars)${mine ? ` [confirmed ${mine.id}]` : ''}`, 'ok');
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
    client.onreceipt = (frame) => {                              // server accepted a SEND (if it supports receipts)
      const id = frame.headers['receipt-id'];
      if (receipts[id]) { log(`Chat: [${id}] RECEIPT after ${Date.now() - receipts[id]} ms (server accepted the frame)`, 'ok'); delete receipts[id]; }
    };
    const sub = client.subscribe('/user/queue/private', onPrivate);   // my private messages
    log(`Chat: subscribed to /user/queue/private (id=${sub.id})`);
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