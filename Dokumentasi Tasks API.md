
# 📝 Dokumentasi REST API — Tasks Bento-do

> Stack: Express.js · PostgreSQL (Neon) · UUID · Zod · Guest/User Identity · Pagination

---

## 📚 Daftar Isi

1. [Overview](#1-overview)
2. [Tujuan Module Tasks](#2-tujuan-module-tasks)
3. [Struktur Folder](#3-struktur-folder)
4. [Cara Kerja Tasks](#4-cara-kerja-tasks)
   - [4.1 Create Task](#41-create-task)
   - [4.2 Get Tasks List](#42-get-tasks-list)
   - [4.3 Get Task By ID](#43-get-task-by-id)
   - [4.4 Update Task](#44-update-task)
   - [4.5 Delete Task](#45-delete-task)
   - [4.6 Integrasi dengan Energy](#46-integrasi-dengan-energy)
5. [Setup Postman](#5-setup-postman)
6. [API Reference](#6-api-reference)
   - [6.1 Create Task](#61-create-task)
   - [6.2 Get Tasks](#62-get-tasks)
   - [6.3 Get Task By ID](#63-get-task-by-id)
   - [6.4 Update Task](#64-update-task)
   - [6.5 Delete Task](#65-delete-task)
7. [Task Object](#7-task-object)
8. [Business Rules Penting](#8-business-rules-penting)
9. [Status Code yang Umum Dipakai](#9-status-code-yang-umum-dipakai)
10. [Catatan Penting](#10-catatan-penting)

---

## 1. Overview

Module Tasks adalah inti dari **Bank Tugas** di Bento-do. 📦

Task digunakan untuk:
- menyimpan semua pekerjaan user/guest
- memberi label beban energi (`Ringan`, `Sedang`, `Berat`)
- menyimpan deadline
- mendukung dashboard Rule of 3
- mendukung Focus Mode
- memicu perhitungan energi
- menjadi sumber reminder deadline

Base URL lokal:

```text id="oqqp0t"
http://localhost:5000/api/v1/tasks
````

---

## 2. Tujuan Module Tasks

Module ini dibuat agar user bisa:

* ✍️ mencatat tugas dengan cepat
* 🧠 mengelompokkan tugas berdasarkan energi
* ⏰ menambahkan deadline
* ✅ menandai tugas selesai
* 🗑️ menghapus tugas secara aman (soft delete)
* 🔄 memakai task yang sama untuk dashboard, focus, energy, dan notifications

Tasks mendukung dua jenis identitas:

* **guest**
* **user login**

---

## 3. Struktur Folder

```text id="gx1f1a"
src/
├── middlewares/
│   ├── guestOrAuth.middleware.js
│   └── validate.middleware.js
├── modules/
│   └── tasks/
│       ├── tasks.controller.js
│       ├── tasks.service.js
│       ├── tasks.repository.js
│       ├── tasks.routes.js
│       └── tasks.validation.js
└── modules/
    ├── auth/
    ├── guest/
    ├── dashboard/
    ├── focus/
    ├── energy/
    └── notifications/
```

---

## 4. Cara Kerja Tasks

### 4.1 Create Task

Task bisa dibuat oleh:

* user login
* guest

Identitas dibaca dari:

* `Authorization: Bearer <token>` untuk user
* `x-guest-session-token` untuk guest

Field utama task:

* `title`
* `energy_weight`
* `deadline` (opsional)

---

### 4.2 Get Tasks List

Endpoint list task mendukung pagination:

```text id="rnur1w"
GET /api/v1/tasks?page=1&limit=20
```

Response list berisi:

* `page`
* `limit`
* `total_items`
* `total_pages`
* `data`

Ini penting supaya list task tetap ringan dan aman saat jumlah task banyak.

---

### 4.3 Get Task By ID

User/guest hanya bisa mengambil task miliknya sendiri.

Kalau task:

* tidak ada
* atau bukan milik user/guest yang sedang request

maka backend mengembalikan `404`.

---

### 4.4 Update Task

Task bisa diupdate untuk:

* mengganti title
* mengganti deadline
* mengganti status
* menyesuaikan field lain yang diizinkan

Update paling penting adalah:

```json id="zj30wl"
{
  "status": "done"
}
```

karena ini bisa memicu:

* perubahan energi
* reminder lifecycle
* integrasi ke module lain

---

### 4.5 Delete Task

Delete task di Bento-do menggunakan **soft delete**, bukan hard delete.

Artinya:

* task tidak benar-benar hilang dari database
* task ditandai dengan `deleted_at`
* module lain seperti notifications masih bisa menjaga histori relasi

---

### 4.6 Integrasi dengan Energy

Saat task selesai, backend bisa mengembalikan data tambahan:

* `energy`
* `energy_effects`

Contohnya saat task selesai tanpa timer:

* `retroactive_deduction`

Contohnya saat task selesai dalam kondisi energi kritis:

* `dopamine_rescue`

Jadi module Tasks tidak berdiri sendiri, tapi terhubung ke **Energy Module**.

---

## 5. Setup Postman

### 5.1 Environment

Tambahkan variabel berikut di Postman environment:

```text id="49xw3v"
base_url = http://localhost:5000/api/v1
token_user =
guest_session_token =
task_id =
task_id_deadline =
```

---

### 5.2 Request sebagai User

Gunakan header:

```text id="bzm58z"
Authorization: Bearer {{token_user}}
```

---

### 5.3 Request sebagai Guest

Gunakan header:

```text id="s412e4"
x-guest-session-token: {{guest_session_token}}
```

---

### 5.4 Auto Save Task ID

Di request create task, tempel script ini di tab **Tests**:

```javascript id="iqod0a"
const json = pm.response.json();

pm.environment.set("task_id", json.data.id);
```

Untuk task deadline:

```javascript id="s5j8yl"
const json = pm.response.json();

pm.environment.set("task_id_deadline", json.data.id);
```

---

## 6. API Reference

---

## 6.1 Create Task

### `POST /api/v1/tasks`

Membuat task baru.

### Headers (User)

```text id="g4do3n"
Authorization: Bearer {{token_user}}
Content-Type: application/json
```

### Headers (Guest)

```text id="wv8wjh"
x-guest-session-token: {{guest_session_token}}
Content-Type: application/json
```

### Body contoh task basic

```json id="eus0p1"
{
  "title": "FULL-TASK Basic No Deadline",
  "energy_weight": "Ringan"
}
```

### Body contoh task dengan deadline

```json id="zwdyf9"
{
  "title": "FULL-TASK With Deadline",
  "energy_weight": "Sedang",
  "deadline": "2026-05-20T12:00:00Z"
}
```

### Response `201`

```json id="t4446q"
{
  "success": true,
  "message": "Tugas berhasil dibuat.",
  "data": {
    "id": "uuid",
    "user_id": "uuid-user",
    "guest_session_id": null,
    "title": "FULL-TASK With Deadline",
    "energy_weight": "Sedang",
    "deadline": "2026-05-20T12:00:00.000Z",
    "status": "pending",
    "used_timer": false,
    "timer_duration": null,
    "source_template": null,
    "completed_at": null,
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

### Response guest limit `403`

Jika guest mencoba membuat task ke-4:

```json id="63q1bo"
{
  "success": false,
  "message": "Batas guest telah tercapai. Silakan login atau register untuk menambah tugas lagi.",
  "require_login": true,
  "code": "GUEST_TASK_LIMIT_REACHED"
}
```

---

## 6.2 Get Tasks

### `GET /api/v1/tasks?page=1&limit=20`

Mengambil daftar task milik user/guest dengan pagination.

### Headers

Gunakan salah satu:

* Bearer token user
* guest session token

### Response `200`

```json id="n8x91j"
{
  "success": true,
  "page": 1,
  "limit": 20,
  "total_items": 5,
  "total_pages": 1,
  "data": [
    {
      "id": "uuid",
      "title": "FULL-TASK Basic No Deadline",
      "energy_weight": "Ringan",
      "deadline": null,
      "status": "pending"
    }
  ]
}
```

---

## 6.3 Get Task By ID

### `GET /api/v1/tasks/:id`

Mengambil detail task berdasarkan ID.

### Response `200`

```json id="jlwm31"
{
  "success": true,
  "message": "Detail tugas berhasil diambil.",
  "data": {
    "id": "uuid",
    "user_id": "uuid-user",
    "guest_session_id": null,
    "title": "FULL-TASK Basic No Deadline",
    "energy_weight": "Ringan",
    "deadline": null,
    "status": "pending",
    "used_timer": false,
    "timer_duration": null,
    "source_template": null,
    "completed_at": null,
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

### Response `404`

Kalau task tidak ditemukan / bukan milik requester:

```json id="jlwm32"
{
  "success": false,
  "message": "Tugas tidak ditemukan!"
}
```

---

## 6.4 Update Task

### `PUT /api/v1/tasks/:id`

Mengupdate task.

### Headers

```text id="qjlwm3"
Authorization: Bearer {{token_user}}
Content-Type: application/json
```

### Contoh update title + deadline

```json id="7njlwm"
{
  "title": "FULL-TASK Updated Deadline",
  "deadline": "2026-05-22T15:00:00Z"
}
```

### Response `200`

```json id="jlwm34"
{
  "success": true,
  "message": "Tugas berhasil diperbarui.",
  "data": {
    "id": "uuid",
    "title": "FULL-TASK Updated Deadline",
    "deadline": "2026-05-22T15:00:00.000Z",
    "status": "pending"
  }
}
```

---

### Mark Task Done

### Body

```json id="azjlwm"
{
  "status": "done"
}
```

### Response `200`

Contoh saat task selesai tanpa timer:

```json id="jlwm36"
{
  "success": true,
  "message": "Tugas berhasil diperbarui.",
  "data": {
    "id": "uuid",
    "title": "FULL-TASK Basic No Deadline",
    "status": "done",
    "used_timer": false,
    "completed_at": "timestamp"
  },
  "energy": {
    "current_energy": 225,
    "max_energy": 240,
    "is_critical_energy": false,
    "energy_reset_at": "timestamp"
  },
  "energy_effects": [
    {
      "change_amount": -15,
      "reason": "retroactive_deduction",
      "energy_before": 240,
      "energy_after": 225
    }
  ]
}
```

---

## 6.5 Delete Task

### `DELETE /api/v1/tasks/:id`

Soft delete task.

### Response `200`

```json id="jlwm37"
{
  "success": true,
  "message": "Tugas berhasil dihapus."
}
```

---

## 7. Task Object

Field umum task di Bento-do:

```json id="jlwm38"
{
  "id": "uuid",
  "user_id": "uuid-user-or-null",
  "guest_session_id": "uuid-guest-or-null",
  "title": "Nama tugas",
  "energy_weight": "Ringan | Sedang | Berat",
  "deadline": "timestamp-or-null",
  "status": "pending | in_progress | done",
  "used_timer": false,
  "timer_duration": null,
  "source_template": "Makalah | Ujian | null",
  "completed_at": "timestamp-or-null",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

---

## 8. Business Rules Penting

### 8.1 Identity-aware Task Access

Task hanya bisa diakses oleh pemiliknya:

* user berdasarkan `user_id`
* guest berdasarkan `guest_session_id`

### 8.2 Guest Limit

Guest maksimal memiliki **3 task aktif**.
Task ke-4 akan diblok oleh login wall.

### 8.3 Deadline is Optional

Field `deadline` boleh `null`.

### 8.4 Status Task

Status utama task:

* `pending`
* `in_progress`
* `done`

### 8.5 Soft Delete

Delete task tidak menghapus permanen data dari DB.

### 8.6 Energy Integration

Saat task jadi `done`, backend dapat memicu:

* retroactive deduction
* reward tertentu seperti dopamine rescue

### 8.7 Reminder Integration

Kalau task punya deadline, module notifications dapat membuat `deadline_reminder`.

---

## 9. Status Code yang Umum Dipakai

| Status Code | Arti                                          |
| ----------- | --------------------------------------------- |
| `200`       | Get/update/delete task berhasil               |
| `201`       | Create task berhasil                          |
| `400`       | Payload atau UUID tidak valid                 |
| `401`       | Auth/token tidak valid pada endpoint tertentu |
| `403`       | Guest diblok oleh login wall                  |
| `404`       | Task tidak ditemukan / bukan milik requester  |

---

## 10. Catatan Penting

### ✅ Yang sudah diverifikasi saat testing

* Create task basic berhasil
* Create task dengan deadline berhasil
* Get tasks list + pagination berhasil
* Get task by ID berhasil
* Update title/deadline berhasil
* Mark task done berhasil
* Delete task berhasil
* Invalid UUID ditolak
* User lain tidak bisa membaca/update task milik user lain

### ⚠️ Catatan implementasi

* Tasks mendukung **guest** dan **user login**
* Guest memakai:

```text id="jlwm39"
x-guest-session-token
```

* User login memakai:

```text id="jlwm40"
Authorization: Bearer <token>
```

* Response update task bisa mengandung data energi tambahan tergantung kondisi task

### 🧪 Folder Postman terkait tasks

```text id="jlwm41"
04 - Tasks - Bank Tugas
├── 04.1 - Create Task Basic
├── 04.2 - Create Task With Deadline
├── 04.3 - Get Tasks List
├── 04.4 - Get Task By ID
├── 04.5 - Update Task Deadline
├── 04.6 - Mark Task Done Without Timer
├── 04.7 - Delete Task
└── 04.8 - Get Task Invalid UUID
```

### ✅ Status akhir

Module **Tasks / Bank Tugas** sudah diuji dan **pass** dalam full integration testing.

