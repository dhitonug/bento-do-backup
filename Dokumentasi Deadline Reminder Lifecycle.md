
# ⏰ Dokumentasi Deadline Reminder Lifecycle — Bento-do

> Stack: Express.js · PostgreSQL (Neon) · Tasks Module · Notifications Module · Soft Delete · Guest Migration

---

## 📑 Daftar Isi

1. [Overview](#1-overview)
2. [Tujuan Lifecycle Reminder](#2-tujuan-lifecycle-reminder)
3. [Modul yang Terlibat](#3-modul-yang-terlibat)
4. [Konsep Reminder Lifecycle](#4-konsep-reminder-lifecycle)
5. [Trigger Utama Reminder](#5-trigger-utama-reminder)
   - [5.1 Create Task with Deadline](#51-create-task-with-deadline)
   - [5.2 Update Deadline](#52-update-deadline)
   - [5.3 Remove Deadline](#53-remove-deadline)
   - [5.4 Mark Task Done](#54-mark-task-done)
   - [5.5 Delete Task](#55-delete-task)
   - [5.6 Complete Task via Focus](#56-complete-task-via-focus)
   - [5.7 Guest Task Migration](#57-guest-task-migration)
6. [Struktur Data Reminder](#6-struktur-data-reminder)
7. [Visibility Reminder di Inbox](#7-visibility-reminder-di-inbox)
8. [Verifikasi Manual via Database](#8-verifikasi-manual-via-database)
9. [Testing Postman — Folder 10](#9-testing-postman--folder-10)
10. [Business Rules Penting](#10-business-rules-penting)
11. [Catatan Penting](#11-catatan-penting)
12. [Kesimpulan](#12-kesimpulan)

---

## 1. Overview

Deadline Reminder Lifecycle adalah mekanisme sinkronisasi otomatis antara **task** dan **notification** di Bento-do. 🔔

Fitur ini memastikan bahwa reminder deadline:
- dibuat saat task punya deadline
- diperbarui saat deadline berubah
- dihapus secara soft delete saat task tidak lagi membutuhkan reminder

Lifecycle ini penting karena module notifications di Bento-do bukan sekadar inbox manual, tetapi bagian dari alur kerja task yang hidup dan berubah.

---

## 2. Tujuan Lifecycle Reminder

Lifecycle reminder dibuat agar backend bisa:

- ⏰ membuat reminder deadline secara otomatis
- 🔄 menjaga reminder tetap sinkron saat deadline berubah
- 🧹 membersihkan reminder saat task selesai / dihapus
- 👤 menangani migrasi task guest ke user dengan benar
- 📥 memastikan inbox notifikasi hanya menampilkan reminder yang relevan

Dengan kata lain, reminder tidak dikelola manual oleh frontend.  
Semua logika inti ada di backend.

---

## 3. Modul yang Terlibat

Fitur ini melibatkan beberapa module sekaligus:

```text id="yqtsud"
tasks/
focus/
auth/
guest/
notifications/
````

Secara praktik, trigger lifecycle reminder bisa datang dari:

* create/update/delete task
* stop focus dengan `completed`
* register/login dengan guest migration

---

## 4. Konsep Reminder Lifecycle

Reminder lifecycle bekerja dengan prinsip:

* **task adalah sumber kebenaran utama**
* **notification mengikuti state task**
* backend menjaga agar reminder tidak dobel aktif
* penghapusan reminder dilakukan dengan **soft delete**

Artinya:

* reminder aktif tidak boleh berjumlah lebih dari satu untuk satu task deadline yang sama
* reminder lama tidak hard delete
* reminder yang sudah tidak relevan cukup diisi `deleted_at`

---

## 5. Trigger Utama Reminder

---

## 5.1 Create Task with Deadline

### Kondisi

User membuat task baru dengan field `deadline` terisi.

### Contoh request

```json id="p90u13"
{
  "title": "LIFE-REMINDER Create",
  "energy_weight": "Sedang",
  "deadline": "2026-05-25T12:00:00Z"
}
```

### Efek backend

* task berhasil dibuat
* backend membuat row notification dengan:

  * `type = deadline_reminder`
  * `task_id` mengarah ke task yang baru
  * `deleted_at = null`

### Expected DB state

* ada 1 row deadline reminder aktif untuk task tersebut

---

## 5.2 Update Deadline

### Kondisi

Deadline task diubah ke waktu baru.

### Contoh request

```json id="a5iakd"
{
  "deadline": "2026-05-28T15:00:00Z"
}
```

### Efek backend

* task deadline diperbarui
* reminder lama **tidak didobel**
* `scheduled_at` reminder aktif ikut diperbarui

### Expected DB state

* `active_reminder_count = 1`
* `scheduled_at` berubah mengikuti deadline baru

---

## 5.3 Remove Deadline

### Kondisi

Deadline task dihapus (`deadline = null`).

### Contoh request

```json id="owiqv3"
{
  "deadline": null
}
```

### Efek backend

* task tetap ada
* deadline dihapus
* reminder deadline di-soft delete

### Expected DB state

* row reminder masih ada
* `deleted_at` terisi
* reminder aktif menjadi `0`

---

## 5.4 Mark Task Done

### Kondisi

Task diupdate menjadi selesai.

### Contoh request

```json id="6yrm27"
{
  "status": "done"
}
```

### Efek backend

* task berubah menjadi `done`
* reminder deadline tidak lagi relevan
* reminder di-soft delete

### Expected DB state

* row `deadline_reminder` masih ada
* `deleted_at` terisi

---

## 5.5 Delete Task

### Kondisi

Task dihapus dari endpoint tasks.

### Efek backend

* task di-soft delete
* reminder deadline terkait ikut di-soft delete

### Expected DB state

* row reminder terkait task tetap ada
* `deleted_at` terisi

---

## 5.6 Complete Task via Focus

### Kondisi

Task diselesaikan melalui flow focus session dengan:

```json id="k4zr8f"
{
  "end_reason": "completed"
}
```

### Efek backend

* focus session berhenti
* task berubah menjadi `done`
* reminder deadline ikut di-soft delete

### Expected DB state

* row reminder terkait task focus tetap ada
* `deleted_at` terisi

---

## 5.7 Guest Task Migration

### Kondisi

Guest membuat task dengan deadline, lalu register/login menjadi user.

### Flow

1. guest membuat session
2. guest membuat task dengan deadline
3. task masih memakai `guest_session_id`
4. user register/login dengan header guest token
5. task dipindahkan ke user
6. backend membuat deadline reminder untuk task hasil migrasi

### Expected DB state

* sebelum migrasi: belum ada reminder aktif untuk task guest
* sesudah migrasi:

  * task memiliki `user_id`
  * `guest_session_id` menjadi `null`
  * reminder deadline dibuat

---

## 6. Struktur Data Reminder

Reminder disimpan sebagai row di tabel `notifications`.

Contoh bentuk reminder:

```json id="t2ehlf"
{
  "id": "uuid",
  "user_id": "uuid-user",
  "task_id": "uuid-task",
  "message": "Deadline tugas kamu besok malam.",
  "type": "deadline_reminder",
  "scheduled_at": "timestamp",
  "sent_at": "timestamp-or-null",
  "is_read": false,
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "deleted_at": null
}
```

Field penting:

* `user_id`
* `task_id`
* `type = deadline_reminder`
* `scheduled_at`
* `deleted_at`

---

## 7. Visibility Reminder di Inbox

Penting untuk dipahami:

Reminder deadline **bisa saja sudah ada di database tetapi belum muncul di inbox**.

Agar reminder tampil di endpoint `/notifications`, row harus memenuhi:

```sql id="vrqumo"
scheduled_at <= NOW()
AND deleted_at IS NULL
```

Jadi ada dua level validasi reminder:

### Level 1 — Reminder Exists

Dicek dari tabel `notifications`

### Level 2 — Reminder Visible

Dicek dari endpoint inbox / query visibility

Ini menjelaskan kenapa saat testing:

* row deadline reminder sudah ada
* tetapi endpoint `/notifications` masih bisa kosong

---

## 8. Verifikasi Manual via Database

Selama testing lifecycle, verifikasi dilakukan dengan query SQL manual di Neon.

### 8.1 Cek reminder berdasarkan task

```sql id="1gu479"
SELECT
  id,
  user_id,
  task_id,
  type,
  scheduled_at,
  sent_at,
  is_read,
  deleted_at,
  created_at,
  updated_at
FROM notifications
WHERE task_id = '<task_id>'
ORDER BY created_at DESC;
```

### 8.2 Cek reminder aktif

```sql id="9vqqty"
SELECT COUNT(*)::int AS active_reminder_count
FROM notifications
WHERE task_id = '<task_id>'
AND type = 'deadline_reminder'
AND deleted_at IS NULL;
```

### 8.3 Cek visibility reminder

```sql id="wjb9um"
SELECT
  id,
  scheduled_at,
  NOW() AS db_now,
  (scheduled_at <= NOW()) AS should_be_visible,
  deleted_at,
  (deleted_at IS NULL) AS is_active
FROM notifications
WHERE id = '<notification_id>';
```

### 8.4 Cek task hasil migrasi guest

```sql id="r8ws45"
SELECT
  id,
  user_id,
  guest_session_id,
  title,
  deadline,
  status
FROM tasks
WHERE id = '<task_id>';
```

---

## 9. Testing Postman — Folder 10

Folder khusus yang dipakai untuk menguji lifecycle ini:

```text id="jlwm71"
10 - Deadline Reminder Lifecycle
├── 10.1 - Create Task With Deadline
├── 10.2 - Update Deadline
├── 10.3 - Remove Deadline
├── 10.4 - Create Task For Done Test
├── 10.5 - Mark Done Removes Reminder
├── 10.6 - Create Task For Delete Test
├── 10.7 - Delete Removes Reminder
├── 10.8 - Create Task For Focus Test
├── 10.9 - Start Focus For Reminder Task
├── 10.10 - Stop Focus Completed Removes Reminder
├── 10.11 - Create Guest Session For Migration
├── 10.12 - Create Guest Task With Deadline
├── 10.13 - Register Guest Migration User
└── 10.14 - Optional Verify Migrated Task By API
```

### Yang diverifikasi dari folder ini

* create reminder saat task punya deadline
* update reminder saat deadline berubah
* soft delete reminder saat deadline dihapus
* soft delete reminder saat task selesai
* soft delete reminder saat task dihapus
* soft delete reminder saat task selesai via focus
* create reminder saat guest task dimigrasikan ke user

---

## 10. Business Rules Penting

### 10.1 Task adalah Source of Truth

Reminder selalu mengikuti kondisi task, bukan sebaliknya.

### 10.2 Satu Reminder Aktif per Task Deadline

Reminder aktif tidak boleh dobel untuk satu task deadline yang sama.

### 10.3 Reminder Menggunakan Soft Delete

Reminder yang tidak relevan lagi tidak dihapus permanen.

### 10.4 Reminder Visibility Bergantung pada `scheduled_at`

Reminder bisa valid di database tetapi belum visible di inbox.

### 10.5 Guest Tidak Punya Inbox Notification

Task guest bisa punya lifecycle terkait reminder saat migrasi, tetapi inbox notifications tetap milik user login.

### 10.6 Focus Completion Ikut Menutup Reminder

Jika task selesai dari flow focus, deadline reminder ikut dibersihkan.

---

## 11. Catatan Penting

### ✅ Yang sudah diverifikasi saat testing

* reminder dibuat saat create task dengan deadline
* reminder ikut berubah saat deadline diupdate
* reminder di-soft delete saat deadline dihapus
* reminder di-soft delete saat task ditandai done
* reminder di-soft delete saat task dihapus
* reminder di-soft delete saat task selesai via focus
* reminder dibuat saat task guest dimigrasikan ke user
* visibility reminder berhasil diverifikasi lewat DB manual check

### ⚠️ Catatan implementasi

* lifecycle reminder tidak cukup diuji dari endpoint inbox saja
* karena inbox hanya menampilkan reminder yang visible
* maka verifikasi DB manual menjadi bagian penting dari testing

### 🔍 Catatan debugging penting

Saat full testing, pernah ditemukan kasus:

* row reminder sudah ada
* tetapi inbox masih kosong

Penyebabnya:

* `scheduled_at > NOW()`

Jadi:

* backend sebenarnya sudah benar membuat reminder
* hanya saja reminder tersebut belum waktunya tampil di inbox

---

## 12. Kesimpulan

Deadline Reminder Lifecycle di Bento-do sudah berhasil diverifikasi end-to-end. ✅

Dari hasil testing dapat disimpulkan bahwa:

* reminder deadline dibuat dengan benar
* reminder tetap sinkron saat deadline berubah
* reminder dibersihkan saat task tidak lagi membutuhkan reminder
* migrasi guest ke user ikut menangani reminder dengan benar
* visibility reminder dipahami dan diverifikasi secara akurat

Dengan ini, module reminder lifecycle dapat dianggap:
**stabil, sinkron, dan final untuk scope backend MVP saat ini.**

---

