# Bento-do Backend

Backend REST API untuk aplikasi produktivitas mahasiswa Bento-do.

## Stack

- Express.js
- PostgreSQL / Neon
- JWT Bearer Token
- Zod validation
- Nodemailer SMTP email
- Helmet, CORS, XSS sanitizer

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

Base URL lokal:

```text
http://localhost:5000/api/v1
```

Health check:

```text
GET http://localhost:5000/
```

## Environment

Isi `.env` dari `.env.example`. Minimal yang dibutuhkan:

```env
PORT=5000
DATABASE_URL=your_database_url
JWT_SECRET=your_super_secret_key
CLIENT_ORIGINS=http://localhost:5173
FRONTEND_URL=http://localhost:5173
PASSWORD_RESET_URL=http://localhost:5173/reset-password
```

Untuk email reset password dan deadline reminder:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_project_email@gmail.com
EMAIL_PASS=your_google_app_password
EMAIL_FROM="Bento-do <your_project_email@gmail.com>"
EMAIL_DEV_LOG=false
```

Jangan commit `.env`.

## Dokumentasi

- [Dokumentasi Bento-do API](./Dokumentasi%20Bento-do%20API.md)
- [Dokumentasi Auth API](./Dokumentasi%20Auth%20API.md)
- [Dokumentasi Tasks API](./Dokumentasi%20Tasks%20API.md)
- [Dokumentasi Notification API](./Dokumentasi%20Notification%20API.md)

## Endpoint Tambahan untuk FE

Endpoint agregasi yang siap dipakai dashboard, history, dan admin:

```text
GET /api/v1/dashboard/overview?period=weekly&calendar_date=2026-06-10
GET /api/v1/dashboard/history?type=all&page=1&limit=20
GET /api/v1/admin/dashboard?period=weekly
GET /api/v1/admin/templates?page=1&limit=20
```

Catatan:

- `period` menerima `daily`, `weekly`, `monthly`, atau `yearly`.
- `dashboard/overview` dan `dashboard/history` mendukung user login dan guest session.
- Endpoint `/admin/*` butuh JWT user dengan role `admin`.
- `GET /api/v1/tasks/:id` sekarang mengembalikan `focus_summary` dan `latest_focus_session` untuk popup detail task.

## Status

Backend sudah mencakup auth, guest mode, tasks, templates, dashboard, focus, energy, in-app notifications, forgot/reset password via email, dan deadline reminder email.
