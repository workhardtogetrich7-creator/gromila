/* sync.js — живая синхронизация прогресса между устройствами через приватный GitHub Gist.
   Токен (scope: gist) хранится только на устройстве. Данные сливаются без потерь:
   журнал и снюс — объединение, вес — по дате, настройки — последняя запись побеждает. */
(function () {
  const S = App.S, KEY = 'syncToken', GKEY = 'syncGist', AKEY = 'syncAt';
  const API = 'https://api.github.com', FILE = 'gromila-sync.json', TAG = 'gromila-sync';
  let token = S.get(KEY, '') || '', gistId = S.get(GKEY, '') || '';
  let status = token ? 'idle' : 'off', lastError = '', lastAt = S.get(AKEY, 0) || 0;
  let busy = false, timer = null, kickT = null;
  const subs = [];
  const emit = () => subs.forEach(f => { try { f(); } catch (e) { /* подписчик упал */ } });
  const setStatus = (s, err) => { status = s; lastError = err || ''; emit(); };

  async function api(path, opts) {
    const r = await fetch(API + path, Object.assign({
      headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
    }, opts || {}));
    if (r.status === 401 || r.status === 403) { const e = new Error('auth'); e.code = 401; throw e; }
    if (!r.ok) { const e = new Error('http ' + r.status); e.code = r.status; throw e; }
    return r.status === 204 ? null : r.json();
  }
  async function findGist() {
    const list = await api('/gists?per_page=100');
    const g = (list || []).find(x => x.description === TAG || (x.files && x.files[FILE]));
    return g ? g.id : '';
  }
  async function createGist() {
    const g = await api('/gists', { method: 'POST', body: JSON.stringify({ description: TAG, public: false, files: { [FILE]: { content: JSON.stringify(App.dump()) } } }) });
    return g.id;
  }
  async function readGist() {
    const g = await api('/gists/' + gistId);
    const f = g.files && g.files[FILE];
    if (!f) return null;
    let content = f.content;
    if (f.truncated && f.raw_url) content = await (await fetch(f.raw_url)).text();
    try { return JSON.parse(content); } catch (e) { return null; }
  }
  async function writeGist(payload) {
    await api('/gists/' + gistId, { method: 'PATCH', body: JSON.stringify({ files: { [FILE]: { content: JSON.stringify(payload) } } }) });
  }

  function mergeData(L, R, lat, rat) {
    const newer = rat >= lat ? R : L, older = rat >= lat ? L : R, out = {};
    const logMap = {};
    [...(L.log || []), ...(R.log || [])].forEach(s => { if (s && s.id != null) logMap[s.id] = s; });
    out.log = Object.values(logMap).sort((a, b) => a.id - b.id);
    const bodyMap = {};
    (older.body || []).forEach(b => { if (b && b.d) bodyMap[b.d] = b; });
    (newer.body || []).forEach(b => { if (b && b.d) bodyMap[b.d] = b; });
    out.body = Object.values(bodyMap).sort((a, c) => a.d < c.d ? -1 : 1);
    out.snus = [...new Set([...(L.snus || []), ...(R.snus || [])])].sort((a, b) => a - b);
    out.last = Object.assign({}, older.last || {}, newer.last || {});
    ['start', 'snusInt'].forEach(k => { const v = newer[k] !== undefined ? newer[k] : older[k]; if (v !== undefined) out[k] = v; });
    for (const k in newer) if (!(k in out)) out[k] = newer[k];
    for (const k in older) if (!(k in out)) out[k] = older[k];
    return out;
  }

  async function doSync() {
    if (!token || busy) return;
    if (!navigator.onLine) { setStatus('offline'); return; }
    busy = true; setStatus('sync');
    try {
      if (!gistId) { gistId = (await findGist()) || (await createGist()); S.set(GKEY, gistId); }
      const local = App.dump(), remote = await readGist();
      const data = (remote && remote.data) ? mergeData(local.data, remote.data, local.at, remote.at || 0) : local.data;
      const merged = { app: 'gromila', v: 1, at: Date.now(), data };
      App.restore({ app: 'gromila', data });
      await writeGist(merged);
      lastAt = Date.now(); S.set(AKEY, lastAt);
      setStatus('ok');
      if (window.onSyncApplied) window.onSyncApplied();
    } catch (e) {
      setStatus('error', e.code === 401 ? 'Токен недействителен' : 'Нет связи с GitHub');
    } finally { busy = false; }
  }
  function startTimer() { stopTimer(); timer = setInterval(() => { if (document.visibilityState === 'visible') doSync(); }, 15000); }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

  const Sync = {
    on(cb) { subs.push(cb); },
    isOn() { return !!token; },
    status() { return status; },
    error() { return lastError; },
    at() { return lastAt; },
    async connect(tok) {
      tok = (tok || '').trim();
      if (!tok) return { ok: false, error: 'Пустой токен' };
      token = tok; setStatus('connecting');
      try { await api('/user'); } catch (e) { token = ''; S.set(KEY, ''); setStatus('off'); return { ok: false, error: e.code === 401 ? 'Токен не подошёл (нужен доступ gist)' : 'Нет связи с GitHub' }; }
      S.set(KEY, token);
      await doSync();
      if (status === 'error') { startTimer(); return { ok: true, warn: lastError }; }
      startTimer();
      return { ok: true };
    },
    disconnect() { token = ''; gistId = ''; S.set(KEY, ''); S.set(GKEY, ''); stopTimer(); setStatus('off'); },
    sync() { return doSync(); },
    kick() { if (!token) return; clearTimeout(kickT); kickT = setTimeout(doSync, 1500); }
  };
  window.Sync = Sync;
  if (token) { startTimer(); setTimeout(doSync, 800); }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && token) doSync(); });
  window.addEventListener('online', () => { if (token) doSync(); });
})();
