// Termini – configuration
// Leave both empty to run in DEMO mode (test data saved in this browser only).
// To go live: create a free project at https://supabase.com, run supabase/schema.sql
// in the SQL editor, then paste the Project URL and the "anon public" key below.
window.TERMINI_CONFIG = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  APP_NAME: 'Termini',
  CURRENCY: 'ALL',          // shown next to prices
  DEFAULT_LANG: 'sq',       // 'sq' or 'en'
  BOOKING_DAYS_AHEAD: 21,   // how far ahead clients can book
  TRIAL_DAYS: 30,           // free trial, starts when the admin approves the salon (keep in sync with schema.sql)
  ADMIN_PHONE: ''           // your WhatsApp number (e.g. '0691234567'); salons with an expired plan get a button to message you
};
