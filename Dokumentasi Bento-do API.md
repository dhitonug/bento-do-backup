
# 🚀 Dokumentasi REST API — Bento-do

> Stack: Express.js · PostgreSQL (Neon) · JWT · Zod · CORS · Helmet · Cookie Parser · XSS Sanitizer

---

## 📚 Daftar Isi

1. [Overview](#1-overview)
2. [Tujuan Project](#2-tujuan-project)
3. [Stack & Teknologi](#3-stack--teknologi)
4. [Prinsip Arsitektur Backend](#4-prinsip-arsitektur-backend)
5. [Struktur Folder](#5-struktur-folder)
6. [Environment Variables](#6-environment-variables)
7. [Konsep Identitas Pengguna](#7-konsep-identitas-pengguna)
8. [Struktur Data Inti](#8-struktur-data-inti)
9. [Modul API](#9-modul-api)
   - [9.1 Health Check](#91-health-check)
   - [9.2 Guest Mode](#92-guest-mode)
   - [9.3 Auth](#93-auth)
   - [9.4 Tasks / Bank Tugas](#94-tasks--bank-tugas)
   - [9.5 Templates](#95-templates)
   - [9.6 Dashboard / Rule of 3](#96-dashboard--rule-of-3)
   - [9.7 Focus](#97-focus)
   - [9.8 Energy](#98-energy)
   - [9.9 Notifications](#99-notifications)
10. [Business Rules Penting](#10-business-rules-penting)
11. [Deadline Reminder Lifecycle](#11-deadline-reminder-lifecycle)
12. [Setup Postman](#12-setup-postman)
13. [Urutan Full Integration Testing](#13-urutan-full-integration-testing)
14. [Status Testing](#14-status-testing)
15. [Dokumentasi Pecahan per Fitur](#15-dokumentasi-pecahan-per-fitur)
16. [Catatan Penutup](#16-catatan-penutup)

---

## 1. Overview

**Bento-do** adalah backend REST API untuk aplikasi produktivitas mahasiswa yang berfokus pada:

- 👤 **Guest Mode** untuk masuk tanpa login
- 📝 **Bank Tugas** untuk menampung semua task
- 🎯 **Rule of 3** agar dashboard hanya menampilkan maksimal 3 task prioritas
- ⏱️ **Focus Session** untuk mode fokus
- ⚡ **Energy System** untuk membatasi beban kerja harian
- 🔔 **In-App Notifications** dan **Deadline Reminder Lifecycle**

Base URL lokal:

```text
http://localhost:5000/api/v1
````

Root health check:

```text
http://localhost:5000/
```

---

## 2. Tujuan Project

Backend Bento-do dibuat untuk menyelesaikan beberapa masalah umum mahasiswa:

* terlalu banyak task sehingga sulit menentukan prioritas
* kehilangan momentum karena onboarding yang terlalu berat
* mudah burnout karena semua tugas terlihat sekaligus
* sulit menjaga energi mental saat belajar
* butuh flow belajar yang lebih sederhana dan terarah

Karena itu backend tidak hanya menyimpan data, tapi juga menjalankan logika utama aplikasi seperti:

* pemilihan maksimal 3 task prioritas
* validasi guest limit
* focus session tracking
* perhitungan energy
* sinkronisasi deadline reminder

---

## 3. Stack & Teknologi

Backend menggunakan:

* **Express.js** → web framework
* **PostgreSQL (Neon)** → database utama
* **JWT** → autentikasi user login
* **Zod** → validasi input request
* **Helmet** → security headers
* **CORS** → kontrol origin frontend
* **Cookie Parser** → parsing cookie
* **express-xss-sanitizer** → sanitasi input

---

## 4. Prinsip Arsitektur Backend

Backend Bento-do memakai prinsip:

### 4.1 Thin Client, Fat API

Frontend dibuat ringan. Semua logika utama diproses di backend, misalnya:

* Rule of 3
* energy calculation
* task filtering
* deadline reminder lifecycle
* login wall guest

### 4.2 RESTful & Versioned API

Semua endpoint utama memakai prefix:

```text
/api/v1
```

### 4.3 Soft Delete

Data penting seperti task dan notification tidak dihapus permanen, tetapi menggunakan `deleted_at`.

### 4.4 UUID First

Entity utama menggunakan UUID agar lebih aman dan stabil untuk distributed flow.

### 4.5 Never Trust the Client

Semua input penting divalidasi di backend, termasuk:

* body
* params
* query
* ownership access

### 4.6 Pagination by Default

Endpoint list memakai pagination agar tetap aman saat data bertambah banyak.

---

## 5. Struktur Folder

```text
src/
├── app.js
├── server.js
├── config/
│   └── db.js
├── middlewares/
│   ├── auth.middleware.js
│   ├── guestOrAuth.middleware.js
│   ├── loginWall.middleware.js
│   ├── error.middleware.js
│   └── validate.middleware.js
├── modules/
│   ├── auth/
│   ├── guest/
│   ├── tasks/
│   ├── templates/
│   ├── dashboard/
│   ├── focus/
│   ├── energy/
│   └── notifications/
└── utils/
    └── jwt.js
```

---

## 6. Environment Variables

Salin `.env.example` ke `.env`, lalu isi seperti ini:

```env
PORT=5000
DATABASE_URL=your_neon_database_url
JWT_SECRET=your_jwt_secret
JWT_EXPIRES=7d
CLIENT_ORIGINS=http://localhost:5173
DB_SSL=true
DB_POOL_MAX=10
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=10000
```

> ⚠️ Jangan commit file `.env` ke repository.

---

## 7. Konsep Identitas Pengguna

Bento-do mendukung **2 jenis identitas**.

### 7.1 User Login

User login memakai JWT Bearer Token:

```text
Authorization: Bearer <token>
```

### 7.2 Guest Session

Guest memakai session token khusus:

```text
x-guest-session-token: <guest_session_token>
```

Guest bisa:

* membuat task awal
* melihat dashboard tertentu
* merasakan flow aplikasi tanpa login

Tetapi guest akan dibatasi oleh **login wall** di kondisi tertentu.

---

## 8. Struktur Data Inti

Berikut entity utama yang dipakai backend:

### 8.1 User

Menyimpan akun user terdaftar.

### 8.2 Guest Session

Mewakili identitas guest sementara.

### 8.3 Task

Entity utama Bank Tugas.

Field penting task:

* `id`
* `user_id`
* `guest_session_id`
* `title`
* `energy_weight`
* `deadline`
* `status`
* `used_timer`
* `timer_duration`
* `source_template`
* `completed_at`
* `deleted_at`

### 8.4 Focus Session

Menyimpan sesi fokus user/guest.

### 8.5 Energy Log

Mencatat perubahan energi.

### 8.6 Notification

Menyimpan in-app notification dan deadline reminder.

Field penting notification:

* `id`
* `user_id`
* `task_id`
* `message`
* `type`
* `scheduled_at`
* `sent_at`
* `is_read`
* `deleted_at`

---

## 9. Modul API

---

## 9.1 Health Check

### `GET /`

Digunakan untuk mengecek apakah server berjalan.

**Response 200**

```json
{
  "success": true,
  "message": "Hello World! Selamat datang di Bento-do API 🚀"
}
```

---

## 9.2 Guest Mode

### `POST /api/v1/guest`

Membuat guest session baru.

**Response 201**

```json
{
  "success": true,
  "message": "Guest session berhasil dibuat.",
  "data": {
    "session_token": "guest-session-token"
  }
}
```

### Ringkasan Guest Mode

* guest bisa membuat task awal
* guest maksimal memiliki 3 task aktif
* task ke-4 akan diblok
* guest bisa dimigrasikan ke user saat register/login

---

## 9.3 Auth

### `POST /api/v1/auth/register`

Register user baru.

**Body**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "display_name": "User Test"
}
```

**Response 201**

```json
{
  "success": true,
  "message": "Register berhasil.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "display_name": "User Test",
      "current_energy": 240,
      "max_energy": 240,
      "created_at": "timestamp"
    },
    "token": "jwt-token",
    "migrated_tasks_count": 0
  }
}
```

### `POST /api/v1/auth/login`

Login user.

**Body**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response 200**

```json
{
  "success": true,
  "message": "Login berhasil.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "display_name": "User Test"
    },
    "token": "jwt-token",
    "migrated_tasks_count": 0
  }
}
```

### Guest Migration

Jika auth request membawa header:

```text
x-guest-session-token: <guest_session_token>
```

maka task guest dapat dipindahkan ke akun user.

---

## 9.4 Tasks / Bank Tugas

### `POST /api/v1/tasks`

Membuat task baru.

**Body contoh**

```json
{
  "title": "Belajar Statistik",
  "energy_weight": "Sedang",
  "deadline": "2026-05-20T12:00:00Z"
}
```

### `GET /api/v1/tasks?page=1&limit=20`

Mengambil list task milik user/guest.

**Response 200**

```json
{
  "success": true,
  "page": 1,
  "limit": 20,
  "total_items": 5,
  "total_pages": 1,
  "data": []
}
```

### `GET /api/v1/tasks/:id`

Mengambil detail task.

### `PUT /api/v1/tasks/:id`

Mengupdate task.

Contoh mark done:

```json
{
  "status": "done"
}
```

Jika task selesai, response bisa memuat:

* `energy`
* `energy_effects`

### `DELETE /api/v1/tasks/:id`

Soft delete task.

---

## 9.5 Templates

Module Templates menyediakan starter task hardcoded untuk membantu user memulai pekerjaan lebih cepat. 📚

### `GET /api/v1/templates`

Mengambil daftar template yang tersedia.

### `POST /api/v1/templates/apply/:template_key`

Meng-apply template dan membuat beberapa task sekaligus.

### Template aktif saat ini

* `makalah`
* `presentasi`
* `praktikum`
* `ujian`

### Ringkasan hasil testing Templates

* get templates berhasil
* semua template berhasil di-apply
* task hasil template masuk ke task list
* `source_template` tersimpan dengan benar
* guest diblok oleh login wall
* invalid template key ditolak

---

## 9.6 Dashboard / Rule of 3

### `GET /api/v1/dashboard/zen`

Mengambil maksimal 3 task prioritas.

**Response 200**

```json
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
      "title": "Belajar UAS",
      "energy_weight": "Sedang",
      "status": "pending"
    }
  ]
}
```

### Fungsi utama dashboard

* hanya menampilkan maksimal 3 task
* memberi tahu jumlah task yang disembunyikan
* membantu user fokus pada prioritas

---

## 9.7 Focus

### `POST /api/v1/focus/start`

Memulai focus session untuk task tertentu.

**Body**

```json
{
  "task_id": "uuid-task"
}
```

### `GET /api/v1/focus/active`

Mengambil sesi fokus aktif.

### `POST /api/v1/focus/:id/stop`

Menghentikan focus session.

**Body escaped**

```json
{
  "end_reason": "escaped"
}
```

**Body completed**

```json
{
  "end_reason": "completed"
}
```

### Ringkasan behavior focus

* hanya boleh ada 1 sesi fokus aktif
* stop `escaped` tidak menganggap task selesai
* stop `completed` bisa mengubah task menjadi `done`
* zombie timer bisa dihentikan otomatis

---

## 9.8 Energy

### `GET /api/v1/energy`

Mengambil summary energi user.

**Response 200**

```json
{
  "success": true,
  "data": {
    "current_energy": 240,
    "max_energy": 240,
    "is_critical_energy": false,
    "energy_reset_at": "timestamp"
  }
}
```

### `GET /api/v1/energy/logs?page=1&limit=20`

Mengambil histori perubahan energi.

### Mekanisme energi penting

* max energy harian = `240`
* retroactive deduction saat task selesai tanpa timer
* timer deduction saat focus berjalan
* dopamine rescue saat energi kritis + task ringan selesai
* leftover trap saat energi hampir habis
* energy depleted memblokir start focus

---

## 9.9 Notifications

### `GET /api/v1/notifications`

Mengambil daftar notifikasi inbox yang visible.

**Response 200**

```json
{
  "success": true,
  "page": 1,
  "limit": 20,
  "total_items": 3,
  "total_pages": 1,
  "unread_count": 2,
  "data": [
    {
      "id": "uuid",
      "task_id": "uuid-task",
      "message": "Deadline tugas kamu besok malam.",
      "type": "deadline_reminder",
      "scheduled_at": "timestamp",
      "sent_at": "timestamp-or-null",
      "is_read": false
    }
  ]
}
```

### Filter unread

```text
GET /api/v1/notifications?is_read=false
```

### Filter by type

```text
GET /api/v1/notifications?type=deadline_reminder
```

### `PUT /api/v1/notifications/:id/read`

Menandai satu notifikasi sebagai sudah dibaca.

### `PUT /api/v1/notifications/read-all`

Menandai semua notifikasi visible sebagai sudah dibaca.

### `DELETE /api/v1/notifications/:id`

Soft delete notifikasi.

---

## 10. Business Rules Penting

### 10.1 Guest Limit

Guest maksimal memiliki **3 task aktif**.

### 10.2 Rule of 3

Dashboard hanya mengembalikan maksimal **3 task prioritas**.

### 10.3 One Active Focus Session

Satu user hanya boleh memiliki **1 focus session aktif** pada satu waktu.

### 10.4 Energy Cap

Energi maksimum harian adalah **240**.

### 10.5 Visible Notification Rule

Inbox notifications hanya menampilkan row yang memenuhi:

* `scheduled_at <= NOW()`
* `deleted_at IS NULL`

### 10.6 Soft Delete Strategy

Task dan notification tidak dihapus permanen, tetapi memakai `deleted_at`.

---

## 11. Deadline Reminder Lifecycle

Backend memastikan `deadline_reminder` ikut sinkron dengan lifecycle task:

### 11.1 Saat task dibuat dengan deadline

* reminder dibuat

### 11.2 Saat deadline diubah

* reminder ikut diupdate
* tidak mendobel reminder aktif

### 11.3 Saat deadline dihapus

* reminder di-soft delete

### 11.4 Saat task menjadi done

* reminder di-soft delete

### 11.5 Saat task dihapus

* reminder di-soft delete

### 11.6 Saat task selesai via focus

* reminder di-soft delete

### 11.7 Saat guest task dimigrasikan ke user

* reminder dibuat untuk task hasil migrasi

> Catatan: lifecycle ini diverifikasi dengan kombinasi **API testing** dan **pengecekan database manual**.

---

## 12. Setup Postman

Environment yang dipakai saat full testing:

```text
base_root = http://localhost:5000
base_url = http://localhost:5000/api/v1

token_user =
token_user_2 =
token_guest_migrated =

user_id =
user_id_2 =
user_id_guest_migrated =

guest_session_token =

task_id =
task_id_2 =
task_id_3 =
task_id_deadline =
task_id_focus =
task_id_delete =
task_id_done =
task_id_guest_migration =
task_id_due_reminder =

focus_session_id =
notification_id =
```

### Header user

```text
Authorization: Bearer {{token_user}}
```

### Header guest

```text
x-guest-session-token: {{guest_session_token}}
```

---

## 13. Urutan Full Integration Testing

Collection testing dibagi per folder:

```text
00 - Setup
01 - Health Check
02 - Guest Mode & Login Wall
03 - Auth
04 - Tasks - Bank Tugas
05 - Templates
06 - Dashboard - Rule of 3
07 - Focus
08 - Energy
09 - Notifications - In App
10 - Deadline Reminder Lifecycle
11 - Negative & Security Cases
12 - Cleanup
```

Urutan ini dipakai untuk pengujian end-to-end.

---

## 14. Status Testing

Semua folder berikut sudah dijalankan dan berhasil:

* ✅ 00 - Setup
* ✅ 01 - Health Check
* ✅ 02 - Guest Mode & Login Wall
* ✅ 03 - Auth
* ✅ 04 - Tasks - Bank Tugas
* ✅ 05 - Templates
* ✅ 06 - Dashboard - Rule of 3
* ✅ 07 - Focus
* ✅ 08 - Energy
* ✅ 09 - Notifications - In App
* ✅ 10 - Deadline Reminder Lifecycle
* ✅ 11 - Negative & Security Cases
* ✅ 12 - Cleanup

### Hasil akhir

* full integration testing **passed**
* ownership/security checks **passed**
* deadline reminder lifecycle **passed**
* backend core architecture dianggap **final untuk scope MVP saat ini**

---

## 15. Dokumentasi Pecahan per Fitur

Agar dokumentasi lebih rapi, detail per modul dipisah ke file terpisah:

* `Dokumentasi Auth API.md`
* `Dokumentasi Guest API.md`
* `Dokumentasi Tasks API.md`
* `Dokumentasi Templates API.md`
* `Dokumentasi Dashboard API.md`
* `Dokumentasi Focus API.md`
* `Dokumentasi Energy API.md`
* `Dokumentasi Notifications API.md`

Dokumen induk ini berfungsi sebagai:

* gambaran umum project
* indeks dokumentasi
* ringkasan arsitektur backend
* ringkasan hasil testing

---

## 16. Catatan Penutup

### Hal yang perlu diperhatikan

* visibility notifikasi inbox sangat bergantung pada:

  * `scheduled_at <= NOW()`
* reminder deadline yang belum masuk waktu tampil **tidak akan muncul** di endpoint `/notifications`, walaupun row-nya sudah ada di database
* push notification ke device/browser via FCM **belum termasuk** dalam final scope backend ini

### Scope backend yang saat ini sudah final

* Auth
* Guest session
* Tasks / Bank Tugas
* Templates
* Dashboard / Rule of 3
* Focus
* Energy
* In-app notifications
* Deadline reminder lifecycle

### Status akhir

🎉 **Arsitektur backend Bento-do untuk scope MVP saat ini sudah selesai, stabil, dan lulus full integration testing.**

