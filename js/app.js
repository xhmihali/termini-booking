// Termini – booking app for barbers & salons. Roles: client, business, admin.
(function () {
  const C = window.TERMINI_CONFIG || {};
  const LIVE = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY);
  const DB = () => window.TerminiDB;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} }
  };
  let lang = store.get('termini_lang') || C.DEFAULT_LANG || 'sq';
  const t = k => (window.I18N[lang] && window.I18N[lang][k] !== undefined ? window.I18N[lang][k] : (window.I18N.en[k] ?? k));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromYmd = s => new Date(s + 'T00:00:00');
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const hm = d => { d = new Date(d); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const money = n => `${Number(n || 0).toLocaleString(lang === 'sq' ? 'de-DE' : 'en-GB')} ${C.CURRENCY || 'ALL'}`;
  const dayName = d => {
    const today = ymd(new Date()), x = ymd(d);
    if (x === today) return t('today'); if (x === ymd(addDays(new Date(), 1))) return t('tomorrow');
    return `${t('days_short')[d.getDay()]} ${d.getDate()}.${pad(d.getMonth() + 1)}`;
  };
  const when = d => { d = new Date(d); return `${dayName(d)}, ${hm(d)}`; };
  const initials = s => (s || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const waNumber = p => { let d = String(p || '').replace(/\D/g, ''); if (d.startsWith('00')) d = d.slice(2); if (d.startsWith('0')) d = '355' + d.slice(1); return d; };
  const telHref = p => 'tel:' + String(p || '').replace(/[^\d+]/g, '');
  const ROLE_HOME = { client: 'explore', business: 'biz-agenda', admin: 'adm-dash' };

  const S = { user: null, route: 'auth', params: {}, salon: null };
  const app = () => $('#app');

  // ---------- Icons ----------
  const I = {
    logo: '<svg viewBox="0 0 24 24" fill="none" stroke="#c99a57" stroke-width="2" stroke-linecap="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg>',
    team: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .7 3 2.3 3.5 5"/></svg>',
    store: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v10h16V10M3 4h18l-1 6H4L3 4Z"/><path d="M10 20v-5h4v5"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg>',
    pin: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>'
  };

  // ---------- UI helpers ----------
  function toast(msg) {
    $$('.toast').forEach(x => x.remove());
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg; document.body.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }
  function errMsg(e) {
    const m = (e && e.message) || '';
    if (m === 'SLOT_TAKEN') return t('slot_taken'); if (m === 'WRONG_LOGIN') return t('wrong_login');
    if (m === 'EMAIL_TAKEN') return t('email_taken'); if (m === 'CHECK_EMAIL') return t('check_email');
    console.error(e); return t('error') + (m ? ': ' + m : '');
  }
  async function guard(fn) { try { return await fn(); } catch (e) { toast(errMsg(e)); } }
  function sheet(html, mount) {
    const scrim = document.createElement('div'); scrim.className = 'scrim';
    scrim.innerHTML = `<div class="sheet" role="dialog">${html}</div>`;
    const close = () => scrim.remove();
    scrim.addEventListener('click', e => { if (e.target === scrim || e.target.closest('[data-close]')) close(); });
    document.body.appendChild(scrim); mount && mount($('.sheet', scrim), close);
    const first = $('input,select,textarea', scrim); first && setTimeout(() => first.focus(), 50);
    return close;
  }
  const statusPill = s => {
    const cls = { confirmed: 'info', completed: 'ok', cancelled: 'mute', no_show: 'bad', pending: 'warn', active: 'ok', suspended: 'bad' }[s] || 'mute';
    return `<span class="pill ${cls}"><span class="dot"></span>${esc(t('status_' + s))}</span>`;
  };
  const catLabel = c => t('cat_' + (c || 'barber'));
  function isOpenNow(salon) {
    const d = new Date(), h = (salon.hours || [])[d.getDay()]; if (!h) return false;
    const m = d.getHours() * 60 + d.getMinutes(); return m >= toMin(h.open) && m < toMin(h.close);
  }

  // ---------- Router ----------
  function go(route, params = {}, replace = false) {
    S.route = route; S.params = params;
    const st = { route, params };
    try { replace ? history.replaceState(st, '', '#' + route) : history.pushState(st, '', '#' + route); } catch {}
    render(); window.scrollTo(0, 0);
  }
  window.addEventListener('popstate', e => { if (e.state && S.user) { S.route = e.state.route; S.params = e.state.params || {}; render(); } });
  const home = () => go(ROLE_HOME[S.user.role] || 'explore', {}, true);

  const NAVS = {
    client: [['explore', 'explore', I.search], ['my-bookings', 'my_bookings', I.cal], ['profile', 'profile', I.user]],
    business: [['biz-agenda', 'agenda', I.cal], ['biz-services', 'services', I.list], ['biz-staff', 'staff', I.team], ['biz-salon', 'settings', I.store], ['profile', 'profile', I.user]],
    admin: [['adm-dash', 'dashboard', I.chart], ['adm-salons', 'salons', I.store], ['adm-users', 'users', I.team], ['profile', 'profile', I.user]]
  };
  const NAV_OF = { salon: 'explore', book: 'explore' };

  function shell(content, opts = {}) {
    const nav = S.user ? NAVS[S.user.role] || [] : [];
    const active = NAV_OF[S.route] || S.route;
    app().innerHTML = `
      <div class="wrap">
        <header class="top">
          ${opts.back ? `<button class="back" data-back>${I.back}${esc(t('back'))}</button>` : `<div class="brand"><div class="brand-mark">${I.logo}</div>${esc(C.APP_NAME || 'Termini')}</div>`}
          <div class="sp"></div>
          ${LIVE ? '' : `<span class="badge-demo" title="${esc(t('demo_hint'))}">${esc(t('demo_mode'))}</span>`}
          <button class="lang" data-lang>${lang === 'sq' ? 'EN' : 'SQ'}</button>
        </header>
        <main>${content}</main>
      </div>
      ${nav.length ? `<nav class="nav"><div class="in">${nav.map(([r, k, ic]) => `<button class="${active === r ? 'on' : ''}" data-nav="${r}">${ic}<span>${esc(t(k))}</span></button>`).join('')}</div></nav>` : ''}`;
    $$('[data-nav]').forEach(b => b.onclick = () => go(b.dataset.nav));
    const bk = $('[data-back]'); if (bk) bk.onclick = () => (history.length > 1 ? history.back() : home());
    $('[data-lang]').onclick = () => { lang = lang === 'sq' ? 'en' : 'sq'; store.set('termini_lang', lang); document.documentElement.lang = lang; render(); };
  }
  const loading = () => shell('<div class="spinner"></div>');

  async function render() {
    if (!S.user) return viewAuth();
    const views = {
      explore: viewExplore, salon: viewSalon, book: viewBook, 'my-bookings': viewMyBookings, profile: viewProfile,
      'biz-agenda': viewBizAgenda, 'biz-services': viewBizServices, 'biz-staff': viewBizStaff, 'biz-salon': viewBizSalon,
      'adm-dash': viewAdmDash, 'adm-salons': viewAdmSalons, 'adm-users': viewAdmUsers
    };
    const allowed = { explore: 'client', salon: 'client', book: 'client', 'my-bookings': 'client' };
    const r = S.route;
    if (!views[r]) return home();
    if (r.startsWith('biz-') && S.user.role !== 'business') return home();
    if (r.startsWith('adm-') && S.user.role !== 'admin') return home();
    if (allowed[r] && S.user.role !== 'client' && S.user.role !== 'admin') return home();
    try { await views[r](); } catch (e) { shell(`<div class="notice bad">${esc(errMsg(e))}</div>`); }
  }

  // ---------- Auth ----------
  function viewAuth(mode = 'login', role = 'client') {
    const demo = !LIVE ? `
      <div class="card" style="margin-top:14px">
        <div class="title" style="margin-bottom:6px">${esc(t('demo_accounts'))}</div>
        <p class="muted small" style="margin:0 0 10px">${esc(t('demo_hint'))}</p>
        <div class="list">
          ${[['klient@demo.al', 'client'], ['berber@demo.al', 'business'], ['admin@demo.al', 'admin']].map(([e, r]) =>
            `<button class="btn ghost block" data-demo="${e}" style="justify-content:space-between"><span>${esc(t(r))}</span><span class="muted small">${e} · demo123</span></button>`).join('')}
        </div>
        <div style="margin-top:10px;text-align:center"><button class="linkbtn small" data-reset>${esc(t('reset_demo'))}</button></div>
      </div>` : '';
    shell(`
      <div class="hero"><h1>${esc(C.APP_NAME || 'Termini')}</h1><p>${esc(t('tagline'))}</p></div>
      <div class="card">
        <div class="seg"><button class="${mode === 'login' ? 'on' : ''}" data-mode="login">${esc(t('login'))}</button><button class="${mode === 'register' ? 'on' : ''}" data-mode="register">${esc(t('register'))}</button></div>
        <form id="authf" novalidate>
          ${mode === 'register' ? `
            <label class="f"><span>${esc(t('iam'))}</span>
              <div class="seg" style="margin:0"><button type="button" class="${role === 'client' ? 'on' : ''}" data-role="client">${esc(t('client'))}</button><button type="button" class="${role === 'business' ? 'on' : ''}" data-role="business">${esc(t('business'))}</button></div></label>
            <label class="f"><span>${esc(t('name'))} *</span><input type="text" name="name" autocomplete="name" required></label>
            <label class="f"><span>${esc(t('phone'))} *</span><input type="tel" name="phone" autocomplete="tel" placeholder="069 123 4567" required></label>` : ''}
          <label class="f"><span>${esc(t('email'))} *</span><input type="email" name="email" autocomplete="email" required></label>
          <label class="f"><span>${esc(t('password'))} *</span><input type="password" name="password" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" required></label>
          <button class="btn primary block" type="submit">${esc(t(mode === 'login' ? 'login' : 'register'))}</button>
        </form>
      </div>${demo}`);
    $$('[data-mode]').forEach(b => b.onclick = () => viewAuth(b.dataset.mode, role));
    $$('[data-role]').forEach(b => b.onclick = () => viewAuth('register', b.dataset.role));
    $$('[data-demo]').forEach(b => b.onclick = () => guard(async () => { S.user = await DB().signIn(b.dataset.demo, 'demo123'); home(); }));
    const rs = $('[data-reset]'); if (rs) rs.onclick = () => { if (confirm(t('reset_confirm'))) guard(async () => { await DB().reset(); toast(t('saved')); }); };
    $('#authf').onsubmit = e => {
      e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
      if (!f.email || !f.password || (mode === 'register' && (!f.name || !f.phone))) return toast(t('fill_required'));
      if (mode === 'register' && f.password.length < 6) return toast(t('password_short'));
      guard(async () => {
        S.user = mode === 'login' ? await DB().signIn(f.email, f.password)
          : await DB().signUp({ email: f.email, password: f.password, name: f.name.trim(), phone: f.phone.trim(), role });
        home();
      });
    };
  }

  // ---------- Client ----------
  let exploreState = { q: '', city: '', cat: '' };
  async function viewExplore() {
    loading();
    const salons = await DB().listSalons();
    const cities = [...new Set(salons.map(s => s.city).filter(Boolean))].sort();
    const cats = [...new Set(salons.map(s => s.category).filter(Boolean))];
    const draw = () => {
      const q = exploreState.q.toLowerCase();
      const list = salons.filter(s => (!exploreState.city || s.city === exploreState.city) && (!exploreState.cat || s.category === exploreState.cat) &&
        (!q || [s.name, s.city, s.address, s.description].join(' ').toLowerCase().includes(q)));
      $('#salons').innerHTML = list.length ? list.map(s => `
        <div class="card tap" data-salon="${s.id}">
          <div class="row">
            <div class="avatar ${esc(s.category)}">${esc(initials(s.name))}</div>
            <div class="grow">
              <div class="title ellipsis">${esc(s.name)}</div>
              <div class="muted small ellipsis">${esc(catLabel(s.category))} · ${I.pin} ${esc(s.city)}, ${esc(s.address)}</div>
            </div>
            ${isOpenNow(s) ? `<span class="pill ok">${esc(t('open_now'))}</span>` : `<span class="pill mute">${esc(t('closed_now'))}</span>`}
          </div>
        </div>`).join('') : `<div class="empty">${esc(t('no_salons'))}</div>`;
      $$('[data-salon]').forEach(c => c.onclick = () => go('salon', { id: c.dataset.salon }));
    };
    shell(`
      <h1>${esc(t('explore'))}</h1>
      <input type="search" id="q" placeholder="${esc(t('search_ph'))}" value="${esc(exploreState.q)}" style="margin:8px 0 10px">
      <div class="chips">
        <button class="chip ${!exploreState.city ? 'on' : ''}" data-city="">${esc(t('all_cities'))}</button>
        ${cities.map(c => `<button class="chip ${exploreState.city === c ? 'on' : ''}" data-city="${esc(c)}">${esc(c)}</button>`).join('')}
      </div>
      ${cats.length > 1 ? `<div class="chips"><button class="chip ${!exploreState.cat ? 'on' : ''}" data-cat="">${esc(t('filter_all'))}</button>${cats.map(c => `<button class="chip ${exploreState.cat === c ? 'on' : ''}" data-cat="${esc(c)}">${esc(catLabel(c))}</button>`).join('')}</div>` : ''}
      <div class="list" id="salons" style="margin-top:8px"></div>`);
    $('#q').oninput = e => { exploreState.q = e.target.value; draw(); };
    $$('[data-city]').forEach(b => b.onclick = () => { exploreState.city = b.dataset.city; $$('[data-city]').forEach(x => x.classList.toggle('on', x === b)); draw(); });
    $$('[data-cat]').forEach(b => b.onclick = () => { exploreState.cat = b.dataset.cat; $$('[data-cat]').forEach(x => x.classList.toggle('on', x === b)); draw(); });
    draw();
  }

  function hoursTable(hours) {
    const order = [1, 2, 3, 4, 5, 6, 0], today = new Date().getDay();
    return `<dl class="kv">${order.map(i => { const h = (hours || [])[i];
      return `<dt style="${i === today ? 'font-weight:700;color:var(--ink)' : ''}">${esc(t('days')[i])}</dt><dd style="${i === today ? 'font-weight:700' : ''}">${h ? `${esc(h.open)} – ${esc(h.close)}` : `<span class="muted">${esc(t('closed'))}</span>`}</dd>`; }).join('')}</dl>`;
  }

  async function viewSalon() {
    loading();
    const s = await DB().getSalon(S.params.id); if (!s) return home();
    const [services, staff] = await Promise.all([DB().listServices(s.id), DB().listStaff(s.id)]);
    const svc = services.filter(x => x.active !== false);
    shell(`
      <div class="row" style="margin-bottom:6px"><div class="avatar ${esc(s.category)}" style="width:56px;height:56px;font-size:20px">${esc(initials(s.name))}</div>
        <div class="grow"><h1 style="margin:0">${esc(s.name)}</h1><div class="muted small">${esc(catLabel(s.category))} · ${esc(s.city)}</div></div></div>
      ${s.description ? `<p class="sub" style="margin-top:8px">${esc(s.description)}</p>` : ''}
      <div class="actions" style="margin-top:0">
        ${s.phone ? `<a class="btn ghost sm" href="${esc(telHref(s.phone))}">${esc(t('call'))}</a>` : ''}
        <a class="btn ghost sm" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + ' ' + s.address + ' ' + s.city)}">${I.pin} ${esc(s.address)}</a>
      </div>
      <h2>${esc(t('services'))}</h2>
      <div class="list">${svc.length ? svc.map(x => `
        <div class="card row">
          <div class="grow"><div class="title">${esc(x.name)}</div><div class="muted small">${x.duration} ${esc(t('min'))}</div></div>
          <div class="price">${esc(money(x.price))}</div>
          <button class="btn gold sm" data-book="${x.id}" ${staff.some(p => p.active !== false) ? '' : 'disabled'}>${esc(t('book'))}</button>
        </div>`).join('') : `<div class="empty">—</div>`}</div>
      ${staff.length ? `<h2>${esc(t('staff'))}</h2><div class="chips">${staff.filter(p => p.active !== false).map(p => `<span class="chip">${esc(p.name)}</span>`).join('')}</div>` : ''}
      <h2>${esc(t('hours'))}</h2><div class="card">${hoursTable(s.hours)}</div>`, { back: true });
    $$('[data-book]').forEach(b => b.onclick = () => go('book', { salon: s.id, service: b.dataset.book }));
  }

  function genSlots(dateStr, salon, service, staff, busy, staffId) {
    const day = fromYmd(dateStr), h = (salon.hours || [])[day.getDay()]; if (!h) return [];
    const open = toMin(h.open), close = toMin(h.close), dur = Number(service.duration) || 30;
    const step = dur < 30 ? 15 : 30, cutoff = Date.now() + 10 * 60000;
    const pool = staff.filter(p => p.active !== false && (!staffId || p.id === staffId));
    const out = [];
    for (let m = open; m + dur <= close; m += step) {
      const start = new Date(day); start.setHours(0, m, 0, 0);
      if (start.getTime() < cutoff) continue;
      const end = new Date(start.getTime() + dur * 60000);
      const free = pool.find(p => !busy.some(b => b.staff_id === p.id && new Date(b.start_at) < end && start < new Date(b.end_at)));
      if (free) out.push({ start, staff_id: free.id });
    }
    return out;
  }

  async function viewBook() {
    loading();
    const salon = await DB().getSalon(S.params.salon); if (!salon) return home();
    const [services, staffAll] = await Promise.all([DB().listServices(salon.id), DB().listStaff(salon.id)]);
    const service = services.find(x => x.id === S.params.service); if (!service) return go('salon', { id: salon.id }, true);
    const staff = staffAll.filter(p => p.active !== false);
    const days = Array.from({ length: C.BOOKING_DAYS_AHEAD || 21 }, (_, i) => addDays(new Date(), i));
    const st = { staffId: '', date: '', slot: null };
    st.date = ymd(days.find(d => (salon.hours || [])[d.getDay()]) || days[0]);
    shell(`
      <h1>${esc(t('book'))}</h1>
      <div class="card row"><div class="grow"><div class="title">${esc(service.name)}</div><div class="muted small">${esc(salon.name)} · ${service.duration} ${esc(t('min'))}</div></div><div class="price">${esc(money(service.price))}</div></div>
      ${staff.length > 1 ? `<h2>${esc(t('choose_staff'))}</h2><div class="chips" id="staffc">
        <button class="chip on" data-staff="">${esc(t('anyone'))}</button>${staff.map(p => `<button class="chip" data-staff="${p.id}">${esc(p.name)}</button>`).join('')}</div>` : ''}
      <h2>${esc(t('choose_day'))}</h2>
      <div class="chips" id="dayc">${days.map(d => { const closed = !(salon.hours || [])[d.getDay()];
        return `<button class="chip day ${ymd(d) === st.date ? 'on' : ''}" data-day="${ymd(d)}" ${closed ? 'disabled' : ''}><span>${esc(ymd(d) === ymd(new Date()) ? t('today') : t('days_short')[d.getDay()])}</span><b>${d.getDate()}</b><span>${pad(d.getMonth() + 1)}</span></button>`; }).join('')}</div>
      <h2>${esc(t('choose_time'))}</h2>
      <div id="slots"><div class="spinner"></div></div>
      <div id="confirm" style="display:none;margin-top:16px">
        <label class="f"><span>${esc(t('note'))}</span><textarea id="note" maxlength="300"></textarea></label>
        <div class="muted small" style="margin-bottom:10px">${esc(t('pay_at_salon'))}</div>
        <button class="btn gold block" id="go"></button>
      </div>`, { back: true });

    const drawSlots = async () => {
      st.slot = null; $('#confirm').style.display = 'none';
      $('#slots').innerHTML = '<div class="spinner"></div>';
      const d0 = fromYmd(st.date), d1 = addDays(d0, 1);
      const busy = await DB().busy(salon.id, d0.toISOString(), d1.toISOString());
      const slots = genSlots(st.date, salon, service, staff, busy, st.staffId);
      $('#slots').innerHTML = slots.length ? `<div class="slots">${slots.map((s, i) => `<button class="slot" data-i="${i}">${hm(s.start)}</button>`).join('')}</div>` : `<div class="empty">${esc(t('no_slots'))}</div>`;
      $$('.slot').forEach(b => b.onclick = () => {
        $$('.slot').forEach(x => x.classList.remove('on')); b.classList.add('on'); st.slot = slots[+b.dataset.i];
        const who = staff.find(p => p.id === st.slot.staff_id);
        $('#go').textContent = `${t('confirm_booking')} · ${dayName(st.slot.start)} ${hm(st.slot.start)}${who && staff.length > 1 ? ' · ' + who.name : ''}`;
        $('#confirm').style.display = 'block'; $('#confirm').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    };
    $$('[data-staff]').forEach(b => b.onclick = () => { st.staffId = b.dataset.staff; $$('[data-staff]').forEach(x => x.classList.toggle('on', x === b)); guard(drawSlots); });
    $$('[data-day]').forEach(b => b.onclick = () => { st.date = b.dataset.day; $$('[data-day]').forEach(x => x.classList.toggle('on', x === b)); guard(drawSlots); });
    $('#go').onclick = () => guard(async () => {
      if (!st.slot) return; $('#go').disabled = true;
      try {
        await DB().createBooking({ salon_id: salon.id, service_id: service.id, staff_id: st.slot.staff_id, start_at: st.slot.start.toISOString(), note: $('#note').value.trim() });
        toast(t('booked_ok')); go('my-bookings', {}, true);
      } catch (e) { $('#go').disabled = false; if (e.message === 'SLOT_TAKEN') { toast(t('slot_taken')); return drawSlots(); } throw e; }
    });
    await guard(drawSlots);
  }

  let bookTab = 'upcoming';
  async function viewMyBookings() {
    loading();
    const all = await DB().myBookings(); const nowT = Date.now();
    const up = all.filter(b => new Date(b.end_at) >= nowT && b.status === 'confirmed').sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
    const past = all.filter(b => !up.includes(b)).sort((a, b) => new Date(b.start_at) - new Date(a.start_at));
    const list = bookTab === 'upcoming' ? up : past;
    shell(`
      <h1>${esc(t('my_bookings'))}</h1>
      <div class="seg" style="margin-top:10px"><button class="${bookTab === 'upcoming' ? 'on' : ''}" data-tab="upcoming">${esc(t('upcoming'))} (${up.length})</button><button class="${bookTab === 'past' ? 'on' : ''}" data-tab="past">${esc(t('past'))}</button></div>
      <div class="list">${list.length ? list.map(b => `
        <div class="card ${b.status === 'cancelled' ? 'b-cancelled' : ''}">
          <div class="row between"><div class="title">${esc(when(b.start_at))}</div>${statusPill(b.status)}</div>
          <div style="margin-top:4px">${esc(b.service_name)} · <b>${esc(money(b.price))}</b></div>
          <div class="muted small">${esc(b.salon_name)}${b.staff_name ? ` · ${esc(t('with'))} ${esc(b.staff_name)}` : ''} · ${esc(b.salon_address || '')}</div>
          ${bookTab === 'upcoming' ? `<div class="actions">
            ${b.salon_phone ? `<a class="btn ghost sm" href="${esc(telHref(b.salon_phone))}">${esc(t('call'))}</a>` : ''}
            <button class="btn danger sm" data-cancel="${b.id}">${esc(t('cancel'))}</button></div>` : ''}
        </div>`).join('') : `<div class="empty">${esc(t('no_bookings'))}<div style="margin-top:12px"><button class="btn gold" data-nav2="explore">${esc(t('explore'))}</button></div></div>`}</div>`);
    $$('[data-tab]').forEach(b => b.onclick = () => { bookTab = b.dataset.tab; viewMyBookings(); });
    $$('[data-nav2]').forEach(b => b.onclick = () => go(b.dataset.nav2));
    $$('[data-cancel]').forEach(b => b.onclick = () => { if (confirm(t('cancel_confirm'))) guard(async () => { await DB().setBookingStatus(b.dataset.cancel, 'cancelled'); viewMyBookings(); }); });
  }

  async function viewProfile() {
    const u = S.user;
    shell(`
      <h1>${esc(t('profile'))}</h1>
      <div class="card" style="margin-top:10px">
        <div class="row" style="margin-bottom:14px"><div class="avatar">${esc(initials(u.name))}</div><div><div class="title">${esc(u.name)}</div><div class="muted small">${esc(u.email)} · ${esc(t(u.role))}</div></div></div>
        <form id="pf">
          <label class="f"><span>${esc(t('name'))}</span><input type="text" name="name" value="${esc(u.name)}" required></label>
          <label class="f"><span>${esc(t('phone'))}</span><input type="tel" name="phone" value="${esc(u.phone)}"></label>
          <button class="btn primary block" type="submit">${esc(t('save'))}</button>
        </form>
      </div>
      <div class="card"><div class="row between"><span class="title">${esc(t('language'))}</span>
        <div class="seg" style="margin:0;width:160px"><button class="${lang === 'sq' ? 'on' : ''}" data-l="sq">Shqip</button><button class="${lang === 'en' ? 'on' : ''}" data-l="en">English</button></div></div></div>
      <div class="actions" style="margin-top:16px"><button class="btn danger block" id="lo">${esc(t('logout'))}</button></div>
      ${LIVE ? '' : `<div style="text-align:center;margin-top:14px"><button class="linkbtn small" id="rs">${esc(t('reset_demo'))}</button></div>`}`);
    $('#pf').onsubmit = e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
      if (!f.name.trim()) return toast(t('fill_required'));
      guard(async () => { S.user = await DB().updateProfile({ name: f.name.trim(), phone: f.phone.trim() }); toast(t('saved')); viewProfile(); }); };
    $$('[data-l]').forEach(b => b.onclick = () => { lang = b.dataset.l; store.set('termini_lang', lang); document.documentElement.lang = lang; render(); });
    $('#lo').onclick = () => guard(async () => { await DB().signOut(); S.user = null; S.salon = null; try { history.replaceState(null, '', '#'); } catch {} viewAuth(); });
    const rs = $('#rs'); if (rs) rs.onclick = () => { if (confirm(t('reset_confirm'))) guard(async () => { await DB().reset(); S.user = null; S.salon = null; viewAuth(); }); };
  }

  // ---------- Business ----------
  async function bizSalon() { S.salon = await DB().mySalon(); return S.salon; }
  function salonBanner(s) {
    if (s.status === 'pending') return `<div class="notice warn">${esc(t('pending_review'))}</div>`;
    if (s.status === 'suspended') return `<div class="notice bad">${esc(t('suspended_msg'))}</div>`;
    return '';
  }
  const DEFAULT_HOURS = [null, { open: '09:00', close: '19:00' }, { open: '09:00', close: '19:00' }, { open: '09:00', close: '19:00' }, { open: '09:00', close: '19:00' }, { open: '09:00', close: '19:00' }, { open: '09:00', close: '17:00' }];

  const TIMES = Array.from({ length: (24 - 6) * 4 }, (_, i) => `${pad(6 + Math.floor(i / 4))}:${pad((i % 4) * 15)}`);
  const timeOpts = v => (TIMES.includes(v) ? TIMES : [v, ...TIMES]).map(x => `<option ${x === v ? 'selected' : ''}>${x}</option>`).join('');
  function salonForm(s) {
    const hours = (s && s.hours) || DEFAULT_HOURS, order = [1, 2, 3, 4, 5, 6, 0];
    const cats = ['barber', 'salon', 'nails', 'spa'];
    return `<form id="sf">
      <label class="f"><span>${esc(t('salon_name'))} *</span><input type="text" name="name" value="${esc(s && s.name)}" required></label>
      <label class="f"><span>${esc(t('category'))}</span><select name="category">${cats.map(c => `<option value="${c}" ${s && s.category === c ? 'selected' : ''}>${esc(catLabel(c))}</option>`).join('')}</select></label>
      <div class="grid2">
        <label class="f"><span>${esc(t('city'))} *</span><input type="text" name="city" value="${esc(s ? s.city : '')}" placeholder="Tiranë" required></label>
        <label class="f"><span>${esc(t('phone'))} *</span><input type="tel" name="phone" value="${esc(s ? s.phone : S.user.phone)}" required></label>
      </div>
      <label class="f"><span>${esc(t('address'))} *</span><input type="text" name="address" value="${esc(s && s.address)}" required></label>
      <label class="f"><span>${esc(t('description'))}</span><textarea name="description" maxlength="400">${esc(s && s.description)}</textarea></label>
      <div class="title" style="margin:6px 0 4px">${esc(t('hours'))}</div>
      <div class="card" style="padding:6px 12px;margin-bottom:14px">${order.map(i => { const h = hours[i];
        return `<div class="hours-row"><span class="small" style="font-weight:600">${esc(t('days')[i])}</span>
          <label class="switch"><input type="checkbox" data-hopen="${i}" ${h ? 'checked' : ''}><i></i></label>
          <select data-hfrom="${i}" ${h ? '' : 'disabled'}>${timeOpts(h ? h.open : '09:00')}</select>
          <select data-hto="${i}" ${h ? '' : 'disabled'}>${timeOpts(h ? h.close : '19:00')}</select></div>`; }).join('')}</div>
      <button class="btn primary block" type="submit">${esc(t('save'))}</button>
    </form>`;
  }
  function bindSalonForm(existing, after) {
    $$('[data-hopen]').forEach(c => c.onchange = () => { const i = c.dataset.hopen; $(`[data-hfrom="${i}"]`).disabled = !c.checked; $(`[data-hto="${i}"]`).disabled = !c.checked; });
    $('#sf').onsubmit = e => {
      e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
      if (!f.name.trim() || !f.city.trim() || !f.address.trim() || !f.phone.trim()) return toast(t('fill_required'));
      const hours = [0, 1, 2, 3, 4, 5, 6].map(i => $(`[data-hopen="${i}"]`).checked ? { open: $(`[data-hfrom="${i}"]`).value || '09:00', close: $(`[data-hto="${i}"]`).value || '19:00' } : null);
      if (hours.some(h => h && toMin(h.open) >= toMin(h.close))) return toast(t('hours_invalid'));
      guard(async () => {
        const s = await DB().saveSalon({ id: existing && existing.id, name: f.name.trim(), category: f.category, city: f.city.trim(), address: f.address.trim(), phone: f.phone.trim(), description: f.description.trim(), hours });
        if (!existing) await DB().saveStaff({ salon_id: s.id, name: S.user.name.split(' ')[0], active: true });
        S.salon = s; toast(t('saved')); after();
      });
    };
  }
  function viewBizSetup() {
    shell(`<h1>${esc(t('setup_title'))}</h1><p class="sub">${esc(t('setup_sub'))}</p><div class="card">${salonForm(null)}</div>`);
    bindSalonForm(null, () => go('biz-services', {}, true));
  }

  let agendaDate = ymd(new Date());
  async function viewBizAgenda() {
    loading();
    const s = await bizSalon(); if (!s) return viewBizSetup();
    const d0 = fromYmd(agendaDate), d1 = addDays(d0, 1), wk = addDays(fromYmd(ymd(new Date())), -6);
    const [list, week, services, staff] = await Promise.all([
      DB().salonBookings(s.id, d0.toISOString(), d1.toISOString()),
      DB().salonBookings(s.id, wk.toISOString(), addDays(fromYmd(ymd(new Date())), 1).toISOString()),
      DB().listServices(s.id), DB().listStaff(s.id)]);
    list.sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
    const active = list.filter(b => b.status !== 'cancelled');
    const rev = arr => arr.filter(b => b.status === 'completed').reduce((n, b) => n + Number(b.price || 0), 0);
    const days = Array.from({ length: 17 }, (_, i) => addDays(new Date(), i - 2));
    shell(`
      ${salonBanner(s)}
      ${!staff.length ? `<div class="notice info">${esc(t('min_staff'))}</div>` : ''}
      ${!services.length ? `<div class="notice info">${esc(t('min_services'))}</div>` : ''}
      <div class="row between"><h1>${esc(s.name)}</h1></div>
      <div class="chips" style="margin:8px -16px 12px">${days.map(d => `<button class="chip day ${ymd(d) === agendaDate ? 'on' : ''}" data-day="${ymd(d)}"><span>${esc(ymd(d) === ymd(new Date()) ? t('today') : t('days_short')[d.getDay()])}</span><b>${d.getDate()}</b><span>${pad(d.getMonth() + 1)}</span></button>`).join('')}</div>
      <div class="stats">
        <div class="stat"><div class="v">${active.length}</div><div class="l">${esc(t('total_bookings'))}</div></div>
        <div class="stat"><div class="v">${esc(money(rev(list)))}</div><div class="l">${esc(t('revenue_day'))}</div></div>
        <div class="stat"><div class="v">${esc(money(rev(week)))}</div><div class="l">${esc(t('revenue_week'))}</div></div>
      </div>
      <h2>${esc(dayName(d0))}</h2>
      <div class="list">${list.length ? list.map(b => {
        const msg = t('wa_msg').replace('{name}', (b.client_name || '').split(' ')[0]).replace('{salon}', s.name).replace('{when}', when(b.start_at));
        return `<div class="card ${b.status === 'cancelled' ? 'b-cancelled' : ''}">
          <div class="row" style="align-items:flex-start">
            <div class="timecol"><b>${hm(b.start_at)}</b><span>${hm(b.end_at)}</span></div>
            <div class="grow">
              <div class="row between"><span class="title ellipsis">${esc(b.client_name || '—')}</span>${statusPill(b.status)}</div>
              <div class="small">${esc(b.service_name)} · <b>${esc(money(b.price))}</b></div>
              <div class="muted small">${esc(t('with'))} ${esc(b.staff_name || '—')}${b.client_phone ? ' · ' + esc(b.client_phone) : ''}</div>
              ${b.note ? `<div class="small" style="margin-top:4px">“${esc(b.note)}”</div>` : ''}
              ${b.status === 'confirmed' ? `<div class="actions">
                <button class="btn primary sm" data-st="completed" data-id="${b.id}">${esc(t('done'))}</button>
                <button class="btn ghost sm" data-st="no_show" data-id="${b.id}">${esc(t('no_show'))}</button>
                ${b.client_phone ? `<a class="btn ghost sm" target="_blank" rel="noopener" href="https://wa.me/${waNumber(b.client_phone)}?text=${encodeURIComponent(msg)}">${esc(t('whatsapp'))}</a>
                <a class="btn ghost sm" href="${esc(telHref(b.client_phone))}">${esc(t('call'))}</a>` : ''}
                <button class="btn danger sm" data-st="cancelled" data-id="${b.id}">${esc(t('cancel'))}</button></div>` : ''}
            </div>
          </div></div>`; }).join('') : `<div class="empty">${esc(t('empty_day'))}</div>`}</div>`);
    $$('[data-day]').forEach(b => b.onclick = () => { agendaDate = b.dataset.day; viewBizAgenda(); });
    const cur = $('[data-day].on'); cur && cur.scrollIntoView({ inline: 'center', block: 'nearest' });
    $$('[data-st]').forEach(b => b.onclick = () => {
      if (b.dataset.st === 'cancelled' && !confirm(t('cancel_confirm'))) return;
      guard(async () => { await DB().setBookingStatus(b.dataset.id, b.dataset.st); viewBizAgenda(); });
    });
  }

  async function viewBizServices() {
    loading();
    const s = await bizSalon(); if (!s) return viewBizSetup();
    const list = await DB().listServices(s.id);
    shell(`${salonBanner(s)}
      <div class="row between"><h1>${esc(t('services'))}</h1><button class="btn gold sm" id="add">+ ${esc(t('add'))}</button></div>
      <div class="list" style="margin-top:10px">${list.length ? list.map(x => `
        <div class="card row tap" data-edit="${x.id}" style="${x.active === false ? 'opacity:.5' : ''}">
          <div class="grow"><div class="title">${esc(x.name)}</div><div class="muted small">${x.duration} ${esc(t('min'))}</div></div>
          <div class="price">${esc(money(x.price))}</div></div>`).join('') : `<div class="empty">${esc(t('min_services'))}</div>`}</div>`);
    const edit = x => sheet(`
      <h2>${esc(x ? t('edit') : t('add'))}</h2>
      <form id="svf">
        <label class="f"><span>${esc(t('service_name'))} *</span><input type="text" name="name" value="${esc(x && x.name)}" required></label>
        <div class="grid2">
          <label class="f"><span>${esc(t('price'))} (${esc(C.CURRENCY || 'ALL')}) *</span><input type="number" name="price" min="0" step="50" inputmode="numeric" value="${x ? x.price : ''}" required></label>
          <label class="f"><span>${esc(t('duration'))} *</span><select name="duration">${[15, 20, 30, 45, 60, 75, 90, 120, 150, 180].map(m => `<option ${(x ? Number(x.duration) : 30) === m ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
        </div>
        <div class="row" style="margin-bottom:14px"><label class="switch"><input type="checkbox" name="active" ${!x || x.active !== false ? 'checked' : ''}><i></i></label><span class="title">${esc(t('active'))}</span></div>
        <div class="actions"><button class="btn primary grow" type="submit">${esc(t('save'))}</button>${x ? `<button class="btn danger" type="button" id="del">${esc(t('delete'))}</button>` : ''}</div>
      </form>`, (el, close) => {
      $('#svf', el).onsubmit = e => { e.preventDefault(); const f = new FormData(e.target);
        if (!String(f.get('name')).trim() || f.get('price') === '') return toast(t('fill_required'));
        guard(async () => { await DB().saveService({ ...(x ? { id: x.id } : {}), salon_id: s.id, name: String(f.get('name')).trim(), price: Number(f.get('price')), duration: Number(f.get('duration')), active: !!f.get('active') }); close(); viewBizServices(); }); };
      const del = $('#del', el); if (del) del.onclick = () => { if (confirm(t('delete_confirm'))) guard(async () => { await DB().deleteService(x.id); close(); viewBizServices(); }); };
    });
    $('#add').onclick = () => edit(null);
    $$('[data-edit]').forEach(c => c.onclick = () => edit(list.find(x => x.id === c.dataset.edit)));
  }

  async function viewBizStaff() {
    loading();
    const s = await bizSalon(); if (!s) return viewBizSetup();
    const list = await DB().listStaff(s.id);
    shell(`${salonBanner(s)}
      <div class="row between"><h1>${esc(t('staff'))}</h1><button class="btn gold sm" id="add">+ ${esc(t('add'))}</button></div>
      <div class="list" style="margin-top:10px">${list.length ? list.map(x => `
        <div class="card row tap" data-edit="${x.id}" style="${x.active === false ? 'opacity:.5' : ''}">
          <div class="avatar" style="width:38px;height:38px;font-size:14px">${esc(initials(x.name))}</div>
          <div class="grow title">${esc(x.name)}</div>${x.active === false ? '' : `<span class="pill ok">${esc(t('active'))}</span>`}</div>`).join('') : `<div class="empty">${esc(t('min_staff'))}</div>`}</div>`);
    const edit = x => sheet(`
      <h2>${esc(x ? t('edit') : t('add'))}</h2>
      <form id="stf">
        <label class="f"><span>${esc(t('staff_name'))} *</span><input type="text" name="name" value="${esc(x && x.name)}" required></label>
        <div class="row" style="margin-bottom:14px"><label class="switch"><input type="checkbox" name="active" ${!x || x.active !== false ? 'checked' : ''}><i></i></label><span class="title">${esc(t('active'))}</span></div>
        <div class="actions"><button class="btn primary grow" type="submit">${esc(t('save'))}</button>${x ? `<button class="btn danger" type="button" id="del">${esc(t('delete'))}</button>` : ''}</div>
      </form>`, (el, close) => {
      $('#stf', el).onsubmit = e => { e.preventDefault(); const f = new FormData(e.target);
        if (!String(f.get('name')).trim()) return toast(t('fill_required'));
        guard(async () => { await DB().saveStaff({ ...(x ? { id: x.id } : {}), salon_id: s.id, name: String(f.get('name')).trim(), active: !!f.get('active') }); close(); viewBizStaff(); }); };
      const del = $('#del', el); if (del) del.onclick = () => { if (confirm(t('delete_confirm'))) guard(async () => { await DB().deleteStaff(x.id); close(); viewBizStaff(); }); };
    });
    $('#add').onclick = () => edit(null);
    $$('[data-edit]').forEach(c => c.onclick = () => edit(list.find(x => x.id === c.dataset.edit)));
  }

  async function viewBizSalon() {
    loading();
    const s = await bizSalon(); if (!s) return viewBizSetup();
    const expired = s.plan_until && fromYmd(s.plan_until) < fromYmd(ymd(new Date()));
    shell(`${salonBanner(s)}
      <h1>${esc(t('settings'))}</h1>
      <div class="card row" style="margin:10px 0">
        <div class="grow"><div class="muted small">${esc(t('plan'))}</div><div class="title">${esc(t('plan_' + (expired ? 'expired' : s.plan)))}</div></div>
        <div style="text-align:right"><div class="muted small">${esc(t('plan_until'))}</div><div class="title">${esc(s.plan_until || '—')}</div></div>
        ${statusPill(s.status)}
      </div>
      <div class="card">${salonForm(s)}</div>`);
    bindSalonForm(s, () => viewBizSalon());
  }

  // ---------- Admin ----------
  async function viewAdmDash() {
    loading();
    const [st, salons] = await Promise.all([DB().adminStats(), DB().adminSalons()]);
    const pending = salons.filter(s => s.status === 'pending');
    shell(`
      <h1>${esc(t('dashboard'))}</h1>
      <div class="stats" style="margin-top:10px">
        <div class="stat"><div class="v">${st.salons}</div><div class="l">${esc(t('total_salons'))}</div></div>
        <div class="stat"><div class="v">${st.clients}</div><div class="l">${esc(t('total_clients'))}</div></div>
        <div class="stat"><div class="v">${st.bookings30}</div><div class="l">${esc(t('bookings_30'))}</div></div>
      </div>
      <h2>${esc(t('pending_salons'))} (${pending.length})</h2>
      <div class="list">${pending.length ? pending.map(adminSalonCard).join('') : '<div class="empty">—</div>'}</div>`);
    bindAdminSalonActions(viewAdmDash);
  }
  function adminSalonCard(s) {
    const expired = s.plan_until && fromYmd(s.plan_until) < fromYmd(ymd(new Date()));
    return `<div class="card">
      <div class="row between"><div class="grow"><div class="title ellipsis">${esc(s.name)}</div><div class="muted small ellipsis">${esc(s.owner_name || '')} · ${esc(s.owner_email || '')}</div></div>${statusPill(s.status)}</div>
      <div class="muted small" style="margin-top:4px">${esc(catLabel(s.category))} · ${esc(s.city)} · ${esc(s.phone || '')}</div>
      <div class="small" style="margin-top:4px">${esc(t('plan'))}: <b>${esc(t('plan_' + (expired ? 'expired' : s.plan)))}</b> · ${esc(t('plan_until'))} <b>${esc(s.plan_until || '—')}</b></div>
      <div class="actions">
        ${s.status === 'pending' ? `<button class="btn primary sm" data-act="approve" data-id="${s.id}">${esc(t('approve'))}</button>` : ''}
        ${s.status === 'active' ? `<button class="btn danger sm" data-act="suspend" data-id="${s.id}">${esc(t('suspend'))}</button>` : ''}
        ${s.status === 'suspended' ? `<button class="btn ghost sm" data-act="approve" data-id="${s.id}">${esc(t('activate'))}</button>` : ''}
        <button class="btn gold sm" data-act="paid" data-id="${s.id}" data-until="${esc(s.plan_until || '')}">${esc(t('mark_paid'))}</button>
      </div></div>`;
  }
  function bindAdminSalonActions(refresh) {
    $$('[data-act]').forEach(b => b.onclick = () => guard(async () => {
      const id = b.dataset.id, a = b.dataset.act;
      if (a === 'approve') await DB().adminSetSalon(id, { status: 'active' });
      if (a === 'suspend') await DB().adminSetSalon(id, { status: 'suspended' });
      if (a === 'paid') {
        const today = fromYmd(ymd(new Date())), cur = b.dataset.until ? fromYmd(b.dataset.until) : today;
        await DB().adminSetSalon(id, { plan: 'pro', plan_until: ymd(addDays(cur > today ? cur : today, 30)) });
      }
      toast(t('saved')); refresh();
    }));
  }
  let admFilter = '';
  async function viewAdmSalons() {
    loading();
    const salons = (await DB().adminSalons()).sort((a, b) => (a.status === 'pending' ? -1 : 0) - (b.status === 'pending' ? -1 : 0) || a.name.localeCompare(b.name));
    const list = salons.filter(s => !admFilter || s.status === admFilter);
    shell(`
      <h1>${esc(t('salons'))}</h1>
      <div class="chips" style="margin-top:8px">${['', 'pending', 'active', 'suspended'].map(f => `<button class="chip ${admFilter === f ? 'on' : ''}" data-f="${f}">${esc(f ? t('status_' + f) : t('filter_all'))} (${f ? salons.filter(s => s.status === f).length : salons.length})</button>`).join('')}</div>
      <div class="list" style="margin-top:8px">${list.length ? list.map(adminSalonCard).join('') : '<div class="empty">—</div>'}</div>`);
    $$('[data-f]').forEach(b => b.onclick = () => { admFilter = b.dataset.f; viewAdmSalons(); });
    bindAdminSalonActions(viewAdmSalons);
  }
  async function viewAdmUsers() {
    loading();
    const users = (await DB().adminUsers()).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    let q = '';
    const draw = () => {
      const l = users.filter(u => !q || [u.name, u.email, u.phone, u.role].join(' ').toLowerCase().includes(q));
      $('#ul').innerHTML = l.map(u => `<div class="card row">
        <div class="avatar" style="width:38px;height:38px;font-size:14px">${esc(initials(u.name))}</div>
        <div class="grow"><div class="title ellipsis">${esc(u.name)}</div><div class="muted small ellipsis">${esc(u.email)} · ${esc(u.phone || '')}</div></div>
        <span class="pill ${u.role === 'admin' ? 'bad' : u.role === 'business' ? 'warn' : 'info'}">${esc(t(u.role))}</span></div>`).join('') || '<div class="empty">—</div>';
    };
    shell(`<h1>${esc(t('users'))} (${users.length})</h1><input type="search" id="uq" placeholder="${esc(t('search_users'))}" style="margin:8px 0 10px"><div class="list" id="ul"></div>`);
    $('#uq').oninput = e => { q = e.target.value.toLowerCase(); draw(); };
    draw();
  }

  // ---------- Boot ----------
  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Failed to load ' + src)); document.head.appendChild(s); });
  }
  async function start() {
    document.documentElement.lang = lang;
    try {
      if (LIVE) { await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js'); await loadScript('js/db-supabase.js'); }
      else await loadScript('js/db-demo.js');
      await DB().init();
      S.user = await DB().currentUser();
    } catch (e) { app().innerHTML = `<div class="wrap"><main><div class="notice bad">${esc(errMsg(e))}</div></main></div>`; return; }
    if (!S.user) return viewAuth();
    const r = (location.hash || '').slice(1);
    const okForRole = r && !r.startsWith('salon') && !r.startsWith('book') &&
      ((r.startsWith('biz-') && S.user.role === 'business') || (r.startsWith('adm-') && S.user.role === 'admin') || ['explore', 'my-bookings', 'profile'].includes(r) && (S.user.role === 'client' || r === 'profile'));
    okForRole ? go(r, {}, true) : home();
  }
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  start();
})();
