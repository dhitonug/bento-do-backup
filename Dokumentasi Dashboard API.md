
# 🎯 Dokumentasi REST API — Dashboard Bento-do

> Stack: Express.js · PostgreSQL (Neon) · Guest/User Identity · Rule of 3 · Energy-Aware Prioritization

---

## 📑 Daftar Isi

1. [Overview](#1-overview)
2. [Tujuan Module Dashboard](#2-tujuan-module-dashboard)
3. [Struktur Folder](#3-struktur-folder)
4. [Cara Kerja Dashboard Zen](#4-cara-kerja-dashboard-zen)
   - [4.1 Rule of 3](#41-rule-of-3)
   - [4.2 Prioritas Task](#42-prioritas-task)
   - [4.3 Hidden Tasks](#43-hidden-tasks)
   - [4.4 Dukungan Guest dan User](#44-dukungan-guest-dan-user)
5. [Setup Postman](#5-setup-postman)
6. [API Reference](#6-api-reference)
   - [6.1 Get Zen Dashboard](#61-get-zen-dashboard)
7. [Response Object Dashboard](#7-response-object-dashboard)
8. [Business Rules Penting](#8-business-rules-penting)
9. [Status Code yang Umum Dipakai](#9-status-code-yang-umum-dipakai)
10. [Catatan Penting](#10-catatan-penting)

---

## 1. Overview

Module Dashboard di Bento-do berfungsi untuk menampilkan **hal yang paling penting untuk dikerjakan sekarang**, bukan seluruh daftar task. 🧠

Endpoint utama dashboard adalah **Zen Dashboard**, yang menerapkan konsep:

- hanya tampilkan **maksimal 3 task**
- sembunyikan task lain agar user tidak kewalahan
- sertakan ringkasan energi agar user tahu kondisinya
- tampilkan pesan bahwa ada task lain yang disembunyikan

Base URL lokal:

```text
http://localhost:5000/api/v1/dashboard
````

Endpoint utama:

```text id="gd7de3"
/api/v1/dashboard/zen
```

---

## 2. Tujuan Module Dashboard

Module Dashboard dibuat agar user:

* 🎯 fokus pada task paling penting
* 🧘 tidak melihat terlalu banyak task sekaligus
* ⚡ tetap sadar kondisi energi saat memilih pekerjaan
* 📌 mendapat tampilan prioritas yang ringkas dan actionable

Dashboard ini adalah implementasi inti dari filosofi Bento-do:
**bukan menampilkan semua hal, tapi menampilkan hal yang perlu dikerjakan sekarang.**

---

## 3. Struktur Folder

```text id="zvf14s"
src/
├── middlewares/
│   └── guestOrAuth.middleware.js
└── modules/
    └── dashboard/
        ├── dashboard.controller.js
        ├── dashboard.service.js
        ├── dashboard.repository.js
        └── dashboard.routes.js
```

Route utama yang digunakan:

```js id="xpzhf5"
// GET /api/v1/dashboard/zen
```

---

## 4. Cara Kerja Dashboard Zen

### 4.1 Rule of 3

Dashboard Zen hanya mengembalikan **maksimal 3 task**.

Artinya:

* meskipun user punya banyak task aktif
* frontend hanya menerima paling banyak 3 task prioritas
* task lainnya tetap ada di database, tetapi tidak ditampilkan di dashboard

Ini disebut **Rule of 3**.

---

### 4.2 Prioritas Task

Task yang tampil di dashboard dipilih oleh backend berdasarkan logika prioritas.

Secara umum, backend mempertimbangkan:

* status task
* deadline
* kondisi energi user
* beban task (`Ringan`, `Sedang`, `Berat`)

Saat energi user rendah / kritis, dashboard bisa lebih ramah terhadap task yang lebih ringan, agar user tidak langsung dibebani task berat.

---

### 4.3 Hidden Tasks

Kalau jumlah task aktif lebih dari 3, response dashboard akan menyertakan:

* `hidden_count`
* `hidden_message`

Contoh:

* user punya 7 task aktif
* dashboard hanya menampilkan 3
* maka `hidden_count = 4`

---

### 4.4 Dukungan Guest dan User

Dashboard Zen bisa dipakai oleh:

* 👤 guest
* 🔐 user login

Identitas dibaca dari:

* `Authorization: Bearer <token>` untuk user
* `x-guest-session-token` untuk guest

Dengan begitu, guest juga bisa merasakan experience dashboard tanpa harus register dulu.

---

## 5. Setup Postman

### 5.1 Environment

Tambahkan variabel berikut di Postman:

```text id="41yl0d"
base_url = http://localhost:5000/api/v1
token_user =
token_user_2 =
guest_session_token =
```

### 5.2 Request sebagai User

Gunakan header:

```text id="47dy6o"
Authorization: Bearer {{token_user}}
```

### 5.3 Request sebagai Guest

Gunakan header:

```text id="k9j6if"
x-guest-session-token: {{guest_session_token}}
```

---

## 6. API Reference

---

## 6.1 Get Zen Dashboard

### `GET /api/v1/dashboard/zen`

Mengambil dashboard ringkas berdasarkan Rule of 3.

### Headers (user)

```text id="wjlwm4"
Authorization: Bearer {{token_user}}
```

### Headers (guest)

```text id="jlwm42"
x-guest-session-token: {{guest_session_token}}
```

### Response `200`

```json id="jlwm43"
{
  "success": true,
  "current_energy": 180,
  "max_energy": 240,
  "is_critical_energy": false,
  "hidden_count": 4,
  "hidden_message": "Masih ada 4 tugas lain yang disembunyikan agar kamu tetap fokus.",
  "data": [
    {
      "id": "uuid",
      "title": "Belajar UAS Statistik",
      "energy_weight": "Sedang",
      "status": "pending"
    },
    {
      "id": "uuid",
      "title": "Revisi Makalah",
      "energy_weight": "Ringan",
      "status": "in_progress"
    },
    {
      "id": "uuid",
      "title": "Latihan Soal Praktikum",
      "energy_weight": "Berat",
      "status": "pending"
    }
  ]
}
```

### Response penting

Field utama yang harus diperhatikan:

* `data` → array task maksimal 3
* `current_energy`
* `max_energy`
* `is_critical_energy`
* `hidden_count`
* `hidden_message`

---

## 7. Response Object Dashboard

Bentuk umum response dashboard:

```json id="t7cjlwm"
{
  "success": true,
  "current_energy": 180,
  "max_energy": 240,
  "is_critical_energy": false,
  "hidden_count": 2,
  "hidden_message": "Masih ada 2 tugas lain yang disembunyikan agar kamu tetap fokus.",
  "data": [
    {
      "id": "uuid",
      "title": "Nama task",
      "energy_weight": "Ringan",
      "status": "pending"
    }
  ]
}
```

### Penjelasan field

* `current_energy` → energi user saat ini
* `max_energy` → kapasitas maksimum energi harian
* `is_critical_energy` → apakah energi sedang kritis
* `hidden_count` → jumlah task lain yang tidak ditampilkan
* `hidden_message` → pesan pendukung untuk hidden tasks
* `data` → maksimal 3 task prioritas

---

## 8. Business Rules Penting

### 8.1 Rule of 3 Selalu Berlaku

`data.length` pada dashboard harus **maksimal 3**.

### 8.2 Hidden Tasks Tidak Hilang

Task yang tidak tampil di dashboard tetap ada di Bank Tugas. Mereka hanya disembunyikan dari dashboard.

### 8.3 Dashboard Hanya Menampilkan Task Aktif

Task yang sudah selesai (`done`) tidak menjadi kandidat utama untuk dashboard aktif.

### 8.4 Dashboard Bersifat Energy-Aware

Dashboard dapat mempertimbangkan kondisi energi dalam menentukan prioritas.

### 8.5 Dashboard Mendukung Guest

Guest yang valid tetap bisa mengakses dashboard zen dengan session token.

### 8.6 Ownership Tetap Berlaku

User hanya melihat dashboard berdasarkan task miliknya sendiri.

---

## 9. Status Code yang Umum Dipakai

| Status Code | Arti                                         |
| ----------- | -------------------------------------------- |
| `200`       | Dashboard berhasil diambil                   |
| `401`       | Auth/token tidak valid pada kondisi tertentu |
| `404`       | Endpoint tidak ditemukan                     |

````

## 10. Catatan Penting

### ✅ Yang sudah diverifikasi saat testing

- Get zen dashboard berhasil
- `data` selalu maksimal 3 task
- `hidden_count` tersedia
- `hidden_message` muncul saat ada task yang disembunyikan
- dashboard bisa diakses oleh user utama
- dashboard bisa diakses oleh user kedua
- guest dashboard berhasil diuji
- struktur energy summary di response sesuai

### ⚠️ Catatan implementasi

- Endpoint aktif yang dipakai project:

```text id="lg8jlwm"
GET /api/v1/dashboard/zen
````

* Dashboard Zen adalah endpoint ringkas, bukan endpoint full task list
* Untuk melihat semua task, gunakan endpoint `/api/v1/tasks`

### 🧪 Folder Postman terkait dashboard

```text id="0jlwm4"
06 - Dashboard - Rule of 3
├── 06.1 - Get Zen Dashboard
├── 06.2 - Verify Rule of 3 Basic
├── 06.3 - Get Zen Dashboard as User 2
└── 06.4 - Get Zen Dashboard Without Auth
```

### ✅ Status akhir

Module **Dashboard / Rule of 3** sudah diuji dan **pass** dalam full integration testing.

---


