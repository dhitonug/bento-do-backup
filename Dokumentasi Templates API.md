
# 📚 Dokumentasi REST API — Templates Bento-do

> Stack: Express.js · PostgreSQL (Neon) · Zod · Guest/User Identity · Login Wall

---

## 📑 Daftar Isi

1. [Overview](#1-overview)
2. [Tujuan Module Templates](#2-tujuan-module-templates)
3. [Struktur Folder](#3-struktur-folder)
4. [Cara Kerja Templates](#4-cara-kerja-templates)
   - [4.1 Get Templates](#41-get-templates)
   - [4.2 Apply Template](#42-apply-template)
   - [4.3 Login Wall pada Templates](#43-login-wall-pada-templates)
5. [Setup Postman](#5-setup-postman)
6. [API Reference](#6-api-reference)
   - [6.1 Get Templates](#61-get-templates)
   - [6.2 Apply Template](#62-apply-template)
7. [Available Template Keys](#7-available-template-keys)
8. [Business Rules Penting](#8-business-rules-penting)
9. [Status Code yang Umum Dipakai](#9-status-code-yang-umum-dipakai)
10. [Catatan Penting](#10-catatan-penting)

---

## 1. Overview

Module Templates dipakai untuk mempercepat pembuatan task dengan pola yang sudah disiapkan sebelumnya. ⚡

Fitur ini cocok untuk user yang:
- belum tahu harus mulai dari task mana
- butuh task starter pack
- ingin brain dump cepat tanpa mengetik semuanya manual

Di Bento-do, templates termasuk bagian dari **Bank Tugas**, tapi dipisah ke module sendiri agar:
- logic template tetap rapi
- key template bisa divalidasi
- proses multiple insert bisa dikelola terpisah

Base URL lokal:

```text
http://localhost:5000/api/v1/templates
````

---

## 2. Tujuan Module Templates

Module Templates dibuat agar user bisa:

* 🧩 melihat daftar template yang tersedia
* 🚀 langsung meng-apply template tertentu
* 📝 membuat beberapa task sekaligus dari satu aksi
* 🎯 memulai workflow belajar lebih cepat

Contoh use case:

* user sedang menyiapkan **makalah**
* user sedang menyiapkan **presentasi**
* user sedang mengerjakan **praktikum**
* user sedang menghadapi **ujian**

---

## 3. Struktur Folder

```text
src/
├── middlewares/
│   ├── guestOrAuth.middleware.js
│   ├── loginWall.middleware.js
│   └── validate.middleware.js
└── modules/
    └── templates/
        ├── templates.controller.js
        ├── templates.service.js
        ├── templates.routes.js
        └── templates.validation.js
```

Route aktif yang digunakan:

```js
// GET /api/v1/templates
// POST /api/v1/templates/apply/:template_key
```

---

## 4. Cara Kerja Templates

### 4.1 Get Templates

Endpoint ini dipakai untuk mengambil daftar template yang tersedia.

Route ini melewati:

* `guestOrAuthMiddleware`
* `loginWallMiddleware`

Artinya:

* request boleh datang dari guest atau user
* tapi login wall tetap bisa memblokir guest jika fitur ini dianggap user-only

---

### 4.2 Apply Template

Saat client memanggil endpoint apply:

```text
POST /api/v1/templates/apply/:template_key
```

backend akan:

1. memvalidasi `template_key`
2. mencari template hardcoded berdasarkan key
3. membuat beberapa task sekaligus
4. menyimpan `source_template`
5. mengembalikan:

   * info template
   * jumlah task yang dibuat
   * daftar task hasil insert

Task hasil template akan memiliki field:

```json
{
  "source_template": "Makalah"
}
```

atau:

```json
{
  "source_template": "Presentasi"
}
```

dan seterusnya, sesuai nama template.

---

### 4.3 Login Wall pada Templates

Templates memakai `loginWallMiddleware`.

Artinya guest bisa:

* lolos middleware identitas awal

Tetapi tetap bisa diblok saat mencoba apply template.

Response tipikal saat guest diblok:

```json
{
  "success": false,
  "message": "Fitur ini hanya untuk pengguna terdaftar. Silakan login terlebih dahulu.",
  "require_login": true
}
```

---

## 5. Setup Postman

### 5.1 Environment

Tambahkan variabel berikut di Postman:

```text
base_url = http://localhost:5000/api/v1
token_user =
guest_session_token =
```

### 5.2 Auth untuk User

Untuk request templates sebagai user, gunakan:

```text
Authorization: Bearer {{token_user}}
```

### 5.3 Auth untuk Guest

Untuk request guest:

```text
x-guest-session-token: {{guest_session_token}}
```

Tetapi ingat:

* meskipun guest punya session token
* endpoint templates tetap bisa diblok oleh login wall

---

## 6. API Reference

---

## 6.1 Get Templates

### `GET /api/v1/templates`

Mengambil daftar template yang tersedia.

### Headers (user)

```text
Authorization: Bearer {{token_user}}
```

### Headers (guest)

```text
x-guest-session-token: {{guest_session_token}}
```

### Response `200`

```json
{
  "success": true,
  "data": [
    {
      "key": "makalah",
      "name": "Makalah",
      "description": "Template cepat untuk tugas makalah mahasiswa.",
      "total_items": 3,
      "preview_items": [
        {
          "title": "Tentukan topik makalah",
          "energy_weight": "Ringan"
        },
        {
          "title": "Cari referensi & susun outline makalah",
          "energy_weight": "Sedang"
        },
        {
          "title": "Tulis dan revisi makalah",
          "energy_weight": "Berat"
        }
      ]
    },
    {
      "key": "presentasi",
      "name": "Presentasi",
      "description": "Template cepat untuk persiapan presentasi kelas.",
      "total_items": 3,
      "preview_items": [
        {
          "title": "Tentukan poin utama presentasi",
          "energy_weight": "Ringan"
        },
        {
          "title": "Buat slide presentasi",
          "energy_weight": "Sedang"
        },
        {
          "title": "Latihan presentasi",
          "energy_weight": "Sedang"
        }
      ]
    },
    {
      "key": "praktikum",
      "name": "Praktikum",
      "description": "Template cepat untuk tugas atau laporan praktikum.",
      "total_items": 3,
      "preview_items": [
        {
          "title": "Pahami modul praktikum",
          "energy_weight": "Ringan"
        },
        {
          "title": "Kerjakan praktikum / eksperimen",
          "energy_weight": "Berat"
        },
        {
          "title": "Susun laporan praktikum",
          "energy_weight": "Sedang"
        }
      ]
    },
    {
      "key": "ujian",
      "name": "Ujian",
      "description": "Template cepat untuk persiapan ujian.",
      "total_items": 3,
      "preview_items": [
        {
          "title": "Kumpulkan materi ujian",
          "energy_weight": "Ringan"
        },
        {
          "title": "Buat ringkasan & latihan soal",
          "energy_weight": "Sedang"
        },
        {
          "title": "Review materi inti ujian",
          "energy_weight": "Berat"
        }
      ]
    }
  ]
}
```

---

## 6.2 Apply Template

### `POST /api/v1/templates/apply/:template_key`

Meng-apply satu template dan membuat beberapa task sekaligus.

---

### Contoh 1 — Apply Template Makalah

#### URL

```text
POST /api/v1/templates/apply/makalah
```

#### Headers

```text
Authorization: Bearer {{token_user}}
Content-Type: application/json
```

#### Body

Tidak perlu body.

#### Response `200/201`

```json
{
  "success": true,
  "template": {
    "key": "makalah",
    "name": "Makalah"
  },
  "inserted_count": 3,
  "data": [
    {
      "id": "uuid",
      "title": "Tentukan topik makalah",
      "energy_weight": "Ringan",
      "source_template": "Makalah"
    },
    {
      "id": "uuid",
      "title": "Cari referensi & susun outline makalah",
      "energy_weight": "Sedang",
      "source_template": "Makalah"
    },
    {
      "id": "uuid",
      "title": "Tulis dan revisi makalah",
      "energy_weight": "Berat",
      "source_template": "Makalah"
    }
  ]
}
```

---

### Contoh 2 — Apply Template Presentasi

#### URL

```text
POST /api/v1/templates/apply/presentasi
```

#### Response `200/201`

```json
{
  "success": true,
  "template": {
    "key": "presentasi",
    "name": "Presentasi"
  },
  "inserted_count": 3,
  "data": [
    {
      "id": "uuid",
      "title": "Tentukan poin utama presentasi",
      "energy_weight": "Ringan",
      "source_template": "Presentasi"
    },
    {
      "id": "uuid",
      "title": "Buat slide presentasi",
      "energy_weight": "Sedang",
      "source_template": "Presentasi"
    },
    {
      "id": "uuid",
      "title": "Latihan presentasi",
      "energy_weight": "Sedang",
      "source_template": "Presentasi"
    }
  ]
}
```

---

### Contoh 3 — Apply Template Praktikum

#### URL

```text
POST /api/v1/templates/apply/praktikum
```

#### Response `200/201`

```json
{
  "success": true,
  "template": {
    "key": "praktikum",
    "name": "Praktikum"
  },
  "inserted_count": 3,
  "data": [
    {
      "id": "uuid",
      "title": "Pahami modul praktikum",
      "energy_weight": "Ringan",
      "source_template": "Praktikum"
    },
    {
      "id": "uuid",
      "title": "Kerjakan praktikum / eksperimen",
      "energy_weight": "Berat",
      "source_template": "Praktikum"
    },
    {
      "id": "uuid",
      "title": "Susun laporan praktikum",
      "energy_weight": "Sedang",
      "source_template": "Praktikum"
    }
  ]
}
```

---

### Contoh 4 — Apply Template Ujian

#### URL

```text
POST /api/v1/templates/apply/ujian
```

#### Response `200/201`

```json
{
  "success": true,
  "template": {
    "key": "ujian",
    "name": "Ujian"
  },
  "inserted_count": 3,
  "data": [
    {
      "id": "uuid",
      "title": "Kumpulkan materi ujian",
      "energy_weight": "Ringan",
      "source_template": "Ujian"
    },
    {
      "id": "uuid",
      "title": "Buat ringkasan & latihan soal",
      "energy_weight": "Sedang",
      "source_template": "Ujian"
    },
    {
      "id": "uuid",
      "title": "Review materi inti ujian",
      "energy_weight": "Berat",
      "source_template": "Ujian"
    }
  ]
}
```

---

### Guest Apply Template — Blocked by Login Wall

#### URL

```text
POST /api/v1/templates/apply/makalah
```

#### Headers

```text
x-guest-session-token: {{guest_session_token}}
Content-Type: application/json
```

#### Response `401/403`

```json
{
  "success": false,
  "message": "Fitur ini hanya untuk pengguna terdaftar. Silakan login terlebih dahulu.",
  "require_login": true
}
```

---

### Invalid Template Key

#### URL

```text
POST /api/v1/templates/apply/template_aneh_banget
```

#### Response `400/404`

```json
{
  "success": false,
  "message": "Template tidak valid."
}
```

---

## 7. Available Template Keys

Template hardcoded yang tersedia saat ini:

### ✅ `makalah`

Template cepat untuk tugas makalah mahasiswa.

Items:

* Tentukan topik makalah
* Cari referensi & susun outline makalah
* Tulis dan revisi makalah

### ✅ `presentasi`

Template cepat untuk persiapan presentasi kelas.

Items:

* Tentukan poin utama presentasi
* Buat slide presentasi
* Latihan presentasi

### ✅ `praktikum`

Template cepat untuk tugas atau laporan praktikum.

Items:

* Pahami modul praktikum
* Kerjakan praktikum / eksperimen
* Susun laporan praktikum

### ✅ `ujian`

Template cepat untuk persiapan ujian.

Items:

* Kumpulkan materi ujian
* Buat ringkasan & latihan soal
* Review materi inti ujian

---

## 8. Business Rules Penting

### 8.1 Templates Bersifat Hardcoded

Templates di scope backend saat ini adalah template cepat bawaan sistem, bukan custom template builder.

### 8.2 Apply Template = Multiple Insert

Satu request apply template membuat beberapa task sekaligus.

### 8.3 Source Template Otomatis Disimpan

Task hasil apply template menyimpan field:

```json
{
  "source_template": "Makalah"
}
```

atau nama template lain sesuai key.

### 8.4 Guest Bisa Diblok oleh Login Wall

Meskipun route memakai `guestOrAuthMiddleware`, guest tetap bisa diblok oleh `loginWallMiddleware`.

### 8.5 Template Key Harus Valid

`template_key` divalidasi dari params route.

---

## 9. Status Code yang Umum Dipakai

| Status Code | Arti                                                 |
| ----------- | ---------------------------------------------------- |
| `200`       | Get/apply template berhasil                          |
| `201`       | Apply template berhasil dan dianggap create          |
| `400`       | Template key tidak valid                             |
| `401`       | Guest diblok / auth dibutuhkan pada kondisi tertentu |
| `403`       | Login wall aktif                                     |
| `404`       | Template tidak ditemukan                             |

---

## 10. Catatan Penting

### ✅ Yang sudah diverifikasi saat testing

* Get templates berhasil
* Apply template `makalah` berhasil
* Apply template `presentasi` berhasil
* Apply template `praktikum` berhasil
* Apply template `ujian` berhasil
* Task hasil template masuk ke task list
* Task hasil template memiliki `source_template`
* Guest diblok saat mencoba apply template
* Invalid template key ditolak

### ⚠️ Catatan implementasi

* Route aktif yang dipakai project:

```text
GET /api/v1/templates
POST /api/v1/templates/apply/:template_key
```

* Daftar template saat ini berasal dari objek hardcoded di service
* Templates sekarang berada pada level **backend starter templates**
* Bukan fitur custom template builder

### 🧪 Folder Postman terkait templates

```text
05 - Templates
├── 05.1 - Get Templates
├── 05.2 - Apply Template Makalah
├── 05.3 - Get Tasks After Makalah
├── 05.4 - Apply Template Presentasi
├── 05.5 - Get Tasks After Presentasi
├── 05.6 - Apply Template Praktikum
├── 05.7 - Get Tasks After Praktikum
├── 05.8 - Apply Template Ujian
├── 05.9 - Get Tasks After Ujian
├── 05.10 - Guest Apply Template - Should Block
└── 05.11 - Apply Invalid Template
```

### ✅ Status akhir

Module **Templates** sudah diuji dan **pass** dalam full integration testing.

---

