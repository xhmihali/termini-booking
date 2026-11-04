# Termini – keeping your data safe

Termini keeps its data in **three layers**. All of them are free.

| Layer | Where | When |
|---|---|---|
| 1. Live database | Supabase (cloud Postgres) | Always. Not on the phone, so changing or wiping a phone loses nothing. |
| 2. Automatic encrypted backup | GitHub, branch `backups` (the last 30) | Every night, 02:43 UTC |
| 3. Manual copy | Admin → Dashboard → **Download backup** (JSON); Business → Salon → **Download CSV** | Whenever you want |

> ⚠️ **DEMO mode** (no Supabase keys in `config.js`) stores everything **only in the browser**.
> It is for trying things out. Connect Supabase before real salons and clients use the app.

---

## Turn on the nightly backup (5 minutes, once)

1. In Supabase, open your project → **Connect** (top bar) → **Session pooler**. Copy the connection string. It looks like
   `postgresql://postgres.abcdefgh:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`.
   Replace `[YOUR-PASSWORD]` with your database password.
2. In GitHub, open the repo → **Settings → Secrets and variables → Actions → New repository secret**, and add:
   - `SUPABASE_DB_URL`: the connection string from step 1
   - `BACKUP_PASSWORD`: a long password that only you know. **Write it down somewhere safe.** Without it the backups cannot be opened.
3. Open **Actions → Daily database backup → Run workflow** to make the first backup now.
   Afterwards a new branch **`backups`** holds files like `termini-backup-2026-11-05_0243.tar.gz.enc`.

The backup is encrypted (AES-256) **before** it leaves GitHub's machine. Even though the repository is public, nobody can read it without your password.

Each backup contains:
- all app tables (salons, services, staff, bookings, reviews, profiles), with structure and data
- login accounts (`auth.users`, `auth.identities`) and the photo records (`storage.objects`)
- `counts.txt`: how many salons, bookings, users and reviews it holds

Photo **files** stay in Supabase Storage. The backup keeps their links and records.

---

## Restore (only in an emergency)

You need a computer with `openssl` and PostgreSQL 17 client tools (`pg_restore`).

```bash
# 1. Download a backup file from the "backups" branch, then decrypt it (asks for BACKUP_PASSWORD)
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in termini-backup-YYYY-MM-DD_HHMM.tar.gz.enc -out backup.tar.gz
mkdir backup && tar xzf backup.tar.gz -C backup
cat backup/counts.txt

# 2. Point to the database to restore into (a NEW, empty Supabase project is safest)
export DB="postgresql://postgres.xxxx:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

# 3. Restore logins first, then the app tables
pg_restore --data-only --no-owner -d "$DB" backup/auth_storage.dump
pg_restore --no-owner -d "$DB" backup/public.dump
```

A message like `schema "public" already exists` is normal and harmless.

After restoring into a new project, put its new URL and anon key in `config.js`. Then run `supabase/schema.sql` once more, which recreates the photo bucket and its rules.
