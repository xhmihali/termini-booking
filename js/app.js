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
    d = new Date(d); const today = ymd(new Date()), x = ymd(d);
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
    logo: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg>',
    team: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .7 3 2.3 3.5 5"/></svg>',
    store: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v10h16V10M3 4h18l-1 6H4L3 4Z"/><path d="M10 20v-5h4v5"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg>',
    pin: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    calplus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/></svg>',
    sunset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 18a5 5 0 0 0-10 0M12 9V3M4.2 10.2l1.4 1.4M2 18h2M20 18h2M18.4 11.6l1.4-1.4M2 22h20"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>'
  };
  const CATS = ['barber', 'salon', 'nails', 'spa'];
  const CAT_ICON = {
    barber: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/></svg>',
    salon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3c-5 0-7 4-7 9v8M12 3c5 0 7 4 7 9v8M9 7c0 5 1 9 3 13M15 7c0 5-1 9-3 13"/></svg>',
    nails: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 21V11a4 4 0 0 1 8 0v10"/><path d="M10 7V4a2 2 0 0 1 4 0v3"/></svg>',
    spa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 20c-4 0-8-3-8-7 3 0 6 2 8 5 2-3 5-5 8-5 0 4-4 7-8 7z"/><path d="M12 18c-2-3-2-8 0-12 2 4 2 9 0 12z"/></svg>'
  };
  const PERSON_TONES = [['var(--accent-soft)', 'var(--accent)'], ['var(--coral-soft)', 'var(--coral-ink)'], ['var(--pink-soft)', 'var(--pink)'], ['var(--ok-soft)', 'var(--ok)']];
  const tone = i => `background:${PERSON_TONES[i % 4][0]};color:${PERSON_TONES[i % 4][1]}`;

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
    if (m === 'NOT_ACCEPTING') return t('not_accepting');
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

  // Ratings & photos helpers
  const starRow = (r, px = 16) => `<span class="stars" style="font-size:${px}px" aria-label="${Number(r).toFixed(1)} / 5">${[1, 2, 3, 4, 5].map(i => `<i class="${r >= i - 0.25 ? 'on' : r >= i - 0.75 ? 'half' : ''}">★</i>`).join('')}</span>`;
  const ratingTag = s => s && s.rating_count ? `<span class="rate">★ ${Number(s.rating_avg).toFixed(1)}<small> (${s.rating_count})</small></span>` : '';
  const salonThumb = (s, cls = '') => (s.photos && s.photos.length)
    ? `<img class="thumb ${cls}" src="${esc(s.photos[0].url)}" alt="" loading="lazy">`
    : `<div class="avatar ${esc(s.category)} ${cls}">${esc(initials(s.name))}</div>`;
  // Shrink photos on the phone before upload (saves the free storage and data)
  function resizeImage(file, max = 1200, quality = 0.78) {
    return new Promise((resolve, reject) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        c.toBlob(b => b ? resolve(b) : reject(new Error('IMAGE')), 'image/jpeg', quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('IMAGE')); };
      img.src = url;
    });
  }
  function reviewSheet(b, onDone) {
    let val = 0;
    sheet(`<h2>${esc(fill('review_title', { salon: b.salon_name || '' }))}</h2>
      <p class="muted small" style="margin:-4px 0 12px">${esc(b.service_name)} · ${esc(dayName(b.start_at))}${b.staff_name ? ' · ' + esc(t('with')) + ' ' + esc(b.staff_name) : ''}</p>
      <div class="starpick" role="radiogroup" aria-label="${esc(t('rating'))}">${[1, 2, 3, 4, 5].map(i => `<button type="button" data-star="${i}" aria-label="${i}">★</button>`).join('')}</div>
      <div class="muted small" id="starlbl" style="text-align:center;min-height:20px;margin:6px 0 10px"></div>
      <label class="f"><span>${esc(t('review_comment'))} (${esc(t('optional'))})</span><textarea id="rvc" maxlength="500"></textarea></label>
      <button class="btn accent block" id="rvsend" disabled>${esc(t('review_send'))}</button>`, (el, close) => {
      const labels = t('star_labels');
      $$('[data-star]', el).forEach(btn => btn.onclick = () => {
        val = +btn.dataset.star; $$('[data-star]', el).forEach(x => x.classList.toggle('on', +x.dataset.star <= val));
        $('#starlbl', el).textContent = labels[val - 1]; $('#rvsend', el).disabled = false;
      });
      $('#rvsend', el).onclick = () => guard(async () => {
        await DB().createReview({ booking_id: b.id, rating: val, comment: $('#rvc', el).value.trim() });
        close(); toast(t('review_thanks')); onDone && onDone();
      });
    });
  }

  // ---------- Router ----------
  function go(route, params = {}, replace = false) {
    S.route = route; S.params = params;
    const st = { route, params }, hash = '#' + route + (params.id ? '/' + params.id : '');
    try { replace ? history.replaceState(st, '', hash) : history.pushState(st, '', hash); } catch {}
    render(); window.scrollTo(0, 0);
  }
  window.addEventListener('popstate', e => { if (e.state) { S.route = e.state.route; S.params = e.state.params || {}; render(); } });
  const STANDALONE = (() => { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone; } catch { return false; } })();
  const guestHome = () => STANDALONE ? 'auth' : 'landing';
  const home = () => S.user ? go(ROLE_HOME[S.user.role] || 'explore', {}, true) : go(guestHome(), {}, true);
  const afterLogin = () => {
    const pb = S.pendingBook; S.pendingBook = null;
    if (pb && S.user.role === 'client') return go('book', pb, true);
    home();
  };
  async function shareLink(title, url) {
    try { if (navigator.share) { await navigator.share({ title, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(url); toast(t('link_copied')); } catch { prompt(t('copy_link'), url); }
  }
  const salonLink = id => location.origin + location.pathname + '#salon/' + id;
  function scrollToId(id) {
    if (S.user || S.route !== 'landing') { go('landing'); setTimeout(() => { const el = document.getElementById(id); el && el.scrollIntoView({ behavior: 'smooth' }); }, 120); return; }
    const el = document.getElementById(id); el && el.scrollIntoView({ behavior: 'smooth' });
  }

  const NAVS = {
    client: [['explore', 'explore', I.search], ['my-bookings', 'my_bookings', I.cal], ['profile', 'profile', I.user]],
    business: [['biz-agenda', 'agenda', I.cal], ['biz-services', 'services', I.list], ['biz-staff', 'staff', I.team], ['biz-salon', 'settings', I.store], ['profile', 'profile', I.user]],
    admin: [['adm-dash', 'dashboard', I.chart], ['adm-salons', 'salons', I.store], ['adm-users', 'users', I.team], ['profile', 'profile', I.user]]
  };
  const NAV_OF = { salon: 'explore', book: 'explore', 'biz-qr': 'biz-salon' };

  function shell(content, opts = {}) {
    const nav = S.user ? NAVS[S.user.role] || [] : [];
    const active = NAV_OF[S.route] || S.route;
    const showNav = nav.length;
    app().innerHTML = `
      <div class="layout ${showNav ? 'with-nav' : ''}">
      ${showNav ? `<nav class="nav ${opts.cta ? 'hide-m' : ''}"><div class="in"><div class="nav-brand"><img src="icons/icon.svg" alt="" width="36" height="36">${esc(C.APP_NAME || 'Termini')}</div>${nav.map(([r, k, ic]) => `<button class="${active === r ? 'on' : ''}" data-nav="${r}" aria-label="${esc(t(k))}">${ic}<span>${esc(t(k))}</span></button>`).join('')}</div></nav>` : ''}
      <div class="wrap ${opts.cta ? 'has-cta' : ''} ${opts.fab ? 'has-fab' : ''}">
        <header class="top">
          ${opts.back ? `<button class="back" data-back aria-label="${esc(t('back'))}">${I.back}</button>` : `<button class="brand" data-brand><img class="brand-mark" src="icons/icon.svg" alt="" width="34" height="34">${esc(C.APP_NAME || 'Termini')}</button>`}
          <div class="sp"></div>${opts.center ? opts.center + '<div class="sp"></div>' : ''}
          ${!S.user ? `<div class="gnav"><button data-scroll="salons-sec">${esc(t('nav_salons'))}</button><button data-scroll="how">${esc(t('nav_how'))}</button><button data-scroll="biz">${esc(t('nav_biz'))}</button><button data-scroll="pricing">${esc(t('nav_pricing'))}</button><button data-scroll="faq">${esc(t('nav_faq'))}</button></div>` : ''}
          ${LIVE ? '' : `<span class="badge-demo" title="${esc(t('demo_hint'))}">${esc(t('demo_mode'))}</span>`}
          <button class="lang" data-lang>${lang === 'sq' ? 'EN' : 'SQ'}</button>
          ${!S.user && S.route !== 'auth' ? `<button class="btn ghost sm" data-auth="login">${esc(t('login'))}</button><button class="btn accent sm hide-sm" data-auth="register">${esc(t('register'))}</button>` : ''}
        </header>
        <main>${content}</main>
        ${S.user ? `<footer class="app-footer"><span>© ${new Date().getFullYear()} ${esc(C.APP_NAME || 'Termini')}</span>${S.user.role === 'business' && C.ADMIN_PHONE ? `<a target="_blank" rel="noopener" href="https://wa.me/${waNumber(C.ADMIN_PHONE)}">${esc(t('contact_admin'))}</a>` : ''}${S.user.role === 'business' && C.CONTACT_EMAIL ? `<a href="mailto:${esc(C.CONTACT_EMAIL)}">${esc(C.CONTACT_EMAIL)}</a>` : ''}</footer>` : ''}
      </div>
      </div>
      ${opts.cta ? `<div class="cta"><div class="in">${opts.cta}</div></div>` : ''}
      ${opts.fab && showNav ? opts.fab : ''}`;
    $$('[data-nav]').forEach(b => b.onclick = () => go(b.dataset.nav));
    const bk = $('[data-back]'); if (bk) bk.onclick = () => (history.length > 1 ? history.back() : home());
    $('[data-lang]').onclick = () => { lang = lang === 'sq' ? 'en' : 'sq'; store.set('termini_lang', lang); document.documentElement.lang = lang; render(); };
    const br = $('[data-brand]'); if (br) br.onclick = () => home();
    $$('[data-scroll]').forEach(b => b.onclick = () => scrollToId(b.dataset.scroll));
    $$('[data-auth]').forEach(b => b.onclick = () => go('auth', { mode: b.dataset.auth, role: b.dataset.role || 'client' }));
  }
  const loading = () => shell('<div class="spinner"></div>');

  async function render() {
    if (!S.user) {
      try {
        if (S.route === 'salon' && S.params.id) return await viewSalon();
        if (S.route === 'auth') return viewAuth(S.params.mode || 'login', S.params.role || 'client');
        return await viewLanding();
      } catch (e) { return shell(`<div class="notice bad">${esc(errMsg(e))}</div>`); }
    }
    const views = {
      explore: viewExplore, salon: viewSalon, book: viewBook, 'my-bookings': viewMyBookings, profile: viewProfile,
      'biz-agenda': viewBizAgenda, 'biz-services': viewBizServices, 'biz-staff': viewBizStaff, 'biz-salon': viewBizSalon, 'biz-qr': viewBizQr,
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
    const feat = (title, keys) => `<div class="feat"><div class="feat-t">${esc(t(title))}</div>${keys.map(k => `<div class="feat-i">${I.check}<span>${esc(t(k))}</span></div>`).join('')}</div>`;
    shell(`<div class="auth-split">
      <section class="auth-hero">
        <img src="icons/icon.svg" alt="" width="84" height="84" class="hero-logo">
        <h1>${esc(t('tagline'))}</h1>
        <p>${esc(t('hero_desktop_sub'))}</p>
        <div class="feats">${feat('for_clients', ['f_c1', 'f_c2', 'f_c3'])}${feat('for_business', ['f_b1', 'f_b2', 'f_b3'])}</div>
      </section>
      <section class="auth-main">
      <div class="hero"><div class="grow"><h1>${esc(C.APP_NAME || 'Termini')}</h1><p>${esc(t('tagline'))}</p></div><img class="hero-logo" src="icons/icon.svg" alt="" width="88" height="88"></div>
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
      </div>${demo}</section></div>`);
    $$('[data-mode]').forEach(b => b.onclick = () => viewAuth(b.dataset.mode, role));
    $$('[data-role]').forEach(b => b.onclick = () => viewAuth('register', b.dataset.role));
    $$('[data-demo]').forEach(b => b.onclick = () => guard(async () => { S.user = await DB().signIn(b.dataset.demo, 'demo123'); afterLogin(); }));
    const rs = $('[data-reset]'); if (rs) rs.onclick = () => { if (confirm(t('reset_confirm'))) guard(async () => { await DB().reset(); toast(t('saved')); }); };
    $('#authf').onsubmit = e => {
      e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
      if (!f.email || !f.password || (mode === 'register' && (!f.name || !f.phone))) return toast(t('fill_required'));
      if (mode === 'register' && f.password.length < 6) return toast(t('password_short'));
      guard(async () => {
        S.user = mode === 'login' ? await DB().signIn(f.email, f.password)
          : await DB().signUp({ email: f.email, password: f.password, name: f.name.trim(), phone: f.phone.trim(), role });
        afterLogin();
      });
    };
  }

  // ---------- Public website (guests) ----------
  let landingState = { q: '', city: '', cat: '' };
  async function viewLanding() {
    loading();
    const salons = await DB().listSalons();
    const cities = [...new Set(salons.map(s => s.city).filter(Boolean))].sort();
    const nexts = {};
    await Promise.all(salons.slice(0, 12).map(async s => { try { if (s.accepting !== false) nexts[s.id] = await salonNext(s); } catch (e) { /* skip */ } }));
    const steps = [['how1_t', 'how1_d', I.search], ['how2_t', 'how2_d', I.cal], ['how3_t', 'how3_d', I.check]];
    const bizF = [['bf1_t', 'bf1_d', I.cal], ['bf2_t', 'bf2_d', I.wa], ['bf3_t', 'bf3_d', I.plus], ['bf4_t', 'bf4_d', I.chart], ['bf5_t', 'bf5_d', I.share], ['bf6_t', 'bf6_d', I.store]];
    const faqs = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];
    const year = new Date().getFullYear();
    shell(`
      <section class="lp-hero">
        <div class="lp-hero-text">
          <span class="pill info" style="margin-bottom:14px">${esc(t('lp_badge'))}</span>
          <h1>${esc(t('tagline'))}</h1>
          <p>${esc(t('hero_desktop_sub'))}</p>
          <form class="lp-search" id="lps">
            ${I.search.replace('<svg', '<svg width="20" height="20" style="color:var(--muted);flex:none"')}
            <input type="search" name="q" placeholder="${esc(t('search_home'))}" aria-label="${esc(t('explore'))}" value="${esc(landingState.q)}">
            ${cities.length > 1 ? `<select name="city" aria-label="${esc(t('city'))}"><option value="">${esc(t('all_cities'))}</option>${cities.map(c => `<option ${landingState.city === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>` : ''}
            <button class="btn accent" type="submit">${esc(t('search_btn'))}</button>
          </form>
          <div class="lp-facts">
            <span><b>${salons.length}</b> ${esc(t('lp_salons'))}</span><span><b>${cities.length}</b> ${esc(t('lp_cities'))}</span><span><b>0 ALL</b> ${esc(t('lp_free_clients'))}</span>
          </div>
        </div>
        <div class="lp-hero-art" aria-hidden="true">
          <img src="icons/icon.svg" alt="" width="190" height="190" class="lp-logo">
          <div class="lp-float f1"><span class="dot" style="color:#22C55E"></span>${esc(t('free_now'))} · 17:30</div>
          <div class="lp-float f2">${I.check.replace('<svg', '<svg width="16" height="16" style="color:var(--ok)"')} ${esc(t('booked_title'))}</div>
          <div class="lp-float f3">${I.wa.replace('<svg', '<svg width="16" height="16" style="color:var(--ok)"')} ${esc(t('lp_reminder'))}</div>
        </div>
      </section>

      <div class="cats" style="margin-top:8px">${CATS.map(c => `<button class="cat ${c} ${landingState.cat === c ? 'on' : ''}" data-lcat="${c}">${CAT_ICON[c]}<span style="text-align:center;line-height:1.15;padding:0 4px">${esc(catLabel(c))}</span></button>`).join('')}</div>

      <section id="salons-sec" class="lp-sec">
        <div class="lp-head"><h2>${esc(t('lp_salons_title'))}</h2><span class="muted">${esc(t('lp_salons_sub'))}</span></div>
        <div class="list grid-cards" id="lsalons"></div>
      </section>

      <section id="how" class="lp-sec">
        <div class="lp-head"><h2>${esc(t('nav_how'))}</h2></div>
        <div class="lp-steps">${steps.map(([a, b, ic], i) => `<div class="card lp-step"><span class="lp-num">${i + 1}</span><span class="lp-ic">${ic}</span><div class="title">${esc(t(a))}</div><div class="muted small">${esc(t(b))}</div></div>`).join('')}</div>
      </section>

      <section id="biz" class="lp-sec lp-biz">
        <div class="lp-biz-head">
          <span class="pill coral">${esc(t('nav_biz'))}</span>
          <h2>${esc(t('biz_title'))}</h2>
          <p>${esc(t('biz_sub'))}</p>
          <button class="btn accent" data-auth="register" data-role="business">${esc(t('biz_cta'))}</button>
        </div>
        <div class="lp-feats">${bizF.map(([a, b, ic]) => `<div class="lp-feat"><span class="lp-ic">${ic}</span><div><div class="title">${esc(t(a))}</div><div class="small" style="color:#C9CCE6">${esc(t(b))}</div></div></div>`).join('')}</div>
      </section>

      <section id="pricing" class="lp-sec">
        <div class="lp-head"><h2>${esc(t('nav_pricing'))}</h2><span class="muted">${esc(t('pricing_sub'))}</span></div>
        <div class="lp-prices">
          <div class="card lp-price"><div class="kicker" style="margin:0">${esc(t('for_clients'))}</div><div class="lp-amount">0 ALL</div><div class="muted">${esc(t('price_clients'))}</div>
            <ul>${['f_c1', 'f_c2', 'f_c3'].map(k => `<li>${I.check}<span>${esc(t(k))}</span></li>`).join('')}</ul>
            <button class="btn ghost block" data-auth="register">${esc(t('register'))}</button></div>
          <div class="card lp-price hl"><div class="kicker" style="margin:0;color:#DCE1FF">${esc(t('for_business'))}</div>
            <div class="lp-amount">${esc(C.PRICE_MONTHLY || t('price_contact'))}${C.PRICE_MONTHLY ? `<small> / ${esc(t('per_month'))}</small>` : ''}</div>
            <div style="color:#DCE1FF">${esc(fill('price_trial', { days: TRIAL }))}</div>
            <ul>${['bf1_t', 'bf2_t', 'bf3_t', 'bf4_t'].map(k => `<li>${I.check}<span>${esc(t(k))}</span></li>`).join('')}</ul>
            <button class="btn block" style="background:#fff;color:var(--accent)" data-auth="register" data-role="business">${esc(t('biz_cta'))}</button></div>
        </div>
      </section>

      <section id="faq" class="lp-sec">
        <div class="lp-head"><h2>${esc(t('nav_faq'))}</h2></div>
        <div class="lp-faq">${faqs.map(k => `<details class="card"><summary>${esc(fill(k, { days: TRIAL }))}</summary><p class="muted">${esc(fill(k + '_a', { days: TRIAL }))}</p></details>`).join('')}</div>
      </section>

      <footer class="lp-footer">
        <div class="lp-fbrand"><div class="row" style="gap:10px"><img src="icons/icon.svg" alt="" width="36" height="36" style="border-radius:11px"><b style="font-size:19px">${esc(C.APP_NAME || 'Termini')}</b></div><p class="muted small">${esc(t('tagline'))}</p></div>
        <div><div class="title">${esc(t('for_clients'))}</div><button class="linkbtn" data-scroll="salons-sec">${esc(t('nav_salons'))}</button><button class="linkbtn" data-auth="register">${esc(t('register'))}</button><button class="linkbtn" data-auth="login">${esc(t('login'))}</button></div>
        <div><div class="title">${esc(t('for_business'))}</div><button class="linkbtn" data-auth="register" data-role="business">${esc(t('biz_cta'))}</button><button class="linkbtn" data-scroll="pricing">${esc(t('nav_pricing'))}</button><button class="linkbtn" data-scroll="faq">${esc(t('nav_faq'))}</button></div>
        <div id="lpcities" style="display:none"><div class="title">${esc(t('cities'))}</div></div>
        <div class="lp-copy muted small">© ${year} ${esc(C.APP_NAME || 'Termini')} · ${esc(t('made_in'))}</div>
      </footer>`);

    const draw = () => {
      const q = landingState.q.toLowerCase();
      const list = salons.filter(s => (!landingState.city || s.city === landingState.city) && (!landingState.cat || s.category === landingState.cat) &&
        (!q || [s.name, s.city, s.address, s.description, catLabel(s.category)].join(' ').toLowerCase().includes(q)));
      $('#lsalons').innerHTML = list.length ? list.map(s => {
        const n = nexts[s.id];
        return `<div class="card tap" data-lsalon="${s.id}">
          <div class="row">${salonThumb(s)}
            <div class="grow"><div class="title ellipsis">${esc(s.name)}</div><div class="muted small ellipsis">${s.rating_count ? `<b style="color:#B45309">★ ${Number(s.rating_avg).toFixed(1)}</b> · ` : ''}${esc(catLabel(s.category))} · ${esc(s.city)}${n ? ` · ${esc(t('from_price'))} ${esc(money(n.svc.price))}` : ''}</div></div>
            ${isOpenNow(s) ? `<span class="pill ok">${esc(t('open_now'))}</span>` : `<span class="pill mute">${esc(t('closed_now'))}</span>`}</div>
          ${n && n.slots.length ? `<div class="times">${n.day ? `<span class="small" style="align-self:center;font-weight:800;color:var(--muted)">${esc(t('next_day'))}</span>` : ''}${n.slots.map((sl, i) => `<button class="tpill ${i === 0 ? 'first' : ''}" data-lpick="${s.id}|${n.svc.id}|${sl.start.toISOString()}|${sl.staff_id}">${hm(sl.start)}</button>`).join('')}</div>` : ''}
        </div>`; }).join('') : `<div class="empty">${esc(t('no_salons'))}</div>`;
      $$('[data-lsalon]').forEach(c => c.onclick = () => go('salon', { id: c.dataset.lsalon }));
      $$('[data-lpick]').forEach(b => b.onclick = e => {
        e.stopPropagation(); const [salon, service, start, staff] = b.dataset.lpick.split('|');
        S.pendingBook = { salon, service, start, staff }; toast(t('login_to_book')); go('auth', { mode: 'login' });
      });
    };
    $('#lps').onsubmit = e => {
      e.preventDefault(); landingState.q = e.target.q.value.trim(); if (e.target.city) landingState.city = e.target.city.value;
      draw(); $('#salons-sec').scrollIntoView({ behavior: 'smooth' });
    };
    $$('[data-lcat]').forEach(b => b.onclick = () => {
      landingState.cat = landingState.cat === b.dataset.lcat ? '' : b.dataset.lcat;
      $$('[data-lcat]').forEach(x => x.classList.toggle('on', x.dataset.lcat === landingState.cat)); draw();
    });
    $$('main [data-auth]').forEach(b => b.onclick = () => go('auth', { mode: b.dataset.auth, role: b.dataset.role || 'client' }));
    $$('main [data-scroll]').forEach(b => b.onclick = () => scrollToId(b.dataset.scroll));
    draw();
    // Links to the static city pages for Google (built by the GitHub Action), if they exist
    if (LIVE) fetch('qytet/cities.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : []).then(list => {
      const el = $('#lpcities'); if (!el || !list.length) return;
      el.insertAdjacentHTML('beforeend', list.slice(0, 8).map(c => `<a href="qytet/${encodeURIComponent(c.slug)}/">${esc(c.name)} (${c.count})</a>`).join('') + `<a href="qytet/">${esc(t('all_cities'))}</a>`);
      el.style.display = '';
    }).catch(() => {});
  }

  // ---------- Client ----------
  let exploreState = { q: '', city: '', cat: '' };

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

  // First free times for a salon (cheapest active service), today or tomorrow
  async function salonNext(s) {
    const [services, staff] = await Promise.all([DB().listServices(s.id), DB().listStaff(s.id)]);
    const svc = services.filter(x => x.active !== false).sort((a, b) => Number(a.price) - Number(b.price))[0];
    const st = staff.filter(p => p.active !== false);
    if (!svc || !st.length) return null;
    const d0 = fromYmd(ymd(new Date()));
    const busy = await DB().busy(s.id, d0.toISOString(), addDays(d0, 2).toISOString());
    let day = 0, slots = genSlots(ymd(d0), s, svc, st, busy, '');
    if (!slots.length) { day = 1; slots = genSlots(ymd(addDays(d0, 1)), s, svc, st, busy, ''); }
    return { svc, slots: slots.slice(0, 3), day };
  }

  async function viewExplore() {
    loading();
    const [salons, mine, myRev] = await Promise.all([DB().listSalons(), DB().myBookings().catch(() => []), DB().myReviews().catch(() => [])]);
    const revIds = new Set(myRev.map(r => r.booking_id));
    const cities = [...new Set(salons.map(s => s.city).filter(Boolean))].sort();
    const nexts = {};
    const nowT = Date.now();
    const nextB = mine.filter(b => b.status === 'confirmed' && new Date(b.end_at) > nowT).sort((a, b) => new Date(a.start_at) - new Date(b.start_at))[0];
    const lastB = mine.filter(b => new Date(b.start_at) < nowT && b.status !== 'cancelled' && b.service_id).sort((a, b) => new Date(b.start_at) - new Date(a.start_at))[0];
    const toRate = mine.filter(b => b.status === 'completed' && !revIds.has(b.id)).sort((a, b) => new Date(b.start_at) - new Date(a.start_at))[0];
    const rail = `<aside class="col-side">
      <div class="card ${nextB ? '' : 'desk-only'}" style="margin-bottom:12px">
        <div class="kicker" style="margin:0 0 10px">${esc(t('next_booking'))}</div>
        ${nextB ? `<div class="row" style="align-items:flex-start">
            <div style="width:52px;flex:none;border-radius:16px;background:var(--accent);color:#fff;text-align:center;padding:7px 0;line-height:1.1"><div style="font-size:11px;font-weight:800">${esc(t('days_short')[new Date(nextB.start_at).getDay()]).toUpperCase()}</div><div style="font-size:20px;font-weight:800">${new Date(nextB.start_at).getDate()}</div></div>
            <div class="grow"><div class="title">${hm(nextB.start_at)} · ${esc(nextB.service_name)}</div><div class="muted small">${esc(nextB.salon_name)}${nextB.staff_name ? ' · ' + esc(t('with')) + ' ' + esc(nextB.staff_name) : ''}</div></div></div>
          <div class="actions"><a class="btn soft sm" href="${icsHref(nextB)}" download="termini.ics">${esc(t('add_calendar'))}</a><button class="btn ghost sm" data-nav2="my-bookings">${esc(t('my_bookings'))}</button></div>`
          : `<div class="muted small">${esc(t('no_next'))}</div>`}
      </div>
      ${toRate ? `<div class="card" style="margin-bottom:12px"><div class="title">${esc(fill('review_ask', { salon: toRate.salon_name }))}</div>
        <div class="muted small" style="margin:2px 0 10px">${esc(toRate.service_name)} · ${esc(dayName(toRate.start_at))}</div>
        <button class="btn accent block" data-rate="${toRate.id}">★ ${esc(t('rate_visit'))}</button></div>` : ''}
      ${lastB ? `<div class="card desk-only" style="margin-bottom:12px"><div class="kicker" style="margin:0 0 8px">${esc(t('book_again'))}</div>
        <div class="title">${esc(lastB.service_name)}</div><div class="muted small" style="margin-bottom:12px">${esc(lastB.salon_name)}${lastB.staff_name ? ' · ' + esc(lastB.staff_name) : ''}</div>
        <button class="btn accent block" data-again="${lastB.salon_id}|${lastB.service_id}">${esc(t('book_again_btn'))}</button></div>` : ''}
      <div class="card desk-only"><div class="title">${esc(t('invite_title'))}</div><p class="muted small" style="margin:4px 0 12px">${esc(t('invite_body'))}</p><button class="btn soft block" id="invite">${I.share.replace('<svg', '<svg width="16" height="16"')}${esc(t('share'))}</button></div>
    </aside>`;
    await Promise.all(salons.slice(0, 30).map(async s => { try { if (s.accepting !== false) nexts[s.id] = await salonNext(s); } catch (e) { /* ignore one salon */ } }));
    const first = (S.user.name || '').split(' ')[0];
    const draw = () => {
      const q = exploreState.q.toLowerCase();
      const list = salons.filter(s => (!exploreState.city || s.city === exploreState.city) && (!exploreState.cat || s.category === exploreState.cat) &&
        (!q || [s.name, s.city, s.address, s.description, catLabel(s.category)].join(' ').toLowerCase().includes(q)));
      const key = s => { const n = nexts[s.id]; return n && n.slots.length ? n.day * 1e13 + n.slots[0].start.getTime() : 9e15; };
      list.sort((a, b) => key(a) - key(b));
      $('#salons').innerHTML = list.length ? list.map(s => {
        const n = nexts[s.id];
        const times = n && n.slots.length
          ? `<div class="times">${n.day ? `<span class="small" style="align-self:center;font-weight:800;color:var(--muted)">${esc(t('next_day'))}</span>` : ''}${n.slots.map((sl, i) => `<button class="tpill ${i === 0 ? 'first' : ''}" data-pick="${s.id}|${n.svc.id}|${sl.start.toISOString()}|${sl.staff_id}">${hm(sl.start)}</button>`).join('')}<button class="tpill ghost" data-open="${s.id}">${esc(t('more'))}</button></div>`
          : `<div class="muted small" style="margin-top:10px">${esc(s.accepting === false ? t('not_accepting') : t('no_free_today'))}</div>`;
        return `<div class="card tap" data-salon="${s.id}">
          <div class="row">
            ${salonThumb(s)}
            <div class="grow">
              <div class="title ellipsis">${esc(s.name)}</div>
              <div class="muted small ellipsis">${s.rating_count ? `<b style="color:#B45309">★ ${Number(s.rating_avg).toFixed(1)}</b> · ` : ''}${esc(catLabel(s.category))} · ${esc(s.city)}${n ? ` · ${esc(t('from_price'))} ${esc(money(n.svc.price))}` : ''}</div>
            </div>
            ${isOpenNow(s) ? `<span class="pill ok">${esc(t('open_now'))}</span>` : `<span class="pill mute">${esc(t('closed_now'))}</span>`}
          </div>${times}
        </div>`; }).join('') : `<div class="empty">${esc(t('no_salons'))}</div>`;
      $$('[data-salon]').forEach(c => c.onclick = () => go('salon', { id: c.dataset.salon }));
      $$('[data-open]').forEach(b => b.onclick = e => { e.stopPropagation(); go('salon', { id: b.dataset.open }); });
      $$('[data-pick]').forEach(b => b.onclick = e => {
        e.stopPropagation(); const [salon, service, start, staff] = b.dataset.pick.split('|');
        go('book', { salon, service, start, staff });
      });
    };
    shell(`
      <div class="row between" style="margin-top:4px">
        <div><div class="muted" style="font-weight:600">${esc(t('hello'))}, ${esc(first)}</div><h1 style="margin:0">${esc(t('what_today'))}</h1></div>
        <div class="avatar" style="background:var(--accent);color:#fff;width:46px;height:46px;border-radius:15px">${esc(initials(S.user.name))}</div>
      </div>
      <div class="split home-split">${rail}<div class="col-main">
      <label class="search">${I.search.replace('<svg', '<svg width="20" height="20" style="color:var(--muted);flex:none"')}
        <input type="search" id="q" placeholder="${esc(t('search_home'))}" value="${esc(exploreState.q)}" aria-label="${esc(t('explore'))}">
        ${cities.length > 1 ? `<select id="city" aria-label="${esc(t('city'))}"><option value="">${esc(t('all_cities'))}</option>${cities.map(c => `<option ${exploreState.city === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>`
          : cities.length === 1 ? `<span style="font-weight:800;color:var(--accent);font-size:13px">${esc(cities[0])}</span>` : ''}
      </label>
      <div class="cats">${CATS.map(c => `<button class="cat ${c} ${exploreState.cat === c ? 'on' : ''}" data-cat="${c}">${CAT_ICON[c]}<span style="text-align:center;line-height:1.15;padding:0 4px">${esc(catLabel(c))}</span></button>`).join('')}</div>
      <h2>${esc(exploreState.q || exploreState.cat || exploreState.city ? t('all_results') : t('free_now'))}</h2>
      <div class="list grid-cards" id="salons"></div></div></div>`);
    $$('[data-nav2]').forEach(b => b.onclick = () => go(b.dataset.nav2));
    $$('[data-again]').forEach(b => b.onclick = () => { const [salon, service] = b.dataset.again.split('|'); go('book', { salon, service }); });
    $$('[data-rate]').forEach(x => x.onclick = () => reviewSheet(toRate, viewExplore));
    const inv = $('#invite'); if (inv) inv.onclick = () => shareLink(C.APP_NAME || 'Termini', location.origin + location.pathname);
    $('#q').oninput = e => { exploreState.q = e.target.value; draw(); };
    const cs = $('#city'); if (cs) cs.onchange = () => { exploreState.city = cs.value; draw(); };
    $$('[data-cat]').forEach(b => b.onclick = () => { exploreState.cat = exploreState.cat === b.dataset.cat ? '' : b.dataset.cat; viewExplore(); });
    draw();
  }

  function hoursTable(hours) {
    const order = [1, 2, 3, 4, 5, 6, 0], today = new Date().getDay();
    return `<dl class="kv">${order.map(i => { const h = (hours || [])[i];
      return `<dt style="${i === today ? 'font-weight:800;color:var(--ink)' : ''}">${esc(t('days')[i])}</dt><dd style="${i === today ? 'font-weight:800' : ''}">${h ? `${esc(h.open)} – ${esc(h.close)}` : `<span class="muted">${esc(t('closed'))}</span>`}</dd>`; }).join('')}</dl>`;
  }
  const stepsBar = (a, b = 3) => `<div class="steps" aria-label="${esc(t('step_of').replace('{a}', a).replace('{b}', b))}">${Array.from({ length: b }, (_, i) => `<span class="${i < a ? 'on' : ''}"></span>`).join('')}</div>`;

  async function viewSalon() {
    loading();
    const s = await DB().getSalon(S.params.id); if (!s) return home();
    const [services, staff, reviews] = await Promise.all([DB().listServices(s.id), DB().listStaff(s.id), DB().listReviews(s.id, 12).catch(() => [])]);
    const svc = services.filter(x => x.active !== false), team = staff.filter(p => p.active !== false);
    const photos = s.photos || [];
    const canBook = team.length && s.accepting !== false && s.status === 'active';
    shell(`
      ${photos.length ? `<div class="gallery g${Math.min(photos.length, 3)}">${photos.map((ph, i) => `<button class="gph" data-ph="${i}" aria-label="${esc(t('photo'))} ${i + 1}"><img src="${esc(ph.url)}" alt="${esc(s.name)}" loading="${i ? 'lazy' : 'eager'}"></button>`).join('')}</div>` : ''}
      <div class="row" style="margin:4px 0 8px">
        ${salonThumb(s, 'big')}
        <div class="grow"><h1 style="margin:0">${esc(s.name)}</h1><div class="muted small">${esc(catLabel(s.category))} · ${esc(s.city)}${s.rating_count ? ` · <b style="color:var(--ink)">★ ${Number(s.rating_avg).toFixed(1)}</b> (${s.rating_count} ${esc(t('reviews_n'))})` : ''}</div></div>
      </div>
      ${s.description ? `<p class="sub">${esc(s.description)}</p>` : ''}
      <div class="actions" style="margin-top:0">
        ${s.phone ? `<a class="btn ghost sm" href="${esc(telHref(s.phone))}">${I.phone.replace('<svg', '<svg width="16" height="16"')}${esc(t('call'))}</a>` : ''}
        <a class="btn ghost sm" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + ' ' + s.address + ' ' + s.city)}">${I.pin} ${esc(s.address)}</a>
        <button class="btn ghost sm" id="share">${I.share.replace('<svg', '<svg width="16" height="16"')}${esc(t('share'))}</button>
      </div>
      ${s.accepting === false ? `<div class="notice warn" style="margin-top:14px">${esc(t('not_accepting'))}</div>` : ''}
      <div class="split"><div class="col-main">
      <h2>${esc(t('services'))}</h2>
      <div class="list">${svc.length ? svc.map(x => `
        <div class="card row">
          <div class="grow"><div class="title">${esc(x.name)}</div><div class="muted small">${x.duration} ${esc(t('min'))} · <b style="color:var(--ink)">${esc(money(x.price))}</b></div></div>
          <button class="btn accent sm" data-book="${x.id}" ${canBook ? '' : 'disabled'}>${esc(t('book'))}</button>
        </div>`).join('') : `<div class="empty">—</div>`}</div>
      <h2>${esc(t('reviews'))}${s.rating_count ? ` <span class="muted" style="font-weight:600;font-size:15px">· ★ ${Number(s.rating_avg).toFixed(1)}</span>` : ''}</h2>
      <div class="list grid-cards">${reviews.length ? reviews.map(r => `<div class="card"><div class="row between"><span class="title">${esc(r.client_name || '—')}</span>${starRow(r.rating, 15)}</div>
        ${r.comment ? `<p style="margin:8px 0 4px">${esc(r.comment)}</p>` : ''}<div class="muted small">${esc(fmtDate(r.created_at))}</div></div>`).join('') : `<div class="muted">${esc(t('no_reviews'))}</div>`}</div>
      </div><aside class="col-side">
      ${team.length ? `<h2>${esc(t('staff'))}</h2><div class="chips">${team.map((p, i) => `<span class="person" style="cursor:default"><span class="ini" style="${tone(i)}">${esc(initials(p.name))}</span>${esc(p.name)}</span>`).join('')}</div>` : ''}
      <h2>${esc(t('hours'))}</h2><div class="card">${hoursTable(s.hours)}</div>
      <h2>${esc(t('location'))}</h2><div class="card" style="padding:0;overflow:hidden"><iframe title="${esc(t('location'))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" style="display:block;width:100%;height:220px;border:0" src="https://www.google.com/maps?q=${encodeURIComponent(s.name + ', ' + s.address + ', ' + s.city)}&output=embed"></iframe></div>
      </aside></div>`, { back: true, center: stepsBar(1) });
    $$('[data-book]').forEach(b => b.onclick = () => {
      const p = { salon: s.id, service: b.dataset.book };
      if (!S.user) { S.pendingBook = p; toast(t('login_to_book')); return go('auth', { mode: 'login' }); }
      go('book', p);
    });
    $('#share').onclick = () => shareLink(s.name, salonLink(s.id));
    $$('[data-ph]').forEach(b => b.onclick = () => {
      let i = +b.dataset.ph;
      sheet(`<div class="viewer"><img id="vimg" src="${esc(photos[i].url)}" alt=""><div class="row between" style="margin-top:10px">
        <button class="btn ghost sm" id="vprev">‹</button><span class="muted small" id="vnum">${i + 1} / ${photos.length}</span><button class="btn ghost sm" id="vnext">›</button></div></div>`, el => {
        const show = () => { $('#vimg', el).src = photos[i].url; $('#vnum', el).textContent = `${i + 1} / ${photos.length}`; };
        $('#vprev', el).onclick = () => { i = (i - 1 + photos.length) % photos.length; show(); };
        $('#vnext', el).onclick = () => { i = (i + 1) % photos.length; show(); };
      });
    });
  }

  function icsHref(b) {
    const f = d => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const e = s => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Termini//EN', 'BEGIN:VEVENT', `UID:${b.id}@termini`, `DTSTAMP:${f(new Date())}`,
      `DTSTART:${f(b.start_at)}`, `DTEND:${f(b.end_at)}`, `SUMMARY:${e(b.service_name + ' – ' + b.salon_name)}`,
      `LOCATION:${e([b.salon_address, b.salon_city].filter(Boolean).join(', '))}`,
      `DESCRIPTION:${e((b.staff_name ? t('with') + ' ' + b.staff_name + ' · ' : '') + money(b.price))}`,
      'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Termini', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'];
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(lines.join('\r\n'));
  }

  async function viewBook() {
    loading();
    const salon = await DB().getSalon(S.params.salon); if (!salon) return home();
    const [services, staffAll] = await Promise.all([DB().listServices(salon.id), DB().listStaff(salon.id)]);
    const service = services.find(x => x.id === S.params.service); if (!service) return go('salon', { id: salon.id }, true);
    const staff = staffAll.filter(p => p.active !== false);
    const today0 = fromYmd(ymd(new Date()));
    const days = Array.from({ length: C.BOOKING_DAYS_AHEAD || 21 }, (_, i) => addDays(today0, i));
    let busy = await DB().busy(salon.id, days[0].toISOString(), addDays(days[days.length - 1], 1).toISOString());
    const pre = S.params.start ? new Date(S.params.start) : null;
    const st = { staffId: S.params.staff && pre ? '' : (S.params.staff || ''), date: '', slot: null, preKey: pre ? pre.getTime() : 0 };
    const count = d => genSlots(ymd(d), salon, service, staff, busy, st.staffId).length;
    st.date = pre ? ymd(pre) : ymd(days.find(d => count(d) > 0) || days[0]);

    shell(`<div class="narrow">
      <h1>${esc(t('when_come'))}</h1>
      <p class="sub">${esc(service.name)} · ${service.duration} ${esc(t('min'))} · ${esc(salon.name)}</p>
      ${salon.accepting === false ? `<div class="notice warn">${esc(t('not_accepting'))}</div>` : ''}
      ${staff.length > 1 ? `<div class="chips" id="staffc">
        ${staff.map((p, i) => `<button class="person" data-staff="${p.id}"><span class="ini" style="${tone(i)}">${esc(initials(p.name))}</span>${esc(p.name)}</button>`).join('')}
        <button class="person any" data-staff="">${esc(t('anyone'))}</button></div>` : ''}
      <div class="daystrip" id="days" style="margin-top:8px"></div>
      <div class="legend"><span><i style="background:#22C55E"></i>${esc(t('avail_many'))}</span><span><i style="background:#F59E0B"></i>${esc(t('avail_few'))}</span><span><i style="background:#EF4444"></i>${esc(t('avail_full'))}</span></div>
      <div id="slots"></div>
      <div style="margin-top:16px" id="notewrap"><button class="linkbtn" id="addnote">${esc(t('add_note'))}</button></div></div>`,
      { back: true, center: stepsBar(2), cta: `<button id="go" disabled>${esc(t('pick_time'))}</button>` });

    const markStaff = () => $$('[data-staff]').forEach(x => x.classList.toggle('on', x.dataset.staff === st.staffId));
    const drawDays = () => {
      $('#days').innerHTML = days.map(d => {
        const n = count(d), cls = n > 6 ? 'g' : n > 2 ? 'y' : n > 0 ? 'r' : '';
        return `<button class="dday ${ymd(d) === st.date ? 'on' : ''}" data-day="${ymd(d)}" ${n ? '' : 'disabled'}><span>${esc(ymd(d) === ymd(new Date()) ? t('today') : t('days_short')[d.getDay()])}</span><b>${d.getDate()}</b><i class="${cls}"></i></button>`;
      }).join('');
      $$('[data-day]').forEach(b => b.onclick = () => { st.date = b.dataset.day; st.preKey = 0; drawDays(); drawSlots(); });
      const on = $('.dday.on'); on && on.scrollIntoView({ inline: 'center', block: 'nearest' });
    };
    const setCta = () => {
      const g = $('#go');
      if (!st.slot) { g.disabled = true; g.textContent = t('pick_time'); return; }
      const who = staff.find(p => p.id === st.slot.staff_id);
      g.disabled = false;
      g.innerHTML = `<span class="ellipsis">${esc(t('book_cta'))} ${esc(dayName(st.slot.start))} · ${hm(st.slot.start)}${who && staff.length > 1 ? ' · ' + esc(who.name) : ''}</span><span class="tag">${esc(money(service.price))}</span>`;
    };
    const drawSlots = () => {
      st.slot = null;
      const slots = genSlots(st.date, salon, service, staff, busy, st.staffId);
      const groups = [['morning', I.sun, s => s.start.getHours() < 12], ['afternoon', I.sunset, s => s.start.getHours() >= 12 && s.start.getHours() < 17], ['evening', I.moon, s => s.start.getHours() >= 17]];
      $('#slots').innerHTML = slots.length ? groups.map(([k, ic, fn]) => {
        const g = slots.map((s, i) => [s, i]).filter(([s]) => fn(s)); if (!g.length) return '';
        return `<div class="tgroup">${ic}${esc(t(k))}</div><div class="slots">${g.map(([s, i]) => `<button class="slot" data-i="${i}">${hm(s.start)}</button>`).join('')}</div>`;
      }).join('') : `<div class="empty">${esc(t('no_slots'))}</div>`;
      const pick = b => { $$('.slot').forEach(x => x.classList.remove('on')); b.classList.add('on'); st.slot = slots[+b.dataset.i]; setCta(); };
      $$('.slot').forEach(b => b.onclick = () => pick(b));
      if (st.preKey) { const i = slots.findIndex(s => s.start.getTime() === st.preKey); if (i >= 0) pick($(`.slot[data-i="${i}"]`)); }
      setCta();
    };
    $$('[data-staff]').forEach(b => b.onclick = () => { st.staffId = b.dataset.staff; markStaff(); drawDays(); drawSlots(); });
    $('#addnote').onclick = () => { $('#notewrap').innerHTML = `<label class="f"><span>${esc(t('note'))}</span><textarea id="note" maxlength="300"></textarea></label>`; $('#note').focus(); };
    $('#go').onclick = () => guard(async () => {
      if (!st.slot) return; const g = $('#go'); g.disabled = true;
      try {
        const nt = $('#note');
        const b = await DB().createBooking({ salon_id: salon.id, service_id: service.id, staff_id: st.slot.staff_id, start_at: st.slot.start.toISOString(), note: nt ? nt.value.trim() : '' });
        const full = { salon_name: salon.name, salon_address: salon.address, salon_city: salon.city, service_name: service.name, ...b };
        sheet(`<div class="success">
            <div class="big">${I.check.replace('<svg', '<svg width="30" height="30"')}</div>
            <h2 style="margin:0 0 4px">${esc(t('booked_title'))}</h2>
            <div class="title">${esc(dayName(full.start_at))} · ${hm(full.start_at)}</div>
            <div class="muted small" style="margin-bottom:16px">${esc(full.service_name)}${full.staff_name ? ' · ' + esc(t('with')) + ' ' + esc(full.staff_name) : ''} · ${esc(full.salon_name)}</div>
            <a class="btn accent block" href="${icsHref(full)}" download="termini.ics">${I.calplus.replace('<svg', '<svg width="18" height="18"')}${esc(t('add_calendar'))}</a>
            <div class="muted small" style="margin:8px 0 12px">${esc(t('calendar_hint'))}</div>
            <button class="btn ghost block" data-close>${esc(t('see_bookings'))}</button></div>`,
          (el, close) => { const obs = new MutationObserver(() => { if (!document.body.contains(el)) { obs.disconnect(); go('my-bookings', {}, true); } }); obs.observe(document.body, { childList: true }); });
      } catch (e) {
        g.disabled = false;
        if (e.message === 'SLOT_TAKEN') { toast(t('slot_taken')); busy = await DB().busy(salon.id, days[0].toISOString(), addDays(days[days.length - 1], 1).toISOString()); drawDays(); drawSlots(); return; }
        throw e;
      }
    });
    markStaff(); drawDays(); drawSlots();
  }

  let bookTab = 'upcoming';
  async function viewMyBookings() {
    loading();
    const [all, mine] = await Promise.all([DB().myBookings(), DB().myReviews().catch(() => [])]); const nowT = Date.now();
    const reviewed = Object.fromEntries(mine.map(r => [r.booking_id, r.rating]));
    const up = all.filter(b => new Date(b.end_at) >= nowT && b.status === 'confirmed').sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
    const past = all.filter(b => !up.includes(b)).sort((a, b) => new Date(b.start_at) - new Date(a.start_at));
    const list = bookTab === 'upcoming' ? up : past;
    shell(`
      <h1>${esc(t('my_bookings'))}</h1>
      <div class="seg" style="margin-top:12px"><button class="${bookTab === 'upcoming' ? 'on' : ''}" data-tab="upcoming">${esc(t('upcoming'))} (${up.length})</button><button class="${bookTab === 'past' ? 'on' : ''}" data-tab="past">${esc(t('past'))}</button></div>
      <div class="list grid-cards">${list.length ? list.map(b => { const d = new Date(b.start_at); return `
        <div class="card ${b.status === 'cancelled' ? 'b-cancelled' : ''}">
          <div class="row" style="align-items:flex-start">
            <div style="width:52px;flex:none;border-radius:16px;background:var(--accent-softer);color:var(--accent);text-align:center;padding:7px 0;line-height:1.1">
              <div style="font-size:11px;font-weight:800">${esc(t('days_short')[d.getDay()]).toUpperCase()}</div><div style="font-size:20px;font-weight:800">${d.getDate()}</div><div style="font-size:11px;font-weight:700">${pad(d.getMonth() + 1)}</div></div>
            <div class="grow">
              <div class="row between" style="gap:6px"><span class="title">${hm(b.start_at)} · ${esc(b.service_name)}</span>${statusPill(b.status)}</div>
              <div class="muted small">${esc(b.salon_name)}${b.staff_name ? ` · ${esc(t('with'))} ${esc(b.staff_name)}` : ''} · <b style="color:var(--ink)">${esc(money(b.price))}</b></div>
              <div class="muted small ellipsis">${esc(b.salon_address || '')}</div>
            </div>
          </div>
          ${bookTab === 'upcoming' ? `<div class="actions">
            <a class="btn soft sm" href="${icsHref(b)}" download="termini.ics">${I.calplus.replace('<svg', '<svg width="16" height="16"')}${esc(t('add_calendar'))}</a>
            ${b.salon_phone ? `<a class="btn ghost sm" href="${esc(telHref(b.salon_phone))}">${esc(t('call'))}</a>` : ''}
            <button class="btn danger sm" data-cancel="${b.id}">${esc(t('cancel'))}</button></div>`
          : b.status === 'completed' ? (reviewed[b.id] ? `<div class="actions" style="align-items:center"><span class="muted small">${esc(t('your_rating'))}</span>${starRow(reviewed[b.id], 16)}</div>`
            : `<div class="actions"><button class="btn accent sm" data-review="${b.id}">★ ${esc(t('rate_visit'))}</button><button class="btn ghost sm" data-again="${b.salon_id}|${b.service_id}">${esc(t('book_again_btn'))}</button></div>`) : ''}
        </div>`; }).join('') : `<div class="empty">${esc(t('no_bookings'))}<div style="margin-top:12px"><button class="btn accent" data-nav2="explore">${esc(t('explore'))}</button></div></div>`}</div>`);
    $$('[data-tab]').forEach(b => b.onclick = () => { bookTab = b.dataset.tab; viewMyBookings(); });
    $$('[data-nav2]').forEach(b => b.onclick = () => go(b.dataset.nav2));
    $$('[data-cancel]').forEach(b => b.onclick = () => { if (confirm(t('cancel_confirm'))) guard(async () => { await DB().setBookingStatus(b.dataset.cancel, 'cancelled'); viewMyBookings(); }); });
    $$('[data-review]').forEach(x => x.onclick = () => reviewSheet(all.find(b => b.id === x.dataset.review), viewMyBookings));
    $$('[data-again]').forEach(x => x.onclick = () => { const [salon, service] = x.dataset.again.split('|'); if (service && service !== 'null') go('book', { salon, service }); else go('salon', { id: salon }); });
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
    $('#lo').onclick = () => guard(async () => { await DB().signOut(); S.user = null; S.salon = null; go(guestHome(), {}, true); });
    const rs = $('#rs'); if (rs) rs.onclick = () => { if (confirm(t('reset_confirm'))) guard(async () => { await DB().reset(); S.user = null; S.salon = null; go(guestHome(), {}, true); }); };
  }

  // ---------- Business ----------
  async function bizSalon() { S.salon = await DB().mySalon(); return S.salon; }
  const TRIAL = C.TRIAL_DAYS || 30;
  const MAX_PHOTOS = LIVE ? 6 : 4;
  const fmtDate = v => { if (!v) return '—'; const d = typeof v === 'string' && v.length === 10 ? fromYmd(v) : new Date(v); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`; };
  const isExpired = s => !!(s.plan_until && fromYmd(s.plan_until) < fromYmd(ymd(new Date())));
  const fill = (k, o) => Object.entries(o).reduce((str, [a, b]) => str.split('{' + a + '}').join(b), t(k));
  const waLink = (phone, text) => `https://wa.me/${phone ? waNumber(phone) : ''}?text=${encodeURIComponent(text)}`;
  function salonBanner(s) {
    if (s.status === 'pending') return `<div class="notice warn">${esc(fill('pending_review', { days: TRIAL }))}</div>`;
    if (s.status === 'suspended') return `<div class="notice bad">${esc(t('suspended_msg'))}</div>`;
    if (isExpired(s)) return `<div class="notice bad">${esc(fill('expired_banner', { date: fmtDate(s.plan_until) }))}
      ${C.ADMIN_PHONE ? `<div style="margin-top:10px"><a class="btn wa sm" target="_blank" rel="noopener" href="${waLink(C.ADMIN_PHONE, fill('admin_msg', { salon: s.name }))}">${esc(t('contact_admin'))}</a></div>` : ''}</div>`;
    return '';
  }
  // Setup checklist shown until everything is ready
  function setupChecklist(s, services, staff) {
    const hasHours = (s.hours || []).some(Boolean);
    const steps = [
      [t('step_created'), true, ''],
      [t('step_hours'), hasHours, 'biz-salon'],
      [t('step_services'), services.some(x => x.active !== false), 'biz-services'],
      [t('step_staff'), staff.some(p => p.active !== false), 'biz-staff'],
      [t('step_approval'), s.status === 'active', '']
    ];
    const done = steps.filter(x => x[1]).length;
    if (done === steps.length) return '';
    return `<div class="card" style="margin-top:12px">
      <div class="row between"><span class="title">${esc(t('setup_title2'))}</span><span class="pill info">${esc(fill('setup_progress', { a: done, b: steps.length }))}</span></div>
      <div style="height:8px;border-radius:4px;background:var(--accent-softer);margin:10px 0 6px;overflow:hidden"><div style="height:8px;width:${Math.round(done / steps.length * 100)}%;background:var(--accent)"></div></div>
      ${steps.map(([label, ok, route]) => `<${route && !ok ? `button data-go="${route}"` : 'div'} class="row" style="width:100%;border:0;background:none;padding:9px 0;text-align:left;font:inherit;color:inherit;${route && !ok ? 'cursor:pointer' : ''}">
        <span style="width:26px;height:26px;border-radius:13px;flex:none;display:grid;place-items:center;${ok ? 'background:var(--ok-soft);color:var(--ok)' : 'border:2px solid var(--line)'}">${ok ? I.check.replace('<svg', '<svg width="14" height="14"') : ''}</span>
        <span class="grow" style="font-weight:${ok ? 600 : 800};${ok ? 'color:var(--muted);text-decoration:line-through' : ''}">${esc(label)}</span>
        ${!ok && route ? `<span style="color:var(--accent);font-weight:800">›</span>` : !ok ? `<span class="pill warn">${esc(t('step_wait'))}</span>` : ''}
      </${route && !ok ? 'button' : 'div'}>`).join('')}
    </div>`;
  }
  function bindChecklist() { $$('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go)); }
  // One-time "you're approved" message for the owner (per device)
  function approvalNotice(s) {
    if (s.status !== 'active' || !s.approved_at) return;
    if (Date.now() - new Date(s.approved_at).getTime() > 30 * 86400000) return;
    const key = 'termini_approved_seen_' + s.id; if (store.get(key)) return; store.set(key, '1');
    sheet(`<div class="success">
      <div class="big">${I.check.replace('<svg', '<svg width="30" height="30"')}</div>
      <h2 style="margin:0 0 6px">${esc(t('approved_title'))}</h2>
      <p class="muted" style="margin:0 0 6px">${esc(t('approved_body'))}</p>
      ${s.plan === 'trial' && s.plan_until ? `<p style="margin:0 0 16px;font-weight:700">${esc(fill('trial_until', { date: fmtDate(s.plan_until) }))}</p>` : ''}
      <button class="btn accent block" data-close>${esc(t('start_btn'))}</button></div>`);
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
    bindSalonForm(null, () => go('biz-agenda', {}, true));
  }

  let agendaDate = ymd(new Date()), agendaStaff = '';
  const longDate = d => `${t('days')[d.getDay()]}, ${d.getDate()} ${t('months')[d.getMonth()]}`;
  const appUrl = () => location.origin + location.pathname;

  // Free gaps (>= 30 min) per staff member on a day, from now on if today
  function freeGaps(salon, dateStr, staff, bookings) {
    const day = fromYmd(dateStr), h = (salon.hours || [])[day.getDay()]; if (!h) return [];
    const at = m => { const d = new Date(day); d.setHours(0, m, 0, 0); return d; };
    let from = at(toMin(h.open)); const to = at(toMin(h.close));
    if (dateStr === ymd(new Date())) { const n = new Date(); n.setSeconds(0, 0); n.setMinutes(Math.ceil(n.getMinutes() / 15) * 15); if (n > from) from = n; }
    const out = [];
    staff.forEach(p => {
      const bs = bookings.filter(b => b.staff_id === p.id && (b.status === 'confirmed' || b.status === 'completed'))
        .map(b => [new Date(b.start_at), new Date(b.end_at)]).sort((a, b) => a[0] - b[0]);
      let cur = from;
      for (const [s, e] of [...bs, [to, to]]) {
        if (s > cur && (Math.min(s, to) - cur) >= 30 * 60000) out.push({ gap: true, start: new Date(cur), end: new Date(Math.min(s, to)), staff: p });
        if (e > cur) cur = e;
        if (cur >= to) break;
      }
    });
    return out;
  }

  async function viewBizAgenda() {
    loading();
    const s = await bizSalon(); if (!s) return viewBizSetup();
    const d0 = fromYmd(agendaDate), d1 = addDays(d0, 1);
    const today0 = fromYmd(ymd(new Date())), wk0 = addDays(today0, -6);
    const [list, services, staffAll, week] = await Promise.all([DB().salonBookings(s.id, d0.toISOString(), d1.toISOString()), DB().listServices(s.id), DB().listStaff(s.id),
      DB().salonBookings(s.id, wk0.toISOString(), addDays(today0, 1).toISOString())]);
    const wdays = Array.from({ length: 7 }, (_, i) => addDays(wk0, i));
    const wrev = wdays.map(d => week.filter(b => (b.status === 'confirmed' || b.status === 'completed') && ymd(new Date(b.start_at)) === ymd(d)).reduce((n, b) => n + Number(b.price || 0), 0));
    const wmax = Math.max(1, ...wrev), wsum = wrev.reduce((a, b) => a + b, 0);
    const weekCard = `<div class="card weekc"><div class="row between"><span class="title">${esc(t('last7'))}</span><span class="price">${esc(money(wsum))}</span></div>
      <div class="bars">${wdays.map((d, i) => `<div class="bar" title="${esc(dayName(d))}: ${esc(money(wrev[i]))}"><span class="${i === 6 ? 'on' : ''}" style="height:${Math.max(4, Math.round(wrev[i] / wmax * 100))}%"></span><small>${esc(i === 6 ? t('today') : t('days_short')[d.getDay()])}</small></div>`).join('')}</div></div>`;
    const staff = staffAll.filter(p => p.active !== false), svcs = services.filter(x => x.active !== false);
    if (agendaStaff && !staff.some(p => p.id === agendaStaff)) agendaStaff = '';
    const isToday = agendaDate === ymd(new Date()), isPast = d1 <= fromYmd(ymd(new Date())), now = Date.now();
    const live = list.filter(b => b.status === 'confirmed' || b.status === 'completed');
    const revenue = live.reduce((n, b) => n + Number(b.price || 0), 0);
    const h = (s.hours || [])[d0.getDay()];
    const openMin = h ? (toMin(h.close) - toMin(h.open)) * Math.max(staff.length, 1) : 0;
    const bookedMin = live.reduce((n, b) => n + (new Date(b.end_at) - new Date(b.start_at)) / 60000, 0);
    const pct = openMin ? Math.min(100, Math.round(bookedMin / openMin * 100)) : 0;
    const shownStaff = agendaStaff ? staff.filter(p => p.id === agendaStaff) : staff;
    const vis = list.filter(b => !agendaStaff || b.staff_id === agendaStaff);
    const gaps = isPast ? [] : freeGaps(s, agendaDate, shownStaff, list).slice(0, 4);
    const items = [...vis, ...gaps].sort((a, b) => new Date(a.start_at || a.start) - new Date(b.start_at || b.start));
    const sec = it => { if (!isToday) return 'day'; const st = new Date(it.start_at || it.start).getTime(), en = new Date(it.end_at || it.end).getTime();
      if (!it.gap && it.status === 'confirmed' && st <= now && en > now) return 'now'; return st > now || it.gap ? 'later' : 'earlier'; };
    const sections = isToday ? [['now', t('now_label')], ['later', t('later_label')], ['earlier', t('earlier_label')]] : [['day', dayName(d0)]];
    const card = b => {
      if (b.gap) {
        const msg = t('free_share_msg').replace('{salon}', s.name).replace('{times}', `${hm(b.start)}–${hm(b.end)} (${b.staff.name})`).replace('{url}', appUrl());
        return `<div class="card row"><span class="timepill coral">${hm(b.start)}</span>
          <div class="grow"><div class="title">${esc(t('free_slot'))}</div><div class="muted small">${esc(b.staff.name)} · ${hm(b.start)}–${hm(b.end)}</div></div>
          <a class="btn primary sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msg)}">${esc(t('share_free'))}</a></div>`;
      }
      const conf = b.status === 'confirmed';
      const msg = t('wa_msg').replace('{name}', (b.client_name || '').split(' ')[0]).replace('{salon}', s.name).replace('{when}', when(b.start_at));
      return `<div class="card row tap ${sec(b) === 'now' ? 'now' : ''} ${b.status === 'cancelled' ? 'b-cancelled' : ''} ${b.status === 'completed' || b.status === 'no_show' ? 'b-done' : ''}" data-b="${b.id}">
        <span class="timepill ${conf ? '' : 'mute'}">${hm(b.start_at)}</span>
        <div class="grow">
          <div class="row" style="gap:6px"><span class="title ellipsis grow">${esc(b.client_name || '—')}</span>${!conf ? statusPill(b.status) : b.walk_in ? `<span class="pill coral">${esc(t('walk_in_label'))}</span>` : ''}</div>
          <div class="muted small ellipsis">${esc(b.service_name)} · ${esc(b.staff_name || '—')} · ${esc(money(b.price))}</div>
        </div>
        ${conf ? `<button class="iconbtn ok" data-done="${b.id}" aria-label="${esc(t('done'))}">${I.check}</button>` : ''}
        ${conf && b.client_phone ? `<a class="iconbtn wa" data-stop target="_blank" rel="noopener" aria-label="${esc(t('whatsapp'))}" href="https://wa.me/${waNumber(b.client_phone)}?text=${encodeURIComponent(msg)}">${I.wa}</a>` : ''}
      </div>`;
    };
    const days = Array.from({ length: 17 }, (_, i) => addDays(fromYmd(ymd(new Date())), i - 2));
    const counts = Object.fromEntries(staff.map(p => [p.id, live.filter(b => b.staff_id === p.id).length]));
    const accepting = s.accepting !== false;
    shell(`
      ${salonBanner(s)}
      <div class="row between" style="margin-top:4px;align-items:flex-start">
        <div class="grow"><div class="muted small" style="font-weight:700">${esc(s.name)}</div><h1 style="margin:0">${esc(longDate(d0))}</h1></div>
        <button class="online ${accepting ? 'on' : 'off'}" id="onl" aria-pressed="${accepting}" title="${esc(t(accepting ? 'accepting_on' : 'accepting_off'))}"><span class="dot"></span>${esc(t(accepting ? 'online' : 'offline'))}</button>
      </div>
      ${setupChecklist(s, services, staffAll)}
      <div class="chips" style="margin-top:12px">${days.map(d => `<button class="chip" style="padding:7px 0;width:54px;display:flex;flex-direction:column;align-items:center;line-height:1.15;${ymd(d) === agendaDate ? 'background:var(--accent);color:#fff' : ''}" data-day="${ymd(d)}"><span style="font-size:11px;opacity:.8">${esc(ymd(d) === ymd(new Date()) ? t('today') : t('days_short')[d.getDay()])}</span><b style="font-size:17px">${d.getDate()}</b></button>`).join('')}</div>
      <div class="agenda-top"><div class="stats">
        <div class="stat accent"><div class="v">${live.length}</div><div class="l">${esc(t('total_bookings')).toLowerCase()}</div></div>
        <div class="stat"><div class="v" style="font-size:19px">${esc(money(revenue).replace(' ' + (C.CURRENCY || 'ALL'), ''))}</div><div class="l">${esc(C.CURRENCY || 'ALL')} · ${esc(dayName(d0)).toLowerCase()}</div></div>
        <div class="stat ring">
          <svg width="40" height="40" viewBox="0 0 40 40" role="img" aria-label="${pct}%" style="flex:none"><circle cx="20" cy="20" r="16" fill="none" stroke="#E3E7FF" stroke-width="6"/><circle cx="20" cy="20" r="16" fill="none" stroke="#FF6A3D" stroke-width="6" pathLength="100" stroke-dasharray="${pct} 100" transform="rotate(-90 20 20)" stroke-linecap="round"/></svg>
          <div style="min-width:0"><div class="v" style="font-size:16px">${pct}%</div><div class="l">${esc(t('occupied'))}</div></div>
        </div>
      </div>${weekCard}</div>
      ${staff.length > 1 ? `<div class="chips" style="margin-top:10px"><button class="chip ${!agendaStaff ? 'on' : ''}" data-fs="">${esc(t('all_staff'))}</button>${staff.map(p => `<button class="chip ${agendaStaff === p.id ? 'on' : ''}" data-fs="${p.id}">${esc(p.name)} · ${counts[p.id] || 0}</button>`).join('')}</div>` : ''}
      ${items.length ? sections.map(([k, label]) => { const its = items.filter(it => sec(it) === k); return its.length ? `<div class="kicker">${esc(label)}</div><div class="list grid-cards">${its.map(card).join('')}</div>` : ''; }).join('')
        : `<div class="empty">${esc(t('empty_day'))}</div>`}`,
      { fab: staff.length && svcs.length && !isPast ? `<button class="fab" id="walk">${I.plus}${esc(t('walk_in'))}</button>` : '' });

    $$('[data-day]').forEach(b => b.onclick = () => { agendaDate = b.dataset.day; viewBizAgenda(); });
    const cur = $(`[data-day="${agendaDate}"]`); cur && cur.scrollIntoView({ inline: 'center', block: 'nearest' });
    $$('[data-fs]').forEach(b => b.onclick = () => { agendaStaff = b.dataset.fs; viewBizAgenda(); });
    $('#onl').onclick = () => guard(async () => { S.salon = await DB().saveSalon({ id: s.id, accepting: !accepting }); toast(t(!accepting ? 'accepting_on' : 'accepting_off')); viewBizAgenda(); });
    $$('[data-done]').forEach(b => b.onclick = e => { e.stopPropagation(); guard(async () => { await DB().setBookingStatus(b.dataset.done, 'completed'); viewBizAgenda(); }); });
    $$('[data-stop]').forEach(a => a.onclick = e => e.stopPropagation());
    $$('[data-b]').forEach(c => c.onclick = () => {
      const b = list.find(x => x.id === c.dataset.b); if (!b) return;
      const conf = b.status === 'confirmed';
      sheet(`<h2>${esc(b.client_name || '—')}</h2>
        <div class="card" style="margin-bottom:12px"><dl class="kv">
          <dt>${esc(t('time_label'))}</dt><dd>${esc(when(b.start_at))} – ${hm(b.end_at)}</dd>
          <dt>${esc(t('services'))}</dt><dd>${esc(b.service_name)} · ${esc(money(b.price))}</dd>
          <dt>${esc(t('staff'))}</dt><dd>${esc(b.staff_name || '—')}</dd>
          ${b.client_phone ? `<dt>${esc(t('phone'))}</dt><dd>${esc(b.client_phone)}</dd>` : ''}
          ${b.note ? `<dt>${esc(t('note_label'))}</dt><dd>${esc(b.note)}</dd>` : ''}
          <dt>${esc(t('status_label'))}</dt><dd>${statusPill(b.status)}</dd></dl></div>
        <div class="list">
          ${conf ? `<button class="btn primary block" data-set="completed">${esc(t('done'))}</button>
          <button class="btn ghost block" data-set="no_show">${esc(t('no_show'))}</button>` : ''}
          ${b.client_phone ? `<div class="grid2"><a class="btn wa" target="_blank" rel="noopener" href="https://wa.me/${waNumber(b.client_phone)}?text=${encodeURIComponent(t('wa_msg').replace('{name}', (b.client_name || '').split(' ')[0]).replace('{salon}', s.name).replace('{when}', when(b.start_at)))}">${esc(t('whatsapp'))}</a>
            <a class="btn ghost" href="${esc(telHref(b.client_phone))}">${esc(t('call'))}</a></div>` : ''}
          ${conf ? `<button class="btn danger block" data-set="cancelled">${esc(t('cancel'))}</button>` : ''}
        </div>`, (el, close) => {
        $$('[data-set]', el).forEach(x => x.onclick = () => {
          if (x.dataset.set === 'cancelled' && !confirm(t('cancel_confirm'))) return;
          guard(async () => { await DB().setBookingStatus(b.id, x.dataset.set); close(); viewBizAgenda(); });
        });
      });
    });
    const wk = $('#walk'); if (wk) wk.onclick = () => walkInSheet(s, svcs, staff);
    bindChecklist(); approvalNotice(s);
  }

  async function walkInSheet(s, svcs, staff) {
    const dateStr = agendaDate, d0 = fromYmd(dateStr);
    const busy = await DB().busy(s.id, d0.toISOString(), addDays(d0, 1).toISOString());
    sheet(`<h2>${esc(t('walk_in_title'))}</h2>
      <form id="wf">
        <label class="f"><span>${esc(t('client_name'))} *</span><input type="text" name="name" required autocomplete="off"></label>
        <label class="f"><span>${esc(t('phone'))} (${esc(t('optional'))})</span><input type="tel" name="phone" placeholder="069 123 4567"></label>
        <div class="grid2">
          <label class="f"><span>${esc(t('services'))}</span><select name="service">${svcs.map(x => `<option value="${x.id}">${esc(x.name)} · ${x.duration}′</option>`).join('')}</select></label>
          <label class="f"><span>${esc(t('staff'))}</span><select name="staff"><option value="">${esc(t('anyone'))}</option>${staff.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></label>
        </div>
        <label class="f"><span>${esc(t('start_time'))}</span><select name="start" id="wstart"></select></label>
        <button class="btn accent block" type="submit">${esc(t('save'))}</button>
      </form>`, (el, close) => {
      const f = $('#wf', el);
      const fill = () => {
        const svc = svcs.find(x => x.id === f.service.value);
        const slots = genSlots(dateStr, s, svc, staff, busy, f.staff.value);
        const hh = (s.hours || [])[d0.getDay()], nw = new Date(), nm = nw.getHours() * 60 + nw.getMinutes();
        const isToday = dateStr === ymd(nw) && hh && nm >= toMin(hh.open) && nm + Number(svc.duration) <= toMin(hh.close);
        $('#wstart', el).innerHTML = (isToday ? `<option value="now">${esc(t('start_now'))}</option>` : '') +
          slots.map(x => `<option value="${x.start.toISOString()}|${x.staff_id}">${hm(x.start)}${staff.length > 1 ? ' · ' + esc((staff.find(p => p.id === x.staff_id) || {}).name || '') : ''}</option>`).join('');
        if (!$('#wstart', el).options.length) $('#wstart', el).innerHTML = `<option value="">${esc(t('no_slots'))}</option>`;
      };
      f.service.onchange = fill; f.staff.onchange = fill; fill();
      f.onsubmit = e => {
        e.preventDefault();
        const name = f.name.value.trim(); if (!name) return toast(t('fill_required'));
        const svc = svcs.find(x => x.id === f.service.value);
        let start, staffId;
        if (f.start.value === 'now') {
          const n = new Date(); n.setSeconds(0, 0); start = n;
          const end = new Date(n.getTime() + svc.duration * 60000);
          const pool = staff.filter(p => !f.staff.value || p.id === f.staff.value);
          const free = pool.find(p => !busy.some(b => b.staff_id === p.id && new Date(b.start_at) < end && n < new Date(b.end_at)));
          if (!free) return toast(t('slot_taken')); staffId = free.id;
        } else if (f.start.value) { const [iso, sid] = f.start.value.split('|'); start = new Date(iso); staffId = sid; }
        else return toast(t('no_slots'));
        guard(async () => {
          await DB().createBooking({ salon_id: s.id, service_id: svc.id, staff_id: staffId, start_at: start.toISOString(), walk_in: true, client_name: name, client_phone: f.phone.value.trim() });
          close(); toast(t('saved')); viewBizAgenda();
        });
      };
    });
  }

  async function viewBizServices() {
    loading();
    const s = await bizSalon(); if (!s) return viewBizSetup();
    const list = await DB().listServices(s.id);
    shell(`${salonBanner(s)}
      <div class="row between"><h1>${esc(t('services'))}</h1><button class="btn gold sm" id="add">+ ${esc(t('add'))}</button></div>
      <div class="list grid-cards" style="margin-top:10px">${list.length ? list.map(x => `
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
      <div class="list grid-cards" style="margin-top:10px">${list.length ? list.map(x => `
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
    const expired = isExpired(s);
    shell(`${salonBanner(s)}
      <h1>${esc(t('settings'))}</h1>
      <div class="card row" style="margin:10px 0">
        <div class="grow"><div class="muted small">${esc(t('plan'))}</div><div class="title">${esc(t('plan_' + (expired ? 'expired' : s.plan)))}</div></div>
        <div style="text-align:right"><div class="muted small">${esc(t('plan_until'))}</div><div class="title">${esc(s.plan_until ? fmtDate(s.plan_until) : t('trial_after_approval'))}</div></div>
        ${statusPill(s.status)}
      </div>
      <div class="card" style="margin-bottom:12px">
        <div class="title">${esc(t('booking_link'))}</div><p class="muted small" style="margin:4px 0 10px">${esc(t('booking_link_hint'))}</p>
        <div class="row"><input type="text" readonly id="blink" value="${esc(salonLink(s.id))}" aria-label="${esc(t('booking_link'))}" style="flex:1;min-width:0"><button class="btn primary sm" id="copyl">${esc(t('copy'))}</button></div>
        <div class="actions"><a class="btn wa sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(fill('link_share_msg', { salon: s.name, url: salonLink(s.id) }))}">${esc(t('whatsapp'))}</a><button class="btn ghost sm" id="sharel">${esc(t('share'))}</button><button class="btn primary sm" data-nav2="biz-qr">${esc(t('qr_btn'))}</button></div>
      </div>
      <div class="card" style="margin-bottom:12px">
        <div class="row between"><span class="title">${esc(t('photos'))} <span class="muted small">(${(s.photos || []).length}/${MAX_PHOTOS})</span></span>
          ${(s.photos || []).length < MAX_PHOTOS ? `<label class="btn soft sm" style="cursor:pointer">+ ${esc(t('add_photo'))}<input type="file" id="phin" accept="image/*" multiple hidden></label>` : ''}</div>
        <p class="muted small" style="margin:4px 0 10px">${esc(t('photos_hint'))}</p>
        <div class="phgrid">${(s.photos || []).map((ph, i) => `<div class="phitem"><img src="${esc(ph.url)}" alt="" loading="lazy">${i === 0 ? `<span class="pill info phcover">${esc(t('cover'))}</span>` : `<button class="phcov" data-cover="${i}">${esc(t('make_cover'))}</button>`}<button class="phdel" data-delph="${i}" aria-label="${esc(t('delete'))}">×</button></div>`).join('') || `<div class="muted small">${esc(t('no_photos'))}</div>`}</div>
      </div>
      <div class="card" style="margin-bottom:12px" id="revcard">
        <div class="row between"><span class="title">${esc(t('reviews'))}</span>${s.rating_count ? `<span>${starRow(Number(s.rating_avg), 16)} <b>${Number(s.rating_avg).toFixed(1)}</b> <span class="muted small">(${s.rating_count})</span></span>` : ''}</div>
        <div id="revlist" class="muted small" style="margin-top:8px">…</div>
      </div>
      <div class="card">${salonForm(s)}</div>
      ${C.ADMIN_PHONE || C.CONTACT_EMAIL ? `<div class="card" style="margin-top:12px"><div class="title">${esc(t('help_title'))}</div><p class="muted small" style="margin:4px 0 10px">${esc(t('help_body'))}</p>
        <div class="actions" style="margin-top:0">${C.ADMIN_PHONE ? `<a class="btn wa sm" target="_blank" rel="noopener" href="${waLink(C.ADMIN_PHONE, fill('help_msg', { salon: s.name }))}">${esc(t('whatsapp'))}</a>` : ''}${C.CONTACT_EMAIL ? `<a class="btn ghost sm" href="mailto:${esc(C.CONTACT_EMAIL)}?subject=${encodeURIComponent('Termini – ' + s.name)}">${esc(C.CONTACT_EMAIL)}</a>` : ''}</div></div>` : ''}`);
    bindSalonForm(s, () => viewBizSalon());
    $('#copyl').onclick = async () => { try { await navigator.clipboard.writeText(salonLink(s.id)); toast(t('link_copied')); } catch { $('#blink').select(); } };
    $('#sharel').onclick = () => shareLink(s.name, salonLink(s.id));
    $$('[data-nav2]').forEach(b => b.onclick = () => go(b.dataset.nav2));
    const savePhotos = async photos => { S.salon = await DB().saveSalon({ id: s.id, photos }); viewBizSalon(); };
    const phin = $('#phin'); if (phin) phin.onchange = () => guard(async () => {
      const files = [...phin.files].slice(0, MAX_PHOTOS - (s.photos || []).length); if (!files.length) return;
      toast(t('uploading'));
      const added = [];
      for (const f of files) { const blob = await resizeImage(f); added.push(await DB().uploadPhoto(s.id, blob)); }
      await savePhotos([...(s.photos || []), ...added]); toast(t('saved'));
    });
    $$('[data-delph]').forEach(b => b.onclick = () => { if (!confirm(t('delete_confirm'))) return; guard(async () => {
      const i = +b.dataset.delph, ph = s.photos[i]; await DB().deletePhoto(s.id, ph); await savePhotos(s.photos.filter((_, k) => k !== i)); }); });
    $$('[data-cover]').forEach(b => b.onclick = () => guard(async () => {
      const i = +b.dataset.cover, arr = [...s.photos]; const [ph] = arr.splice(i, 1); arr.unshift(ph); await savePhotos(arr); }));
    DB().listReviews(s.id, 5).then(rs => { const el = $('#revlist'); if (!el) return;
      el.innerHTML = rs.length ? rs.map(r => `<div style="padding:8px 0;border-top:1px solid var(--line);color:var(--ink)"><div class="row between"><b>${esc(r.client_name || '—')}</b>${starRow(r.rating, 14)}</div>${r.comment ? `<div style="margin-top:4px">${esc(r.comment)}</div>` : ''}<div class="muted small">${esc(fmtDate(r.created_at))}</div></div>`).join('') : esc(t('no_reviews')); }).catch(() => {});
  }

  async function viewBizQr() {
    loading();
    const s = await bizSalon(); if (!s) return viewBizSetup();
    if (!window.qrcode) await loadScript('js/vendor/qrcode.js');
    const url = salonLink(s.id);
    const qr = window.qrcode(0, 'M'); qr.addData(url); qr.make();
    const svg = qr.createSvgTag({ cellSize: 10, margin: 0, scalable: true });
    shell(`<div class="noprint">
        <h1>${esc(t('qr_title'))}</h1><p class="sub">${esc(t('qr_sub'))}</p>
        <div class="actions" style="margin:0 0 18px"><button class="btn accent" id="print">${esc(t('print'))}</button>
          <a class="btn ghost" download="termini-qr-${esc(s.id.slice(0, 8))}.svg" href="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}">${esc(t('download_qr'))}</a></div>
      </div>
      <div class="poster">
        <div class="poster-top"><img src="icons/icon.svg" alt="" width="54" height="54"><span>${esc(C.APP_NAME || 'Termini')}</span></div>
        <div class="poster-body">
          <div class="poster-name">${esc(s.name)}</div>
          <div class="poster-cta">${esc(t('qr_cta'))}</div>
          <div class="poster-qr">${svg}</div>
          <div class="poster-scan">${esc(t('qr_scan'))}</div>
          <div class="poster-url">${esc(url.replace(/^https?:\/\//, ''))}</div>
        </div>
        <div class="poster-foot">${esc(t('qr_foot'))}</div>
      </div>`, { back: true });
    $('#print').onclick = () => window.print();
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
      <div class="list grid-cards">${pending.length ? pending.map(adminSalonCard).join('') : '<div class="empty">—</div>'}</div>`);
    bindAdminSalonActions(viewAdmDash, salons);
  }
  function adminSalonCard(s) {
    const expired = isExpired(s), phone = s.owner_phone || s.phone, first = (s.owner_name || '').split(' ')[0];
    return `<div class="card">
      <div class="row between"><div class="grow"><div class="title ellipsis">${esc(s.name)}</div><div class="muted small ellipsis">${esc(s.owner_name || '')} · ${esc(s.owner_email || '')}</div></div>${expired && s.status === 'active' ? `<span class="pill bad"><span class="dot"></span>${esc(t('plan_expired'))}</span>` : statusPill(s.status)}</div>
      <div class="muted small" style="margin-top:4px">${esc(catLabel(s.category))} · ${esc(s.city)} · ${esc(s.phone || '')}</div>
      <div class="small" style="margin-top:4px">${esc(t('plan'))}: <b>${esc(t('plan_' + (expired ? 'expired' : s.plan)))}</b> · ${esc(t('plan_until'))} <b>${esc(s.plan_until ? fmtDate(s.plan_until) : t('trial_after_approval'))}</b></div>
      <div class="actions">
        ${phone && s.status !== 'pending' ? `<a class="btn wa sm" target="_blank" rel="noopener" href="${waLink(phone, expired ? fill('expired_msg', { name: first, salon: s.name, date: fmtDate(s.plan_until) }) : '')}">${esc(t(expired ? 'remind_payment' : 'contact_owner'))}</a>` : ''}
        ${s.status === 'pending' ? `<button class="btn primary sm" data-act="approve" data-id="${s.id}">${esc(t('approve'))}</button>` : ''}
        ${s.status === 'active' ? `<button class="btn danger sm" data-act="suspend" data-id="${s.id}">${esc(t('suspend'))}</button>` : ''}
        ${s.status === 'suspended' ? `<button class="btn ghost sm" data-act="approve" data-id="${s.id}">${esc(t('activate'))}</button>` : ''}
        <button class="btn gold sm" data-act="paid" data-id="${s.id}" data-until="${esc(s.plan_until || '')}">${esc(t('mark_paid'))}</button>
      </div></div>`;
  }
  function bindAdminSalonActions(refresh, salons) {
    $$('[data-act]').forEach(b => b.onclick = () => guard(async () => {
      const id = b.dataset.id, a = b.dataset.act;
      if (a === 'approve') {
        const before = (salons || []).find(x => x.id === id) || {};
        const s2 = await DB().adminSetSalon(id, { status: 'active' });
        if (before.status === 'pending') {
          const phone = before.owner_phone || before.phone, first = (before.owner_name || '').split(' ')[0];
          const msg = fill('approve_msg', { name: first, salon: before.name, date: fmtDate(s2.plan_until), url: appUrl() });
          sheet(`<div class="success">
            <div class="big">${I.check.replace('<svg', '<svg width="30" height="30"')}</div>
            <h2 style="margin:0 0 4px">${esc(t('approved_admin'))}: ${esc(before.name)}</h2>
            <p class="muted" style="margin:0 0 16px">${esc(fill('trial_until', { date: fmtDate(s2.plan_until) }))}</p>
            ${phone ? `<a class="btn wa block" target="_blank" rel="noopener" href="${waLink(phone, msg)}">${I.wa.replace('<svg', '<svg width="18" height="18"')}${esc(t('notify_owner'))}</a>
            <div class="muted small" style="margin:8px 0 12px">${esc(t('notify_hint'))}</div>` : ''}
            <button class="btn ghost block" data-close>${esc(t('done_btn'))}</button></div>`);
          return refresh();
        }
      }
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
      <div class="list grid-cards" style="margin-top:8px">${list.length ? list.map(adminSalonCard).join('') : '<div class="empty">—</div>'}</div>`);
    $$('[data-f]').forEach(b => b.onclick = () => { admFilter = b.dataset.f; viewAdmSalons(); });
    bindAdminSalonActions(viewAdmSalons, salons);
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
    shell(`<h1>${esc(t('users'))} (${users.length})</h1><input type="search" id="uq" placeholder="${esc(t('search_users'))}" style="margin:8px 0 10px"><div class="list grid-cards" id="ul"></div>`);
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
    const [r, rid] = (location.hash || '').slice(1).split('/');
    if (r === 'salon' && rid && (!S.user || S.user.role === 'client')) return go('salon', { id: rid }, true);
    if (!S.user) return go(r === 'auth' ? 'auth' : guestHome(), {}, true);
    const okForRole = r && !r.startsWith('salon') && !r.startsWith('book') &&
      ((r.startsWith('biz-') && S.user.role === 'business') || (r.startsWith('adm-') && S.user.role === 'admin') || ['explore', 'my-bookings', 'profile'].includes(r) && (S.user.role === 'client' || r === 'profile'));
    okForRole ? go(r, {}, true) : home();
  }
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  start();
})();
