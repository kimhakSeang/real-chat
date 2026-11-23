// Home screen extras for user.html: bottom bar, notifications, account menu, settings,
// news search + saved list, to-do list. Load AFTER board.js and chat.js.
(() => {
  if (document.body.dataset.page !== 'user') return;
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const store = {
    get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (e) { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} },
  };

  /* ---------- Pop-ups: notifications + account menu ---------- */
  const pops = [[$('bell'), $('bell-pop')], [$('avatar-btn'), $('account-pop')]];
  function closePops(except) {
    pops.forEach(([btn, pop]) => {
      if (pop === except) return;
      pop.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    });
  }
  pops.forEach(([btn, pop]) => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = pop.hidden;
    closePops(pop);
    pop.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  }));
  document.addEventListener('click', (e) => { if (!e.target.closest('.pop-wrap')) closePops(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePops(); });

  /* ---------- Bottom bar: Chats / Home / To-do ---------- */
  const views = { home: $('view-home'), chats: $('view-chats'), todo: $('view-todo') };
  const navBtns = document.querySelectorAll('.bottom-nav [data-view]');
  function setView(name) {
    Object.keys(views).forEach((k) => { views[k].hidden = k !== name; });
    navBtns.forEach((b) => b.setAttribute('aria-current', b.dataset.view === name ? 'page' : 'false'));
    closePops();
    window.scrollTo(0, 0);
  }
  window.setView = setView;                       // chat.js uses it to jump back to the home screen
  navBtns.forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));

  /* ---------- Notifications (new announcements) ---------- */
  const notes = [];                               // { msg, read }
  const bellBadge = $('bell').querySelector('.badge'), bellList = $('bell-list');
  function renderNotes() {
    const unread = notes.filter((n) => !n.read).length;
    bellBadge.hidden = !unread;
    bellBadge.textContent = unread;
    bellList.replaceChildren();
    if (!notes.length) { bellList.append(el('div', 'pop-empty', 'No notifications yet.')); return; }
    notes.slice(0, 10).forEach((n) => {
      const b = el('button', 'pop-item' + (n.read ? '' : ' unread'));
      b.type = 'button';
      b.append(el('b', '', n.msg.tittle || '(no title)'), el('span', '', n.msg.subTitle || n.msg.author || ''));
      b.onclick = () => { n.read = true; renderNotes(); closePops(); openDetail(n.msg); };
      bellList.append(b);
    });
  }
  $('bell-readall').onclick = () => { notes.forEach((n) => { n.read = true; }); renderNotes(); };
  eventHooks.push((msg) => { notes.unshift({ msg, read: false }); renderNotes(); });

  /* ---------- Settings (theme) ---------- */
  const dlg = $('settings');
  let theme = store.get('theme', 'system');
  function applyTheme(t) {
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
  }
  applyTheme(theme);
  $('open-settings').onclick = () => {
    closePops();
    dlg.querySelector(`input[value="${theme}"]`).checked = true;
    $('settings-name').textContent = $('user-name').textContent;
    dlg.showModal();
  };
  dlg.addEventListener('change', (e) => {
    if (e.target.name !== 'theme') return;
    theme = e.target.value;
    applyTheme(theme);
    store.set('theme', theme);
  });
  $('settings-close').onclick = () => dlg.close();
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

  /* ---------- News: search + All / Saved ---------- */
  const feed = $('feed'), savedFeed = $('saved-feed'), newsSearch = $('news-search'), newsEmpty = $('news-empty');
  const chips = document.querySelectorAll('.chip');
  let tab = 'all';
  function applyNewsFilter() {
    const term = newsSearch.value.trim().toLowerCase();
    let total = 0, shown = 0;
    (tab === 'saved' ? savedFeed : feed).querySelectorAll('.event').forEach((c) => {
      total++;
      const ok = !term || c.dataset.search.includes(term);
      c.hidden = !ok;
      if (ok) shown++;
    });
    newsEmpty.hidden = !(term && total && !shown);
    newsEmpty.textContent = `No news match “${newsSearch.value.trim()}”.`;
  }
  function renderSaved() {
    savedFeed.replaceChildren();
    const list = loadSaved();
    if (!list.length) savedFeed.append(el('p', 'empty', 'Nothing saved yet. Tap the bookmark on a news card to keep it here.'));
    list.forEach((m) => savedFeed.append(buildCard(m, false)));
    applyNewsFilter();
  }
  function setTab(t) {
    tab = t;
    feed.hidden = t !== 'all';
    savedFeed.hidden = t !== 'saved';
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.tab === t)));
    if (t === 'saved') renderSaved(); else applyNewsFilter();
  }
  chips.forEach((c) => c.addEventListener('click', () => setTab(c.dataset.tab)));
  newsSearch.addEventListener('input', applyNewsFilter);
  document.addEventListener('news:saved-changed', () => { if (tab === 'saved') renderSaved(); });
  eventHooks.push(() => applyNewsFilter());        // new cards respect the current search

  /* ---------- To-do list ---------- */
  let todos = store.get('todos', []);
  const todoList = $('todo-list'), todoCount = $('todo-count'), todoClear = $('todo-clear');
  function renderTodos() {
    todoList.replaceChildren();
    todos.forEach((t) => {
      const li = el('li', t.done ? 'done' : '');
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.checked = t.done; cb.setAttribute('aria-label', 'Done: ' + t.text);
      cb.onchange = () => { t.done = cb.checked; store.set('todos', todos); renderTodos(); };
      const del = el('button', 'chat-link', '✕');
      del.type = 'button'; del.setAttribute('aria-label', 'Delete: ' + t.text);
      del.onclick = () => { todos = todos.filter((x) => x !== t); store.set('todos', todos); renderTodos(); };
      li.append(cb, el('span', 'txt', t.text), del);
      todoList.append(li);
    });
    const done = todos.filter((t) => t.done).length;
    todoCount.textContent = todos.length ? `${done} of ${todos.length} done` : 'Nothing to do. Add your first task above.';
    todoClear.hidden = !done;
  }
  $('todo-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('todo-input'), text = input.value.trim();
    if (!text) return;
    todos.unshift({ text, done: false });
    input.value = '';
    store.set('todos', todos);
    renderTodos();
  });
  todoClear.onclick = () => { todos = todos.filter((t) => !t.done); store.set('todos', todos); renderTodos(); };

  renderNotes();
  renderTodos();
  setTab('all');
  setView('home');
})();