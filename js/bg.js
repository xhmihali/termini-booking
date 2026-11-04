// Termini – animated background: floating dots that drift from one side to the other,
// with depth (size/speed/brightness) and soft links between nearby dots. Pure canvas, no libraries.
(function () {
  const c = document.getElementById('bg-dots'); if (!c || !c.getContext) return;
  const ctx = c.getContext('2d');
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COLORS = ['43,63,224', '123,92,255', '255,106,61', '236,72,153', '56,189,248'];
  let W = 0, H = 0, parts = [], last = performance.now(), t = 0, running = false;

  function mk(anywhere) {
    const z = Math.random();                       // depth: 0 = far, 1 = near
    return {
      x: anywhere ? Math.random() * W : -30 - Math.random() * 60,
      y: Math.random() * H, z,
      r: 1.1 + z * 3.4,                            // nearer = bigger
      vx: 0.18 + z * 0.75,                         // nearer = faster
      ph: Math.random() * Math.PI * 2, amp: 6 + z * 22,
      c: COLORS[(Math.random() * COLORS.length) | 0], a: 0.28 + z * 0.55
    };
  }
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    c.style.width = W + 'px'; c.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(72, Math.max(26, (W * H) / 21000)));
    parts = Array.from({ length: n }, () => mk(true));
  }
  function draw(dt) {
    t += dt;
    ctx.clearRect(0, 0, W, H);
    const pos = parts.map(p => {
      p.x += p.vx * dt;
      if (p.x > W + 40) Object.assign(p, mk(false));
      return [p.x, p.y + Math.sin(t * 0.018 + p.ph) * p.amp];
    });
    // soft links between nearby dots of similar depth (constellation look)
    ctx.lineWidth = 1;
    for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        if (Math.abs(parts[i].z - parts[j].z) > 0.35) continue;
        const dx = pos[i][0] - pos[j][0], dy = pos[i][1] - pos[j][1], d2 = dx * dx + dy * dy;
        if (d2 < 120 * 120) {
          ctx.strokeStyle = `rgba(91,59,232,${(1 - Math.sqrt(d2) / 120) * 0.16 * (0.4 + parts[i].z)})`;
          ctx.beginPath(); ctx.moveTo(pos[i][0], pos[i][1]); ctx.lineTo(pos[j][0], pos[j][1]); ctx.stroke();
        }
      }
    }
    // dots, near ones with a glow and a tiny highlight (3D bead)
    parts.forEach((p, i) => {
      const [x, y] = pos[i];
      if (p.z > 0.6) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, p.r * 5);
        g.addColorStop(0, `rgba(${p.c},${p.a * 0.45})`); g.addColorStop(1, `rgba(${p.c},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, p.r * 5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = `rgba(${p.c},${p.a})`; ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2); ctx.fill();
      if (p.z > 0.45) { ctx.fillStyle = `rgba(255,255,255,${0.55 * p.z})`; ctx.beginPath(); ctx.arc(x - p.r * 0.35, y - p.r * 0.35, p.r * 0.35, 0, Math.PI * 2); ctx.fill(); }
    });
  }
  function loop(now) {
    if (!running) return;
    const dt = Math.min(48, now - last) / 16.67; last = now;
    draw(dt);
    requestAnimationFrame(loop);
  }
  function start() { if (running || reduce) return; running = true; last = performance.now(); requestAnimationFrame(loop); }
  function stop() { running = false; }

  resize();
  window.addEventListener('resize', () => { resize(); if (reduce) draw(0); });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  if (reduce) draw(0); else start();
})();
