
# 🔔 Dokumentasi REST API — Notifications Bento-do

> Stack: Express.js · PostgreSQL (Neon) · UUID · Zod · Auth Middleware · Soft Delete · Deadline Reminder Lifecycle

---

## 📑 Daftar Isi

1. [Overview](#1-overview)
2. [Tujuan Module Notifications](#2-tujuan-module-notifications)
3. [Struktur Folder](#3-struktur-folder)
4. [Cara Kerja Notifications](#4-cara-kerja-notifications)
   - [4.1 In-App Notifications](#41-in-app-notifications)
   - [4.2 Filter Visibility](#42-filter-visibility)
   - [4.3 Mark As Read](#43-mark-as-read)
   - [4.4 Mark All As Read](#44-mark-all-as-read)
   - [4.5 Soft Delete Notification](#45-soft-delete-notification)
   - [4.6 Deadline Reminder Lifecycle](#46-deadline-reminder-lifecycle)
5. [Setup Postman](#5-setup-postman)
6. [API Reference](#6-api-reference)
   - [6.1 Get Notifications](#61-get-notifications)
   - [6.2 Get Notifications with Filters](#62-get-notifications-with-filters)
   - [6.3 Mark Notification as Read](#63-mark-notification-as-read)
   - [6.4 Mark All Notifications as Read](#64-mark-all-notifications-as-read)
   - [6.5 Delete Notification](#65-delete-notification)
7. [Notification Object](#7-notification-object)
8. [Notification Types](#8-notification-types)
9. [Business Rules Penting](#9-business-rules-penting)
10. [Status Code yang Umum Dipakai](#10-status-code-yang-umum-dipakai)
11. [Catatan Penting](#11-catatan-penting)

---

## 1. Overview

Module Notifications dipakai untuk menampilkan notifikasi internal di dalam aplikasi Bento-do. 🔔

Module ini mendukung:
- inbox notifikasi user
- filter unread
- filter berdasarkan tipe
- mark satu notifikasi sebagai read
- mark semua notifikasi sebagai read
- soft delete notifikasi
- deadline reminder lifecycle yang terhubung ke task

Base URL lokal:

```text
http://localhost:5000/api/v1/notifications
````

Karena notifikasi bersifat user-specific, module ini menggunakan **auth-only route**.
Artinya endpoint notifications hanya dapat diakses oleh user login, bukan guest.

---

## 2. Tujuan Module Notifications

Module Notifications dibuat agar user bisa:

* 📥 melihat notifikasi yang relevan di dalam aplikasi
* 👀 mengetahui jumlah notifikasi yang belum dibaca
* ✅ menandai notifikasi satu per satu atau sekaligus
* 🗑️ menghapus notifikasi dari inbox tanpa hard delete
* ⏰ menerima reminder deadline yang sinkron dengan lifecycle task

Notifications di Bento-do adalah **in-app notifications**, bukan push notification ke device/browser.

---

## 3. Struktur Folder

```text id="hfycoy"
src/
├── middlewares/
│   ├── auth.middleware.js
│   └── validate.middleware.js
└── modules/
    └── notifications/
        ├── notifications.controller.js
        ├── notifications.service.js
        ├── notifications.repository.js
        ├── notifications.routes.js
        └── notifications.validation.js
```

Route aktif yang digunakan:

```js id="zitdqi"
// GET    /api/v1/notifications
// PUT    /api/v1/notifications/read-all
// PUT    /api/v1/notifications/:id/read
// DELETE /api/v1/notifications/:id
```

---

## 4. Cara Kerja Notifications

### 4.1 In-App Notifications

Notifications disimpan di database dan ditampilkan melalui endpoint inbox.

Setiap notification terhubung ke:

* `user_id`
* `task_id` (opsional tergantung konteks)
* `message`
* `type`
* `scheduled_at`
* `sent_at`
* `is_read`

---

### 4.2 Filter Visibility

Tidak semua row notification langsung muncul di inbox.

Agar notification tampil di endpoint `/notifications`, notification harus memenuhi syarat:

* `deleted_at IS NULL`
* `scheduled_at <= NOW()`

Artinya:

* reminder yang waktunya belum jatuh **sudah bisa ada di database**
* tetapi **belum muncul di inbox** kalau `scheduled_at` masih di masa depan

Ini sangat penting untuk deadline reminder.

---

### 4.3 Mark As Read

User bisa menandai satu notification sebagai sudah dibaca melalui endpoint:

```text id="gh2bzm"
PUT /api/v1/notifications/:id/read
```

Backend akan:

* memastikan notification milik user yang login
* mengubah `is_read = true`
* memperbarui `updated_at`

---

### 4.4 Mark All As Read

User juga bisa menandai semua notifikasi visible yang belum dibaca melalui:

```text id="somqcc"
PUT /api/v1/notifications/read-all
```

Backend akan:

* hanya memproses notifikasi milik user
* hanya memproses notifikasi yang visible
* hanya memproses notifikasi yang `is_read = false`

---

### 4.5 Soft Delete Notification

Notification tidak dihapus permanen.
Saat user delete notification, backend akan mengisi:

* `deleted_at`
* `updated_at`

Sehingga:

* notification hilang dari inbox
* tetapi histori database tetap aman

---

### 4.6 Deadline Reminder Lifecycle

Notifications juga dipakai untuk **deadline reminder**.

Reminder ini terhubung ke lifecycle task:

* task dibuat dengan deadline → reminder dibuat
* deadline diubah → reminder diupdate
* deadline dihapus → reminder di-soft delete
* task selesai → reminder di-soft delete
* task dihapus → reminder di-soft delete
* task selesai via focus → reminder di-soft delete
* task guest dimigrasikan ke user → reminder dibuat

Jadi module notifications bukan sekadar inbox, tetapi juga bagian dari sistem sinkronisasi task.

---

## 5. Setup Postman

### 5.1 Environment

Tambahkan variabel berikut di Postman:

```text id="ganv4p"
base_url = http://localhost:5000/api/v1
token_user =
token_user_2 =
notification_id =
```

### 5.2 Auth untuk User

Gunakan header:

```text id="0h4jlwm"
Authorization: Bearer {{token_user}}
```

### 5.3 Auto Save Notification ID

Di request list notifications, tempel script ini di tab **Tests**:

```javascript id="jlwm60"
const json = pm.response.json();

if (json.data && json.data.length > 0) {
  pm.environment.set("notification_id", json.data[0].id);
}
```

---

## 6. API Reference

---

## 6.1 Get Notifications

### `GET /api/v1/notifications`

Mengambil inbox notifikasi user yang visible.

### Headers

```text id="efoqq1"
Authorization: Bearer {{token_user}}
```

### Response `200`

```json id="jlwm61"
{
  "success": true,
  "page": 1,
  "limit": 20,
  "total_items": 3,
  "total_pages": 1,
  "unread_count": 2,
  "data": [
    {
      "id": "44bc110b-ddfa-46b8-86a3-1e94b23c294a",
      "user_id": "uuid-user",
      "task_id": "uuid-task",
      "message": "Selamat! Tugas ringan selesai dan kamu dapat dopamine rescue.",
      "type": "dopamine_rescue",
      "scheduled_at": "2026-05-12T04:43:03.612Z",
      "sent_at": "2026-05-12T04:43:03.612Z",
      "is_read": true,
      "created_at": "2026-05-12T04:45:03.612Z",
      "updated_at": "2026-05-12T04:45:03.612Z"
    },
    {
      "id": "d718b661-3f75-47ab-942a-311b5204bbaf",
      "user_id": "uuid-user",
      "task_id": "uuid-task",
      "message": "Energi kamu mulai kritis. Kerjakan tugas ringan dulu ya.",
      "type": "energy_critical",
      "scheduled_at": "2026-05-12T04:40:03.612Z",
      "sent_at": "2026-05-12T04:40:03.612Z",
      "is_read": false,
      "created_at": "2026-05-12T04:45:03.612Z",
      "updated_at": "2026-05-12T04:45:03.612Z"
    },
    {
      "id": "de4e7686-2c56-4062-8974-57c547698014",
      "user_id": "uuid-user",
      "task_id": "uuid-task",
      "message": "Deadline tugas kamu besok malam.",
      "type": "deadline_reminder",
      "scheduled_at": "2026-05-12T04:35:03.612Z",
      "sent_at": "2026-05-12T04:35:03.612Z",
      "is_read": false,
      "created_at": "2026-05-12T04:45:03.612Z",
      "updated_at": "2026-05-12T04:45:03.612Z"
    }
  ]
}
```

---

## 6.2 Get Notifications with Filters

### Filter unread

```text id="jlwm62"
GET /api/v1/notifications?is_read=false
```

### Response `200`

```json id="jlwm63"
{
  "success": true,
  "page": 1,
  "limit": 20,
  "total_items": 2,
  "total_pages": 1,
  "unread_count": 2,
  "data": [
    {
      "id": "d718b661-3f75-47ab-942a-311b5204bbaf",
      "type": "energy_critical",
      "is_read": false
    },
    {
      "id": "de4e7686-2c56-4062-8974-57c547698014",
      "type": "deadline_reminder",
      "is_read": false
    }
  ]
}
```

### Filter by type

```text id="jlwm64"
GET /api/v1/notifications?type=deadline_reminder
```

### Response `200`

```json id="jlwm65"
{
  "success": true,
  "page": 1,
  "limit": 20,
  "total_items": 1,
  "total_pages": 1,
  "unread_count": 2,
  "data": [
    {
      "id": "de4e7686-2c56-4062-8974-57c547698014",
      "type": "deadline_reminder",
      "is_read": false
    }
  ]
}
```

---

## 6.3 Mark Notification as Read

### `PUT /api/v1/notifications/:id/read`

Menandai satu notification sebagai sudah dibaca.

### Headers

```text id="w9glnn"
Authorization: Bearer {{token_user}}
```

### Response `200`

```json id="jlwm66"
{
  "success": true,
  "message": "Notifikasi berhasil ditandai sudah dibaca.",
  "data": {
    "id": "d718b661-3f75-47ab-942a-311b5204bbaf",
    "user_id": "uuid-user",
    "task_id": "uuid-task",
    "message": "Energi kamu mulai kritis. Kerjakan tugas ringan dulu ya.",
    "type": "energy_critical",
    "scheduled_at": "2026-05-12T04:40:03.612Z",
    "sent_at": "2026-05-12T04:40:03.612Z",
    "is_read": true,
    "created_at": "2026-05-12T04:45:03.612Z",
    "updated_at": "2026-05-12T04:49:08.538Z"
  }
}
```

---

## 6.4 Mark All Notifications as Read

### `PUT /api/v1/notifications/read-all`

Menandai semua notification visible sebagai sudah dibaca.

### Headers

```text id="jlwm67"
Authorization: Bearer {{token_user}}
```

### Response `200`

```json id="jlwm68"
{
  "success": true,
  "message": "Semua notifikasi yang tersedia berhasil ditandai sudah dibaca.",
  "data": {
    "updated_count": 1
  }
}
```

---

## 6.5 Delete Notification

### `DELETE /api/v1/notifications/:id`

Soft delete notification.

### Headers

```text id="cjlwm6"
Authorization: Bearer {{token_user}}
```

### Response `200`

```json id="u0jlwm"
{
  "success": true,
  "message": "Notifikasi berhasil dihapus."
}
```

---

## 7. Notification Object

Bentuk umum object notification:

```json id="9jlwm6"
{
  "id": "uuid",
  "user_id": "uuid-user",
  "task_id": "uuid-task-or-null",
  "message": "Isi notifikasi",
  "type": "deadline_reminder",
  "scheduled_at": "timestamp",
  "sent_at": "timestamp-or-null",
  "is_read": false,
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

Field penting:

* `message` → isi notifikasi
* `type` → jenis notifikasi
* `scheduled_at` → waktu notifikasi dijadwalkan muncul
* `sent_at` → waktu notifikasi dianggap terkirim/siap tampil
* `is_read` → status baca user

---

## 8. Notification Types

Tipe notification yang sudah digunakan dan terverifikasi:

### `deadline_reminder`

Reminder deadline task.

Contoh message:

* `Deadline tugas kamu besok malam.`

### `energy_critical`

Notifikasi saat kondisi energi user mulai kritis.

Contoh message:

* `Energi kamu mulai kritis. Kerjakan tugas ringan dulu ya.`

### `dopamine_rescue`

Notifikasi saat user mendapatkan recovery kecil dari task ringan.

Contoh message:

* `Selamat! Tugas ringan selesai dan kamu dapat dopamine rescue.`

---

## 9. Business Rules Penting

### 9.1 Notifications Hanya untuk User Login

Endpoint notifications memakai auth middleware, jadi guest tidak bisa mengakses inbox notifikasi.

### 9.2 Visibility Bergantung pada Waktu

Notification hanya muncul di inbox jika:

* `scheduled_at <= NOW()`
* `deleted_at IS NULL`

### 9.3 Unread Count Menghitung Notification Visible yang Belum Dibaca

`unread_count` tidak selalu sama dengan semua notification di database, karena yang dihitung hanya notification visible.

### 9.4 Mark Read Hanya untuk Notification Milik Sendiri

User tidak bisa membaca/menandai notifikasi milik user lain.

### 9.5 Delete Menggunakan Soft Delete

Delete notification tidak menghapus row permanen dari database.

### 9.6 Reminder Lifecycle Sinkron dengan Task

Deadline reminder mengikuti perubahan task secara otomatis.

---

## 10. Status Code yang Umum Dipakai

| Status Code | Arti                                                 |
| ----------- | ---------------------------------------------------- |
| `200`       | Get / mark read / mark all / delete berhasil         |
| `400`       | UUID atau query param tidak valid                    |
| `401`       | Auth/token tidak valid                               |
| `404`       | Notification tidak ditemukan / bukan milik requester |

---

## 11. Catatan Penting

### ✅ Yang sudah diverifikasi saat testing

* Get notifications berhasil
* Filter unread berhasil
* Filter by type berhasil
* Mark satu notification sebagai read berhasil
* Mark all notifications as read berhasil
* Delete notification berhasil
* Notification yang dihapus tidak muncul lagi di inbox
* Invalid notification UUID ditolak
* User lain tidak bisa mengakses notification milik user lain
* Deadline reminder lifecycle berhasil diverifikasi melalui API + DB check

### ⚠️ Catatan implementasi

* Route aktif yang dipakai project:

```text id="jlwm69"
GET /api/v1/notifications
PUT /api/v1/notifications/read-all
PUT /api/v1/notifications/:id/read
DELETE /api/v1/notifications/:id
```

* Endpoint inbox hanya menampilkan notification yang **visible**
* Jadi kemungkinan ada row `deadline_reminder` di database tetapi belum muncul di inbox karena `scheduled_at` masih di masa depan
* Pada full testing, visibility deadline reminder juga diverifikasi lewat query database manual

### 🧪 Folder Postman terkait notifications

```text id="jlwm70"
09 - Notifications - In App
├── 09.1 - Get Notifications
├── 09.2 - Get Unread Notifications
├── 09.3 - Get Deadline Reminder Notifications
├── 09.4 - Mark Notification As Read
├── 09.5 - Mark All Notifications As Read
├── 09.6 - Get Notifications After Mark All Read
├── 09.7 - Delete Notification
├── 09.8 - Get Notifications After Delete
├── 09.9 - Mark Notification Invalid UUID
└── 09.10 - User 2 Tries Access User 1 Notification
```

### ✅ Status akhir

Module **Notifications** sudah diuji dan **pass** dalam full integration testing.

---

