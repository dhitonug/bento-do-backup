# Dokumentasi REST API - Guest

Stack yang digunakan:

- Express.js v5
- PostgreSQL
- UUID
- Zod

---

# 📚 Daftar Isi

- [1. Struktur Folder](#1-struktur-folder)
- [2. Environment Variables](#2-environment-variables)
- [3. Database Schema](#3-database-schema)
- [4. Guest Session - Cara Kerja](#4-guest-session---cara-kerja)
  - [4.1 Konsep Guest Session](#41-konsep-guest-session)
  - [4.2 Alur Guest Session](#42-alur-guest-session)
  - [4.3 Keamanan Guest Session](#43-keamanan-guest-session)
- [5. Middleware](#5-middleware)
  - [5.1 guestOrAuth Middleware](#51-guestorauth-middleware)
- [6. Setup Postman](#6-setup-postman)
- [7. API Reference](#7-api-reference)
  - [POST /guest](#post-guest)
- [8. Testing dengan Collection Runner](#8-testing-dengan-collection-runner)

---

# 1. Struktur Folder

```bash
.
├── .env
├── .env.example
├── db.sql
├── package.json
└── src/
    ├── server.js
    ├── app.js
    │
    ├── config/
    │   └── db.js
    │
    ├── middlewares/
    │   ├── auth.middleware.js
    │   ├── error.middleware.js
    │   ├── guestOrAuth.middleware.js
    │   ├── loginWall.middleware.js
    │   └── validate.middleware.js
    │
    ├── modules/
    │   ├── auth/
    │   │   ├── auth.controller.js
    │   │   ├── auth.service.js
    │   │   ├── auth.repository.js
    │   │   ├── auth.routes.js
    │   │   └── auth.validation.js
    │   │
    │   ├── guest/
    │   │   ├── guest.controller.js
    │   │   ├── guest.service.js
    │   │   ├── guest.repository.js
    │   │   └── guest.routes.js
    │   │
    │   └── tasks/
    │       ├── tasks.controller.js
    │       ├── tasks.service.js
    │       ├── tasks.repository.js
    │       ├── tasks.routes.js
    │       └── tasks.validation.js
    │
    └── utils/
        └── jwt.js
```

---

# 2. Environment Variables

Isi file `.env` dengan konfigurasi berikut:

```env
PORT=5000
DATABASE_URL=postgresql://user:password@host:5432/bento_db
```

| Variable | Contoh | Keterangan |
|----------|---------|-------------|
| `PORT` | `5000` | Port server |
| `DATABASE_URL` | `postgresql://...` | Connection string PostgreSQL |

---

# 3. Database Schema

## Tabel `guest_sessions`

```sql
CREATE TABLE guest_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token VARCHAR(255) UNIQUE NOT NULL,

  synced_at TIMESTAMP NULL,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);
```

| Kolom | Tipe | Keterangan |
|------|------|-------------|
| `id` | UUID | Primary key internal |
| `session_token` | VARCHAR(255) | Token yang dikirim ke client |
| `synced_at` | TIMESTAMP | Waktu sinkronisasi ke user |
| `created_at` | TIMESTAMP | Waktu session dibuat |
| `updated_at` | TIMESTAMP | Waktu update terakhir |
| `deleted_at` | TIMESTAMP NULL | Soft delete |

> ⚠️ `id` digunakan sebagai identifier internal database.  
> Sedangkan `session_token` adalah token yang dikirim ke client.

Task akan menyimpan `guest_sessions.id`, bukan `session_token`.

---

# 4. Guest Session - Cara Kerja

## 4.1 Konsep Guest Session

Guest session memungkinkan pengguna menggunakan aplikasi tanpa harus registrasi terlebih dahulu.

Session dibuat menggunakan UUID token yang berfungsi sebagai identitas sementara.

```js
// guest.service.js

const session_token = uuidv4();

const session =
  await guestRepo.createGuestSession(
    session_token
  );
```

---

## Filosofi Guest Mode

Konsep ini menggunakan pendekatan:

> Product-Led Growth

User diberikan kesempatan mencoba produk terlebih dahulu sebelum diminta membuat akun.

---

## 4.2 Alur Guest Session

1. Client melakukan `POST /guest`
2. Server membuat guest session baru
3. Session disimpan ke database
4. Server mengembalikan `session_token`
5. Client menggunakan token pada header:

```http
x-guest-session-token: token
```

6. Token valid sampai guest melakukan register atau login

---

## 4.3 Keamanan Guest Session

Beberapa alasan guest session tetap aman:

- UUID bersifat random 128-bit
- Sulit ditebak oleh attacker
- Client tidak mengetahui `id` internal database
- Data guest terisolasi dari data user lain

---

# 5. Middleware

## 5.1 `guestOrAuth` Middleware

Middleware ini mendukung dua metode autentikasi:

1. JWT Authentication
2. Guest Session Authentication

```js
if (authHeader) {
  // Verifikasi JWT
  // Set req.identity sebagai user
} else if (guestToken) {
  // Cari guest session
  // Set req.identity sebagai guest
} else {
  // Unauthorized
}
```

---

## Identity Guest

```js
req.identity = {
  type: "guest",
  user_id: null,
  guest_session_id: "uuid",
};
```

---

# 6. Setup Postman

## Environment Variables

| Variable | Initial Value | Current Value |
|----------|----------------|----------------|
| `BASE_URL` | `http://localhost:5000/api/v1` | `http://localhost:5000/api/v1` |
| `GUEST_TOKEN` | *(kosong)* | *(otomatis terisi)* |

---

## Auto Simpan Guest Token

Tambahkan script berikut pada tab **Tests** di request `POST /guest`.

```js
const json = pm.response.json();

pm.environment.set(
  "GUEST_TOKEN",
  json.data.session_token
);
```

---

## Mengirim Guest Token

```http
x-guest-session-token: {{GUEST_TOKEN}}
```

---

# 7. API Reference

## Base URL

```text
http://localhost:5000/api/v1
```

---

# POST `/guest`

Digunakan untuk membuat guest session baru.

---

## Request

### Method

```http
POST
```

### Endpoint

```http
/guest
```

### Headers

```text
Tidak ada
```

### Body

```text
Tidak ada
```

---

## Response Success — `201 Created`

```json
{
  "success": true,
  "message": "Guest session berhasil dibuat.",
  "data": {
    "guest_session_id": "550e8400-e29b-41d4-a716-446655440000",
    "session_token": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "created_at": "2026-05-08T00:00:00.000Z"
  }
}
```

---

## Response Code

| Status Code | Keterangan |
|-------------|-------------|
| `201` | Guest session berhasil dibuat |
| `500` | Terjadi kesalahan pada server |

---

## Cara Menggunakan Guest Session

1. Kirim request `POST /guest`
2. Ambil `session_token`
3. Gunakan token pada header:

```http
x-guest-session-token: token
```

4. Gunakan token tersebut untuk endpoint tasks
5. Token valid sampai guest register atau login

---

# 8. Testing dengan Collection Runner

## Folder

```text
1. GUEST MODE
```

| No | Request | Ekspektasi |
|----|----------|-------------|
| 1 | `POST /guest` | `201`, mendapatkan `session_token` |
| 2 | `POST /tasks` sebagai guest | `201`, membuat task Ringan |
| 3 | `POST /tasks` sebagai guest | `201`, membuat task Sedang |
| 4 | `POST /tasks` sebagai guest | `201`, membuat task Berat |
| 5 | `GET /tasks?page=1&limit=3` | `200`, maksimal 3 item |
| 6 | `GET /tasks/:id` | `200`, detail task |
| 7 | `PUT /tasks/:id` status done | `200`, status berhasil diupdate |
| 8 | `DELETE /tasks/:id` | `200`, soft delete berhasil |

---

# ✅ Catatan

- Guest tidak perlu registrasi
- Session menggunakan UUID random
- Token guest disimpan di header request
- Data guest tetap terisolasi
- Guest dapat menggunakan seluruh fitur task
- Data guest dapat dipindahkan ke user saat register/login
