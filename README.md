# Termini – Rezervime për berberë & sallone

A booking app (installable PWA) for barbers, beauty salons, nail studios and spas. Albanian and English.

**Design:** "Fresh" (version B): light, friendly, blue + coral, Plus Jakarta Sans font (Google Fonts, free).

**Three types of user**
- **Client:** the home screen shows category tiles and "Free now near you", with the first free times on each salon card, bookable in one tap. Booking uses a 3-step flow: staff, days with availability dots (green/yellow/red), and times grouped into morning, afternoon and evening. After booking, clients can **Add to calendar** (.ics with a reminder 2 hours before, free). They can see and cancel their bookings. Payment happens at the salon.
- **Business:** sets up the salon (info and opening hours), services (price, duration), and staff. The agenda has **Now / Later / Earlier** sections, stats (bookings, revenue, % booked), a staff filter, and one-tap Complete and WhatsApp reminder buttons. **Free-time cards** have a "Share" button that posts the free hours on WhatsApp. **Walk-in client** adds someone without the app. An **Online/Offline** switch stops online bookings.
- **Admin (you):** approves new salons, suspends them, and tracks each salon's plan. The **30-day free trial starts the day you approve** the salon. Right after approval, a **"Notify the owner on WhatsApp"** button opens a ready message. When a salon pays you, tap **"+30 days (paid)"**. A salon whose plan has **expired is hidden from clients automatically** and can't take online bookings; you get a **"Payment reminder"** WhatsApp button. Also sees all users and stats.

**New salon onboarding:** the owner signs up as Business, creates the salon, and sees a checklist (account → hours → services → staff → admin approval) with a progress bar. When approved, the owner sees an "Your salon is approved!" message with the trial end date the next time they open the app. Set `ADMIN_PHONE` in `config.js` so owners with an expired plan get a button to WhatsApp you.

**Works on phone and computer:** on a phone it is an installable app with a bottom menu. On a tablet the lists use 2 columns. On a computer (1024px and wider) it becomes a full website: left sidebar menu, cards in 2–3 columns, salon page with services on the left and staff/hours on the right, centered pop-up windows, and a login page with a marketing panel.

**Public website (no login needed):** visitors see a full website: hero with search, live salons with their first free times, "How it works", a "For businesses" section, pricing, FAQ and footer. Guests can open any salon page. When they pick a time they are asked to log in, then continue straight to booking. Every salon has its own **shareable link** (`…/#salon/<id>`) for Instagram/Facebook/Google Maps (Salon → "Your booking link"). Set `PRICE_MONTHLY`, `CONTACT_EMAIL` and `ADMIN_PHONE` in `config.js` to fill pricing and contact.

**Extra details:** the client home has "Your next appointment", "Book again" and "Invite a friend". The salon page has a map and a Share button. The business agenda has a "Last 7 days" revenue chart. The background is a soft animated violet/blue/coral glow with a fine dot grid, on all screens.

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
