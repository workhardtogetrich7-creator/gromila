/* music.js — плеер для своей музыки */
(function () {
  const audio = document.getElementById('audio');
  const P = {
    list: [], idx: -1, shuffle: App.S.get('shuffle', false), repeat: App.S.get('repeat', true), url: null, subs: [],
    on(fn) { this.subs.push(fn); }, emit() { this.subs.forEach(f => f()); },
    async load() { this.list = await App.tracks.all(); this.emit(); },
    get cur() { return this.list[this.idx] || null; },
    get playing() { return !audio.paused && !audio.ended; },
    async add(files) {
      for (const f of files) { if (f.type && !f.type.startsWith('audio') && !/\.(mp3|m4a|aac|wav|flac|ogg)$/i.test(f.name)) continue; await App.tracks.add(f); }
      await this.load();
    },
    async remove(id) { const was = this.cur && this.cur.id === id; if (was) { audio.pause(); audio.removeAttribute('src'); this.idx = -1; } await App.tracks.del(id); await this.load(); if (was) this.emit(); },
    async play(i) {
      if (!this.list.length) return;
      this.idx = ((i % this.list.length) + this.list.length) % this.list.length;
      const t = await App.tracks.get(this.list[this.idx].id); if (!t) return;
      if (this.url) URL.revokeObjectURL(this.url);
      this.url = URL.createObjectURL(t.blob); audio.src = this.url;
      try { await audio.play(); } catch (e) { /* нужен жест пользователя */ }
      this.meta(); this.emit();
    },
    toggle() { if (!this.cur) { this.play(0); return; } if (audio.paused) audio.play().catch(() => {}); else audio.pause(); },
    next(auto) {
      if (!this.list.length) return;
      if (this.shuffle && this.list.length > 1) { let n; do { n = Math.floor(Math.random() * this.list.length); } while (n === this.idx); return this.play(n); }
      if (auto && !this.repeat && this.idx === this.list.length - 1) { this.emit(); return; }
      return this.play(this.idx + 1);
    },
    prev() { if (audio.currentTime > 4) audio.currentTime = 0; else this.play(this.idx - 1); },
    setShuffle(v) { this.shuffle = v; App.S.set('shuffle', v); this.emit(); },
    setRepeat(v) { this.repeat = v; App.S.set('repeat', v); this.emit(); },
    meta() {
      if (!('mediaSession' in navigator) || !this.cur) return;
      navigator.mediaSession.metadata = new MediaMetadata({ title: this.cur.name, artist: 'Громила · моя музыка' });
      const h = navigator.mediaSession.setActionHandler.bind(navigator.mediaSession);
      try { h('play', () => audio.play()); h('pause', () => audio.pause()); h('nexttrack', () => this.next()); h('previoustrack', () => this.prev()); } catch (e) { /* не поддерживается */ }
    }
  };
  audio.addEventListener('play', () => P.emit()); audio.addEventListener('pause', () => P.emit());
  audio.addEventListener('ended', () => P.next(true));
  window.Music = P; window.audioEl = audio;
})();
