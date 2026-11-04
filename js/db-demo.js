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
    const db = { users: [], salons: [], services: [], staff: [], bookings: [] };
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
        hours, status, plan, plan_until: trialEnd, created_at: now() };
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
      db.bookings.push({ id: uid(), salon_id: s.id, service_id: sv.id, staff_id: staff.id, client_id: client.id,
        start_at: start.toISOString(), end_at: end.toISOString(), price: sv.price, status, note: '', created_at: now() });
    };
    bk(s1, cut, arben, c1, at(0, 10, 0), 'confirmed'); bk(s1, beard, dori, c2, at(0, 11, 30), 'confirmed');
    bk(s1, cut, arben, c2, at(0, 15, 0), 'confirmed'); bk(s1, cut, dori, c1, at(1, 12, 0), 'confirmed');
    bk(s1, cut, arben, c1, at(-3, 17, 0), 'completed'); bk(s2, blow, elira, c1, at(2, 11, 0), 'confirmed');
    bk(s1, beard, arben, c2, at(-1, 9, 30), 'no_show');
    save(db); return db;
  }

  const strip = u => u && ({ id: u.id, email: u.email, name: u.name, phone: u.phone, role: u.role, created_at: u.created_at });
  function me(db) { const s = ls.get(SKEY) || (mem && mem.__session); return db.users.find(u => u.id === s) || null; }
  function setSession(db, id) { ls.set(SKEY, id); if (mem) mem.__session = id; }
  function need(db, role) { const u = me(db); if (!u) throw new Error('AUTH'); if (role && u.role !== role && u.role !== 'admin') throw new Error('FORBIDDEN'); return u; }
  function enrich(db, b) {
    const s = db.salons.find(x => x.id === b.salon_id) || {}, sv = db.services.find(x => x.id === b.service_id) || {},
      st = db.staff.find(x => x.id === b.staff_id) || {}, c = db.users.find(x => x.id === b.client_id) || {};
    return { ...b, salon_name: s.name, salon_phone: s.phone, salon_address: s.address, salon_city: s.city,
      service_name: sv.name || b.service_name, staff_name: st.name || b.staff_name, client_name: c.name || b.client_name, client_phone: c.phone || b.client_phone };
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

    async listSalons() { return load().salons.filter(s => s.status === 'active'); },
    async getSalon(id) { return load().salons.find(s => s.id === id) || null; },
    async mySalon() { const db = load(); const u = need(db); return db.salons.find(s => s.owner_id === u.id) || null; },
    async saveSalon(data) {
      const db = load(); const u = need(db, 'business');
      const fields = ['name', 'category', 'city', 'address', 'phone', 'description', 'hours'];
      let s = data.id && db.salons.find(x => x.id === data.id);
      if (s) { if (!ownsSalon(db, u, s.id)) throw new Error('FORBIDDEN'); fields.forEach(f => { if (f in data) s[f] = data[f]; }); }
      else {
        s = { id: uid(), owner_id: u.id, status: 'pending', plan: 'trial',
          plan_until: addDays(new Date(), (window.TERMINI_CONFIG || {}).TRIAL_DAYS || 30).toISOString().slice(0, 10), created_at: now() };
        fields.forEach(f => { s[f] = data[f]; }); db.salons.push(s);
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
    async createBooking({ salon_id, service_id, staff_id, start_at, note }) {
      const db = load(); const u = need(db);
      const sv = db.services.find(x => x.id === service_id && x.salon_id === salon_id); if (!sv) throw new Error('NOT_FOUND');
      const end_at = new Date(new Date(start_at).getTime() + sv.duration * 60000).toISOString();
      if (db.bookings.some(b => b.staff_id === staff_id && blocking(b.status) && overlaps(b.start_at, b.end_at, start_at, end_at))) throw new Error('SLOT_TAKEN');
      const stf = db.staff.find(x => x.id === staff_id && x.salon_id === salon_id && x.active !== false); if (!stf) throw new Error('NOT_FOUND');
      const b = { id: uid(), salon_id, service_id, staff_id, client_id: u.id, start_at, end_at, price: sv.price, status: 'confirmed', note: note || '',
        service_name: sv.name, staff_name: stf.name, client_name: u.name, client_phone: u.phone, created_at: now() };
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

    async adminSalons() { const db = load(); need(db, 'admin');
      return db.salons.map(s => ({ ...s, owner_name: (db.users.find(u => u.id === s.owner_id) || {}).name, owner_email: (db.users.find(u => u.id === s.owner_id) || {}).email })); },
    async adminSetSalon(id, patch) { const db = load(); const u = need(db, 'admin'); if (u.role !== 'admin') throw new Error('FORBIDDEN');
      const s = db.salons.find(x => x.id === id); ['status', 'plan', 'plan_until'].forEach(f => { if (f in patch) s[f] = patch[f]; }); save(db); return s; },
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
