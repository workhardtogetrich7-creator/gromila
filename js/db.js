/* db.js — настройки и журнал (localStorage) + треки (IndexedDB) */
(function () {
  const KEY = 'gromila.v1.';
  const S = {
    get(k, def) { try { const v = localStorage.getItem(KEY + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* приватный режим */ } }
  };

  const mondayOf = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

  const App = {
    S, iso, parse, mondayOf,
    startDate() { let s = S.get('start', null); if (!s) { s = iso(mondayOf(new Date())); S.set('start', s); } return s; },
    week(date = new Date()) { const d0 = parse(this.startDate()); return Math.max(1, Math.floor((new Date(date.getFullYear(), date.getMonth(), date.getDate()) - d0) / 864e5 / 7) + 1); },
    log() { return S.get('log', []); },
    addSession(s) { const l = this.log(); l.push(s); S.set('log', l); const last = S.get('last', {}); for (const x of s.sets) last[x.ex] = { w: x.w, r: x.r }; S.set('last', last); },
    last(ex) { return S.get('last', {})[ex]; },
    body() { return S.get('body', []); },
    addBody(kg) { const b = this.body().filter(x => x.d !== iso(new Date())); b.push({ d: iso(new Date()), kg }); b.sort((a, c) => a.d < c.d ? -1 : 1); S.set('body', b); }
  };

  /* ---------- IndexedDB для музыки ---------- */
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('gromila', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('tracks', { keyPath: 'id' });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const tx = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction('tracks', mode), st = t.objectStore('tracks'); const out = fn(st); t.oncomplete = () => res(out && out.result !== undefined ? out.result : undefined); t.onerror = () => rej(t.error); }); };
  App.tracks = {
    async all() { const db = await open(); return new Promise((res, rej) => { const q = db.transaction('tracks').objectStore('tracks').getAll(); q.onsuccess = () => res(q.result.sort((a, b) => a.added - b.added)); q.onerror = () => rej(q.error); }); },
    async add(file) { const t = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: file.name.replace(/\.[^.]+$/, ''), size: file.size, type: file.type, added: Date.now(), blob: file }; await tx('readwrite', st => st.put(t)); return t; },
    async del(id) { await tx('readwrite', st => st.delete(id)); },
    async get(id) { const db = await open(); return new Promise((res, rej) => { const q = db.transaction('tracks').objectStore('tracks').get(id); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); }
  };
  window.App = App;
})();
