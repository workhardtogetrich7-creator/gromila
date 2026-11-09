/* app.js — экраны и плеер тренировки */
(function () {
  const $ = s => document.querySelector(s);
  const view = $('#view'), tabsEl = $('#tabs'), layer = $('#layer'), mini = $('#mini');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => String(Math.round(n * 10) / 10).replace('.', ',');
  const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const DOW = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const ICON = {
    today: '<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M8 2v4M16 2v4M3 10h18M9 16l2 2 4-4"/>',
    plan: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    lib: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    stats: '<path d="M3 3v18h18"/><path d="m7 15 4-5 3 3 5-7"/>',
    play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>',
    pause: '<path d="M8 5v14M16 5v14" stroke-width="3.2"/>',
    next: '<path d="M5 5v14l10-7zM19 5v14"/>', prev: '<path d="M19 5v14L9 12zM5 5v14"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>', check: '<path d="m5 12 5 5 9-10"/>',
    shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>', chev: '<path d="m9 6 6 6-6 6"/>',
    flame: '<path d="M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1 2-2 3-3 3 0-4-2-7-4-9 0 4-4 6-4 12 0 4 3 8 7 8z"/>',
    back: '<path d="m15 18-6-6 6-6"/>', skip: '<path d="m5 5 10 7-10 7zM19 5v14"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
    down: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>', copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'
  };
  const ic = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICON[n]}</svg>`;
  const VER = '27';
  const st = { tab: App.S.get('tab', 'today'), lib: 'Все', pw: null };
  const TABS = [['today', 'Сегодня'], ['plan', 'Программа'], ['lib', 'Упражнения'], ['music', 'Музыка'], ['stats', 'Прогресс']];

  const thumbCache = {};
  const thumb = id => thumbCache[id] || (thumbCache[id] = Fig.thumb(EX[id], 1).outerHTML);
  const tempoText = t => { const [a, b, c] = t.split('-'); return `Опускание ${a} с · пауза ${b} с · подъём ${c} с`; };
  const toast = msg => { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); };
  const oneDB = () => App.S.get('onedb', false);

  /* ============ СНЮС ============ */
  const fmtH = h => String(h).replace('.', ',');
  const clockOf = ts => new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const fmtLeft = ms => { const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h > 0 ? `${h} ч ${String(m).padStart(2, '0')} мин` : m > 0 ? `${m} мин` : `${s % 60} с`; };
  const fmtSince = ms => { const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h > 0 ? `${h} ч ${m} мин` : `${m} мин`; };
  function snusStatus() {
    const log = App.snus(), intH = App.snusInterval(), now = Date.now(), today = App.iso(new Date());
    const last = log.length ? log[log.length - 1] : null;
    const cnt = log.filter(t => App.iso(new Date(t)) === today).length;
    const leftMs = last ? Math.max(0, last + intH * 3600e3 - now) : 0;
    return { last, intH, cnt, leftMs, sinceMs: last ? now - last : 0, allowed: !last || leftMs <= 0, nextTs: last ? last + intH * 3600e3 : null };
  }
  function snusCard() {
    const s = snusStatus();
    let body;
    if (!s.last) {
      body = `<div class="b" style="font-size:18px">Пока не отмечал</div><div class="sm muted" style="margin-top:4px">Жми «Закинул», когда закинешь — покажу, через сколько можно следующий.</div>`;
    } else if (s.allowed) {
      body = `<div class="num" style="font-size:30px">Можно</div><div class="sm muted" style="margin-top:4px">Прошло ${fmtSince(s.sinceMs)} с последнего · сегодня ${s.cnt}</div>`;
    } else {
      body = `<div class="row between"><div><div class="tag">До следующего</div><div class="num" id="snusLeft" style="font-size:32px">${fmtLeft(s.leftMs)}</div></div><div style="text-align:right"><div class="tag">Сегодня</div><div class="num" style="font-size:32px">${s.cnt}</div></div></div>
        <div class="sm muted" style="margin-top:8px">Можно в ${clockOf(s.nextTs)}. Чем реже — тем лучше для тренировок.</div>`;
    }
    return `<div class="card" id="snuscard"><div class="row between" style="margin-bottom:10px"><span class="eyebrow">Снюс · интервал ${fmtH(s.intH)} ч</span><button class="btn sm ghost" data-a="snuscfg" style="min-height:34px;padding:0 12px">Настроить</button></div>
      ${body}
      <button class="btn block" data-a="snus" style="margin-top:12px">${ic('clock')} Закинул</button></div>`;
  }
  function snusSheetHTML() {
    const s = snusStatus(), dayId = PROG.BY_DOW[new Date().getDay()];
    const note = dayId
      ? `Сегодня день тренировки (День ${dayId}). Старайся не кидать за час до и час после — никотин сужает сосуды и режет восстановление и пампинг.`
      : `Никотин сужает сосуды и мешает мышцам восстанавливаться. Растягивать интервал — выгоднее для массы.`;
    return `<div class="row between" style="margin-bottom:10px"><h2 style="font-size:24px">Снюс</h2><button class="ibtn" data-a="sclose" aria-label="Закрыть">${ic('x')}</button></div>
      <div class="tag">Интервал между закладками</div>
      <div class="stepper" style="margin:8px 0 14px"><button data-a="snusint" data-d="-0.5" aria-label="Короче интервал">−</button><div class="v"><b>${fmtH(s.intH)}</b><span>часов</span></div><button data-a="snusint" data-d="0.5" aria-label="Длиннее интервал">+</button></div>
      <div class="row between" style="margin-bottom:14px"><div><div class="tag">Сегодня закинул</div><div class="num" style="font-size:28px">${s.cnt}</div></div><div class="col" style="gap:8px"><button class="btn sm" data-a="snusundo">Отменить последний</button><button class="btn sm ghost" data-a="snusreset">Сбросить за сегодня</button></div></div>
      <div class="card" style="background:var(--raised);margin:0"><div class="eyebrow">Про тренировки</div><p class="sm" style="margin:6px 0 0">${note}</p></div>`;
  }
  function openSnusSheet() { const old = document.querySelector('.sheet'); if (old) old.remove(); sheet(snusSheetHTML()); }
  let snusTmr = null;
  function stopSnusTick() { if (snusTmr) { clearInterval(snusTmr); snusTmr = null; } }
  function snusTick() {
    stopSnusTick();
    if (st.tab !== 'today' || !document.getElementById('snusLeft')) return;
    snusTmr = setInterval(() => {
      if (st.tab !== 'today' || W || $('#exov')) return stopSnusTick();
      const el = document.getElementById('snusLeft'); if (!el) return stopSnusTick();
      const s = snusStatus();
      if (s.allowed) { const y = view.scrollTop; render(); view.scrollTop = y; return; }
      el.textContent = fmtLeft(s.leftMs);
    }, 1000);
  }

  /* ============ БЭКАП ============ */
  const b64enc = s => btoa(unescape(encodeURIComponent(s)));
  const b64dec = s => decodeURIComponent(escape(atob(s)));
  function download(name, text) { try { const b = new Blob([text], { type: 'application/json' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 1500); return true; } catch (e) { return false; } }
  function copyFallback(code) { sheet(`<div class="row between" style="margin-bottom:6px"><h2 style="font-size:22px">Код бэкапа</h2><button class="ibtn" data-a="sclose" aria-label="Закрыть">${ic('x')}</button></div><p class="sm muted" style="margin:0 0 10px">Выдели и скопируй вручную, потом вставь на другом устройстве в «Восстановить».</p><textarea readonly style="width:100%;min-height:120px;border-radius:12px;border:1px solid var(--line2);background:var(--surface);color:var(--text);padding:12px;font:500 13px var(--body)">${esc(code)}</textarea><button class="btn block" style="margin-top:10px" data-a="sclose">Закрыть</button>`); }
  function applyBackup(raw) {
    let p = null;
    try { p = JSON.parse(raw); } catch (e) { try { p = JSON.parse(b64dec(raw.trim())); } catch (e2) { /* не распознан */ } }
    if (!p) { toast('Не удалось прочитать бэкап'); return; }
    if (p.app !== 'gromila') { toast('Это не бэкап Громилы'); return; }
    if (!confirm('Заменить данные на этом устройстве данными из бэкапа?')) return;
    if (!App.restore(p)) { toast('Ошибка восстановления'); return; }
    const sh = document.querySelector('.sheet'); if (sh) sh.remove();
    render(); toast('Данные восстановлены');
  }
  function bkpSheet() {
    return `<div class="row between" style="margin-bottom:6px"><h2 style="font-size:24px">Восстановить</h2><button class="ibtn" data-a="sclose" aria-label="Закрыть">${ic('x')}</button></div>
      <p class="sm muted" style="margin:0 0 12px">Вставь код бэкапа или выбери файл .json с другого устройства. Это заменит данные здесь.</p>
      <textarea id="bkpin" placeholder="Вставь код сюда" style="width:100%;min-height:90px;border-radius:12px;border:1px solid var(--line2);background:var(--surface);color:var(--text);padding:12px;font:500 14px var(--body);resize:vertical"></textarea>
      <div class="row" style="gap:10px;margin-top:12px"><label class="btn grow" for="bkpfilein" tabindex="0">Файл .json</label><input id="bkpfilein" type="file" accept="application/json,.json"><button class="btn primary grow" data-a="bkpdo">Восстановить</button></div>`;
  }

  /* ============ СИНХРОНИЗАЦИЯ ============ */
  function syncCard() {
    const on = Sync.isOn(), s = Sync.status(), err = Sync.error();
    const when = Sync.at() ? new Date(Sync.at()).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
    let body;
    if (!on) {
      body = `<p class="sm muted" style="margin:6px 0 12px">Включи — и прогресс будет сам появляться на всех твоих устройствах через твой GitHub. Обновление раз в несколько секунд, без телефона и карты.</p><button class="btn primary block" data-a="syncopen">Подключить синхронизацию</button>`;
    } else {
      const txt = s === 'ok' ? `Синхронизировано${when ? ' · ' + when : ''}` : (s === 'sync' || s === 'connecting') ? 'Синхронизирую…' : s === 'offline' ? 'Нет сети — синхронизирую, когда появится' : s === 'error' ? ('Ошибка: ' + (err || 'нет связи')) : 'Подключено';
      const chip = s === 'ok' ? '<span class="chip green">вкл</span>' : s === 'error' ? '<span class="chip red">!</span>' : '<span class="chip">…</span>';
      body = `<div class="row between" style="margin:6px 0 12px"><div class="grow"><div class="b">${s === 'error' ? 'Нужно внимание' : 'Включена'}</div><div class="sm muted">${txt}</div></div>${chip}</div>
        <div class="row" style="gap:10px"><button class="btn grow" data-a="syncnow">Синхронизировать сейчас</button><button class="btn ghost" data-a="syncoff">Отключить</button></div>`;
    }
    return `<div class="card"><div class="eyebrow">Синхронизация устройств</div>${body}</div>`;
  }
  function syncSheet() {
    return `<div class="row between" style="margin-bottom:6px"><h2 style="font-size:24px">Синхронизация</h2><button class="ibtn" data-a="sclose" aria-label="Закрыть">${ic('x')}</button></div>
      <p class="sm muted" style="margin:0 0 12px">Данные будут жить в приватном Gist на твоём GitHub и подтягиваться на все устройства, где введён этот токен. Телефон и карта не нужны.</p>
      <ol class="sm" style="padding-left:20px;margin:0 0 12px"><li>Жми «Создать токен» — откроется GitHub (при запросе подтверди вход).</li><li>Проверь, что отмечен только <b>gist</b>, внизу — <b>Generate token</b>.</li><li>Скопируй токен (начинается с <b>ghp_</b>) и вставь ниже.</li></ol>
      <a class="btn block" href="https://github.com/settings/tokens/new?scopes=gist&description=Gromila%20Sync" target="_blank" rel="noopener" style="margin-bottom:10px">${ic('copy')} Создать токен на GitHub</a>
      <input id="synctok" type="password" placeholder="Вставь токен ghp_…" autocomplete="off" autocapitalize="off" spellcheck="false" style="width:100%;min-height:52px;border-radius:12px;border:1px solid var(--line2);background:var(--surface);color:var(--text);padding:0 14px;font:600 15px var(--body);margin-bottom:10px">
      <button class="btn primary block" data-a="syncconn">Подключить</button>
      <p class="xs muted" style="margin:10px 0 0">Токен хранится только на этом устройстве и даёт доступ только к твоим Gist. Отозвать можно в настройках GitHub в любой момент.</p>`;
  }

  /* ============ СЕГОДНЯ ============ */
  function kegelCard() {
    const today = App.iso(new Date()), d = PROG.DAYS.K;
    const done = App.log().some(s => s.day === 'K' && s.date === today);
    if (done) return `<div class="card row between"><div class="grow"><div class="eyebrow">Кегель · тазовое дно</div><div class="b" style="margin-top:4px">Сегодня сделано</div></div><span class="chip green">${ic('check')}</span></div>`;
    return `<div class="card"><div class="eyebrow">Кегель · тазовое дно · каждый день</div><p class="sm muted" style="margin:6px 0 12px">5 упражнений лёжа, ~${d.mins} мин. Делай ежедневно — для контроля и потенции частота важнее всего.</p><button class="btn block" data-a="start" data-day="K">${ic('play')} Начать Кегель</button></div>`;
  }
  function armCard() {
    const today = App.iso(new Date()), d = PROG.DAYS.R;
    const done = App.log().some(s => s.day === 'R' && s.date === today);
    if (done) return `<div class="card row between"><div class="grow"><div class="eyebrow">Добив рук · трицепс и молотки</div><div class="b" style="margin-top:4px">Сегодня сделано</div></div><span class="chip green">${ic('check')}</span></div>`;
    return `<div class="card"><div class="eyebrow">Добив рук · трицепс и молотки · 2 раза в неделю</div><p class="sm muted" style="margin:6px 0 12px">Короткий добив рук, ~${d.mins} мин. Делай 2 раза в неделю после основной тренировки — для роста рук важнее всего трицепс и молотки.</p><button class="btn block" data-a="start" data-day="R">${ic('play')} Начать добив рук</button></div>`;
  }
  function renderToday() {
    const now = new Date(), wk = App.week(now), ph = PROG.phaseOfWeek(wk), P = PROG.PHASES[ph];
    const iso = App.iso(now), log = App.log(), dayId = PROG.BY_DOW[now.getDay()];
    const doneToday = log.filter(s => s.date === iso && s.day !== 'K' && s.day !== 'R');
    const mon = App.mondayOf(now);
    const week = DOW.map((n, i) => { const d = new Date(mon); d.setDate(d.getDate() + i); const id = PROG.BY_DOW[(i + 1) % 7]; const done = log.some(s => s.date === App.iso(d) && s.day !== 'K' && s.day !== 'R'); const today = App.iso(d) === iso;
      return `<div class="d ${id ? 'plan' : ''} ${done ? 'done' : ''} ${today ? 'today' : ''}">${n}<i></i></div>`; }).join('');
    let hero;
    if (dayId && !doneToday.length) {
      const d = PROG.DAYS[dayId], sets = d.list.reduce((a, x) => a + x.sets[ph], 0);
      hero = `<div class="card glow"><div class="eyebrow">Сегодня · ${d.dowName}</div><h1 class="h1" style="margin:6px 0 4px">День ${d.id}</h1><div class="b" style="font-size:19px">${d.name}</div>
        <div class="row wrap" style="margin:14px 0"><span class="chip">${d.list.length} упражнений</span><span class="chip">${sets} подходов</span><span class="chip">~${d.mins} мин</span>${oneDB() ? '<span class="chip">1 гантель</span>' : ''}</div>
        <button class="btn primary lg block" data-a="start" data-day="${d.id}">${ic('play')} Начать тренировку</button>
        <button class="btn ghost block" style="margin-top:8px" data-a="logday" data-day="${d.id}">Уже тренировался — отметить сделанным</button></div>
        <div class="card"><div class="eyebrow">Разминка · 5 минут</div><p class="sm" style="margin:8px 0 0">${d.warm}</p></div>`;
    } else if (dayId) {
      hero = `<div class="card glow"><div class="eyebrow">Сегодня</div><h1 class="h1" style="margin:6px 0">Тренировка выполнена</h1><p class="muted" style="margin:0 0 14px">Отличная работа. Теперь еда и сон — именно тогда мышцы растут.</p><div class="row"><span class="chip green">${ic('check')} День ${doneToday[0].day}</span><span class="chip">${doneToday[0].sets.length} подходов</span></div></div>`;
    } else {
      let nd = new Date(now), n = 0; do { nd.setDate(nd.getDate() + 1); n++; } while (!PROG.BY_DOW[nd.getDay()]);
      const nx = PROG.DAYS[PROG.BY_DOW[nd.getDay()]];
      hero = `<div class="card glow"><div class="eyebrow">Сегодня · день отдыха</div><h1 class="h1" style="margin:6px 0">Восстановление</h1><p class="muted" style="margin:0 0 14px">Мышцы растут в отдыхе: ешь 3000 ккал, спи 8 часов, пей воду. Следующая тренировка — ${n === 1 ? 'завтра' : nx.dowName.toLowerCase()}: <b style="color:#fff">День ${nx.id} · ${nx.name}</b>.</p><button class="btn block" data-a="start" data-day="${nx.id}">Всё равно потренироваться</button></div>`;
    }
    const trk = Music.list.length, cur = Music.cur;
    const musicCard = trk ? `<div class="card row" data-a="tab" data-t="music" role="button" tabindex="0"><div class="ibtn">${ic('music')}</div><div class="grow"><div class="b">${cur ? esc(cur.name) : 'Моя музыка'}</div><div class="sm muted">${trk} ${trk === 1 ? 'трек' : 'треков'} · нажми, чтобы включить</div></div>${ic('chev')}</div>`
      : `<div class="card row" data-a="tab" data-t="music" role="button" tabindex="0"><div class="ibtn">${ic('music')}</div><div class="grow"><div class="b">Добавь свою музыку</div><div class="sm muted">Загрузи треки — они будут играть во время тренировки</div></div>${ic('chev')}</div>`;
    const main = log.filter(s => s.day !== 'K' && s.day !== 'R'), total = main.length, thisWeek = main.filter(s => s.date >= App.iso(mon)).length;
    return `<div class="page"><div class="top"><div><div class="brand">Громила</div><div class="sm muted">${now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</div></div><span class="chip">${ic('flame')} Неделя ${((wk - 1) % 8) + 1}/8</span></div>
      <div class="card"><div class="row between" style="margin-bottom:8px"><span class="eyebrow">Фаза · ${P.name}</span><span class="chip">Темп ${P.tempo}</span></div><div class="week">${week}</div></div>
      ${hero}
      <div class="kpi" style="margin-bottom:14px"><div><b>${thisWeek}/3</b><span>на этой неделе</span></div><div><b>${total}</b><span>всего тренировок</span></div><div><b>${wk}</b><span>неделя с начала</span></div></div>
      ${musicCard}
      ${kegelCard()}
      ${armCard()}
      ${snusCard()}
      <div class="card"><div class="eyebrow">Выбрать другую</div><div class="row" style="margin-top:10px">${['A', 'B', 'C'].map(i => `<button class="btn sm grow" data-a="start" data-day="${i}">День ${i}</button>`).join('')}</div></div></div>`;
  }

  /* ============ ПРОГРАММА ============ */
  function renderPlan() {
    const wk = App.week(), cur = ((wk - 1) % 8) + 1, sel = st.pw || cur, ph = PROG.phaseOfWeek(sel), P = PROG.PHASES[ph];
    const weeks = [...Array(8)].map((_, i) => { const n = i + 1; return `<button class="wk ${n === cur ? 'cur' : n < cur ? 'past' : ''}" data-a="pw" data-w="${n}" aria-pressed="${n === sel}">${n}<small>нед.</small></button>`; }).join('');
    const days = Object.values(PROG.DAYS).filter(d => !d.daily && !d.extra).map(d => `<div class="card"><div class="row between"><div><div class="eyebrow">${d.dowName}</div><h2 style="margin-top:4px">День ${d.id} · ${d.name}</h2></div></div>
      <div style="margin:8px 0">${d.list.map(x => { const ex = EX[x.ex]; return `<button class="setrow" style="width:100%;background:none;border:0;border-bottom:1px solid var(--line);text-align:left" data-a="ex" data-id="${ex.id}"><div class="thumbbox" style="width:56px;height:54px">${thumb(ex.id)}</div><div class="grow"><div class="b" style="line-height:1.25">${ex.name}</div><div class="xs muted">${x.note || ex.group}</div></div><div style="text-align:right"><div class="num">${x.sets[ph]}×</div><div class="xs muted">${x.reps[ph]}</div></div></button>`; }).join('')}</div>
      <p class="xs muted" style="margin:0 0 12px">Разминка: ${d.warm}</p><button class="btn primary block" data-a="start" data-day="${d.id}">${ic('play')} Начать день ${d.id}</button></div>`).join('');
    return `<div class="page"><div class="top"><h1 class="h1">Программа</h1><span class="chip">8 недель · 3 дня</span></div>
      <div class="phases" role="group" aria-label="Недели">${weeks}</div>
      <div class="card glow"><div class="eyebrow">Недели ${P.weeks}</div><h2 style="margin:4px 0 8px;font-size:26px">${P.name}</h2><div class="row wrap" style="margin-bottom:10px"><span class="chip">Темп ${P.tempo}</span><span class="chip">${P.rpe}</span></div><p class="sm" style="margin:0">${P.tech}</p></div>
      ${days}
      <div class="card"><div class="eyebrow">Как читать темп «3-1-1»</div><p class="sm" style="margin:8px 0 0">Первая цифра — секунды на <b>опускание</b>, вторая — <b>пауза</b> в растянутой точке, третья — <b>подъём</b>. На лёгких гантелях именно медленное опускание и паузы делают нагрузку тяжёлой для мышц.</p></div>
      <div class="card"><div class="row between" style="margin-bottom:4px"><span class="eyebrow">Твои гантели</span><button class="btn sm ${oneDB() ? 'on' : ''}" data-a="onedb" aria-pressed="${oneDB()}" style="min-height:34px;padding:0 14px;flex:none">Одна гантель</button></div>
        ${oneDB()
          ? `<p class="sm" style="margin:8px 0 0"><b>Режим «одна гантель» включён.</b> В каждой тренировке под упражнением появляется подсказка, как сделать его одной гантелью, а стартовый вес ограничен 9 кг (4+3+2). Турник и брусья используем как обычно. Выключи, когда вернётся второй снаряд.</p>`
          : `<p class="sm" style="margin:8px 0 0"><b>Гантель ≈ 7,5 кг:</b> на гриф 35 см — по 2 диска 2 кг и 2 диска 1,5 кг + фиксаторы.<br><b>Одна гантель ≈ 15 кг</b> (для тяги, приседа, моста): все диски на один гриф.<br><b>Штанга ≈ 15 кг:</b> оба грифа на переходник 40 см, диски по краям.<br><span class="muted">Временно одна гантель? Жми «Одна гантель» наверху — покажу замены для всех упражнений.</span></p>`}</div>
      <div class="card"><div class="eyebrow">Рост силы</div><p class="sm" style="margin:8px 0 0">Вес 7,5 кг для 3 лет стажа — лёгкий, поэтому прогрессия идёт за счёт <b>повторов, темпа, пауз, отказа и дроп-сетов</b>. Когда на 15–20 повторов всё станет легко — добавь рюкзак с грузом, бутылки с водой или докупи диски.</p></div>
      <div class="card"><div class="eyebrow">Питание на массу (72 кг)</div><div class="kpi" style="margin:10px 0"><div><b>3000</b><span>ккал в день</span></div><div><b>150</b><span>г белка</span></div><div><b>+0,4</b><span>кг в неделю</span></div></div>
        <p class="sm" style="margin:0 0 6px"><b>Белок</b> (в каждый приём): курица, индейка, говядина, яйца целиком, творог, греческий йогурт, скумбрия, лосось, тунец, протеин.</p>
        <p class="sm" style="margin:0 0 6px"><b>Углеводы</b> (энергия и рост): рис, гречка, овсянка, макароны тв. сортов, картошка, цельнозерновой хлеб, бананы, мёд.</p>
        <p class="sm" style="margin:0 0 6px"><b>Жиры</b> (калории и гормоны): орехи, арахисовая паста, оливковое масло, авокадо, желтки.</p>
        <p class="sm muted" style="margin:8px 0 0">Ешь 4–5 раз в день, не пропускай. Не лезет 3000 — добивай жидким: смузи из молока, банана, овсянки, арахисовой пасты и протеина (~700 ккал). Вода 2,5–3 л. Взвешивайся раз в неделю утром; стоит 2 недели — плюс 250 ккал. Общие рекомендации, не медицинский совет.</p></div>
      <div class="card"><div class="eyebrow">Пример дня · ~3000 ккал</div>
        <div style="margin:8px 0 0">
          <div class="setrow"><div class="grow"><div class="b">Завтрак</div><div class="xs muted">Овсянка на молоке + банан + арахисовая паста + 3 яйца</div></div><div class="num">~700</div></div>
          <div class="setrow"><div class="grow"><div class="b">Перекус</div><div class="xs muted">Творог 200 г + мёд + горсть орехов</div></div><div class="num">~450</div></div>
          <div class="setrow"><div class="grow"><div class="b">Обед</div><div class="xs muted">Рис 150 г (сухого) + куриная грудка 200 г + овощи + масло</div></div><div class="num">~750</div></div>
          <div class="setrow"><div class="grow"><div class="b">После тренировки</div><div class="xs muted">Протеин + банан, либо гречка + говядина</div></div><div class="num">~500</div></div>
          <div class="setrow"><div class="grow"><div class="b">Ужин</div><div class="xs muted">Картофель + скумбрия/лосось + 2 яйца + греческий йогурт</div></div><div class="num">~600</div></div>
        </div>
        <p class="xs muted" style="margin:10px 0 0">Калории примерные, в сумме ~3000. Подгоняй порции под себя: цель — стабильно +0,25–0,5 кг в неделю.</p></div></div>`;
  }

  /* ============ УПРАЖНЕНИЯ ============ */
  function renderLib() {
    const ids = EX_ORDER.filter(id => st.lib === 'Все' || EX[id].group === st.lib);
    return `<div class="page"><div class="top"><h1 class="h1">Упражнения</h1><span class="chip">${ids.length}</span></div>
      <div class="chips" role="group" aria-label="Группа мышц">${EX_GROUPS.map(g => `<button data-a="grp" data-g="${g}" aria-pressed="${g === st.lib}">${g}</button>`).join('')}</div>
      ${ids.map(id => { const e = EX[id]; return `<button class="exrow" data-a="ex" data-id="${id}"><div class="thumbbox">${thumb(id)}</div><div class="grow"><div class="t">${e.name}</div><div class="xs muted" style="margin-top:4px">${e.mus.join(' · ')}</div></div>${ic('chev')}</button>`; }).join('')}</div>`;
  }

  function techHTML(e) {
    return `<div class="chips" style="flex-wrap:wrap">${e.mus.map(m => `<span class="chip red">${m}</span>`).join('')}<span class="chip">${e.eq}</span></div>
      <h3 style="font-size:18px;margin:10px 0 4px;color:var(--cyan)">Как делать</h3><ol>${e.steps.map(s => `<li>${s}</li>`).join('')}</ol>
      <h3 style="font-size:18px;margin:10px 0 4px;color:var(--red)">Частые ошибки</h3><ul>${e.mistakes.map(s => `<li>${s}</li>`).join('')}</ul>
      <div class="row wrap" style="margin-bottom:10px"><span class="chip">Темп ${e.tempo}</span><span class="chip">${e.breath}</span></div><p class="sm muted" style="margin:0 0 6px">${tempoText(e.tempo)}</p>
      <div class="card" style="margin:12px 0 0;background:var(--raised)"><div class="eyebrow">Совет</div><p class="sm" style="margin:6px 0 0">${e.tip}</p></div>
      ${oneDB() && e.one ? `<div class="card" style="margin:12px 0 0;background:var(--raised);border:1px solid var(--accent)"><div class="eyebrow" style="color:var(--accent)">Одной гантелью</div><p class="sm" style="margin:6px 0 0">${e.one}</p></div>` : ''}`;
  }

  let exFig = null;
  function openEx(id) {
    const e = EX[id]; closeEx();
    const o = document.createElement('div'); o.className = 'ov'; o.id = 'exov';
    o.innerHTML = `<div class="body"><div class="bar"><button class="ibtn" data-a="exclose" aria-label="Назад">${ic('back')}</button><div class="b" style="flex:1">${e.group}</div></div>
      <div class="stage" id="exstage"><div class="name">${e.name}</div><button class="pp" data-a="figtoggle" aria-label="Пауза/пуск">${ic('pause')}</button></div><div style="margin-top:14px">${techHTML(e)}</div></div>`;
    layer.appendChild(o); exFig = Fig.mount($('#exstage'), e);
  }
  function closeEx() { if (exFig) { exFig.destroy(); exFig = null; } const o = $('#exov'); if (o) o.remove(); }

  /* ============ МУЗЫКА ============ */
  function renderMusic() {
    const L = Music.list, cur = Music.cur;
    return `<div class="page"><div class="top"><h1 class="h1">Музыка</h1><span class="chip">${L.length} треков</span></div>
      <div class="drop"><div class="ibtn" style="background:var(--raised)">${ic('music')}</div><div class="b">Загрузи свою музыку</div><div class="sm muted">mp3, m4a, wav — выбери файлы из приложения «Файлы» на iPhone</div>
      <label class="btn primary lg" for="file" tabindex="0" style="margin-top:6px">${ic('plus')} Добавить треки</label><input id="file" type="file" accept="audio/*,.mp3,.m4a,.aac,.wav,.flac" multiple></div>
      <div class="row" style="margin:14px 0"><button class="btn grow ${Music.shuffle ? 'on' : ''}" data-a="shuffle" aria-pressed="${Music.shuffle}">${ic('shuffle')} Вперемешку</button><button class="btn grow ${Music.repeat ? 'on' : ''}" data-a="repeat" aria-pressed="${Music.repeat}">${ic('repeat')} По кругу</button></div>
      ${L.map((t, i) => `<div class="track ${cur && cur.id === t.id ? 'cur' : ''}"><button class="ibtn" data-a="tplay" data-i="${i}" aria-label="Играть: ${esc(t.name)}">${ic(cur && cur.id === t.id && Music.playing ? 'pause' : 'play')}</button><div class="grow"><div class="n">${esc(t.name)}</div><div class="xs muted">${(t.size / 1048576).toFixed(1).replace('.', ',')} МБ</div></div><button class="ibtn" style="border:0;background:none" data-a="tdel" data-id="${t.id}" aria-label="Удалить: ${esc(t.name)}">${ic('trash')}</button></div>`).join('')}
      <p class="xs muted">Треки хранятся только на этом телефоне и никуда не отправляются. Музыка играет, пока экран включён — во время тренировки он не гаснет.</p></div>`;
  }
  function renderMini() {
    const c = Music.cur; mini.classList.toggle('on', !!c); view.classList.toggle('has-mini', !!c);
    if (!c) { mini.innerHTML = ''; return; }
    mini.innerHTML = `<div class="eq ${Music.playing ? 'play' : ''}"><i></i><i></i><i></i></div><div class="grow b" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-left:6px">${esc(c.name)}</div>
      <button class="ibtn" style="border:0;background:none" data-a="mprev" aria-label="Назад">${ic('prev')}</button><button class="ibtn" data-a="mtoggle" aria-label="${Music.playing ? 'Пауза' : 'Играть'}">${ic(Music.playing ? 'pause' : 'play')}</button><button class="ibtn" style="border:0;background:none" data-a="mnext" aria-label="Дальше">${ic('next')}</button>`;
  }

  function histSheet(s) {
    const nm = ex => (window.EX && EX[ex]) ? EX[ex].name : ex;
    const planned = PROG.DAYS[s.day] ? PROG.DAYS[s.day].list.map(x => x.ex) : [];
    const byEx = {};
    (s.sets || []).forEach(x => { (byEx[x.ex] = byEx[x.ex] || []).push(x); });
    const done = Object.keys(byEx), skipped = planned.filter(ex => !byEx[ex]);
    const totalSets = (s.sets || []).length, totalReps = (s.sets || []).reduce((a, x) => a + x.r, 0);
    const date = App.parse(s.date).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
    const doneHtml = done.map(ex => { const a = byEx[ex], w = a.some(z => z.w > 0) ? ' · ' + a.map(z => fmt(z.w)).join('/') + ' кг' : ''; return `<div class="setrow"><div class="grow"><div class="b">${nm(ex)}</div><div class="xs muted">${a.length} подх · ${a.map(z => z.r).join(' · ')} повт${w}</div></div><span class="chip green">${ic('check')}</span></div>`; }).join('');
    const skipHtml = skipped.length ? skipped.map(ex => `<div class="setrow"><div class="grow"><div class="b" style="color:var(--muted)">${nm(ex)}</div></div><span class="chip">—</span></div>`).join('') : '<p class="sm muted" style="margin:8px 0 0">Ничего не пропустил — весь день закрыл.</p>';
    return `<div class="row between" style="margin-bottom:6px"><h2 style="font-size:24px">День ${s.day}</h2><button class="ibtn" data-a="sclose" aria-label="Закрыть">${ic('x')}</button></div>
      <div class="sm muted" style="margin:0 0 14px">${date} · ${Math.round(s.dur / 60)} мин · ${totalSets} подходов · ${totalReps} повторов</div>
      <div class="eyebrow">Сделал</div>${doneHtml || '<p class="sm muted" style="margin:8px 0 0">Подходов не записано.</p>'}
      <div class="eyebrow" style="margin-top:14px">Пропустил</div>${skipHtml}`;
  }

  /* ============ ПРОГРЕСС ============ */
  function chart(b) {
    if (b.length < 2) return '<p class="sm muted" style="margin:10px 0 0">Добавь вес минимум два раза, чтобы увидеть график.</p>';
    const pts = b.slice(-14), mn = Math.min(...pts.map(x => x.kg)) - 0.5, mx = Math.max(...pts.map(x => x.kg)) + 0.5, W = 300, H = 110;
    const xy = pts.map((p, i) => [8 + i * (W - 16) / (pts.length - 1), H - 10 - (p.kg - mn) / (mx - mn) * (H - 24)]);
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;margin-top:10px" role="img" aria-label="График веса тела"><polyline points="${xy.map(p => p.join(',')).join(' ')}" fill="none" stroke="#e3b968" stroke-width="2.5" stroke-linejoin="round" style=""/>${xy.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#0a0a0b" stroke="#e3b968" stroke-width="2"/>`).join('')}</svg>
      <div class="row between xs muted"><span>${fmt(pts[0].kg)} кг</span><span>${fmt(pts[pts.length - 1].kg)} кг</span></div>`;
  }
  function gainBlock(body) {
    const RATE = 0.25; // кг/нед — сухой набор
    // Две ступени-ачивки под рост 180 см (сухой): Бейтман 74 → Бэтмен 80
    const STAGES = [
      { icon: '🔪', name: 'Патрик Бейтман', kg: 74, tag: 'рельеф + база' },
      { icon: '🦇', name: 'Бэтмен (Бэйл)', kg: 80, tag: 'масса и ширина спины/плеч' }
    ];
    if (!body.length) {
      const srows = STAGES.map(s => `<div class="row between" style="margin-top:10px"><div><div class="b">${s.icon} ${s.name}</div><div class="xs muted">${s.tag} · ${s.kg} кг</div></div><span class="num muted" style="font-size:20px">${s.kg} кг</span></div>`).join('');
      return `<div class="card glow" style="margin:12px 0 0"><div class="eyebrow">🎯 Цель · две ступени</div>${srows}<p class="sm muted" style="margin:10px 0 0">Запиши вес — поведу к первой ступени темпом <b style="color:#fff">+0,25 кг/нед</b>. Взвешивайся раз в неделю утром натощак.</p></div>`;
    }
    const first = body[0], lastB = body[body.length - 1], cur = lastB.kg;
    const activeIdx = STAGES.findIndex(s => cur < s.kg); // -1 => обе взяты
    const srows = STAGES.map((s, i) => {
      const done = cur >= s.kg, active = i === activeIdx;
      const right = done ? '<span class="chip green">взято ✓</span>'
        : active ? `<span class="num" style="color:var(--accent)">${s.kg}<span class="sm muted" style="font-family:var(--body)"> кг</span></span>`
        : `<span class="num muted" style="font-size:20px">${s.kg} кг</span>`;
      let block = `<div class="row between" style="margin-top:${i ? 14 : 12}px"><div><div class="b${active || done ? '' : ' muted'}">${s.icon} ${s.name}</div><div class="xs muted">${s.tag} · ${s.kg} кг</div></div>${right}</div>`;
      if (active) {
        const segStart = i > 0 ? STAGES[i - 1].kg : Math.min(first.kg, cur);
        const span = s.kg - segStart, pct = Math.max(0, Math.min(100, span > 0 ? (cur - segStart) / span * 100 : 0));
        const remain = Math.max(0, s.kg - cur), months = Math.round(remain / RATE / 4.345);
        block += `<div style="height:8px;border-radius:99px;background:var(--active);overflow:hidden;margin:10px 0 8px"><div style="height:100%;width:${pct}%;background:var(--accent)"></div></div>
          <div class="row between sm"><span class="muted">${fmt(cur)} кг сейчас</span><span class="b" style="color:var(--accent)">осталось +${fmt(remain)} кг</span></div>
          <p class="sm muted" style="margin:8px 0 0">~${months} мес темпом +0,25 кг/нед · ${s.tag}</p>`;
      }
      return block;
    }).join('');
    const goalCard = `<div class="card glow" style="margin:12px 0 0"><div class="row between"><span class="eyebrow">🎯 Цель · две ступени</span>${activeIdx === -1 ? '<span class="chip green">обе взяты 🔥</span>' : ''}</div>${srows}</div>`;
    const weeks = (App.parse(lastB.d) - App.parse(first.d)) / 6048e5;
    const gained = lastB.kg - first.kg, target = RATE * weeks, expected = first.kg + target;
    let status, cls, tip;
    if (weeks < 1) {
      status = 'Собираю данные'; cls = ''; tip = 'Взвешивайся раз в неделю утром натощак — через неделю покажу темп набора.';
    } else {
      const diff = gained - target;
      if (diff < -0.3) { status = 'Отстаёшь'; cls = 'red'; tip = 'Набор медленный. Добавь ~250 ккал в день — проще всего смузи (молоко + банан + овсянка + арахисовая паста + протеин, ~700 ккал).'; }
      else if (diff > 0.5) { status = 'Быстро'; cls = ''; tip = 'Для сухого набора чуть быстро — убавь ~200 ккал, чтобы меньше заливало жиром.'; }
      else { status = 'На пути'; cls = 'green'; tip = 'Темп ровно в цель — так и держи. Белок 110–135 г, сон 8 ч.'; }
    }
    return goalCard + `<div class="card" style="margin:12px 0 0;background:var(--raised)">
      <div class="row between" style="margin-bottom:8px"><span class="eyebrow">Недельный темп +0,25 кг/нед</span><span class="chip ${cls}">${status}</span></div>
      <div class="kpi"><div><b>${fmt(first.kg)}</b><span>старт, кг</span></div><div><b>${gained >= 0 ? '+' : ''}${fmt(gained)}</b><span>набрал, кг</span></div><div><b>${weeks >= 1 ? fmt(expected) : '—'}</b><span>цель к дате</span></div></div>
      <p class="sm" style="margin:10px 0 0">${tip}</p></div>`;
  }
  function renderStats() {
    const log = App.log().filter(s => s.day !== 'K' && s.day !== 'R'), body = App.body(), last = body[body.length - 1];
    const prs = {}; log.forEach(s => s.sets.forEach(x => { const p = prs[x.ex]; if (!p || x.w > p.w || (x.w === p.w && x.r > p.r)) prs[x.ex] = { w: x.w, r: x.r }; }));
    const reps = log.reduce((a, s) => a + s.sets.reduce((b, x) => b + x.r, 0), 0);
    const hist = log.slice(-8).reverse();
    return `<div class="page"><div class="top"><h1 class="h1">Прогресс</h1><span class="chip">180 см</span></div>
      <div class="kpi" style="margin-bottom:14px"><div><b>${log.length}</b><span>тренировок</span></div><div><b>${log.reduce((a, s) => a + s.sets.length, 0)}</b><span>подходов</span></div><div><b>${reps}</b><span>повторов</span></div></div>
      <div class="card"><div class="row between"><div><div class="eyebrow">Вес тела</div><div class="num" style="margin-top:4px;font-size:34px">${last ? fmt(last.kg) + ' кг' : '72 кг'}</div></div></div>
        <div class="row" style="margin-top:12px"><input id="bw" type="number" inputmode="decimal" step="0.1" min="30" max="200" placeholder="Сегодня, кг" aria-label="Вес тела, кг"><button class="btn primary" data-a="bw" style="flex:none">Записать</button></div>${chart(body)}${gainBlock(body)}</div>
      <div class="card"><div class="eyebrow">Рекорды</div>${Object.keys(prs).length ? Object.keys(prs).map(id => `<div class="setrow"><div class="grow b">${EX[id].name}</div><div class="num">${prs[id].w ? fmt(prs[id].w) + ' кг × ' + prs[id].r : prs[id].r + ' повт.'}</div></div>`).join('') : '<p class="sm muted" style="margin:8px 0 0">Пока пусто — первая тренировка всё заполнит.</p>'}</div>
      <div class="card"><div class="eyebrow">История</div>${hist.length ? hist.map(s => `<button class="setrow" data-a="hist" data-id="${s.id}" style="width:100%;background:none;border:0;border-bottom:1px solid var(--line);text-align:left"><div class="grow"><div class="b">День ${s.day} · ${PROG.DAYS[s.day] ? PROG.DAYS[s.day].name : ''}</div><div class="xs muted">${App.parse(s.date).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })} · ${Math.round(s.dur / 60)} мин</div></div><span class="chip">${s.sets.length} подх.</span>${ic('chev')}</button>`).join('') : '<p class="sm muted" style="margin:8px 0 0">Тренировок пока нет.</p>'}<p class="xs muted" style="margin:8px 0 0">Нажми на тренировку — покажу, что сделал и что пропустил.</p></div>
      <div class="card"><div class="eyebrow">Старт программы</div><p class="sm muted" style="margin:6px 0 10px">Сейчас идёт неделя ${App.week()}. Дата начала — понедельник первой недели.</p><div class="row"><input id="sd" type="date" value="${App.startDate()}" aria-label="Дата начала программы"><button class="btn" data-a="sdset" style="flex:none">Сохранить</button></div><button class="btn ghost block" style="margin-top:10px" data-a="sdnow">Начать цикл с этой недели</button></div>
      ${syncCard()}
      <div class="card"><div class="eyebrow">Данные · бэкап</div>
        <p class="sm muted" style="margin:6px 0 12px">Ручной перенос, если синхронизация выключена. Музыка не входит — она хранится отдельно на каждом телефоне.</p>
        <div class="row" style="gap:10px"><button class="btn grow" data-a="bkpfile">${ic('down')} Сохранить файл</button><button class="btn grow" data-a="bkpcode">${ic('copy')} Код</button></div>
        <button class="btn ghost block" style="margin-top:10px" data-a="bkprestore">Восстановить из кода или файла</button></div>
      <p class="xs muted" style="text-align:center;margin:16px 0 0">Громила · версия ${VER}</p></div>`;
  }

  /* ============ ТРЕНИРОВКА ============ */
  let W = null, wfig = null, tmr = null, wake = null, actx = null;
  const beep = (f, d) => { if (!actx) return; try { const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = f; o.type = 'sine'; g.gain.value = 0.0001; o.connect(g); g.connect(actx.destination); const t = actx.currentTime; g.gain.exponentialRampToValueAtTime(0.5, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.start(t); o.stop(t + d + 0.05); } catch (e) { /* без звука */ } };
  const keepAwake = async () => { try { if ('wakeLock' in navigator && W) wake = await navigator.wakeLock.request('screen'); } catch (e) { /* не поддерживается */ } };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && W) keepAwake(); });

  function setInputs() {
    const it = W.items[W.i], ex = EX[it.ex], last = App.last(ex.id);
    W.w = last ? last.w : ex.w; W.r = last ? last.r : (parseInt(it.reps) || 10);
    if (oneDB() && !last && W.w > 9) W.w = 9;
  }
  function startWorkout(dayId) {
    const wk = App.week(), ph = PROG.phaseOfWeek(wk), d = PROG.DAYS[dayId];
    W = { day: dayId, ph, wk, items: d.list.map(x => ({ ex: x.ex, sets: x.sets[ph], reps: x.reps[ph], rest: x.rest, note: x.note })), i: 0, s: 0, sets: [], t0: Date.now(), mode: 'work', pend: null };
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); } catch (e) { actx = null; }
    keepAwake(); setInputs(); renderW();
  }
  function stopFig() { if (wfig) { wfig.destroy(); wfig = null; } }
  function clearTmr() { if (tmr) { clearInterval(tmr); tmr = null; } }
  function wmusic() {
    return `<div class="row" id="wmusic" style="justify-content:center;gap:8px">${Music.list.length ? `<button class="ibtn" data-a="mprev" aria-label="Назад">${ic('prev')}</button><button class="ibtn" data-a="mtoggle" aria-label="Музыка">${ic(Music.playing ? 'pause' : 'play')}</button><button class="ibtn" data-a="mnext" aria-label="Дальше">${ic('next')}</button><div class="sm muted grow" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${Music.cur ? esc(Music.cur.name) : 'Включить музыку'}</div>` : `<div class="sm muted">Добавь музыку на вкладке «Музыка»</div>`}</div>`;
  }
  function updWMusic() { const m = $('#wmusic'); if (m) m.outerHTML = wmusic(); }

  function renderW() {
    stopFig(); clearTmr();
    let o = $('#wov'); if (!o) { o = document.createElement('div'); o.className = 'ov'; o.id = 'wov'; layer.appendChild(o); }
    const it = W.items[W.i], ex = EX[it.ex], P = PROG.PHASES[W.ph];
    const prog = W.items.map((_, k) => `<i class="${k < W.i ? 'on' : k === W.i ? 'cur' : ''}"></i>`).join('');
    if (W.mode === 'work') {
      const unit = ex.w === 0 ? 'доп. кг' : 'кг на гантель';
      const last = App.last(ex.id), lw = last && last.w > 0;
      const lastTxt = last ? (lw ? `${fmt(last.w)} кг × ${last.r}` : `${last.r} повт`) : 'первый раз';
      const goalTxt = last ? (lw ? `${last.r + 1} повт · или ${fmt(last.w + 0.5)} кг` : `${last.r + 1} повт`) : 'задай рабочий вес';
      o.innerHTML = `<div class="body"><div class="bar"><button class="ibtn" data-a="wexit" aria-label="Выйти">${ic('x')}</button><div class="prog">${prog}</div><span class="xs b">${W.i + 1}/${W.items.length}</span></div>
        <div class="stage" id="wstage" data-a="figtoggle"><div class="name">${ex.name}</div></div>
        <div class="chips" style="margin-top:10px;flex-wrap:wrap">${ex.mus.map(m => `<span class="chip red">${m}</span>`).join('')}</div>
        <div class="card" style="margin-bottom:10px"><div class="row between"><div><div class="tag">Подход</div><div class="num">${W.s + 1} / ${it.sets}</div></div><div><div class="tag">Повторов</div><div class="num">${it.reps}</div></div><div><div class="tag">Темп</div><div class="num">${P.tempo}</div></div></div>
          <p class="xs muted" style="margin:10px 0 0">${tempoText(P.tempo)}${it.note ? ' · ' + it.note : ''}</p>
          ${oneDB() && ex.one ? `<div class="row" style="margin-top:10px;padding:8px 10px;background:var(--raised);border-radius:10px;gap:8px;align-items:flex-start"><span class="chip" style="flex:none">1 гантель</span><span class="xs" style="line-height:1.4">${ex.one}</span></div>` : ''}
          <div class="row between" style="margin-top:10px;padding-top:10px;border-top:1px solid var(--line)"><div><div class="tag">Прошлый раз</div><div class="b">${lastTxt}</div></div><div style="text-align:right"><div class="tag">Побей</div><div class="b" style="color:var(--accent)">${goalTxt}</div></div></div></div>
        <div class="two"><div class="stepper"><button data-a="wstep" data-k="w" data-d="-0.5" aria-label="Меньше веса">−</button><div class="v"><b id="vw">${fmt(W.w)}</b><span>${unit}</span></div><button data-a="wstep" data-k="w" data-d="0.5" aria-label="Больше веса">+</button></div>
        <div class="stepper"><button data-a="wstep" data-k="r" data-d="-1" aria-label="Меньше повторов">−</button><div class="v"><b id="vr">${W.r}</b><span>повторов</span></div><button data-a="wstep" data-k="r" data-d="1" aria-label="Больше повторов">+</button></div></div></div>
        <div class="foot"><button class="btn primary lg block" data-a="setdone">${ic('check')} Подход выполнен</button><div class="row" style="margin-top:8px"><button class="btn sm" data-a="tech" data-id="${ex.id}">${ic('info')} Техника</button><button class="btn sm ghost" data-a="wskip">Пропустить</button>${Music.list.length ? '<div class="grow"></div>' : ''}</div>${Music.list.length ? `<div style="margin-top:8px">${wmusic()}</div>` : ''}</div>`;
      wfig = Fig.mount($('#wstage'), ex);
    } else if (W.mode === 'rest') {
      const nx = W.items[W.pend.i], nex = EX[nx.ex], newEx = W.pend.i !== W.i;
      o.innerHTML = `<div class="body" style="text-align:center"><div class="bar"><button class="ibtn" data-a="wexit" aria-label="Выйти">${ic('x')}</button><div class="prog">${prog}</div><span class="xs b">${W.i + 1}/${W.items.length}</span></div>
        <div class="eyebrow" style="margin-top:8px">Отдых</div>
        <div class="ring"><svg viewBox="0 0 100 100"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e3b968"/><stop offset="1" stop-color="#e3b968"/></linearGradient></defs><circle class="bg" cx="50" cy="50" r="44"/><circle class="fg" id="rfg" cx="50" cy="50" r="44" stroke-dasharray="276.46" stroke-dashoffset="0"/></svg><div class="t"><span id="rt">0:00</span><small>секунд</small></div></div>
        <div class="card" style="text-align:left"><div class="eyebrow">${newEx ? 'Следующее упражнение' : 'Следующий подход'}</div><div class="row" style="margin-top:10px"><div class="thumbbox">${thumb(nex.id)}</div><div class="grow"><div class="b" style="line-height:1.25">${nex.name}</div><div class="sm muted">Подход ${W.pend.s + 1} из ${nx.sets} · ${/\d/.test(nx.reps) ? nx.reps + ' повт.' : nx.reps}</div></div></div></div>
        <div class="row" style="justify-content:center"><button class="btn" data-a="radd">+15 с</button><button class="btn primary" data-a="rskip">Пропустить отдых</button></div></div>
        <div class="foot">${wmusic()}</div>`;
      runRest();
    } else {
      const sets = W.sets, reps = sets.reduce((a, x) => a + x.r, 0), ton = sets.reduce((a, x) => a + x.w * x.r, 0), dur = Math.round((Date.now() - W.t0) / 60000);
      if (!sets.length) {
        o.innerHTML = `<div class="body" style="text-align:center"><div style="height:30px"></div><div class="ibtn" style="width:84px;height:84px;margin:0 auto 14px;background:var(--active);color:var(--accent);border:0"><svg class="i" style="width:44px;height:44px;stroke-width:2.6" viewBox="0 0 24 24">${ICON.info}</svg></div><h1 class="h1">Ничего не записано</h1><p class="muted" style="margin:6px 0 0">Ты не отметил ни одного подхода. В тренировке после каждого подхода жми <b style="color:#fff">«Подход выполнен»</b> — тогда он попадёт в итоги.</p>
        <div class="card" style="text-align:left;margin-top:16px"><p class="sm" style="margin:0">Если ты всё же отзанимался — запиши День ${W.day} сделанным, и он появится в итогах (с плановыми подходами).</p></div></div>
        <div class="foot"><button class="btn primary lg block" data-a="logday" data-day="${W.day}">${ic('check')} Записать как сделано</button><button class="btn ghost block" style="margin-top:8px" data-a="wdone">Не записывать</button></div>`;
      } else {
      o.innerHTML = `<div class="body" style="text-align:center"><div style="height:30px"></div><div class="ibtn" style="width:84px;height:84px;margin:0 auto 14px;background:#3fc07a;color:#042019;border:0"><svg class="i" style="width:44px;height:44px;stroke-width:2.6" viewBox="0 0 24 24">${ICON.check}</svg></div><h1 class="h1">Тренировка завершена</h1><p class="muted">День ${W.day} · ${PROG.DAYS[W.day].name}</p>
        <div class="kpi" style="margin:18px 0"><div><b>${sets.length}</b><span>подходов</span></div><div><b>${reps}</b><span>повторов</span></div><div><b>${dur}</b><span>минут</span></div></div>
        ${ton ? `<div class="card"><div class="eyebrow">Тоннаж</div><div class="num" style="font-size:40px;margin-top:4px">${Math.round(ton)} кг</div></div>` : ''}${reviewHTML({ id: W.saved, day: W.day, sets: W.sets })}<p class="sm muted" style="margin-top:14px">Теперь белок, вода и сон — мышцы растут в отдыхе.</p></div>
        <div class="foot"><button class="btn primary lg block" data-a="wdone">Готово</button></div>`;
      }
    }
  }

  function runRest() {
    const secs = W.restLeft; W.restEnd = Date.now() + secs * 1000; W.restTotal = secs; let lastShown = -1;
    const tick = () => {
      const left = Math.max(0, Math.ceil((W.restEnd - Date.now()) / 1000)), t = $('#rt'), r = $('#rfg');
      if (t && left !== lastShown) { t.textContent = mmss(left); if (left > 0 && left <= 3) beep(660, 0.12); lastShown = left; }
      if (r) r.setAttribute('stroke-dashoffset', 276.46 * (1 - left / Math.max(W.restTotal, 1)));
      if (left <= 0) { clearTmr(); beep(990, 0.5); advance(); }
    };
    tick(); tmr = setInterval(tick, 200);
  }
  function advance() { const p = W.pend, newEx = p.i !== W.i; W.i = p.i; W.s = p.s; W.pend = null; if (newEx) setInputs(); W.mode = 'work'; renderW(); }
  function setDone() {
    const it = W.items[W.i];
    W.sets.push({ ex: it.ex, w: W.w, r: W.r, n: W.s + 1 });
    let ni = W.i, ns = W.s + 1;
    if (ns >= it.sets) { ni++; ns = 0; }
    if (ni >= W.items.length) { finish(); return; }
    W.pend = { i: ni, s: ns }; W.restLeft = it.rest; W.mode = 'rest'; renderW();
  }
  function finish() { W.mode = 'done'; clearTmr(); stopFig(); if (W.sets.length) save(); renderW(); }
  function save() { const n = new Date(); const s = { id: n.getTime(), date: App.iso(n), day: W.day, week: W.wk, ph: W.ph, dur: Math.round((Date.now() - W.t0) / 1000), sets: W.sets }; App.addSession(s); W.saved = s.id; }
  /* Записать день «как сделано» из плана — для случая, когда занимался, но не отмечал подходы */
  function logDayDone(dayId) {
    const wk = App.week(), ph = PROG.phaseOfWeek(wk), d = PROG.DAYS[dayId], now = new Date(), sets = [];
    d.list.forEach(x => { const n = x.sets[ph], last = App.last(x.ex), r0 = parseInt(x.reps[ph]) || 10; for (let i = 0; i < n; i++) sets.push({ ex: x.ex, w: last ? last.w : (EX[x.ex].w || 0), r: last ? last.r : r0, n: i + 1 }); });
    App.addSession({ id: now.getTime(), date: App.iso(now), day: dayId, week: wk, ph, dur: d.mins * 60, sets });
  }
  /* ====== Авто-разбор тренировки (экран «Завершена») ====== */
  /* Добивные = финишеры: мелкие/изолирующие, которые часто бросают в конце */
  const FINISHERS = ['skull', 'closepush', 'hammer', 'calf', 'crunch', 'legraise'];
  function analyze(s) {
    const day = PROG.DAYS[s.day]; if (!day || !s.sets.length) return null;
    const cur = {};
    s.sets.forEach(x => { const a = cur[x.ex] || (cur[x.ex] = { n: 0, bw: 0, br: 0, reps: 0 }); a.n++; a.reps += x.r; if (x.w > a.bw || (x.w === a.bw && x.r > a.br)) { a.bw = x.w; a.br = x.r; } });
    const prevS = App.log().filter(p => p.day === s.day && p.id !== s.id).sort((a, b) => b.id - a.id)[0];
    const prev = {};
    if (prevS) prevS.sets.forEach(x => { const a = prev[x.ex] || (prev[x.ex] = { bw: 0, br: 0 }); if (x.w > a.bw || (x.w === a.bw && x.r > a.br)) { a.bw = x.w; a.br = x.r; } });
    const rows = day.list.map(it => {
      const ex = it.ex, c = cur[ex], p = prev[ex], E = EX[ex];
      let trend = 'new';
      if (!c) trend = 'skip'; else if (!p) trend = 'new';
      else if (c.bw > p.bw || (c.bw === p.bw && c.br > p.br)) trend = 'up';
      else if (c.bw === p.bw && c.br === p.br) trend = 'same'; else trend = 'down';
      return { ex, name: E ? E.name : ex, c, p, trend, fin: FINISHERS.includes(ex) };
    });
    const doneN = rows.filter(r => r.c).length;
    const finRows = rows.filter(r => r.fin);
    let cmp = 0, prog = 0;
    rows.forEach(r => { if (r.c && r.p) { cmp++; if (r.trend === 'up') prog++; } });
    const doneRatio = rows.length ? doneN / rows.length : 1;
    let score = cmp ? doneRatio * 7 + (prog / cmp) * 3 : doneRatio * 10;
    score = Math.max(1, Math.min(10, Math.round(score)));
    return { rows, doneN, planned: rows.length, finRows, finDone: finRows.filter(r => r.c).length, prog, cmp, score, hasPrev: !!prevS };
  }
  function reviewHTML(s) {
    const a = analyze(s); if (!a) return '';
    const sColor = a.score >= 8 ? 'var(--green)' : a.score >= 5 ? 'var(--accent)' : 'var(--red)';
    const verdict = a.score >= 9 ? 'Машина. Так держать 🔥' : a.score >= 7 ? 'Крепко отработал 💪' : a.score >= 5 ? 'Нормально, но добивай до конца' : 'Мало — не бросай упражнения до конца';
    const rows = a.rows.map(r => {
      let chip;
      if (!r.c) chip = '<span class="chip red">пропуск</span>';
      else {
        const best = r.c.bw > 0 ? `${fmt(r.c.bw)} кг × ${r.c.br}` : `${r.c.br} повт.`;
        const cls = r.trend === 'up' ? ' green' : r.trend === 'down' ? ' red' : '';
        const mark = r.trend === 'up' ? ' ↑' : r.trend === 'down' ? ' ↓' : '';
        chip = `<span class="chip${cls}">${best}${mark}</span>`;
      }
      return `<div class="row between" style="padding:9px 0;border-top:1px solid var(--line);gap:12px"><span class="sm${r.c ? '' : ' muted'}" style="text-align:left">${r.fin ? '🥊 ' : ''}${r.name}</span>${chip}</div>`;
    }).join('');
    let fin = '';
    if (a.finRows.length) {
      const miss = a.finRows.filter(r => !r.c).map(r => r.name);
      fin = miss.length
        ? `<div class="row" style="margin-top:12px;gap:8px"><span class="chip red">Добив пропущен</span><span class="sm muted grow" style="text-align:left">${miss.join(', ')}</span></div>`
        : '<div class="row" style="margin-top:12px"><span class="chip green">Добивные — все ✓</span></div>';
    }
    const progLine = a.hasPrev && a.cmp
      ? `<div class="sm muted" style="margin-top:10px;text-align:left">📈 Выросли: ${a.prog} из ${a.cmp} упражнений vs прошлый раз</div>`
      : '<div class="sm muted" style="margin-top:10px;text-align:left">📈 Первый раз этот день — это точка отсчёта</div>';
    return `<div class="card glow" style="text-align:left;margin-top:16px">
      <div class="row between"><div class="eyebrow">Разбор тренировки</div><div class="num" style="color:${sColor}">${a.score}<span class="sm muted" style="font-family:var(--body)">/10</span></div></div>
      <div class="sm" style="color:${sColor};font-weight:700;margin-top:2px">${verdict}</div>
      <div style="margin-top:10px">${rows}</div>
      ${fin}${progLine}
      <div class="sm muted" style="margin-top:10px;text-align:left">Сделано ${a.doneN} из ${a.planned} упражнений дня.</div>
    </div>`;
  }

  function closeW() { clearTmr(); stopFig(); const o = $('#wov'); if (o) o.remove(); if (wake) { wake.release().catch(() => {}); wake = null; } W = null; render(); }

  function sheet(html) { const s = document.createElement('div'); s.className = 'sheet'; s.innerHTML = `<div class="p" role="dialog" aria-modal="true">${html}</div>`; s.addEventListener('click', e => { if (e.target === s) s.remove(); }); layer.appendChild(s); return s; }

  /* ============ СОБЫТИЯ ============ */
  const A = {
    tab: t => go(t.dataset.t), start: t => startWorkout(t.dataset.day),
    pw: t => { st.pw = +t.dataset.w; render(); }, grp: t => { st.lib = t.dataset.g; render(); },
    ex: t => openEx(t.dataset.id), exclose: closeEx,
    figtoggle: () => { const f = wfig || exFig; if (!f) return; const p = f.toggle(); document.querySelectorAll('.pp').forEach(b => b.innerHTML = ic(p ? 'pause' : 'play')); },
    tech: t => sheet(`<div class="row between" style="margin-bottom:6px"><h2 style="font-size:24px">${EX[t.dataset.id].name}</h2><button class="ibtn" data-a="sclose" aria-label="Закрыть">${ic('x')}</button></div>${techHTML(EX[t.dataset.id])}`),
    sclose: t => t.closest('.sheet').remove(),
    wstep: t => { const k = t.dataset.k, d = +t.dataset.d; W[k] = Math.max(0, Math.round((W[k] + d) * 10) / 10); $(k === 'w' ? '#vw' : '#vr').textContent = k === 'w' ? fmt(W.w) : W.r; },
    setdone: setDone, wskip: () => { if (W.i + 1 < W.items.length) { W.i++; W.s = 0; setInputs(); renderW(); } else finish(); },
    radd: () => { W.restEnd += 15000; W.restTotal += 15; }, rskip: () => { clearTmr(); advance(); },
    wexit: () => { const n = W.sets.length; const s = sheet(`<h2 style="font-size:24px;margin-bottom:6px">Завершить тренировку?</h2><p class="muted">Выполнено подходов: ${n}.</p><div class="col"><button class="btn primary lg" data-a="sclose">Продолжить</button>${n ? '<button class="btn" data-a="wsave">Завершить и сохранить</button>' : ''}<button class="btn ghost" data-a="wquit">Выйти без сохранения</button></div>`); },
    wsave: t => { t.closest('.sheet').remove(); finish(); }, wquit: t => { t.closest('.sheet').remove(); closeW(); },
    wdone: () => { closeW(); go('stats'); },
    shuffle: () => Music.setShuffle(!Music.shuffle), repeat: () => Music.setRepeat(!Music.repeat),
    tplay: t => { const i = +t.dataset.i; if (Music.idx === i) Music.toggle(); else Music.play(i); },
    tdel: t => { if (confirm('Удалить трек?')) Music.remove(t.dataset.id); },
    mtoggle: () => Music.toggle(), mnext: () => Music.next(), mprev: () => Music.prev(),
    bw: () => { const v = parseFloat(($('#bw').value || '').replace(',', '.')); if (!(v >= 30 && v <= 200)) { toast('Введи вес от 30 до 200 кг'); return; } App.addBody(v); render(); toast('Записано'); },
    sdset: () => { const v = $('#sd').value; if (v) { App.S.set('start', v); if (window.Sync) Sync.kick(); render(); toast('Дата сохранена'); } },
    sdnow: () => { App.S.set('start', App.iso(App.mondayOf(new Date()))); if (window.Sync) Sync.kick(); render(); toast('Цикл начат с этой недели'); },
    snus: () => { App.snusAdd(); render(); toast('Отметил'); },
    snuscfg: () => openSnusSheet(),
    snusint: t => { App.snusSetInterval(App.snusInterval() + (+t.dataset.d)); openSnusSheet(); render(); },
    snusundo: () => { App.snusUndo(); openSnusSheet(); render(); toast('Отменил последний'); },
    snusreset: () => { App.snusResetToday(); openSnusSheet(); render(); toast('Сброшено за сегодня'); },
    bkpfile: () => { if (download(`gromila-backup-${App.iso(new Date())}.json`, JSON.stringify(App.dump()))) toast('Файл бэкапа сохранён'); else toast('Не удалось сохранить файл'); },
    bkpcode: async () => { const code = b64enc(JSON.stringify(App.dump())); try { await navigator.clipboard.writeText(code); toast('Код скопирован'); } catch (e) { copyFallback(code); } },
    bkprestore: () => sheet(bkpSheet()),
    bkpdo: () => { const v = ($('#bkpin') && $('#bkpin').value || '').trim(); if (!v) { toast('Вставь код или выбери файл'); return; } applyBackup(v); },
    syncopen: () => sheet(syncSheet()),
    syncconn: async t => { const el = $('#synctok'), tok = el ? el.value : ''; if (!tok.trim()) { toast('Вставь токен'); return; } t.disabled = true; t.textContent = 'Подключаю…'; const r = await Sync.connect(tok); if (r.ok) { const sh = document.querySelector('.sheet'); if (sh) sh.remove(); render(); toast(r.warn ? 'Подключено, но: ' + r.warn : 'Синхронизация включена'); } else { t.disabled = false; t.textContent = 'Подключить'; toast(r.error || 'Не удалось подключить'); } },
    syncnow: async () => { toast('Синхронизирую…'); await Sync.sync(); render(); },
    syncoff: () => { if (confirm('Отключить синхронизацию на этом устройстве? Данные останутся в приложении.')) { Sync.disconnect(); render(); toast('Синхронизация отключена'); } },
    hist: t => { const id = +t.dataset.id, s = App.log().find(x => x.id === id); if (s) sheet(histSheet(s)); },
    onedb: () => { const v = !oneDB(); App.S.set('onedb', v); if (window.Sync) Sync.kick(); render(); toast(v ? 'Режим «одна гантель» включён' : 'Обычный режим'); },
    logday: t => { const day = t.dataset.day; if (W) { logDayDone(day); closeW(); go('stats'); toast('Тренировка записана в итоги'); } else if (confirm(`Отметить День ${day} сделанным? Он попадёт в итоги с плановыми подходами.`)) { logDayDone(day); render(); toast('Тренировка записана в итоги'); } }
  };
  document.addEventListener('click', e => { const t = e.target.closest('[data-a]'); if (!t) return; const f = A[t.dataset.a]; if (f) { e.preventDefault(); f(t, e); } });
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role=button],label.btn')) { e.preventDefault(); e.target.click(); } });
  document.addEventListener('change', async e => {
    if (e.target.id === 'file') { const n = e.target.files.length; await Music.add([...e.target.files]); toast(`Добавлено треков: ${n}`); }
    else if (e.target.id === 'bkpfilein') { const f = e.target.files[0]; if (f) { try { applyBackup(await f.text()); } catch (err) { toast('Не удалось прочитать файл'); } } }
  });

  /* ============ РОУТЕР ============ */
  function renderTabs() { tabsEl.innerHTML = TABS.map(([id, n]) => `<button data-a="tab" data-t="${id}" aria-current="${st.tab === id}">${ic({ today: 'today', plan: 'plan', lib: 'lib', music: 'music', stats: 'stats' }[id])}<span>${n}</span></button>`).join(''); }
  function render() { stopSnusTick(); view.innerHTML = { today: renderToday, plan: renderPlan, lib: renderLib, music: renderMusic, stats: renderStats }[st.tab](); renderTabs(); renderMini(); snusTick(); }
  function go(t) { st.tab = t; App.S.set('tab', t); render(); view.scrollTop = 0; }

  Music.on(() => { renderMini(); if (st.tab === 'music' && !W && !$('#exov')) { const y = view.scrollTop; render(); view.scrollTop = y; } updWMusic(); });
  const refreshStats = () => { if (st.tab === 'stats' && !W && !$('#exov')) { const y = view.scrollTop; render(); view.scrollTop = y; } };
  window.onSyncApplied = refreshStats;
  if (window.Sync) Sync.on(refreshStats);
  Music.load().then(render);
  render();
  if ('serviceWorker' in navigator && /^https:|^http:\/\/localhost/.test(location.href) && !/localhost|127\.0\.0\.1/.test(location.host)) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
