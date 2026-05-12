# Dokumentasi REST API - Tasks

Stack yang digunakan:

* Express.js v5
* PostgreSQL
* JWT
* Zod

---

# 📚 Daftar Isi

* [1. Struktur Folder](#1-struktur-folder)
* [2. Environment Variables](#2-environment-variables)
* [3. Database Schema](#3-database-schema)
* [4. Authentication](#4-authentication)
* [5. Middleware](#5-middleware)

  * [5.1 guestOrAuth Middleware](#51-guestorauth-middleware)
  * [5.2 validate Middleware](#52-validate-middleware)
* [6. Setup Postman](#6-setup-postman)
* [7. API Reference](#7-api-reference)

  * [GET /tasks](#get-tasks)
  * [POST /tasks](#post-tasks)
  * [GET /tasks/:id](#get-tasksid)
  * [PUT /tasks/:id](#put-tasksid)
  * [DELETE /tasks/:id](#delete-tasksid)
* [8. Error Handling](#8-error-handling)
* [9. Testing dengan Collection Runner](#9-testing-dengan-collection-runner)

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
JWT_SECRET=ganti_dengan_string_random_panjang
```

| Variable       | Contoh                 | Keterangan                   |
| -------------- | ---------------------- | ---------------------------- |
| `PORT`         | `5000`                 | Port server                  |
| `DATABASE_URL` | `postgresql://...`     | Connection string PostgreSQL |
| `JWT_SECRET`   | `random-secret-string` | Secret key JWT               |

---

# 3. Database Schema

## Tabel `tasks`

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NULL REFERENCES users(id),
  guest_session_id UUID NULL REFERENCES guest_sessions(id),

  title VARCHAR(255) NOT NULL,

  energy_weight VARCHAR(20)
  CHECK (energy_weight IN ('Ringan','Sedang','Berat')),

  deadline TIMESTAMP NULL,

  status VARCHAR(30) DEFAULT 'pending'
  CHECK (status IN ('pending','in_progress','done')),

  completed_at TIMESTAMP NULL,

  used_timer BOOLEAN DEFAULT FALSE,
  timer_duration INTEGER NULL,

  source_template VARCHAR(100) NULL,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);
```

| Kolom              | Tipe           | Keterangan                   |
| ------------------ | -------------- | ---------------------------- |
| `id`               | UUID           | Primary key                  |
| `user_id`          | UUID           | FK users (null untuk guest)  |
| `guest_session_id` | UUID           | FK guest_sessions            |
| `title`            | VARCHAR(255)   | Judul tugas                  |
| `energy_weight`    | VARCHAR(20)    | Ringan / Sedang / Berat      |
| `deadline`         | TIMESTAMP      | Deadline task                |
| `status`           | VARCHAR(30)    | pending / in_progress / done |
| `completed_at`     | TIMESTAMP      | Waktu task selesai           |
| `used_timer`       | BOOLEAN        | Apakah menggunakan timer     |
| `timer_duration`   | INTEGER        | Durasi timer                 |
| `source_template`  | VARCHAR(100)   | Template asal                |
| `created_at`       | TIMESTAMP      | Waktu dibuat                 |
| `updated_at`       | TIMESTAMP      | Waktu update                 |
| `deleted_at`       | TIMESTAMP NULL | Soft delete                  |

---

# 4. Authentication

Semua endpoint Tasks membutuhkan salah satu header berikut:

| Tipe  | Header                         | Didapat dari                             |
| ----- | ------------------------------ | ---------------------------------------- |
| Guest | `x-guest-session-token: token` | `POST /guest`                            |
| User  | `Authorization: Bearer jwt`    | `POST /auth/login` atau `/auth/register` |

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

## 5.2 `validate` Middleware

Middleware digunakan untuk validasi request menggunakan Zod.

```js
router.post(
  "/",
  validate(createTaskSchema),
  controller.createTask
);
```

---

# 6. Setup Postman

## Environment Variables

| Variable      | Initial Value                  | Current Value                  |
| ------------- | ------------------------------ | ------------------------------ |
| `BASE_URL`    | `http://localhost:5000/api/v1` | `http://localhost:5000/api/v1` |
| `GUEST_TOKEN` | *(kosong)*                     | *(otomatis terisi)*            |
| `AUTH_TOKEN`  | *(kosong)*                     | *(otomatis terisi)*            |
| `TASK_ID`     | *(kosong)*                     | *(otomatis terisi)*            |

---

## Auto Simpan TASK_ID

Tambahkan script berikut pada tab **Tests** di request `POST /tasks`.

```js
const json = pm.response.json();

pm.environment.set(
  "TASK_ID",
  json.data.id
);
```

---

## Mengirim Guest Token

```http
x-guest-session-token: {{GUEST_TOKEN}}
```

---

## Mengirim JWT Token

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

# GET `/tasks`

Digunakan untuk mendapatkan daftar tasks dengan pagination.

---

## Request

### Method

```http
GET
```

### Endpoint

```http
/tasks?page=1&limit=20
```

### Headers

```text
(Auth Header)
```

---

## Query Parameters

| Param   | Default | Max  | Keterangan              |
| ------- | ------- | ---- | ----------------------- |
| `page`  | `1`     | -    | Nomor halaman           |
| `limit` | `20`    | `50` | Jumlah item per halaman |

---

## Response Success — `200 OK`

```json
{
  "success": true,
  "page": 1,
  "limit": 20,
  "total_items": 5,
  "total_pages": 1,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "guest_session_id": "uuid",
      "title": "Makalah Filsafat",
      "energy_weight": "Berat",
      "deadline": "2024-12-25T23:59:59.000Z",
      "status": "pending",
      "source_template": "Tugas Makalah",
      "created_at": "2026-05-08T00:00:00.000Z",
      "updated_at": "2026-05-08T00:00:00.000Z"
    }
  ]
}
```

---

# POST `/tasks`

Digunakan untuk membuat task baru.

---

## Request

### Method

```http
POST
```

### Endpoint

```http
/tasks
```

### Headers

| Header                                    | Keterangan         |
| ----------------------------------------- | ------------------ |
| `Content-Type`                            | `application/json` |
| `Authorization` / `x-guest-session-token` | Auth header        |

---

## Request Body

```json
{
  "title": "UAS Statistik",
  "energy_weight": "Berat",
  "deadline": "2024-12-15T08:00:00.000Z",
  "source_template": "Tugas Makalah"
}
```

---

## Validasi Input

| Field             | Aturan                  |
| ----------------- | ----------------------- |
| `title`           | Wajib, 3-255 karakter   |
| `energy_weight`   | Ringan / Sedang / Berat |
| `deadline`        | Format ISO 8601         |
| `source_template` | Maksimal 100 karakter   |

---

## Energy Weight

| Value    | Keterangan            |
| -------- | --------------------- |
| `Ringan` | Menggunakan 15 energi |
| `Sedang` | Menggunakan 30 energi |
| `Berat`  | Menggunakan 60 energi |

---

## Response Success — `201 Created`

```json
{
  "success": true,
  "message": "Tugas berhasil ditambahkan.",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "guest_session_id": "uuid",
    "title": "UAS Statistik",
    "energy_weight": "Berat",
    "deadline": "2024-12-15T08:00:00.000Z",
    "status": "pending",
    "source_template": "Tugas Makalah",
    "created_at": "2026-05-08T00:00:00.000Z"
  }
}
```

---

# GET `/tasks/:id`

Digunakan untuk mendapatkan detail task.

---

## Response Success — `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "guest_session_id": "uuid",
    "title": "UAS Statistik",
    "energy_weight": "Berat",
    "deadline": "2024-12-15T08:00:00.000Z",
    "status": "in_progress",
    "used_timer": true,
    "timer_duration": 25,
    "source_template": null,
    "completed_at": null,
    "created_at": "2026-05-08T00:00:00.000Z",
    "updated_at": "2026-05-08T00:00:00.000Z"
  }
}
```

---

# PUT `/tasks/:id`

Digunakan untuk memperbarui task.

Semua field bersifat opsional.

---

## Request Body

```json
{
  "title": "Judul baru",
  "energy_weight": "Sedang",
  "status": "done",
  "deadline": "2024-12-30T23:59:59.000Z"
}
```

---

## Status Values

| Value         | Keterangan        |
| ------------- | ----------------- |
| `pending`     | Belum dikerjakan  |
| `in_progress` | Sedang dikerjakan |
| `done`        | Selesai           |

---

## Response Success — `200 OK`

```json
{
  "success": true,
  "message": "Tugas berhasil diperbarui.",
  "data": {
    "id": "uuid",
    "title": "Judul baru",
    "energy_weight": "Sedang",
    "deadline": "2024-12-30T23:59:59.000Z",
    "status": "done",
    "source_template": null,
    "updated_at": "2026-05-08T00:00:00.000Z"
  }
}
```

---

# DELETE `/tasks/:id`

Digunakan untuk soft delete task.

Data tetap tersimpan di database.

---

## Response Success — `200 OK`

```json
{
  "success": true,
  "message": "Tugas berhasil dipindahkan ke tempat sampah."
}
```

---

## Catatan Soft Delete

* Data tidak benar-benar dihapus
* Kolom `deleted_at` akan diisi timestamp
* Endpoint `GET /tasks` tidak menampilkan task yang sudah dihapus

---

# 8. Error Handling

| Kode  | Pesan                                       | Penyebab                    |
| ----- | ------------------------------------------- | --------------------------- |
| `400` | Pesan validasi Zod                          | Input tidak valid           |
| `400` | Format Task ID harus UUID valid             | ID bukan UUID               |
| `401` | Authorization atau guest session dibutuhkan | Tidak ada auth header       |
| `401` | Token tidak valid                           | JWT invalid                 |
| `401` | Guest session tidak valid                   | Guest token tidak ditemukan |
| `404` | Tugas tidak ditemukan                       | Task tidak ada              |
| `500` | Terjadi kesalahan pada server               | Internal server error       |

---

# 9. Testing dengan Collection Runner

## Folder `1. GUEST MODE`

| No | Request                      | Ekspektasi                       |
| -- | ---------------------------- | -------------------------------- |
| 1  | `POST /guest`                | `201`, mendapatkan session token |
| 2  | `POST /tasks` guest          | `201`, task berhasil dibuat      |
| 3  | `GET /tasks?page=1&limit=3`  | `200`, maksimal 3 item           |
| 4  | `GET /tasks/:id`             | `200`, detail task               |
| 5  | `PUT /tasks/:id` status done | `200`, task updated              |
| 6  | `DELETE /tasks/:id`          | `200`, soft delete berhasil      |

---

## Folder `3. USER MODE`

| No | Request                     | Ekspektasi                    |
| -- | --------------------------- | ----------------------------- |
| 1  | `POST /tasks` user          | `201`, task berhasil dibuat   |
| 2  | `POST /tasks` template      | `201`, source_template terisi |
| 3  | `GET /tasks?page=1&limit=3` | `200`, maksimal 3 item        |
| 4  | `GET /tasks/:id`            | `200`, detail task            |
| 5  | `PUT /tasks/:id`            | `200`, task berhasil diupdate |
| 6  | `DELETE /tasks/:id`         | `200`, task berhasil dihapus  |

---

# ✅ Catatan

* Mendukung guest dan authenticated user
* Menggunakan pagination
* Soft delete enabled
* Validasi menggunakan Zod
* JWT authentication untuk user
* Guest token authentication untuk guest
* Struktur API mengikuti prinsip RESTful
