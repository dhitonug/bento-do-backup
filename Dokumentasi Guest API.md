
# 👤 Dokumentasi REST API — Guest Bento-do

> Stack: Express.js · PostgreSQL (Neon) · UUID · Zod · JWT · Guest Session Token

---

## 📚 Daftar Isi

1. [Overview](#1-overview)
2. [Tujuan Guest Mode](#2-tujuan-guest-mode)
3. [Struktur Folder](#3-struktur-folder)
4. [Cara Kerja Guest Session](#4-cara-kerja-guest-session)
   - [4.1 Membuat Guest Session](#41-membuat-guest-session)
   - [4.2 Menggunakan Guest Token](#42-menggunakan-guest-token)
   - [4.3 Guest Login Wall](#43-guest-login-wall)
   - [4.4 Migrasi Guest ke User](#44-migrasi-guest-ke-user)
5. [Setup Postman](#5-setup-postman)
6. [API Reference](#6-api-reference)
   - [6.1 Create Guest Session](#61-create-guest-session)
7. [Flow Guest Mode Lengkap](#7-flow-guest-mode-lengkap)
8. [Status Code yang Umum Dipakai](#8-status-code-yang-umum-dipakai)
9. [Catatan Penting](#9-catatan-penting)

---

## 1. Overview

Guest Mode adalah salah satu fitur inti Bento-do agar user bisa langsung mencoba aplikasi tanpa harus register di awal. ✨

Dengan Guest Mode, user dapat:
- membuat session guest
- membuat beberapa task awal
- mencoba dashboard awal
- merasakan flow aplikasi tanpa hambatan registrasi

Guest Mode dirancang untuk mendukung konsep **frictionless entry**, lalu baru diarahkan ke login/register saat user sudah mulai benar-benar menggunakan sistem.

Base URL lokal untuk guest module:

```text id="kpvk0n"
http://localhost:5000/api/v1/guest
````

---

## 2. Tujuan Guest Mode

Guest Mode dibuat agar user:

* 🚀 bisa langsung masuk aplikasi tanpa onboarding berat
* 📝 bisa mulai menulis task secepat mungkin
* 🧠 tidak kehilangan momentum saat ingin “brain dump”
* 🔐 baru diminta login saat menyentuh batas guest / fitur tertentu

Dalam Bento-do, guest bukan akun penuh.
Guest hanya punya **session sementara** yang diwakili oleh:

```text id="0p4i0f"
x-guest-session-token
```

---

## 3. Struktur Folder

```text id="t1wyd8"
src/
├── middlewares/
│   ├── guestOrAuth.middleware.js
│   └── loginWall.middleware.js
├── modules/
│   └── guest/
│       ├── guest.controller.js
│       ├── guest.service.js
│       ├── guest.repository.js
│       ├── guest.routes.js
│       └── guest.validation.js
└── modules/
    ├── tasks/
    ├── dashboard/
    ├── templates/
    └── auth/
```

> Catatan: secara arsitektur, Guest Mode tidak hanya hidup di `guest/`, tetapi juga dipakai oleh:
>
> * `tasks`
> * `dashboard`
> * `templates`
> * `auth`
>   melalui middleware dan logic migration.

---

## 4. Cara Kerja Guest Session

### 4.1 Membuat Guest Session

Saat client memanggil endpoint:

```text id="dyrcbx"
POST /api/v1/guest
```

backend akan membuat session guest baru dan mengembalikan token session.

Token ini kemudian dipakai untuk request-request berikutnya.

---

### 4.2 Menggunakan Guest Token

Setelah guest session dibuat, token harus dikirim di header:

```text id="6jlwmq"
x-guest-session-token: <guest_session_token>
```

Header ini dipakai pada endpoint yang mendukung guest, misalnya:

* create task
* dashboard guest
* flow migrasi guest → user

---

### 4.3 Guest Login Wall

Guest tidak memiliki akses tak terbatas.

Business rule utama:

* guest hanya boleh punya maksimal **3 task aktif**
* saat mencoba membuat task ke-4, backend akan memblokir request dan meminta user login/register

Response yang diharapkan:

```json id="shhq1b"
{
  "success": false,
  "message": "Batas guest telah tercapai. Silakan login atau register untuk menambah tugas lagi.",
  "require_login": true,
  "code": "GUEST_TASK_LIMIT_REACHED"
}
```

Selain batas task, beberapa fitur juga dilindungi oleh **login wall**, misalnya:

* apply templates
* fitur yang memang khusus user terdaftar

---

### 4.4 Migrasi Guest ke User

Kalau guest sudah membuat task lalu memutuskan register/login, task guest bisa dipindahkan ke akun user.

Flow migration:

1. guest membuat session
2. guest membuat task
3. client mengirim register/login dengan header guest token
4. backend mencari guest session
5. backend memindahkan task guest ke `user_id` user baru / user login
6. jumlah task yang dipindahkan dikembalikan di response auth

Header yang dipakai:

```text id="elax08"
x-guest-session-token: <guest_session_token>
```

Contoh field migration result:

```json id="jqqjlwm"
{
  "migrated_tasks_count": 1
}
```

---

## 5. Setup Postman

### 5.1 Environment

Tambahkan variable berikut di Postman environment:

```text id="c1qtw1"
base_url = http://localhost:5000/api/v1
guest_session_token =
token_user =
user_id =
```

---

### 5.2 Auto Save Guest Token

Di request `POST /guest`, tempel script ini di tab **Tests**:

```javascript id="egjlwm"
const json = pm.response.json();

pm.environment.set("guest_session_token", json.data.session_token);
```

---

### 5.3 Mengirim Guest Token

Untuk endpoint guest-enabled, isi header:

```text id="jlwm05"
x-guest-session-token: {{guest_session_token}}
```

---

## 6. API Reference

---

## 6.1 Create Guest Session

### `POST /api/v1/guest`

Membuat guest session baru.

### Headers

Tidak perlu header khusus.

### Body

Tidak perlu body.

### Response `201`

```json id="jlwm07"
{
  "success": true,
  "message": "Guest session berhasil dibuat.",
  "data": {
    "session_token": "guest-session-token"
  }
}
```

> Pada implementasi tertentu, response juga bisa menyertakan metadata guest tambahan.
> Yang paling penting untuk client adalah `session_token`.

---

## 7. Flow Guest Mode Lengkap

```text id="jjlwm08"
1. Client kirim POST /api/v1/guest
        ↓
2. Backend membuat guest session
        ↓
3. Backend mengembalikan session_token
        ↓
4. Client menyimpan session_token di environment/state
        ↓
5. Client membuat task guest dengan header x-guest-session-token
        ↓
6. Backend menyimpan task dengan guest_session_id
        ↓
7. Jika guest membuat task ke-4 → login wall aktif
        ↓
8. Jika guest register/login:
   - client kirim x-guest-session-token
   - backend migrasikan task guest ke user
        ↓
9. Guest berubah menjadi user terdaftar
```

---

## 8. Status Code yang Umum Dipakai

| Status Code | Arti                                                       |
| ----------- | ---------------------------------------------------------- |
| `201`       | Guest session berhasil dibuat                              |
| `400`       | Request guest tidak valid                                  |
| `401`       | Token guest tidak ada / tidak valid pada endpoint tertentu |
| `403`       | Guest diblok oleh login wall / batas guest tercapai        |

---

## 9. Catatan Penting

### ✅ Yang sudah diverifikasi saat testing

* Guest session berhasil dibuat
* `guest_session_token` berhasil disimpan dan dipakai
* Guest bisa membuat task 1–3
* Guest diblok saat membuat task ke-4
* Guest bisa masuk ke flow dashboard tertentu
* Guest task berhasil dimigrasikan ke user saat register
* `migrated_tasks_count` muncul di response auth

### ⚠️ Catatan implementasi

* Guest Mode memakai **header token**, bukan JWT
* Header utama guest adalah:

```text id="rjlwm0"
x-guest-session-token: <guest_session_token>
```

* Guest bukan user penuh, jadi beberapa fitur akan diblok oleh login wall
* Migrasi guest diverifikasi berhasil saat register menggunakan header guest token

### 🧪 Folder Postman terkait guest

```text id="zjlwm0"
02 - Guest Mode & Login Wall
├── 02.1 - Create Guest Session
├── 02.2 - Guest Create Task 1
├── 02.3 - Guest Create Task 2
├── 02.4 - Guest Create Task 3
├── 02.5 - Guest Create Task 4 - Should Block
└── 02.6 - Guest Dashboard Zen
```

### ✅ Status akhir

Module **Guest Mode** sudah diuji dan **pass** dalam full integration testing.



