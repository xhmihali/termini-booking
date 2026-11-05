// Termini – background themes. Pure CSS/canvas, no libraries, no network.
// Themes: mesh (default), aurora, circuit, network, waves, minimal, orbs.
// Choose one in Profile → Background, or set DEFAULT_BG in config.js.
(function () {
  const scene = document.querySelector('.bg-scene'); if (!scene) return;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const THEMES = ['mesh', 'aurora', 'circuit', 'network', 'waves', 'minimal', 'orbs'];
  const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
  let stopDots = null, current = null;

  // ---- drifting dots (used by "network" and "orbs") ----
  function startDots(c, o) {
    const ctx = c.getContext('2d'); if (!ctx) return () => {};
    const COLORS = o.colors;
    let W = 0, H = 0, parts = [], last = performance.now(), t = 0, running = false, raf = 0;
    const mk = any => { const z = Math.random(); return { x: any ? Math.random() * W : -30 - Math.random() * 60, y: Math.random() * H, z, r: o.r0 + z * o.r1, vx: 0.15 + z * o.speed, ph: Math.random() * 6.28, amp: 6 + z * 22, c: COLORS[(Math.random() * COLORS.length) | 0], a: 0.25 + z * 0.55 }; };
    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight;
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); c.style.width = W + 'px'; c.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      parts = Array.from({ length: Math.round(Math.min(o.max, Math.max(24, (W * H) / o.density))) }, () => mk(true));
      if (!running) draw(0);
    }
    function draw(dt) {
      t += dt; ctx.clearRect(0, 0, W, H);
      const pos = parts.map(p => { p.x += p.vx * dt; if (p.x > W + 40) Object.assign(p, mk(false)); return [p.x, p.y + Math.sin(t * 0.018 + p.ph) * p.amp]; });
      if (o.links) {
        ctx.lineWidth = 1;
        for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
          if (Math.abs(parts[i].z - parts[j].z) > 0.4) continue;
          const dx = pos[i][0] - pos[j][0], dy = pos[i][1] - pos[j][1], d2 = dx * dx + dy * dy;
          if (d2 < o.link * o.link) { ctx.strokeStyle = `rgba(${o.linkColor},${(1 - Math.sqrt(d2) / o.link) * o.linkA * (0.4 + parts[i].z)})`; ctx.beginPath(); ctx.moveTo(pos[i][0], pos[i][1]); ctx.lineTo(pos[j][0], pos[j][1]); ctx.stroke(); }
        }
      }
      parts.forEach((p, i) => {
        const [x, y] = pos[i];
        if (p.z > 0.6) { const g = ctx.createRadialGradient(x, y, 0, x, y, p.r * 5); g.addColorStop(0, `rgba(${p.c},${p.a * 0.4})`); g.addColorStop(1, `rgba(${p.c},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, p.r * 5, 0, 6.283); ctx.fill(); }
        ctx.fillStyle = `rgba(${p.c},${p.a})`; ctx.beginPath(); ctx.arc(x, y, p.r, 0, 6.283); ctx.fill();
      });
    }
    function loop(now) { if (!running) return; draw(Math.min(48, now - last) / 16.67); last = now; raf = requestAnimationFrame(loop); }
    const start = () => { if (running || reduce) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); };
    const pause = () => { running = false; cancelAnimationFrame(raf); };
    const vis = () => (document.hidden ? pause() : start());
    resize(); window.addEventListener('resize', resize); document.addEventListener('visibilitychange', vis); start();
    return () => { pause(); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', vis); };
  }

  const beams = n => Array.from({ length: n }, (_, i) => `<i class="beam ${i % 2 ? 'v' : 'h'} b${i + 1}"></i>`).join('');
  const nodes = n => Array.from({ length: n }, (_, i) => `<i class="node n${i + 1}"></i>`).join('');
  const TPL = {
    mesh: '<div class="mesh"><i class="m1"></i><i class="m2"></i><i class="m3"></i><i class="m4"></i></div><div class="grain"></div>',
    aurora: '<div class="aurora"></div><div class="grain"></div>',
    circuit: `<div class="circuit"></div><div class="beams">${beams(8)}${nodes(6)}</div>`,
    network: '<div class="netbase"></div><canvas></canvas>',
    waves: '<div class="wavebase"></div><div class="wave w1"></div><div class="wave w2"></div><div class="wave w3"></div>',
    minimal: '<div class="minimal"></div>',
    orbs: '<div class="orb o1"></div><div class="orb o2"></div><div class="orb o3"></div><div class="orb o4"></div><div class="grid3d"></div><div class="shard s1"></div><div class="shard s2"></div><div class="shard s3"></div><canvas></canvas>'
  };
  const DOTS = {
    network: { colors: ['43,63,224', '123,92,255', '255,106,61'], r0: 1.2, r1: 2.6, speed: 0.6, links: true, link: 140, linkA: 0.28, linkColor: '60,70,220', max: 90, density: 16000 },
    orbs: { colors: ['43,63,224', '123,92,255', '255,106,61', '236,72,153', '56,189,248'], r0: 1.1, r1: 3.4, speed: 0.75, links: true, link: 120, linkA: 0.16, linkColor: '91,59,232', max: 72, density: 21000 }
  };

  function apply(name) {
    if (!TPL[name]) name = THEMES[0];
    if (name === current) return name;
    if (stopDots) { stopDots(); stopDots = null; }
    scene.innerHTML = TPL[name];
    document.documentElement.setAttribute('data-bg', name);
    const c = scene.querySelector('canvas');
    if (c && DOTS[name]) stopDots = startDots(c, DOTS[name]);
    current = name; return name;
  }
  window.TerminiBG = {
    themes: THEMES,
    get current() { return current; },
    set(name) { const n = apply(name); store.set('termini_bg', n); return n; }
  };
  apply(store.get('termini_bg') || (window.TERMINI_CONFIG || {}).DEFAULT_BG || 'mesh');
})();
