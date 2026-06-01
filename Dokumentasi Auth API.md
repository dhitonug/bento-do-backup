# 🔐 Dokumentasi REST API — Auth Bento-do

> Stack: Express.js · PostgreSQL (Neon) · JWT · Bcrypt · Zod · CORS · Helmet · Cookie Parser · XSS Sanitizer

---

## 📚 Daftar Isi

1. [Overview](#1-overview)
2. [Struktur Folder](#2-struktur-folder)
3. [Environment Variables](#3-environment-variables)
4. [Auth — Cara Kerja](#4-auth--cara-kerja)
   - [4.1 Register](#41-register)
   - [4.2 Login](#42-login)
   - [4.3 JWT Token](#43-jwt-token)
   - [4.4 Auth Middleware](#44-auth-middleware)
   - [4.5 Guest Migration](#45-guest-migration)
5. [Setup Postman](#5-setup-postman)
6. [API Reference](#6-api-reference)
   - [6.1 Register](#61-register)
   - [6.2 Login](#62-login)
7. [Alur Lengkap Auth](#7-alur-lengkap-auth)
8. [Status Code yang Umum Dipakai](#8-status-code-yang-umum-dipakai)
9. [Catatan Penting](#9-catatan-penting)

---

## 1. Overview

Module Auth Bento-do bertugas untuk:

- 📝 mendaftarkan user baru
- 🔑 login user lama
- 🪪 menghasilkan JWT token
- 🔄 memigrasikan task guest ke akun user saat register/login
- 🛡️ melindungi endpoint private dengan Bearer Token

Bento-do menggunakan pendekatan **JWT di response body**, lalu token dikirim ulang oleh client lewat header:

```text
Authorization: Bearer <token>
````

Base URL lokal:

```text
http://localhost:5000/api/v1/auth
```

---

## 2. Struktur Folder

```text
src/
├── middlewares/
│   └── auth.middleware.js
├── modules/
│   └── auth/
│       ├── auth.controller.js
│       ├── auth.service.js
│       ├── auth.repository.js
│       ├── auth.routes.js
│       └── auth.validation.js
└── utils/
    └── jwt.js
```

---

## 3. Environment Variables

Salin `.env.example` ke `.env`, lalu isi minimal seperti ini:

```env
PORT=5000
DATABASE_URL=your_neon_database_url
JWT_SECRET=your_super_secret_key
JWT_EXPIRES=7d
CLIENT_ORIGINS=http://localhost:5173
DB_SSL=true
DB_POOL_MAX=10
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=10000
```

> ⚠️ Jangan commit file `.env` ke GitHub.

---

## 4. Auth — Cara Kerja

### 4.1 Register

Saat user register:

1. email dinormalisasi menjadi lowercase
2. backend mengecek apakah email sudah dipakai
3. password di-hash dengan `bcrypt`
4. user baru disimpan ke database
5. JWT token dibuat
6. jika ada guest session aktif, task guest dipindahkan ke akun user

---

### 4.2 Login

Saat user login:

1. backend mencari user berdasarkan email
2. password dibandingkan dengan hash di database
3. jika cocok, JWT token dibuat
4. jika ada guest session aktif, task guest dipindahkan ke akun user

---

### 4.3 JWT Token

Token dibuat melalui `utils/jwt.js` dan dipakai untuk autentikasi endpoint private.

Payload token minimal berisi:

* `id`
* `email`

Contoh penggunaan dari client:

```text
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

### 4.4 Auth Middleware

Middleware auth memeriksa header:

```text
Authorization: Bearer <token>
```

Kalau token valid:

* backend mengisi `req.user`
* request boleh lanjut ke controller

Kalau token tidak ada / salah / expired:

* backend mengembalikan `401 Unauthorized`

Contoh data user yang diinject ke request:

```json
{
  "id": "user-uuid",
  "email": "user@example.com"
}
```

---

### 4.5 Guest Migration

Salah satu fitur penting Bento-do adalah **Guest Mode**.
Kalau user sudah membuat task sebagai guest, lalu register/login, task guest bisa otomatis dipindahkan ke akun user.

Header yang dipakai saat migration:

```text
x-guest-session-token: <guest_session_token>
```

Hasil migration ditandai dengan field:

```json
{
  "migrated_tasks_count": 1
}
```

---

## 5. Setup Postman

### 5.1 Buat Environment

Buat environment baru, misalnya:

**Bento-do Local**

Isi variabel:

```text
base_url = http://localhost:5000/api/v1
token_user =
token_user_2 =
guest_session_token =
user_id =
user_id_2 =
```

---

### 5.2 Auto Save Token Setelah Register/Login

Di tab **Tests** request register/login, tempel script ini:

```javascript
const json = pm.response.json();

pm.environment.set("token_user", json.data.token);
pm.environment.set("user_id", json.data.user.id);
```

Untuk user kedua:

```javascript
const json = pm.response.json();

pm.environment.set("token_user_2", json.data.token);
pm.environment.set("user_id_2", json.data.user.id);
```

---

### 5.3 Pakai Token di Request Protected

Untuk endpoint private, isi header:

```text
Authorization: Bearer {{token_user}}
```

Atau di tab **Authorization** → **Bearer Token**:

```text
{{token_user}}
```

---

## 6. API Reference

---

## 6.1 Register

### `POST /api/v1/auth/register`

Mendaftarkan user baru.

### Headers

```text
Content-Type: application/json
```

### Body

```json
{
  "email": "fulltest.user1@example.com",
  "password": "password123",
  "display_name": "Full Test User 1"
}
```

### Response `201`

```json
{
  "success": true,
  "message": "Register berhasil.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "fulltest.user1@example.com",
      "display_name": "Full Test User 1",
      "current_energy": 240,
      "max_energy": 240,
      "created_at": "2026-05-12T06:25:22.422Z"
    },
    "token": "jwt-token",
    "migrated_tasks_count": 0
  }
}
```

---

### Register + Guest Migration

Kalau user register sambil membawa session guest:

#### Headers

```text
x-guest-session-token: {{guest_session_token}}
Content-Type: application/json
```

#### Body

```json
{
  "email": "fulltest.guestmigrate@example.com",
  "password": "password123",
  "display_name": "Guest Migrated User"
}
```

#### Response `201`

```json
{
  "success": true,
  "message": "Register berhasil. Data guest kamu sudah dipindahkan!",
  "data": {
    "user": {
      "id": "uuid",
      "email": "fulltest.guestmigrate@example.com",
      "display_name": "Guest Migrated User",
      "current_energy": 240,
      "max_energy": 240,
      "created_at": "timestamp"
    },
    "token": "jwt-token",
    "migrated_tasks_count": 1
  }
}
```

---

## 6.2 Login

### `POST /api/v1/auth/login`

Login user lama.

### Headers

```text
Content-Type: application/json
```

### Body

```json
{
  "email": "fulltest.user1@example.com",
  "password": "password123"
}
```

### Response `200`

```json
{
  "success": true,
  "message": "Login berhasil.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "fulltest.user1@example.com",
      "display_name": "Full Test User 1",
      "current_energy": 240,
      "max_energy": 240,
      "created_at": "timestamp"
    },
    "token": "jwt-token",
    "migrated_tasks_count": 0
  }
}
```

---

### Login + Guest Migration

#### Headers

```text
x-guest-session-token: {{guest_session_token}}
Content-Type: application/json
```

#### Body

```json
{
  "email": "fulltest.user1@example.com",
  "password": "password123"
}
```

#### Response `200`

```json
{
  "success": true,
  "message": "Login berhasil. Data guest kamu sudah dipindahkan!",
  "data": {
    "user": {
      "id": "uuid",
      "email": "fulltest.user1@example.com",
      "display_name": "Full Test User 1"
    },
    "token": "jwt-token",
    "migrated_tasks_count": 1
  }
}
```

---

## 7. Alur Lengkap Auth

```text
1. Client kirim POST /api/v1/auth/register atau /api/v1/auth/login
        ↓
2. Controller menerima body request
        ↓
3. Validation middleware memeriksa payload
        ↓
4. Service:
   - normalize email
   - register: hash password
   - login: compare password
   - cek guest session jika ada
   - migrasikan task guest ke user
        ↓
5. utils/jwt.js membuat token JWT
        ↓
6. Controller mengirim response:
   - user object
   - token
   - migrated_tasks_count
        ↓
7. Client menyimpan token
        ↓
8. Client akses protected route dengan header Authorization: Bearer <token>
        ↓
9. authMiddleware memverifikasi token
        ↓
10. req.user terisi dan request lanjut
```

---

## 8. Status Code yang Umum Dipakai

| Status Code | Arti                                        |
| ----------- | ------------------------------------------- |
| `200`       | Login berhasil                              |
| `201`       | Register berhasil                           |
| `400`       | Payload tidak valid                         |
| `401`       | Email/password salah atau token tidak valid |
| `409`       | Email sudah digunakan                       |

---

## 9. Catatan Penting

### ✅ Yang sudah diverifikasi saat testing

* Register user berhasil
* Login user berhasil
* Duplicate email ditolak
* Invalid password ditolak
* JWT token bisa dipakai untuk endpoint protected
* Guest migration saat register berhasil
* Guest migration saat login berhasil

### ⚠️ Catatan implementasi

* Auth Bento-do saat ini memakai **JWT Bearer token**
* Token dikirim lewat **response body**, bukan cookie
* Guest migration diuji berhasil memakai header:

```text
x-guest-session-token: <guest_token>
```

### 🧪 Folder Postman terkait auth

```text
03 - Auth
├── 03.1 - Register User 1
├── 03.2 - Login User 1
├── 03.3 - Register User 2
├── 03.4 - Login User 2
├── 03.5 - Register Guest Migration User
├── 03.6 - Login Invalid Password
└── 03.7 - Register Duplicate Email
```

### ✅ Status akhir

Module **Auth** sudah berhasil diuji dan **pass** dalam full integration testing.

---

## Tambahan: Forgot Password & Reset Password

Auth sekarang bisa menangani lupa password tanpa Firebase.

Flow yang dipakai:

1. User meminta link reset password lewat email.
2. Backend membuat reset token acak yang berlaku singkat.
3. Backend menyimpan hash token ke database, bukan token mentah.
4. Link reset dikirim ke email user.
5. Frontend mengirim password baru dengan header `Authorization: Bearer <reset_token>`.
6. Backend mengganti `users.password_hash`, lalu token reset ditandai sudah dipakai.

### `POST /api/v1/auth/forgot-password`

Request:

```json
{
  "email": "user@example.com"
}
```

Response selalu generik supaya email terdaftar tidak bisa ditebak:

```json
{
  "success": true,
  "message": "Jika email terdaftar, link reset password sudah dikirim."
}
```

### `POST /api/v1/auth/reset-password`

Headers:

```text
Authorization: Bearer <reset_token>
Content-Type: application/json
```

Request:

```json
{
  "new_password": "passwordBaru123"
}
```

Response:

```json
{
  "success": true,
  "message": "Password berhasil direset. Silakan login kembali."
}
```

### Environment untuk Email Reset Password

```env
FRONTEND_URL=http://localhost:5173
PASSWORD_RESET_URL=http://localhost:5173/reset-password
PASSWORD_RESET_EXPIRES_MINUTES=15

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=email_kamu@gmail.com
EMAIL_PASS=app_password_kamu
EMAIL_FROM="Bento-do <email_kamu@gmail.com>"
```

Jika SMTP belum diisi saat development, email akan dicetak ke console lewat `EMAIL_DEV_LOG=true`.
