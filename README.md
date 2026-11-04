# Termini – Rezervime për berberë & sallone

A booking app (installable PWA) for barbers, beauty salons, nail studios and spas. Albanian and English.

**Three types of user**
- **Client:** finds salons by city or type, picks a service, staff member, day and free time, and books. They can see and cancel their bookings. Payment happens at the salon.
- **Business:** sets up the salon (info and opening hours), services (price, duration), and staff. The daily agenda lets them mark bookings Complete or No-show, cancel them, and send a WhatsApp reminder or call the client. They also see daily and weekly revenue.
- **Admin (you):** approves new salons, suspends them, and tracks each salon's plan (30-day free trial, then mark "+30 days (paid)" when a salon pays you). Also sees all users and stats.

## Cost: €0

| Part | Service | Cost |
|---|---|---|
| Website / app hosting | GitHub Pages (public repo) | Free |
| Database + logins | Supabase Free plan (500 MB DB, 50,000 monthly users) | Free |
| Library | supabase-js (MIT license) | Free |
| Reminders | WhatsApp click-to-chat links (`wa.me`) | Free, no SMS fees |
| Fonts / icons | System fonts, own SVG icon | Free |

Note: Supabase pauses a free project after 7 days with **no activity**. A salon app with daily bookings stays active. If it ever pauses, click "Restore" in the Supabase dashboard (free).

## Two modes

1. **DEMO mode** (the default): no setup needed. Test data is stored in the browser of each device. Test accounts (password `demo123`):
   - `klient@demo.al` (client) · `berber@demo.al` (business) · `admin@demo.al` (admin)
2. **LIVE mode:** real accounts and shared data via Supabase. Follow the steps below.

## Go live (about 10 minutes)

1. Create a free account at **supabase.com** → **New project** (region: Frankfurt/EU). Save the database password.
2. In the project: **SQL Editor → New query**, paste all of `supabase/schema.sql`, then click **Run**.
3. **Authentication → Sign In / Providers → Email**: for the first tests, turn **off** "Confirm email". Supabase's built-in email sender is limited, and you can turn confirmation back on later with your own SMTP.
4. **Authentication → URL Configuration**: set the Site URL to `https://xhmihali.github.io/termini-booking/`.
5. **Project Settings → API**: copy the **Project URL** and the **anon public** key into `config.js`:
   ```js
   SUPABASE_URL: 'https://xxxx.supabase.co',
   SUPABASE_ANON_KEY: 'eyJhbGciOi...',
   ```
   The anon key is meant to be public. Security is enforced by the database rules in `schema.sql`. **Never** put the `service_role` key in the app.
6. Commit. GitHub Pages updates in about a minute.
7. Open the app, sign up with your own email, then in the SQL Editor run:
   ```sql
   update public.profiles set role = 'admin' where email = 'YOUR@EMAIL.COM';
   ```
   Log out and back in to get the admin panel.

## Security built into the database
- Nobody can sign up as admin. Users can't change their own role.
- Salons start as **pending**. Owners can't approve themselves or change their plan.
- The **database** refuses double bookings (exclusion constraint), checks opening hours (Europe/Tirane time), and sets price and end time itself.
- Clients see only their own bookings. Others' bookings appear only as "busy" time, without names.
- Clients can only cancel. Only the salon can mark Complete or No-show.

## Files
```
index.html            app page
config.js             settings (Supabase keys, currency, trial days…)
css/styles.css        design
js/i18n.js            Albanian + English texts
js/app.js             screens and logic for the 3 roles
js/db-demo.js         demo data (in browser)
js/db-supabase.js     live data (Supabase)
supabase/schema.sql   database, security rules, functions
sw.js, manifest.webmanifest, icons/   installable app (PWA)
```

After changing files, bump `VERSION` in `sw.js` so installed phones pick up the update.

## Install on a phone
Open the link in Chrome (Android) → menu → **Add to Home screen / Install app**. On iPhone: Safari → Share → **Add to Home Screen**.

---
© Xhuljan Mihali. All rights reserved.
