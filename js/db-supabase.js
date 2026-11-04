// Termini – LIVE data layer (Supabase). Same interface as db-demo.js.
// Security is enforced in the database (supabase/schema.sql), not here.
(function () {
  const C = window.TERMINI_CONFIG;
  const sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  let me = null;

  function fail(error) {
    if (!error) return;
    const m = (error.message || '') + ' ' + (error.code || '');
    if (error.code === '23P01' || /bookings_no_overlap|CLOSED|IN_PAST/.test(m)) throw new Error('SLOT_TAKEN');
    if (/Invalid login credentials/i.test(m)) throw new Error('WRONG_LOGIN');
    if (/already registered|already exists/i.test(m)) throw new Error('EMAIL_TAKEN');
    if (/Email not confirmed/i.test(m)) throw new Error('CHECK_EMAIL');
    if (/NOT_ACCEPTING|SALON_NOT_ACTIVE/.test(m)) throw new Error('NOT_ACCEPTING');
    throw new Error(error.message || 'Error');
  }
  const q = async p => { const { data, error } = await p; fail(error); return data; };
  const flatBooking = b => ({ ...b,
    salon_name: b.salons && b.salons.name, salon_phone: b.salons && b.salons.phone,
    salon_address: b.salons && b.salons.address, salon_city: b.salons && b.salons.city, salons: undefined });

  async function loadProfile(user) {
    if (!user) { me = null; return null; }
    const p = await q(sb.from('profiles').select('*').eq('id', user.id).maybeSingle());
    me = p ? { id: p.id, email: p.email || user.email, name: p.name, phone: p.phone, role: p.role, created_at: p.created_at } : null;
    return me;
  }
  const uidOrThrow = () => { if (!me) throw new Error('AUTH'); return me.id; };

  window.TerminiDB = {
    mode: 'live',
    async init() {},
    async reset() {},
    async currentUser() { const { data } = await sb.auth.getSession(); return loadProfile(data.session && data.session.user); },
    async signUp({ email, password, name, phone, role }) {
      const { data, error } = await sb.auth.signUp({ email: email.trim(), password,
        options: { data: { name, phone, role: role === 'business' ? 'business' : 'client' }, emailRedirectTo: location.origin + location.pathname } });
      fail(error);
      if (!data.session) throw new Error('CHECK_EMAIL'); // email confirmation is ON in Supabase
      return loadProfile(data.user);
    },
    async signIn(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password }); fail(error);
      return loadProfile(data.user);
    },
    async signOut() { await sb.auth.signOut(); me = null; },
    async updateProfile({ name, phone }) {
      await q(sb.from('profiles').update({ name, phone }).eq('id', uidOrThrow()));
      return { ...me, name, phone };
    },

    async listSalons() { const today = new Date().toISOString().slice(0, 10);
      return q(sb.from('salons').select('*').eq('status', 'active').or(`plan_until.is.null,plan_until.gte.${today}`).order('name')); },
    async getSalon(id) { return q(sb.from('salons').select('*').eq('id', id).maybeSingle()); },
    async mySalon() { return q(sb.from('salons').select('*').eq('owner_id', uidOrThrow()).maybeSingle()); },
    async saveSalon(d) {
      const row = { name: d.name, category: d.category, city: d.city, address: d.address, phone: d.phone, description: d.description, hours: d.hours, accepting: d.accepting };
      Object.keys(row).forEach(k => row[k] === undefined && delete row[k]);
      if (d.id) return q(sb.from('salons').update(row).eq('id', d.id).select().single());
      return q(sb.from('salons').insert({ ...row, owner_id: uidOrThrow() }).select().single());
    },

    async listServices(salonId) { return q(sb.from('services').select('*').eq('salon_id', salonId).order('created_at')); },
    async saveService(d) {
      const row = { salon_id: d.salon_id, name: d.name, price: d.price, duration: d.duration, active: d.active !== false };
      return d.id ? q(sb.from('services').update(row).eq('id', d.id).select().single()) : q(sb.from('services').insert(row).select().single());
    },
    async deleteService(id) { await q(sb.from('services').delete().eq('id', id)); },
    async listStaff(salonId) { return q(sb.from('staff').select('*').eq('salon_id', salonId).order('created_at')); },
    async saveStaff(d) {
      const row = { salon_id: d.salon_id, name: d.name, active: d.active !== false };
      return d.id ? q(sb.from('staff').update(row).eq('id', d.id).select().single()) : q(sb.from('staff').insert(row).select().single());
    },
    async deleteStaff(id) { await q(sb.from('staff').delete().eq('id', id)); },

    async busy(salonId, from, to) { return q(sb.rpc('busy_slots', { p_salon: salonId, p_from: from, p_to: to })); },
    async createBooking({ salon_id, service_id, staff_id, start_at, note, walk_in, client_name, client_phone }) {
      // end_at and price are recalculated by the database trigger; values here are placeholders
      const b = await q(sb.from('bookings').insert({ salon_id, service_id, staff_id, client_id: uidOrThrow(), start_at,
        end_at: new Date(new Date(start_at).getTime() + 60000).toISOString(), note: note || '',
        walk_in: !!walk_in, client_name: client_name || '', client_phone: client_phone || '' }).select('*, salons(name,phone,address,city)').single());
      return flatBooking(b);
    },
    async myBookings() {
      const rows = await q(sb.from('bookings').select('*, salons(name,phone,address,city)').eq('client_id', uidOrThrow()).order('start_at', { ascending: false }).limit(200));
      return rows.map(flatBooking);
    },
    async salonBookings(salonId, from, to) {
      return q(sb.from('bookings').select('*').eq('salon_id', salonId).lt('start_at', to).gt('end_at', from).order('start_at'));
    },
    async setBookingStatus(id, status) { return q(sb.from('bookings').update({ status }).eq('id', id).select().single()); },

    async adminSalons() {
      const rows = await q(sb.from('salons').select('*, profiles(name,email,phone)').order('created_at', { ascending: false }));
      return rows.map(s => ({ ...s, owner_name: s.profiles && s.profiles.name, owner_email: s.profiles && s.profiles.email, owner_phone: s.profiles && s.profiles.phone, profiles: undefined }));
    },
    async adminSetSalon(id, patch) { return q(sb.from('salons').update(patch).eq('id', id).select().single()); },
    async adminUsers() { return q(sb.from('profiles').select('*').order('created_at', { ascending: false }).limit(1000)); },
    async adminStats() { return q(sb.rpc('admin_stats')); }
  };
})();
