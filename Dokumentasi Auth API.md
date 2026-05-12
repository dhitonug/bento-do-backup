# Dokumentasi REST API - Authentication

Stack yang digunakan:

- Express.js v5
- PostgreSQL
- JWT
- Bcrypt
- Zod
- CORS
- Helmet
- XSS Sanitizer

---

# 📚 Daftar Isi

- [1. Struktur Folder](#1-struktur-folder)
- [2. Environment Variables](#2-environment-variables)
- [3. Database Schema](#3-database-schema)
- [4. Auth - Cara Kerja](#4-auth---cara-kerja)
  - [4.1 Bcrypt - Hash Password](#41-bcrypt---hash-password)
  - [4.2 JWT - Access Token](#42-jwt---access-token)
  - [4.3 Auto Sync Guest ke User](#43-auto-sync-guest-ke-user)
- [5. Middleware](#5-middleware)
  - [5.1 guestOrAuth Middleware](#51-guestorauth-middleware)
  - [5.2 validate Middleware](#52-validate-middleware)
- [6. Setup Postman](#6-setup-postman)
- [7. API Reference](#7-api-reference)
  - [POST /auth/register](#post-authregister)
  - [POST /auth/login](#post-authlogin)
- [8. Alur Lengkap](#8-alur-lengkap)
- [9. Testing dengan Collection Runner](#9-testing-dengan-collection-runner)

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
````

---

# 2. Environment Variables

Salin file `.env.example` menjadi `.env`, lalu isi nilainya.

```env
PORT=5000
DATABASE_URL=postgresql://user:password@host:5432/bento_db
JWT_SECRET=ganti_dengan_string_random_panjang
```

| Variable       | Contoh                 | Keterangan                   |
| -------------- | ---------------------- | ---------------------------- |
| `PORT`         | `5000`                 | Port server                  |
| `DATABASE_URL` | `postgresql://...`     | Connection string PostgreSQL |
| `JWT_SECRET`   | `random-secret-string` | Secret key untuk JWT         |

> ⚠️ Jangan pernah commit file `.env` ke GitHub.

---

# 3. Database Schema

## Tabel `users`

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),

  max_energy INTEGER DEFAULT 240,
  current_energy INTEGER DEFAULT 240,
  energy_reset_at TIMESTAMP DEFAULT NOW(),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);
```

| Kolom             | Tipe           | Keterangan                  |
| ----------------- | -------------- | --------------------------- |
| `id`              | UUID           | Primary key                 |
| `email`           | VARCHAR(255)   | Email unik user             |
| `password_hash`   | VARCHAR(255)   | Password yang sudah di-hash |
| `display_name`    | VARCHAR(100)   | Nama tampilan user          |
| `max_energy`      | INTEGER        | Maksimal energi             |
| `current_energy`  | INTEGER        | Energi saat ini             |
| `energy_reset_at` | TIMESTAMP      | Waktu reset energi          |
| `created_at`      | TIMESTAMP      | Waktu akun dibuat           |
| `updated_at`      | TIMESTAMP      | Waktu terakhir update       |
| `deleted_at`      | TIMESTAMP NULL | Soft delete                 |

---

# 4. Auth - Cara Kerja

## 4.1 Bcrypt - Hash Password

Bcrypt digunakan untuk mengubah password menjadi hash sebelum disimpan ke database.

Password tidak pernah disimpan dalam bentuk plain text.

### Saat Register

```js
const password_hash = await bcrypt.hash(data.password, 10);
```

### Saat Login

```js
const isMatch = await bcrypt.compare(
  password,
  user.password_hash
);
```

## Kenapa menggunakan Bcrypt?

* Hash bersifat satu arah
* Password tidak bisa di-decrypt
* Memiliki salt otomatis
* Lebih tahan terhadap brute-force attack
* Password yang sama menghasilkan hash berbeda

---

## 4.2 JWT - Access Token

JWT digunakan sebagai access token untuk autentikasi user.

### Generate Token

```js
// utils/jwt.js

export const generateToken = (payload) => {
  return jwt.sign(
    {
      id: payload.id,
      email: payload.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};
```

---

## Struktur JWT

```text
header.payload.signature
```

### Payload JWT

```json
{
  "id": "uuid",
  "email": "user@mail.com",
  "iat": 1711111111,
  "exp": 1711715911
}
```

---

## Cara Mengirim Token

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

> JWT hanya ditandatangani (signed), bukan dienkripsi (encrypted).

---

## 4.3 Auto Sync Guest ke User

Ketika guest melakukan register atau login, task milik guest akan otomatis dipindahkan ke akun user.

---

## Alur Auto Sync

1. Guest membuat task menggunakan `guest_session_id`
2. Guest register/login menggunakan header `x-guest-session-token`
3. Backend mencari data guest berdasarkan session token
4. Semua task dipindahkan ke akun user

```sql
UPDATE tasks
SET user_id = user.id
WHERE guest_session_id = guest.id;
```

---

## Keuntungan Auto Sync

* Data task guest tidak hilang
* User experience lebih baik
* Transisi guest ke user lebih mulus

---

# 5. Middleware

## 5.1 `guestOrAuth` Middleware

Middleware ini mendukung dua jenis autentikasi:

1. JWT Authentication
2. Guest Session Authentication

```js
if (authHeader) {
  // Verifikasi JWT
  // Set req.identity sebagai user
} else if (guestToken) {
  // Verifikasi guest token
  // Set req.identity sebagai guest
} else {
  // Unauthorized
}
```

---

## Identity untuk User

```js
req.identity = {
  type: "user",
  user_id: "uuid",
  guest_session_id: null,
};
```

---

## Identity untuk Guest

```js
req.identity = {
  type: "guest",
  user_id: null,
  guest_session_id: "uuid",
};
```

---

## 5.2 `validate` Middleware

Middleware ini digunakan untuk validasi request menggunakan Zod.

```js
router.post(
  "/register",
  validate(registerSchema),
  controller.register
);
```

Jika validasi gagal:

```http
400 Bad Request
```

---

# 6. Setup Postman

## Environment Variables

| Variable      | Initial Value                  | Current Value                  |
| ------------- | ------------------------------ | ------------------------------ |
| `BASE_URL`    | `http://localhost:5000/api/v1` | `http://localhost:5000/api/v1` |
| `GUEST_TOKEN` | *(kosong)*                     | *(otomatis terisi)*            |
| `AUTH_TOKEN`  | *(kosong)*                     | *(otomatis terisi)*            |

---

## Auto Simpan Token

Tambahkan script berikut di tab **Tests**:

```js
const json = pm.response.json();

pm.environment.set(
  "AUTH_TOKEN",
  json.data.token
);
```

---

## Mengirim Token

```http
Authorization: Bearer {{AUTH_TOKEN}}
```

---

# 7. API Reference

## Base URL

```text
http://localhost:5000/api/v1
```

---

# POST `/auth/register`

Digunakan untuk membuat akun baru.

Jika terdapat header `x-guest-session-token`, maka task guest akan otomatis dipindahkan ke akun user.

---

## Request

### Method

```http
POST
```

### Endpoint

```http
/auth/register
```

---

## Headers

| Header                  | Wajib | Keterangan         |
| ----------------------- | ----- | ------------------ |
| `Content-Type`          | Ya    | `application/json` |
| `x-guest-session-token` | Tidak | Token guest        |

---

## Request Body

```json
{
  "email": "budi@kampus.ac.id",
  "password": "password123",
  "display_name": "Budi Santoso"
}
```

---

## Validasi Input

| Field          | Aturan                       |
| -------------- | ---------------------------- |
| `email`        | Wajib dan format email valid |
| `password`     | Wajib, minimal 6 karakter    |
| `display_name` | Wajib, minimal 3 karakter    |

---

## Response Success — `201 Created`

```json
{
  "success": true,
  "message": "Register berhasil. Data guest kamu sudah dipindahkan!",
  "data": {
    "user": {
      "id": "uuid",
      "email": "budi@kampus.ac.id",
      "display_name": "Budi Santoso",
      "current_energy": 240,
      "max_energy": 240
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "migrated_tasks_count": 3
  }
}
```

---

## Response Code

| Status Code | Keterangan            |
| ----------- | --------------------- |
| `201`       | Register berhasil     |
| `400`       | Input tidak valid     |
| `409`       | Email sudah digunakan |

---

# POST `/auth/login`

Digunakan untuk login menggunakan email dan password.

---

## Request

### Method

```http
POST
```

### Endpoint

```http
/auth/login
```

---

## Headers

| Header                  | Wajib | Keterangan         |
| ----------------------- | ----- | ------------------ |
| `Content-Type`          | Ya    | `application/json` |
| `x-guest-session-token` | Tidak | Token guest        |

---

## Request Body

```json
{
  "email": "budi@kampus.ac.id",
  "password": "password123"
}
```

---

## Response Success — `200 OK`

```json
{
  "success": true,
  "message": "Login berhasil.",
  "data": {
    "user": {},
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "migrated_tasks_count": 0
  }
}
```

---

## Response Code

| Status Code | Keterangan                |
| ----------- | ------------------------- |
| `200`       | Login berhasil            |
| `400`       | Input tidak valid         |
| `401`       | Email atau password salah |

---

# 8. Alur Lengkap

```text
1. Client POST /guest
2. Server mengembalikan guest session token

3. Client POST /tasks
4. Task disimpan sebagai task guest

5. Client GET /tasks
6. Verifikasi task guest

7. Client POST /auth/register
8. Sertakan x-guest-session-token

9. Backend memindahkan task guest
10. JWT token dikembalikan

11. Client GET /tasks
12. Gunakan Authorization: Bearer <token>
```

---

# 9. Testing dengan Collection Runner

## Folder

```text
2. USER AUTHENTICATION
```

| No | Request                                  | Ekspektasi                   |
| -- | ---------------------------------------- | ---------------------------- |
| 1  | `POST /auth/register` tanpa guest        | `201`, migrated count = `0`  |
| 2  | `POST /auth/register` dengan guest token | `201`, migrated count > `0`  |
| 3  | `POST /auth/login` normal                | `200`, mendapatkan token     |
| 4  | `POST /auth/login` dengan guest token    | `200`, migrated count >= `0` |

---

# ✅ Catatan

* Password tidak pernah disimpan dalam bentuk plain text
* JWT expired dalam `7 hari`
* Task guest otomatis dipindahkan ke akun user
* Validasi menggunakan Zod
* Struktur API mengikuti prinsip RESTful
* Arsitektur middleware modular dan scalable

