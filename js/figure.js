/* figure.js — SVG-манекен с анимацией техники (вид сбоку / спереди) */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const D = Math.PI / 180;
  const L = { torso: 66, thigh: 46, shin: 46, uarm: 32, farm: 30 };
  const lerp = (a, b, t) => a + (b - a) * t;
  const vec = (a, len) => [Math.sin(a * D) * len, Math.cos(a * D) * len];
  const add = (p, v) => [p[0] + v[0], p[1] + v[1]];
  const ease = t => t * t * (3 - 2 * t);

  /* двухзвенная кинематика: возвращает [сустав, конец] */
  function ik(root, target, l1, l2, s) {
    const dx = target[0] - root[0], dy = target[1] - root[1];
    const d = Math.min(l1 + l2 - 0.01, Math.max(Math.abs(l1 - l2) + 0.5, Math.hypot(dx, dy)));
    const a = Math.atan2(dy, dx);
    const c = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
    const th = a + s * Math.acos(Math.max(-1, Math.min(1, c)));
    return [[root[0] + l1 * Math.cos(th), root[1] + l1 * Math.sin(th)],
            [root[0] + d * Math.cos(a), root[1] + d * Math.sin(a)]];
  }

  /* ---------- расчёт геометрии: вид сбоку ---------- */
  function solveSide(P) {
    const g = {};
    const tv = vec(P.torso, L.torso);
    let hip, sh;
    if (P.shoulder) { sh = P.shoulder.slice(); hip = [sh[0] - tv[0], sh[1] - tv[1]]; }
    else { hip = P.hip.slice(); sh = add(hip, tv); }
    const hd = P.head != null ? P.head : P.torso;
    g.head = add(sh, vec(hd, 21));
    g.neck = add(sh, vec(hd, 8));
    if (P.sh) sh = [sh[0], sh[1] - P.sh];
    g.hip = hip; g.sh = sh;

    const legIK = (foot, s) => ik(hip, foot, L.thigh, L.shin, s);
    const legDir = (t, sn) => { const k = add(hip, vec(t, L.thigh)); return [k, add(k, vec(sn, L.shin))]; };
    let [knee, ank] = P.foot ? legIK(P.foot, P.ks || -1) : legDir(P.thigh || 0, P.shin || 0);
    g.leg = { knee, ank, shoe: !!P.foot, rear: false };
    if (P.farThigh != null) { const [k, a] = legDir(P.farThigh, P.farShin); g.fleg = { knee: k, ank: a, shoe: false }; }
    else if (P.farFoot) { const [k, a] = legIK(P.farFoot, P.ks || -1); g.fleg = { knee: k, ank: a, shoe: true, rear: !!P.rearFoot }; }
    else g.fleg = { knee: [knee[0] - 9, knee[1]], ank: [ank[0] - 9, ank[1]], shoe: P.foot ? true : false };
    g.shoe = P.shoe || [17, 5];

    const u = L.uarm * (P.ufs || 1), f = L.farm * (P.ffs || 1);
    const arm = (root, target, hand) => {
      if (target) return ik(root, target, u, f, P.ed || 1);
      const e = add(root, vec(P.uarm || 0, u));
      return [e, add(e, vec(P.farm || 0, f))];
    };
    let tgt = P.hand || null;
    if (P.handHead) tgt = [g.head[0] + 5, g.head[1] - 4];
    if (P.handRel) tgt = [sh[0] + P.handRel[0], sh[1] + P.handRel[1]];
    const [el, ha] = arm(sh, tgt);
    g.arm = { el, ha };
    if (P.farArm === 'none') g.farm = null;
    else if (P.farArm && P.farArm.hand) { const [e2, h2] = arm(sh, P.farArm.hand); g.farm = { el: e2, ha: h2, still: true }; }
    else g.farm = { el: [el[0] - 6, el[1]], ha: [ha[0] - 6, ha[1]] };
    g.db = P.db || null;
    return g;
  }

  /* ---------- вид спереди ---------- */
  function solveFront(P) {
    const g = { front: true };
    const shY = P.shY || 98, hipY = P.hipY || 164;
    g.hip = [150, hipY]; g.sh = [150, shY];
    g.head = [150, P.shY ? shY - 15 : shY - 24];
    g.sw = 26; g.hw = 15;
    g.legs = [-1, 1].map(s => ({ hip: [150 + s * g.hw * 0.7, hipY], ank: [150 + s * 17, 254] }));
    const u = L.uarm, f = L.farm;
    g.arms = [-1, 1].map(s => {
      const root = [150 + s * g.sw, shY + 4];
      const e = [root[0] + s * Math.sin((P.uarm || 0) * D) * u, root[1] + Math.cos((P.uarm || 0) * D) * u];
      const h = [e[0] + s * Math.sin((P.farm || 0) * D) * f, e[1] + Math.cos((P.farm || 0) * D) * f];
      return { root, el: e, ha: h };
    });
    g.db = P.db || null;
    g.hand = g.arms[1].ha; g.hipP = g.hip; g.ank = g.legs[1].ank;
    return g;
  }

  const el = (name, attrs, parent) => {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const setLine = (e, a, b) => { e.setAttribute('x1', a[0]); e.setAttribute('y1', a[1]); e.setAttribute('x2', b[0]); e.setAttribute('y2', b[1]); };

  function limb(parent, w, far) {
    const g = el('g', { class: far ? 'far' : 'near' }, parent);
    const o = el('line', { stroke: '#4a4a52', 'stroke-width': w + 3, 'stroke-linecap': 'round' }, g);
    const b = el('line', { stroke: far ? '#aaaaa6' : '#dcdcd7', 'stroke-width': w, 'stroke-linecap': 'round' }, g);
    const h = el('line', { stroke: '#fff', 'stroke-opacity': far ? 0.15 : 0.45, 'stroke-width': Math.max(2, w * 0.28), 'stroke-linecap': 'round' }, g);
    return { g, set(a, c) { setLine(o, a, c); setLine(b, a, c); const dx = -w * 0.18; setLine(h, [a[0] + dx, a[1] - w * 0.18], [c[0] + dx, c[1] - w * 0.18]); } };
  }
  function overlay(parent) {
    const g = el('g', { 'stroke-linecap': 'round', fill: 'none' }, parent);
    const a = el('line', { stroke: '#e23b42' }, g), b = el('line', { stroke: '#ff7078' }, g);
    return { set(p, q, w, op) {
      setLine(a, p, q); setLine(b, p, q);
      a.setAttribute('stroke-width', w + 5); a.setAttribute('stroke-opacity', op * 0.35);
      b.setAttribute('stroke-width', w); b.setAttribute('stroke-opacity', op);
    }, hide() { a.setAttribute('stroke-opacity', 0); b.setAttribute('stroke-opacity', 0); } };
  }
  function blob(parent) {
    const g = el('g', {}, parent);
    const a = el('circle', { fill: '#e23b42' }, g), b = el('circle', { fill: '#ff7078' }, g);
    return { set(c, r, op) { for (const [e, k, o] of [[a, 1.45, op * 0.35], [b, 1, op]]) { e.setAttribute('cx', c[0]); e.setAttribute('cy', c[1]); e.setAttribute('r', r * k); e.setAttribute('fill-opacity', o); } },
      hide() { a.setAttribute('fill-opacity', 0); b.setAttribute('fill-opacity', 0); } };
  }
  function weight(parent) {
    const g = el('g', {}, parent);
    const back = el('circle', { fill: '#141416', stroke: '#55555c', 'stroke-width': 1.5 }, g);
    const front = el('circle', { fill: '#1c1c1f', stroke: '#8a8a90', 'stroke-width': 1.5 }, g);
    const hub = el('circle', { fill: '#9a9aa0' }, g);
    const bar = el('rect', { fill: '#26262a', stroke: '#8a8a90', 'stroke-width': 1.2, rx: 2 }, g);
    const p1 = el('rect', { fill: '#1c1c1f', stroke: '#8a8a90', 'stroke-width': 1.2, rx: 2 }, g);
    const p2 = el('rect', { fill: '#1c1c1f', stroke: '#8a8a90', 'stroke-width': 1.2, rx: 2 }, g);
    return { set(pos, kind, far) {
      g.setAttribute('opacity', far ? 0.6 : 1);
      const x = pos[0], y = pos[1], end = kind !== 'side';
      for (const e of [back, front, hub]) e.style.display = end ? '' : 'none';
      for (const e of [bar, p1, p2]) e.style.display = end ? 'none' : '';
      if (end) {
        const r = kind === 'bar' ? 11 : 8.5;
        back.setAttribute('cx', x + 3); back.setAttribute('cy', y - 2); back.setAttribute('r', r - 1);
        front.setAttribute('cx', x); front.setAttribute('cy', y); front.setAttribute('r', r);
        hub.setAttribute('cx', x); hub.setAttribute('cy', y); hub.setAttribute('r', 2.6);
      } else {
        bar.setAttribute('x', x - 17); bar.setAttribute('y', y - 2.5); bar.setAttribute('width', 34); bar.setAttribute('height', 5);
        p1.setAttribute('x', x - 17); p1.setAttribute('y', y - 8); p1.setAttribute('width', 8); p1.setAttribute('height', 16);
        p2.setAttribute('x', x + 9); p2.setAttribute('y', y - 8); p2.setAttribute('width', 8); p2.setAttribute('height', 16);
      }
    }, hide() { g.setAttribute('opacity', 0); } };
  }

  /* ---------- окружение ---------- */
  function drawEnv(svg, env) {
    const g = el('g', {}, svg);
    el('rect', { x: 8, y: 262, width: 284, height: 14, rx: 4, fill: '#121214', stroke: '#3a3a40', 'stroke-width': 1.2 }, g);
    el('line', { x1: 14, y1: 262.5, x2: 286, y2: 262.5, stroke: '#e3b968', 'stroke-opacity': 0.35, 'stroke-width': 1.5 }, g);
    for (const e of env || []) {
      if (e.t === 'pullbar') {
        el('rect', { x: e.x + 52, y: e.y - 12, width: 9, height: 262 - e.y + 12, rx: 3, fill: '#1d1d20', stroke: '#55555c' }, g);
        el('line', { x1: e.x, y1: e.y, x2: e.x + 56, y2: e.y, stroke: '#3a3a40', 'stroke-width': 7, 'stroke-linecap': 'round' }, g);
        el('circle', { cx: e.x, cy: e.y, r: 5.5, fill: '#8a8a90', stroke: '#d0d0cc' }, g);
        el('rect', { x: e.x + 42, y: 258, width: 40, height: 5, rx: 2, fill: '#1d1d20', stroke: '#55555c' }, g);
      } else if (e.t === 'dips') {
        el('rect', { x: e.x + 40, y: e.y - 4, width: 9, height: 262 - e.y + 4, rx: 3, fill: '#1d1d20', stroke: '#55555c' }, g);
        el('line', { x1: e.x - 14, y1: e.y, x2: e.x + 44, y2: e.y, stroke: '#3a3a40', 'stroke-width': 7, 'stroke-linecap': 'round' }, g);
        el('circle', { cx: e.x - 14, cy: e.y, r: 5.5, fill: '#8a8a90', stroke: '#d0d0cc' }, g);
        el('rect', { x: e.x + 24, y: 258, width: 40, height: 5, rx: 2, fill: '#1d1d20', stroke: '#55555c' }, g);
      } else if (e.t === 'chair') {
        el('rect', { x: e.x, y: e.y, width: e.w, height: 8, rx: 3, fill: '#1d1d20', stroke: '#6a6a72' }, g);
        el('rect', { x: e.x + 3, y: e.y + 8, width: 6, height: 262 - e.y - 8, fill: '#161618', stroke: '#44444a' }, g);
        el('rect', { x: e.x + e.w - 9, y: e.y + 8, width: 6, height: 262 - e.y - 8, fill: '#161618', stroke: '#44444a' }, g);
      }
    }
  }

  /* ---------- сборка фигуры ---------- */
  function build(svg, ex, thumb) {
    const cfg = ex.fig, P0 = cfg.pose(0, 1), front = P0.view === 'front';
    svg.innerHTML = '';
    drawEnv(svg, cfg.env);
    const R = { front };
    R.trail = el('path', { class: 'trail', fill: 'none', stroke: '#e3b968', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-dasharray': '2 6', opacity: 0.9 }, svg);
    const fig = el('g', {}, svg);
    if (!front) {
      R.fleg = [limb(fig, 19, true), limb(fig, 14, true)];
      R.farm = [limb(fig, 12.5, true), limb(fig, 10.5, true)];
      R.fshoe = el('line', { stroke: '#78787e', 'stroke-width': 7, 'stroke-linecap': 'round' }, fig);
      R.fdb = weight(fig);
      R.torso = limb(fig, 30); R.neck = limb(fig, 9); R.glute = el('circle', { r: 15, fill: '#dcdcd7', stroke: '#4a4a52', 'stroke-width': 1.5 }, fig);
      R.torso.g.insertBefore(R.glute, R.torso.g.firstChild);
      R.head = el('circle', { r: 12, fill: '#e8e8e4', stroke: '#4a4a52', 'stroke-width': 1.5 }, fig);
      R.leg = [limb(fig, 19), limb(fig, 14)];
      R.shoe = el('line', { stroke: '#9a9a9e', 'stroke-width': 7, 'stroke-linecap': 'round' }, fig);
      R.arm = [limb(fig, 12.5), limb(fig, 10.5)];
      R.delt = el('circle', { r: 11, fill: '#dcdcd7', stroke: '#4a4a52', 'stroke-width': 1.5 }, fig);
      R.db = weight(fig);
      R.ovA = overlay(fig); R.ovB = overlay(fig); R.ovC = overlay(fig); R.bl = blob(fig); R.bl2 = blob(fig);
    } else {
      R.legs = [0, 1].map(() => [limb(fig, 17), limb(fig, 13)]);
      R.torso = el('path', { fill: '#dcdcd7', stroke: '#4a4a52', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }, fig);
      R.head = el('circle', { r: 12, fill: '#e8e8e4', stroke: '#4a4a52', 'stroke-width': 1.5 }, fig);
      R.neck = limb(fig, 9);
      R.arms = [0, 1].map(() => [limb(fig, 11), limb(fig, 9.5)]);
      R.dbs = [weight(fig), weight(fig)];
      R.bl = [blob(fig), blob(fig)]; R.ovA = overlay(fig); R.ovB = overlay(fig);
    }
    return R;
  }

  function muscleList(ex, dir) { const m = ex.fig.mus; return typeof m === 'function' ? m(dir) : (m || []); }

  function draw(R, ex, P, p, dir) {
    const g = R.front ? solveFront(P) : solveSide(P);
    const k = ex.fig.peak === 0 ? 1 - p : p;
    const op = 0.3 + 0.7 * k;
    const mus = muscleList(ex, dir);
    const has = n => mus.includes(n);
    if (R.front) {
      const hw = g.hw, sw = g.sw, sy = g.sh[1], hy = g.hip[1];
      R.torso.setAttribute('d', `M${150 - sw},${sy + 2} Q150,${sy - 6} ${150 + sw},${sy + 2} L${150 + hw},${hy} Q150,${hy + 8} ${150 - hw},${hy} Z`);
      R.head.setAttribute('cx', g.head[0]); R.head.setAttribute('cy', g.head[1]);
      R.neck.set([150, sy], [150, g.head[1] + 8]);
      g.legs.forEach((l, i) => { const [kn, an] = ik(l.hip, l.ank, 46, 46, i ? 1 : -1); R.legs[i][0].set(l.hip, [(l.hip[0] + an[0]) / 2, (l.hip[1] + an[1]) / 2]); R.legs[i][1].set([(l.hip[0] + an[0]) / 2, (l.hip[1] + an[1]) / 2], l.ank); });
      g.arms.forEach((a, i) => { R.arms[i][0].set(a.root, a.el); R.arms[i][1].set(a.el, a.ha); R.dbs[i].set(a.ha, g.db || 'end'); if (!g.db) R.dbs[i].hide(); });
      const dl = has('shoulders');
      g.arms.forEach((a, i) => { dl ? R.bl[i].set([a.root[0] + (i ? 2 : -2), a.root[1]], 11, op) : R.bl[i].hide(); });
      if (has('traps')) R.ovA.set([150 - sw + 6, sy + 1], [150 + sw - 6, sy + 1], 9, op); else R.ovA.hide();
      if (has('back')) R.ovB.set([150 - 14, sy + 16], [150 + 14, sy + 16], 14, op); else R.ovB.hide();
      return g;
    }
    const tdir = [g.sh[0] - g.hip[0], g.sh[1] - g.hip[1]]; const tl = Math.hypot(tdir[0], tdir[1]) || 1;
    const td = [tdir[0] / tl, tdir[1] / tl], tn = [-td[1], td[0]]; // «перед» тела
    R.torso.set(g.hip, g.sh);
    R.glute.setAttribute('cx', g.hip[0]); R.glute.setAttribute('cy', g.hip[1]);
    R.neck.set(g.sh, g.neck);
    R.head.setAttribute('cx', g.head[0]); R.head.setAttribute('cy', g.head[1]);
    R.delt.setAttribute('cx', g.sh[0]); R.delt.setAttribute('cy', g.sh[1]);
    const shoe = (e, a, rear) => { const s = g.shoe; setLine(e, a, [a[0] + (rear ? -1 : 1) * s[0], a[1] + s[1]]); };
    R.leg[0].set(g.hip, g.leg.knee); R.leg[1].set(g.leg.knee, g.leg.ank);
    if (g.leg.shoe) shoe(R.shoe, g.leg.ank); else { setLine(R.shoe, g.leg.ank, [g.leg.ank[0] + 0.1, g.leg.ank[1]]); }
    R.fleg[0].set(g.hip, g.fleg.knee); R.fleg[1].set(g.fleg.knee, g.fleg.ank);
    if (g.fleg.shoe) shoe(R.fshoe, g.fleg.ank, g.fleg.rear); else setLine(R.fshoe, g.fleg.ank, [g.fleg.ank[0] + 0.1, g.fleg.ank[1]]);
    R.arm[0].set(g.sh, g.arm.el); R.arm[1].set(g.arm.el, g.arm.ha);
    if (g.farm) { R.farm[0].set(g.sh, g.farm.el); R.farm[1].set(g.farm.el, g.farm.ha); R.farm[0].g.style.display = R.farm[1].g.style.display = ''; }
    else { R.farm[0].g.style.display = R.farm[1].g.style.display = 'none'; }
    if (g.db) { R.db.set(g.arm.ha, g.db); g.farm ? R.fdb.set(g.farm.ha, g.db, true) : R.fdb.hide(); } else { R.db.hide(); R.fdb.hide(); }
    // мышцы
    const sub = (a, b, t0, t1, off, n) => [[lerp(a[0], b[0], t0) + n[0] * off, lerp(a[1], b[1], t0) + n[1] * off], [lerp(a[0], b[0], t1) + n[0] * off, lerp(a[1], b[1], t1) + n[1] * off]];
    const segN = (a, b, s) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [s * dy / l, -s * dx / l]; };
    const front_ = (a, b) => segN(a, b, 1);
    let ovs = [R.ovA, R.ovB, R.ovC], oi = 0; const use = (seg, w) => { const o = ovs[oi++]; o.set(seg[0], seg[1], w, op); };
    ovs.forEach(o => o.hide()); R.bl.hide(); R.bl2.hide();
    let bi = 0; const bl = (c, r) => { (bi++ ? R.bl2 : R.bl).set(c, r, op); };
    if (has('biceps')) use(sub(g.sh, g.arm.el, 0.2, 0.85, 3.2, front_(g.sh, g.arm.el)), 6);
    if (has('triceps')) use(sub(g.sh, g.arm.el, 0.15, 0.85, -3.2, front_(g.sh, g.arm.el)), 6);
    if (has('forearm')) use(sub(g.arm.el, g.arm.ha, 0.1, 0.8, 2.4, front_(g.arm.el, g.arm.ha)), 5);
    if (has('shoulders')) bl([g.sh[0] + tn[0] * 2, g.sh[1] + tn[1] * 2], 10.5);
    if (has('chest')) use(sub(g.hip, g.sh, 0.58, 0.93, 6, tn), 14);
    if (has('back')) use(sub(g.hip, g.sh, 0.3, 0.92, -6, tn), 14);
    if (has('abs')) use(sub(g.hip, g.sh, 0.12, 0.55, 6.5, tn), 11);
    if (has('traps')) use([g.neck, [g.sh[0] - tn[0] * 1, g.sh[1] - tn[1] * 1]], 9);
    if (has('quads')) use(sub(g.hip, g.leg.knee, 0.1, 0.92, 4.5, front_(g.hip, g.leg.knee)), 9);
    if (has('hamstrings')) use(sub(g.hip, g.leg.knee, 0.1, 0.9, -4.5, front_(g.hip, g.leg.knee)), 9);
    if (has('glutes')) bl([g.hip[0] - tn[0] * 4, g.hip[1] - tn[1] * 4], 11);
    if (has('calves')) use(sub(g.leg.knee, g.leg.ank, 0.1, 0.7, -3.5, front_(g.leg.knee, g.leg.ank)), 8);
    return g;
  }

  function trailPath(R, ex) {
    const pts = [], key = ex.fig.trail || 'hand';
    for (let i = 0; i <= 28; i++) {
      const p = i / 28, P = ex.fig.pose(p, 1), g = R.front ? solveFront(P) : solveSide(P);
      const q = key === 'hip' ? (R.front ? g.hip : g.hip) : key === 'ank' ? (g.leg ? g.leg.ank : g.ank) : key === 'head' ? g.head : (R.front ? g.hand : g.arm.ha);
      pts.push(q);
    }
    R.trail.setAttribute('d', 'M' + pts.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' L'));
  }

  const VB = '0 0 300 285';
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const Fig = {
    /* статичная картинка (для списков) */
    thumb(ex, p = 1) {
      const svg = el('svg', { viewBox: VB, class: 'fig thumb', role: 'img', 'aria-label': ex.name });
      const R = build(svg, ex, true); R.trail.setAttribute('opacity', 0);
      draw(R, ex, ex.fig.pose(p, 1), p, 1);
      return svg;
    },
    /* анимация */
    mount(container, ex, opts = {}) {
      const svg = el('svg', { viewBox: VB, class: 'fig live', role: 'img', 'aria-label': 'Анимация: ' + ex.name });
      container.appendChild(svg);
      const R = build(svg, ex, false);
      trailPath(R, ex);
      const period = (opts.period || ex.fig.period || 4200);
      let raf = 0, t0 = performance.now(), playing = !reduce, off = 0, stopped = false, curP = 1, dash = 0;
      const prog = u => u < 0.4 ? [ease(u / 0.4), 1] : u < 0.5 ? [1, 1] : u < 0.9 ? [1 - ease((u - 0.5) / 0.4), -1] : [0, -1];
      function frame(now) {
        if (stopped) return;
        if (playing) {
          const u = (((now - t0) + off) % period) / period, [p, dir] = prog(u);
          curP = p; dash -= 0.25; R.trail.setAttribute('stroke-dashoffset', dash);
          draw(R, ex, ex.fig.pose(p, dir), p, dir);
        }
        raf = requestAnimationFrame(frame);
      }
      if (!playing) draw(R, ex, ex.fig.pose(1, 1), 1, 1);
      raf = requestAnimationFrame(frame);
      const api = {
        toggle() { if (playing) { playing = false; off = (off + performance.now() - t0); } else { playing = true; t0 = performance.now(); } return playing; },
        get playing() { return playing; },
        destroy() { stopped = true; cancelAnimationFrame(raf); svg.remove(); }
      };
      return api;
    }
  };
  window.Fig = Fig;
})();
