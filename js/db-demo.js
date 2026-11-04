// Termini – DEMO data layer (localStorage). Same interface as db-supabase.js.
(function () {
  const KEY = 'termini_demo_db_v1', SKEY = 'termini_demo_session';
  const ls = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} }
  };
  let mem = null; // in-memory fallback when storage is blocked
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36));
  const now = () => new Date().toISOString();
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const at = (dayOffset, hh, mm) => { const d = addDays(new Date(), dayOffset); d.setHours(hh, mm, 0, 0); return d; };

  function load() { return ls.get(KEY) || mem || seed(); }
  function save(db) { mem = db; ls.set(KEY, db); }

  function seed() {
    const H = (o, c) => ({ open: o, close: c });
    const week = (o, c, sat, sun) => [sun, H(o, c), H(o, c), H(o, c), H(o, c), H(o, c), sat];
    const trialEnd = addDays(new Date(), 30).toISOString().slice(0, 10);
    const db = { users: [], salons: [], services: [], staff: [], bookings: [], reviews: [] };
    const u = (email, name, phone, role) => { const x = { id: uid(), email, password: 'demo123', name, phone, role, created_at: now() }; db.users.push(x); return x; };
    const admin = u('admin@demo.al', 'Admin Termini', '0690000000', 'admin');
    const b1 = u('berber@demo.al', 'Arben Hoxha', '0691111111', 'business');
    const b2 = u('bella@demo.al', 'Elira Kola', '0692222222', 'business');
    const b3 = u('nails@demo.al', 'Sara Dema', '0693333333', 'business');
    const c1 = u('klient@demo.al', 'Klajdi Shehu', '0694444444', 'client');
    const c2 = u('ana@demo.al', 'Ana Prifti', '0695555555', 'client');
    void admin;
    const salon = (owner, name, category, city, address, desc, hours, status, plan) => {
      const s = { id: uid(), owner_id: owner.id, name, category, city, address, phone: owner.phone, description: desc,
        hours, status, plan, plan_until: status === 'active' ? trialEnd : null, approved_at: status === 'active' ? addDays(new Date(), -60).toISOString() : null, accepting: true, photos: [], rating_avg: null, rating_count: 0, created_at: now() };
      db.salons.push(s); return s;
    };
    const s1 = salon(b1, 'Berberia Elegance', 'barber', 'Tiranë', 'Rr. Myslym Shyri 24', 'Prerje klasike dhe moderne, rruajtje me peshqir të nxehtë.',
      week('09:00', '20:00', H('09:00', '18:00'), null), 'active', 'pro');
    const s2 = salon(b2, 'Salon Bella', 'salon', 'Durrës', 'Lagjja 13, Rruga Taulantia', 'Flokë, ngjyrime, grim për dasma dhe evente.',
      week('10:00', '19:00', H('10:00', '17:00'), null), 'active', 'trial');
    salon(b3, 'Nail Studio Sara', 'nails', 'Tiranë', 'Blloku, Rr. Pjetër Bogdani 8', 'Manikyr, pedikyr, xhel.',
      week('10:00', '19:00', H('10:00', '16:00'), null), 'pending', 'trial');
    const svc = (s, name, price, duration) => { const x = { id: uid(), salon_id: s.id, name, price, duration, active: true }; db.services.push(x); return x; };
    const st = (s, name) => { const x = { id: uid(), salon_id: s.id, name, active: true }; db.staff.push(x); return x; };
    const cut = svc(s1, 'Prerje flokësh', 800, 30), beard = svc(s1, 'Rregullim mjekre', 500, 20);
    svc(s1, 'Prerje + mjekër', 1200, 45); svc(s1, 'Rruajtje me peshqir të nxehtë', 700, 30);
    const blow = svc(s2, 'Larje + fen', 1000, 45); svc(s2, 'Ngjyrim flokësh', 3500, 120); svc(s2, 'Grim eventi', 4000, 60);
    const arben = st(s1, 'Arben'), dori = st(s1, 'Dori'), elira = st(s2, 'Elira');
    const bk = (s, sv, staff, client, start, status) => {
      const end = new Date(start.getTime() + sv.duration * 60000);
      const b = { id: uid(), salon_id: s.id, service_id: sv.id, staff_id: staff.id, client_id: client.id,
        start_at: start.toISOString(), end_at: end.toISOString(), price: sv.price, status, note: '', created_at: now() };
      db.bookings.push(b); return b;
    };
    const rv = (b, client, rating, comment, daysAgo) => db.reviews.push({ id: uid(), booking_id: b.id, salon_id: b.salon_id, client_id: client.id,
      client_name: shortName(client.name), rating, comment, created_at: addDays(new Date(), -daysAgo).toISOString() });
    bk(s1, cut, arben, c1, at(0, 10, 0), 'confirmed'); bk(s1, beard, dori, c2, at(0, 11, 30), 'confirmed');
    bk(s1, cut, arben, c2, at(0, 15, 0), 'confirmed'); bk(s1, cut, dori, c1, at(1, 12, 0), 'confirmed');
    bk(s1, cut, arben, c1, at(-3, 17, 0), 'completed'); bk(s2, blow, elira, c1, at(2, 11, 0), 'confirmed');
    bk(s1, beard, arben, c2, at(-1, 9, 30), 'no_show');
    rv(bk(s1, cut, dori, c2, at(-8, 16, 0), 'completed'), c2, 5, 'Prerja më e mirë në Tiranë. Dori shumë profesional!', 8);
    rv(bk(s1, beard, arben, c2, at(-15, 12, 0), 'completed'), c2, 4, 'Shërbim i shpejtë dhe i pastër.', 15);
    rv(bk(s2, blow, elira, c2, at(-6, 11, 0), 'completed'), c2, 5, 'Elira është fantastike, flokët dolën perfekt.', 6);
    db.salons.forEach(s => recompute(db, s.id));
    save(db); return db;
  }

  const shortName = n => { const p = String(n || '').trim().split(/\s+/); return p[0] + (p[1] ? ' ' + p[1][0] + '.' : ''); };
  function recompute(db, salonId) {
    const s = db.salons.find(x => x.id === salonId); if (!s) return;
    const rs = (db.reviews || []).filter(r => r.salon_id === salonId);
    s.rating_count = rs.length; s.rating_avg = rs.length ? Math.round(rs.reduce((n, r) => n + r.rating, 0) / rs.length * 100) / 100 : null;
  }
  const blobToDataUrl = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
  const strip = u => u && ({ id: u.id, email: u.email, name: u.name, phone: u.phone, role: u.role, created_at: u.created_at });
  function me(db) { const s = ls.get(SKEY) || (mem && mem.__session); return db.users.find(u => u.id === s) || null; }
  function setSession(db, id) { ls.set(SKEY, id); if (mem) mem.__session = id; }
  function need(db, role) { const u = me(db); if (!u) throw new Error('AUTH'); if (role && u.role !== role && u.role !== 'admin') throw new Error('FORBIDDEN'); return u; }
  function enrich(db, b) {
    const s = db.salons.find(x => x.id === b.salon_id) || {}, sv = db.services.find(x => x.id === b.service_id) || {},
      st = db.staff.find(x => x.id === b.staff_id) || {}, c = db.users.find(x => x.id === b.client_id) || {};
    return { ...b, salon_name: s.name, salon_phone: s.phone, salon_address: s.address, salon_city: s.city,
      service_name: sv.name || b.service_name, staff_name: st.name || b.staff_name, client_name: b.client_name || c.name, client_phone: b.client_phone || c.phone };
  }
  const overlaps = (a1, a2, b1, b2) => new Date(a1) < new Date(b2) && new Date(b1) < new Date(a2);
  const blocking = s => s === 'confirmed' || s === 'completed';
  const ownsSalon = (db, u, salonId) => u.role === 'admin' || db.salons.some(s => s.id === salonId && s.owner_id === u.id);

  window.TerminiDB = {
    mode: 'demo',
    async init() { load(); },
    async reset() { ls.del(KEY); ls.del(SKEY); mem = null; seed(); },
    async currentUser() { return strip(me(load())); },
    async signUp({ email, password, name, phone, role }) {
      const db = load(); email = email.trim().toLowerCase();
      if (db.users.some(u => u.email === email)) throw new Error('EMAIL_TAKEN');
      const u = { id: uid(), email, password, name, phone, role: role === 'business' ? 'business' : 'client', created_at: now() };
      db.users.push(u); save(db); setSession(db, u.id); return strip(u);
    },
    async signIn(email, password) {
      const db = load(); const u = db.users.find(x => x.email === email.trim().toLowerCase() && x.password === password);
      if (!u) throw new Error('WRONG_LOGIN'); setSession(db, u.id); return strip(u);
    },
    async signOut() { ls.del(SKEY); if (mem) mem.__session = null; },
    async updateProfile({ name, phone }) { const db = load(); const u = need(db); u.name = name; u.phone = phone; save(db); return strip(u); },

    async listSalons() { const today = new Date().toISOString().slice(0, 10); return load().salons.filter(s => s.status === 'active' && (!s.plan_until || s.plan_until >= today)); },
    async getSalon(id) { return load().salons.find(s => s.id === id) || null; },
    async mySalon() { const db = load(); const u = need(db); return db.salons.find(s => s.owner_id === u.id) || null; },
    async saveSalon(data) {
      const db = load(); const u = need(db, 'business');
      const fields = ['name', 'category', 'city', 'address', 'phone', 'description', 'hours', 'accepting', 'photos'];
      let s = data.id && db.salons.find(x => x.id === data.id);
      if (s) { if (!ownsSalon(db, u, s.id)) throw new Error('FORBIDDEN'); fields.forEach(f => { if (f in data) s[f] = data[f]; }); }
      else {
        s = { id: uid(), owner_id: u.id, status: 'pending', plan: 'trial', plan_until: null, approved_at: null, created_at: now() };
        fields.forEach(f => { s[f] = data[f]; }); if (s.accepting === undefined) s.accepting = true; s.photos = s.photos || []; s.rating_avg = null; s.rating_count = 0; db.salons.push(s);
      }
      save(db); return s;
    },

    async listServices(salonId) { return load().services.filter(s => s.salon_id === salonId); },
    async saveService(data) {
      const db = load(); const u = need(db, 'business'); if (!ownsSalon(db, u, data.salon_id)) throw new Error('FORBIDDEN');
      let s = data.id && db.services.find(x => x.id === data.id);
      if (s) Object.assign(s, data); else { s = { id: uid(), active: true, ...data }; db.services.push(s); }
      save(db); return s;
    },
    async deleteService(id) { const db = load(); const u = need(db, 'business'); const s = db.services.find(x => x.id === id);
      if (s && ownsSalon(db, u, s.salon_id)) { db.services = db.services.filter(x => x.id !== id); save(db); } },
    async listStaff(salonId) { return load().staff.filter(s => s.salon_id === salonId); },
    async saveStaff(data) {
      const db = load(); const u = need(db, 'business'); if (!ownsSalon(db, u, data.salon_id)) throw new Error('FORBIDDEN');
      let s = data.id && db.staff.find(x => x.id === data.id);
      if (s) Object.assign(s, data); else { s = { id: uid(), active: true, ...data }; db.staff.push(s); }
      save(db); return s;
    },
    async deleteStaff(id) { const db = load(); const u = need(db, 'business'); const s = db.staff.find(x => x.id === id);
      if (s && ownsSalon(db, u, s.salon_id)) { db.staff = db.staff.filter(x => x.id !== id); save(db); } },

    async busy(salonId, from, to) {
      return load().bookings.filter(b => b.salon_id === salonId && blocking(b.status) && overlaps(b.start_at, b.end_at, from, to))
        .map(b => ({ staff_id: b.staff_id, start_at: b.start_at, end_at: b.end_at }));
    },
    async createBooking({ salon_id, service_id, staff_id, start_at, note, walk_in, client_name, client_phone }) {
      const db = load(); const u = need(db);
      const salon = db.salons.find(x => x.id === salon_id); if (!salon) throw new Error('NOT_FOUND');
      const owner = ownsSalon(db, u, salon_id);
      if (!owner && (salon.status !== 'active' || salon.accepting === false || (salon.plan_until && salon.plan_until < new Date().toISOString().slice(0, 10)))) throw new Error('NOT_ACCEPTING');
      const isWalk = !!(owner && walk_in);
      const sv = db.services.find(x => x.id === service_id && x.salon_id === salon_id); if (!sv) throw new Error('NOT_FOUND');
      const end_at = new Date(new Date(start_at).getTime() + sv.duration * 60000).toISOString();
      if (db.bookings.some(b => b.staff_id === staff_id && blocking(b.status) && overlaps(b.start_at, b.end_at, start_at, end_at))) throw new Error('SLOT_TAKEN');
      const stf = db.staff.find(x => x.id === staff_id && x.salon_id === salon_id && x.active !== false); if (!stf) throw new Error('NOT_FOUND');
      const b = { id: uid(), salon_id, service_id, staff_id, client_id: u.id, start_at, end_at, price: sv.price, status: 'confirmed', note: note || '',
        service_name: sv.name, staff_name: stf.name, client_name: isWalk ? (client_name || '—') : u.name, client_phone: isWalk ? (client_phone || '') : u.phone,
        walk_in: isWalk, created_at: now() };
      db.bookings.push(b); save(db); return enrich(db, b);
    },
    async myBookings() { const db = load(); const u = need(db); return db.bookings.filter(b => b.client_id === u.id).map(b => enrich(db, b)); },
    async salonBookings(salonId, from, to) {
      const db = load(); const u = need(db, 'business'); if (!ownsSalon(db, u, salonId)) throw new Error('FORBIDDEN');
      return db.bookings.filter(b => b.salon_id === salonId && overlaps(b.start_at, b.end_at, from, to)).map(b => enrich(db, b));
    },
    async setBookingStatus(id, status) {
      const db = load(); const u = need(db); const b = db.bookings.find(x => x.id === id); if (!b) throw new Error('NOT_FOUND');
      const isOwner = ownsSalon(db, u, b.salon_id);
      if (!isOwner && !(b.client_id === u.id && status === 'cancelled')) throw new Error('FORBIDDEN');
      b.status = status; save(db); return enrich(db, b);
    },

    // Photos (demo: stored in the browser as small JPEG data URLs)
    async uploadPhoto(salonId, blob) { const db = load(); const u = need(db, 'business'); if (!ownsSalon(db, u, salonId)) throw new Error('FORBIDDEN');
      return { url: await blobToDataUrl(blob), path: uid() }; },
    async deletePhoto() {},
    // Reviews
    async listReviews(salonId, limit = 20) { return (load().reviews || []).filter(r => r.salon_id === salonId).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit); },
    async myReviews() { const db = load(); const u = need(db); return (db.reviews || []).filter(r => r.client_id === u.id); },
    async createReview({ booking_id, rating, comment }) {
      const db = load(); const u = need(db); db.reviews = db.reviews || [];
      const b = db.bookings.find(x => x.id === booking_id);
      if (!b || b.client_id !== u.id || b.status !== 'completed') throw new Error('FORBIDDEN');
      if (db.reviews.some(r => r.booking_id === booking_id)) throw new Error('FORBIDDEN');
      const r = { id: uid(), booking_id, salon_id: b.salon_id, client_id: u.id, client_name: shortName(u.name), rating: Math.max(1, Math.min(5, rating | 0)), comment: String(comment || '').slice(0, 500), created_at: now() };
      db.reviews.push(r); recompute(db, b.salon_id); save(db); return r;
    },

    async adminSalons() { const db = load(); need(db, 'admin');
      return db.salons.map(s => ({ ...s, owner_name: (db.users.find(u => u.id === s.owner_id) || {}).name, owner_email: (db.users.find(u => u.id === s.owner_id) || {}).email, owner_phone: (db.users.find(u => u.id === s.owner_id) || {}).phone })); },
    async adminSetSalon(id, patch) { const db = load(); const u = need(db, 'admin'); if (u.role !== 'admin') throw new Error('FORBIDDEN');
      const s = db.salons.find(x => x.id === id); ['status', 'plan', 'plan_until'].forEach(f => { if (f in patch) s[f] = patch[f]; });
      if (s.status === 'active' && !s.approved_at) { // first approval starts the free trial
        s.approved_at = now();
        if (s.plan === 'trial' && !s.plan_until) s.plan_until = addDays(new Date(), (window.TERMINI_CONFIG || {}).TRIAL_DAYS || 30).toISOString().slice(0, 10);
      }
      save(db); return s; },
    async adminUsers() { const db = load(); const u = need(db, 'admin'); if (u.role !== 'admin') throw new Error('FORBIDDEN'); return db.users.map(strip); },
    async adminStats() {
      const db = load(); const u = need(db, 'admin'); if (u.role !== 'admin') throw new Error('FORBIDDEN');
      const since = addDays(new Date(), -30);
      return { salons: db.salons.length, pending: db.salons.filter(s => s.status === 'pending').length,
        clients: db.users.filter(x => x.role === 'client').length, bookings: db.bookings.length,
        bookings30: db.bookings.filter(b => new Date(b.created_at) >= since).length };
    }
  };
})();
