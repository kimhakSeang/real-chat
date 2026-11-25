// Direct (1-to-1) chat for user.html: "Active now" strip with round avatars + chat window.
// Load AFTER board.js.
(() => {
  if (typeof connectHooks === 'undefined' || typeof log === 'undefined') {
    console.error('chat.js: board.js is missing or outdated (no connectHooks). Use the latest board.js and load it before chat.js.');
    return;
  }
  const VALID = /^[A-Za-z0-9_-]{1,20}$/;

  // ---- Chat destinations: must match your WebSocketConfig and DirectChatController ----
  const CHAT_SEND  = '/user-app/chat.private';   // application prefix + @MessageMapping("/chat.private")
  const CHAT_WHO   = '/user-app/chat.who';       // application prefix + @MessageMapping("/chat.who")
  const CHAT_INBOX = '/user/queue/private';      // convertAndSendToUser(name, "/queue/private", msg)
  const CHAT_USERS = '/topic/chat.users';        // template.convertAndSend("/topic/chat.users", names)
  // ---------------------------------------------------------------------------------------
  let me = new URLSearchParams(location.search).get('name'), nameSource = 'URL ?name=';   // user.html?name=alice
  if (!VALID.test(me || '')) { nameSource = 'login page (sessionStorage)'; me = null; try { me = sessionStorage.getItem('chatName'); } catch (e) {} }
  if (!VALID.test(me || '')) {                  // no name yet → send the visitor to the login page
    window.CHAT_REDIRECTING = true;             // stops board.js from connecting
    location.replace('login.html');
    return;
  }
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
  .chat-strip{position:relative;margin:20px 0 6px}
  .chat-strip-head{display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:10px}
  .chat-strip-head .myname{color:var(--muted)}
  .chat-strip-head .myname::before{content:'· '}
  .chat-switch{font-size:.8rem;color:var(--accent)}
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
  .chat-card{position:absolute;left:0;right:0;top:100%;z-index:30;scroll-margin-bottom:110px;display:flex;flex-direction:column;margin:12px 0 0;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:16px;box-shadow:0 14px 38px rgba(0,0,0,.18);font-size:.92rem;transform-origin:var(--caret,40px) 0}
  .chat-card[hidden]{display:none}
  .chat-card::before{content:'';position:absolute;top:-8px;left:var(--caret,40px);width:14px;height:14px;background:var(--surface);border-left:1px solid var(--line);border-top:1px solid var(--line);transform:translateX(-50%) rotate(45deg)}
  .chat-card form{background:none;border:0;border-radius:0;padding:10px 12px}
  .chat-card .chat-top{padding:12px 14px;border-radius:16px 16px 0 0;background:var(--surface)}
  .chat-card .chat-top .chat-avatar.sm{width:38px;height:38px;font-size:.85rem}
  .chat-card .chat-msgs{height:min(300px,42vh);flex:none}
  .chat-card .chat-row{border-radius:0 0 16px 16px}
  .chat-card .chat-row input{border-radius:999px;padding:10px 16px}

  /* Opening: the card grows out of the friend you tapped (the arrow tip is the origin), bubbles float in */
  .chat-card.is-opening{animation:chatOpen .5s cubic-bezier(.2,.9,.25,1.15) both}
  .chat-card.is-opening .chat-line,.chat-card.is-opening .chat-hello{animation:bubbleIn .35s .1s ease-out both}
  .chat-card.is-closing{animation:chatClose .22s ease-in both}
  @keyframes chatOpen{0%{opacity:0;transform:translateY(-14px) scale(.55)}60%{opacity:1}100%{opacity:1;transform:none}}
  @keyframes chatClose{to{opacity:0;transform:translateY(-10px) scale(.6)}}
  @keyframes bubbleIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  .chat-person .chat-avatar.bounce{animation:avatarPop .4s cubic-bezier(.3,1.6,.5,1)}
  @keyframes avatarPop{0%{transform:scale(1)}40%{transform:scale(.82)}100%{transform:scale(1)}}
  @media (prefers-reduced-motion:reduce){
    .chat-card.is-opening,.chat-card.is-closing,.chat-card.is-opening .chat-line,.chat-card.is-opening .chat-hello,.chat-person .chat-avatar.bounce{animation:none}
  }

  .chat-send{flex:none;width:42px;height:42px;padding:0;border:0;border-radius:50%;background:var(--accent);color:var(--accent-ink);display:flex;align-items:center;justify-content:center;cursor:pointer}
  .chat-send:disabled{opacity:.4;cursor:not-allowed}
  .chat-send .ico{width:20px;height:20px}
  .chat-top .titles{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.25}
  .chat-top .presence{font-size:.75rem;color:var(--muted)}
  .chat-top .presence.on{color:var(--live)}
  .chat-top{display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid var(--line)}
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
    <div class="chat-strip-head"><b>Online Users</b><span class="count"></span></div>
    <div class="chat-people"></div>`;
  const slot = document.getElementById('people-slot');            // user.html provides the place for it
  if (slot) slot.append(strip);
  else { const feed = document.getElementById('feed'); feed.parentNode.insertBefore(strip, feed); }

  // Chat area: shown right below the avatar row when an avatar is clicked
  const win = el('section', 'chat-card');
  win.hidden = true;
  win.innerHTML = `
    <div class="chat-paper" aria-hidden="true"></div>
    <div class="chat-frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <div class="chat-top"><span class="who"></span><span class="titles"><b class="peer"></b><small class="presence"></small></span><button class="chat-link close" aria-label="Close chat">✕</button></div>
    <div class="chat-msgs" role="log" aria-live="polite"></div>
    <form class="chat-row"><input class="msginput" maxlength="1000" autocomplete="off" aria-label="Message"><button class="chat-send" type="submit" aria-label="Send"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg></button></form>`;
  strip.append(win);                               // the card sits right under the friends row

  const q = (root, s) => root.querySelector(s);
  const peopleEl = q(strip, '.chat-people'), countEl = q(strip, '.count');
  const emptyEl = el('p', 'chat-empty'); emptyEl.hidden = true; peopleEl.after(emptyEl);   // note under the avatar row
  const MIN_SLOTS = 6;                                           // empty frames keep the row looking like the vintage design
  const searchEl = document.getElementById('friend-search') || { value: '', addEventListener() {} };   // search box in the page
  const whoEl = q(win, '.who'), sendBtn = q(win, '.chat-send'), peerEl = q(win, '.peer'), presenceEl = q(win, '.presence'), msgsEl = q(win, '.chat-msgs'), input = q(win, '.msginput');
  const nameEl = document.getElementById('user-name');            // header shows the logo + my user name
  if (nameEl) nameEl.textContent = me;
  const avatarBtn = document.getElementById('avatar-btn');         // round profile button in the header
  if (avatarBtn) avatarBtn.replaceChildren(avatar(me));
  const chatListEl = document.getElementById('chat-list'), navBadge = document.getElementById('nav-chat-badge');

  /* ---------- "All chats" list (bottom bar → Chats) ---------- */
  function renderChats() {
    const total = Object.values(unread).reduce((a, b) => a + b, 0);
    if (navBadge) { navBadge.hidden = !total; navBadge.textContent = total; }
    if (!chatListEl) return;
    chatListEl.replaceChildren();
    const lastOf = (p) => threads[p][threads[p].length - 1];
    const peers = Object.keys(threads).filter((p) => threads[p].length)
      .sort((a, b) => parseTimestamp(lastOf(b).timestamp) - parseTimestamp(lastOf(a).timestamp));
    if (!peers.length) {
      chatListEl.append(el('div', 'chat-empty', 'No conversations yet. Tap someone in Online users to say hi.'));
      return;
    }
    peers.forEach((p) => {
      const last = lastOf(p);
      const row = el('button', 'chat-item');
      row.type = 'button';
      const a = avatar(p);
      if (online.includes(p)) a.append(el('span', 'dot'));
      const mid = el('span', 'mid');
      mid.append(el('b', '', p), el('span', 'preview', (last.from === me ? 'You: ' : '') + last.text));
      const end = el('span', 'end');
      end.append(el('small', '', parseTimestamp(last.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })));
      if (unread[p]) end.append(el('span', 'chat-badge', unread[p]));
      row.append(a, mid, end);
      row.onclick = () => { if (window.setView) window.setView('home'); openThread(p); };   // chat opens on the home screen
      chatListEl.append(row);
    });
  }

  /* ---------- Rendering ---------- */
  function renderPeople() {
    peopleEl.replaceChildren();
    const term = searchEl.value.trim();
    const others = online.filter((n) => n !== me);
    countEl.textContent = others.length ? '· ' + others.length : '';
    renderChats();
    const shown = others.filter((n) => n.toLowerCase().includes(term.toLowerCase()));
    log(`Chat: friend list → online=${JSON.stringify(online)}, others=${others.length}, shown=${shown.length}${term ? `, search="${term}"` : ''}`);
    emptyEl.hidden = !!shown.length;
    emptyEl.textContent = shown.length ? '' : (!others.length ? 'No one else is online.' : `No friends match “${term}”.`);
    shown.forEach((n) => {
      const b = el('button', 'chat-person' + (n === current ? ' active' : ''));
      b.title = n;
      b.setAttribute('aria-label', 'Chat with ' + n + (unread[n] ? `, ${unread[n]} unread` : ''));
      const a = avatar(n);
      a.append(el('span', 'dot'));
      if (unread[n]) a.append(el('span', 'chat-badge', unread[n]));
      b.append(a, el('span', 'nm', n));
      b.onclick = () => {
        openThread(n);
        const av = peopleEl.querySelector('.chat-person.active .chat-avatar');   // little bounce on the friend you tapped
        if (av && !reduceMotion()) av.classList.add('bounce');
      };
      peopleEl.append(b);
    });
    for (let i = shown.length; i < MIN_SLOTS; i++) {              // empty frames, like the design
      const g = el('div', 'chat-person ghost');
      g.setAttribute('aria-hidden', 'true');
      g.append(el('span', 'chat-avatar'));
      peopleEl.append(g);
    }
  }

  function renderThread() {
    renderChats();
    if (!current) { closeCard(); return; }
    const wasHidden = win.hidden || win.classList.contains('is-closing');
    win.hidden = false;
    if (wasHidden || shownFor !== current) { positionCaret(); playOpen(); }   // opened, or switched to another friend
    shownFor = current;
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
    presenceEl.textContent = ok ? '● Online' : 'Offline';
    presenceEl.classList.toggle('on', ok);
    if (input.disabled === ok) input.disabled = !ok;
    input.placeholder = ok ? 'Type a message…' : current + ' is offline';
    updateSend();
    positionCaret();
  }

  /* ---------- Open / close animation of the chat card ---------- */
  let shownFor = null, closeTimer = null;
  function reduceMotion() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function playOpen() {
    clearTimeout(closeTimer);
    win.classList.remove('is-closing', 'is-opening');
    if (reduceMotion()) return;
    void win.offsetWidth;                            // restart the animation
    win.classList.add('is-opening');
  }
  function closeCard() {
    shownFor = null;
    if (win.hidden || win.classList.contains('is-closing')) return;
    if (reduceMotion()) { win.hidden = true; return; }
    win.classList.remove('is-opening');
    win.classList.add('is-closing');
    closeTimer = setTimeout(() => { win.hidden = true; win.classList.remove('is-closing'); }, 230);
  }
  win.addEventListener('animationend', (e) => { if (e.target === win) win.classList.remove('is-opening'); });

  function updateSend() { sendBtn.disabled = input.disabled || !input.value.trim(); }
  function positionCaret() {                        // the small arrow on the card points at the selected friend
    const btn = peopleEl.querySelector('.chat-person.active');
    if (!btn || win.hidden) return;
    const b = btn.getBoundingClientRect(), w = win.getBoundingClientRect();
    win.style.setProperty('--caret', Math.min(Math.max(b.left + b.width / 2 - w.left, 28), w.width - 28) + 'px');
  }

  function openThread(n) {
    current = n; unread[n] = 0;
    renderPeople(); renderThread(); input.focus();
    win.scrollIntoView({ block: 'nearest' });
  }

  /* ---------- Events ---------- */
  searchEl.addEventListener('input', renderPeople);               // filter friends as you type
  q(win, '.close').onclick = () => { current = null; renderThread(); renderPeople(); };
  win.addEventListener('keydown', (e) => { if (e.key === 'Escape') { current = null; renderThread(); renderPeople(); } });
  input.addEventListener('input', updateSend);
  peopleEl.addEventListener('scroll', positionCaret);
  window.addEventListener('resize', positionCaret);

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
    log(`Chat: [${id}] SEND → ${CHAT_SEND} payload=${payload}`);
    log(`Chat: [${id}] state: ${snapshot()}`);
    receipts[id] = Date.now();
    try { stomp.send(CHAT_SEND, { receipt: id }, payload); }
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
      log(`Chat: [${id}] NO echo on ${CHAT_INBOX} after 6 s → "Not delivered". ${snapshot()}. Check: ` +
          '(1) STOMP error / WebSocket closed lines above; ' +
          '(2) server log: did /chat.private run, and is the sender Principal null (silently ignored)? ' +
          '(3) the "subscribed to /user/queue/private" line after connecting; ' +
          '(4) "/queue" in enableSimpleBroker; ' +
          '(5) the receiver name must equal ?name= exactly.', 'error');
      if (current === peer) renderThread();
    }, 6000);
  });

  function onPrivate(frame) {
    log(`Chat: received on ${CHAT_INBOX} headers=${JSON.stringify(frame.headers)} body=${frame.body}`);
    let m;
    try { m = JSON.parse(frame.body); }
    catch (err) { log('Chat: cannot parse private message: ' + err.message, 'error'); return; }
    if (m.text === SELFTEST) {                                    // reply to the self-test: not a real message
      if (selfTest) {
        clearTimeout(selfTest.timer);
        log(`Chat: SELF-TEST OK – round trip ${Date.now() - selfTest.t0} ms (send → server → ${CHAT_INBOX}). Sending and receiving both work.`, 'ok');
        selfTest = null;
      }
      return;
    }
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

  // ---- Self-test: send a message to myself and wait for it on my inbox ----
  const SELFTEST = '__chat_selftest__';
  let selfTest = null;
  function runSelfTest() {
    if (!DEBUG || !connected || !stomp || !stomp.connected) return;
    if (selfTest) clearTimeout(selfTest.timer);
    log(`Chat: SELF-TEST → sending a test message to myself ("${me}") via ${CHAT_SEND}`);
    selfTest = {
      t0: Date.now(),
      timer: setTimeout(() => {
        log(`Chat: SELF-TEST FAILED – nothing came back on ${CHAT_INBOX} within 4 s. Either the SEND never reached the controller ` +
            `(application prefix of ${CHAT_SEND} not in setApplicationDestinationPrefixes, @MessageMapping missing, or sender Principal is null) ` +
            `or the reply was not delivered (broker prefix of ${CHAT_INBOX} missing in enableSimpleBroker, or not subscribed). ` +
            'Look for STOMP ERROR / WebSocket closed lines above and in the server log.', 'error');
        selfTest = null;
      }, 4000)
    };
    try { stomp.send(CHAT_SEND, {}, JSON.stringify({ to: me, text: SELFTEST })); }
    catch (err) { log('Chat: SELF-TEST send threw: ' + err.message, 'error'); }
  }
  window.chatSelfTest = runSelfTest;            // run it any time from the browser console

  // ---- Log out: close the WebSocket cleanly so the server removes this user right away ----
  function logout() {
    log(`Chat: logging out "${me}" – sending DISCONNECT`);
    window.CHAT_REDIRECTING = true;                 // stop board.js from reconnecting
    try { sessionStorage.removeItem('chatName'); } catch (e) {}   // forget the name: user.html now asks for a login
    let done = false;
    const go = () => { if (done) return; done = true; location.replace('login.html'); };
    const client = stomp;
    try {
      if (client && client.connected && client.ws) {
        client.ws.addEventListener('close', () => { log('Chat: WebSocket closed, session ended', 'ok'); go(); });
        client.disconnect();                        // STOMP DISCONNECT frame, then closes the WebSocket
      } else go();
    } catch (err) { log('Chat: logout error: ' + err.message, 'error'); go(); }
    setTimeout(go, 1500);                           // never wait longer than this
  }
  const logoutBtn = document.getElementById('chat-logout');        // in the account menu
  if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); logout(); });

  // Safety net: leaving the page in ANY way (logout link, refresh, closing the tab) ends the session cleanly
  window.addEventListener('pagehide', () => {
    try { if (stomp && stomp.connected) stomp.disconnect(); } catch (e) {}
  });
  window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });   // page came back from the back/forward cache

  let gotUsers = false, whoTimer = null;

  function onUsers(f) {
    gotUsers = true;
    log(`Chat: received ${CHAT_USERS} → ${f.body}`);
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
    log(`Chat: subscribing to ${CHAT_INBOX} and ${CHAT_USERS} as "${me}"`);
    client.onreceipt = (frame) => {                              // server accepted a SEND (if it supports receipts)
      const id = frame.headers['receipt-id'];
      if (receipts[id]) { log(`Chat: [${id}] RECEIPT after ${Date.now() - receipts[id]} ms (server accepted the frame)`, 'ok'); delete receipts[id]; }
    };
    const sub = client.subscribe(CHAT_INBOX, onPrivate);   // my private messages
    log(`Chat: subscribed to ${CHAT_INBOX} (id=${sub.id})`);
    client.subscribe(CHAT_USERS, onUsers);              // who is online
    gotUsers = false;
    client.send(CHAT_WHO, {}, '');                        // ask for the current list
    log(`Chat: sent ${CHAT_WHO} (asking the server for the online list)`);
    setTimeout(runSelfTest, 600);                                // then test send + receive end to end
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
  log(`Chat destinations: send=${CHAT_SEND} who=${CHAT_WHO} inbox=${CHAT_INBOX} users=${CHAT_USERS}`);
  renderPeople();
})();