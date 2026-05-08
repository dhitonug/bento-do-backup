# Dokumentasi REST API - Validation & Error Handling

Stack yang digunakan:

* Express.js v5
* Zod

---

# 📚 Daftar Isi

* [1. Overview](#1-overview)
* [2. Validasi Input](#2-validasi-input)

  * [2.1 Tasks - Create](#21-tasks---create)
  * [2.2 Tasks - Update](#22-tasks---update)
  * [2.3 Tasks - Params](#23-tasks---params)
  * [2.4 Tasks - Query](#24-tasks---query)
  * [2.5 Auth - Register](#25-auth---register)
  * [2.6 Auth - Login](#26-auth---login)
* [3. Error Response Format](#3-error-response-format)
* [4. Daftar Error](#4-daftar-error)

  * [4.1 400 Bad Request](#41-400-bad-request)
  * [4.2 401 Unauthorized](#42-401-unauthorized)
  * [4.3 404 Not Found](#43-404-not-found)
  * [4.4 409 Conflict](#44-409-conflict)
  * [4.5 500 Internal Server Error](#45-500-internal-server-error)
* [5. Testing dengan Collection Runner](#5-testing-dengan-collection-runner)

---

# 1. Overview

Dokumentasi ini menjelaskan seluruh validasi input dan error handling yang digunakan pada Bento-Do API.

Semua endpoint menggunakan format response yang konsisten agar mudah diproses oleh frontend maupun Postman testing.

---

# 2. Validasi Input

## 2.1 Tasks - Create

| Field             | Aturan                               | Error Jika                         |
| ----------------- | ------------------------------------ | ---------------------------------- |
| `title`           | Wajib, 3-255 karakter                | Kosong atau kurang dari 3 karakter |
| `energy_weight`   | Wajib, enum: Ringan / Sedang / Berat | Nilai di luar enum                 |
| `deadline`        | Opsional, format ISO 8601            | Format tidak valid                 |
| `source_template` | Opsional, maksimal 100 karakter      | Lebih dari 100 karakter            |

---

## 2.2 Tasks - Update

| Field           | Aturan                                       | Error Jika             |
| --------------- | -------------------------------------------- | ---------------------- |
| `title`         | Opsional, 3-255 karakter                     | Kurang dari 3 karakter |
| `energy_weight` | Opsional, enum: Ringan / Sedang / Berat      | Nilai di luar enum     |
| `status`        | Opsional, enum: pending / in_progress / done | Nilai di luar enum     |
| `deadline`      | Opsional, nullable, format ISO 8601          | Format tidak valid     |

---

## 2.3 Tasks - Params

| Field | Aturan             | Error Jika       |
| ----- | ------------------ | ---------------- |
| `id`  | Wajib, format UUID | Bukan UUID valid |

---

## 2.4 Tasks - Query

| Field   | Aturan                                  | Error Jika                     |
| ------- | --------------------------------------- | ------------------------------ |
| `page`  | Opsional, integer minimal 1             | Bukan angka atau kurang dari 1 |
| `limit` | Opsional, integer minimal 1 maksimal 50 | Di luar range 1-50             |

---

## 2.5 Auth - Register

| Field          | Aturan                                           | Error Jika                        |
| -------------- | ------------------------------------------------ | --------------------------------- |
| `email`        | Wajib, format email valid                        | Format email salah                |
| `password`     | Wajib, minimal 6 karakter, maksimal 100 karakter | Kurang dari 6 atau lebih dari 100 |
| `display_name` | Wajib, minimal 3 karakter, maksimal 50 karakter  | Kurang dari 3 atau lebih dari 50  |

---

## 2.6 Auth - Login

| Field      | Aturan                    | Error Jika             |
| ---------- | ------------------------- | ---------------------- |
| `email`    | Wajib, format email valid | Format email salah     |
| `password` | Wajib, minimal 6 karakter | Kurang dari 6 karakter |

---

# 3. Error Response Format

Semua endpoint error menggunakan format berikut:

```json id="w9d9ks"
{
  "success": false,
  "message": "Pesan error yang jelas"
}
```

---

# 4. Daftar Error

## 4.1 400 Bad Request

| Kondisi               | Pesan                                                 |
| --------------------- | ----------------------------------------------------- |
| Input title kosong    | `Judul tugas minimal 3 karakter!`                     |
| energy_weight invalid | `Bobot energi harus Ringan, Sedang, atau Berat!`      |
| status invalid        | `Status hanya boleh pending, in_progress, atau done!` |
| deadline invalid      | `Format deadline harus ISO 8601!`                     |
| UUID invalid          | `Format Task ID harus UUID yang valid!`               |
| page invalid          | `Page harus bilangan bulat!`                          |
| limit invalid         | `Limit minimal 1!`                                    |

---

## 4.2 401 Unauthorized

| Kondisi             | Pesan                                          |
| ------------------- | ---------------------------------------------- |
| Tanpa auth header   | `Authorization atau guest session dibutuhkan!` |
| JWT invalid         | `Token tidak valid!`                           |
| Guest token invalid | `Guest session tidak valid!`                   |
| Format bearer salah | `Format token harus Bearer token!`             |
| Token kosong        | `Token tidak ditemukan!`                       |

---

## 4.3 404 Not Found

| Kondisi                  | Pesan                       |
| ------------------------ | --------------------------- |
| Task tidak ditemukan     | `Tugas tidak ditemukan!`    |
| Endpoint tidak ditemukan | `Endpoint tidak ditemukan!` |
| Email tidak ditemukan    | `Email tidak ditemukan!`    |

---

## 4.4 409 Conflict

| Kondisi               | Pesan                    |
| --------------------- | ------------------------ |
| Email sudah terdaftar | `Email sudah digunakan!` |

---

## 4.5 500 Internal Server Error

| Kondisi             | Pesan                            |
| ------------------- | -------------------------------- |
| Error tidak terduga | `Terjadi kesalahan pada server.` |

---

# 5. Testing dengan Collection Runner

## Folder `4. VALIDATION & ERRORS`

| No | Request                             | Ekspektasi                       |
| -- | ----------------------------------- | -------------------------------- |
| 1  | `GET /tasks` tanpa header           | `401`, authorization dibutuhkan  |
| 2  | `GET /tasks` guest token invalid    | `401`, guest session tidak valid |
| 3  | `GET /tasks` JWT invalid            | `401`, token tidak valid         |
| 4  | `POST /tasks` body kosong           | `400`, validasi title gagal      |
| 5  | `POST /tasks` energy_weight invalid | `400`, enum invalid              |
| 6  | `GET /tasks/:id` UUID invalid       | `400`, UUID invalid              |
| 7  | `GET /tasks/:id` task tidak ada     | `404`, task tidak ditemukan      |
| 8  | `GET /endpoint-tidak-ada`           | `404`, endpoint tidak ditemukan  |

---

# Dokumentasi REST API - Complex Scenarios

Stack yang digunakan:

* Express.js v5
* PostgreSQL
* JWT
* UUID

---

# 📚 Daftar Isi

* [1. Overview](#1-overview-1)
* [2. Scenario 1: Guest Mode - Data Persistence](#2-scenario-1-guest-mode---data-persistence)
* [3. Scenario 2: Guest Upgrade to User - Auto Sync](#3-scenario-2-guest-upgrade-to-user---auto-sync)
* [4. Testing dengan Collection Runner](#4-testing-dengan-collection-runner-1)

---

# 1. Overview

Dokumentasi ini menjelaskan skenario kompleks yang menguji integrasi antar modul pada Bento-Do API.

Skenario meliputi:

1. Guest data persistence
2. Auto sync guest menjadi user

---

# 2. Scenario 1: Guest Mode - Data Persistence

## Tujuan

Membuktikan bahwa data guest tetap tersimpan di database meskipun browser atau tab ditutup.

Data guest tidak disimpan di localStorage browser, melainkan di database server.

---

## Alur

1. Client membuat guest session baru
2. Client membuat 3 task sebagai guest
3. Client menyimpan `session_token`
4. Simulasi tab tertutup dilakukan
5. Client menggunakan token yang sama untuk GET tasks
6. Data task masih tersedia

---

## Verifikasi

### Request

```http id="zcv2u4"
GET /tasks
```

### Header

```http id="n6w0pj"
x-guest-session-token: <token_guest>
```

### Expected Response

```text id="rgrn5o"
200 OK
total_items >= 3
```

---

## Hasil yang Diharapkan

* Tasks tetap tersimpan setelah simulasi tab tertutup
* Data guest tidak hilang
* Guest token tetap valid sampai di-sync atau dihapus

---

# 3. Scenario 2: Guest Upgrade to User - Auto Sync

## Tujuan

Membuktikan bahwa tasks guest otomatis berpindah ke akun user saat register atau login.

---

## Alur

1. Client membuat guest session baru
2. Client membuat 2 task sebagai guest
3. Client register menggunakan guest token
4. Backend melakukan auto sync
5. `migrated_tasks_count = 2`
6. Client login sebagai user
7. Client GET tasks sebagai user
8. Tasks sudah menjadi milik user

---

## Verifikasi Register

### Request

```http id="drt2ho"
POST /auth/register
```

### Header

```http id="z7s8qf"
x-guest-session-token: <token_guest>
```

### Body

```json id="3m2v2v"
{
  "email": "user@example.com",
  "password": "password123",
  "display_name": "Budi"
}
```

### Expected Response

```text id="2ig38u"
201 Created
migrated_tasks_count = 2
```

---

## Verifikasi Tasks Berpindah

### Request

```http id="m0hn5r"
GET /tasks
```

### Header

```http id="g2p6gl"
Authorization: Bearer <jwt_token>
```

### Expected Response

```text id="qqehm8"
200 OK
total_items = 2
user_id terisi
guest_session_id null
```

---

## Hasil yang Diharapkan

* Register berhasil
* Tasks guest otomatis dipindahkan
* `migrated_tasks_count` sesuai jumlah task guest
* `guest_session_id` menjadi null
* `user_id` terisi

---

# 4. Testing dengan Collection Runner

## Folder `5. COMPLEX SCENARIOS`

---

## 5.1 Guest Mode - Data Persistence

| No | Request                | Ekspektasi                       |
| -- | ---------------------- | -------------------------------- |
| 1  | `POST /guest`          | `201`, mendapatkan session token |
| 2  | `POST /tasks` guest ×3 | `201`, berhasil membuat 3 tasks  |
| 3  | `GET /tasks` guest     | `200`, total_items >= 3          |

---

## 5.2 Guest Upgrade to User - Auto Sync

| No | Request                             | Ekspektasi                       |
| -- | ----------------------------------- | -------------------------------- |
| 1  | `POST /guest`                       | `201`, mendapatkan session token |
| 2  | `POST /tasks` guest ×2              | `201`, berhasil membuat 2 tasks  |
| 3  | `POST /auth/register` + guest token | `201`, migrated_count = 2        |
| 4  | `POST /auth/login`                  | `200`, mendapatkan JWT           |
| 5  | `GET /tasks` user                   | `200`, tasks berhasil berpindah  |

---

# ✅ Kesimpulan

* Guest mode mendukung data persistence
* Tasks guest dapat di-sync otomatis ke akun user
* Session guest tetap aman menggunakan UUID token
* Sistem mendukung transisi seamless dari guest ke authenticated user
* Integrasi antar modul berjalan konsisten dan terisolasi dengan baik
