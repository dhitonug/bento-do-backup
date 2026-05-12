
# 🧪 Dokumentasi Testing Postman — Bento-do

> Dokumentasi ini berisi panduan struktur collection, environment, urutan testing, tujuan setiap folder, dan hasil akhir full integration testing backend Bento-do.

---

## 📚 Daftar Isi

1. [Overview](#1-overview)
2. [Tujuan Testing Postman](#2-tujuan-testing-postman)
3. [Environment Postman](#3-environment-postman)
4. [Struktur Collection Testing](#4-struktur-collection-testing)
5. [Penjelasan Folder per Fitur](#5-penjelasan-folder-per-fitur)
   - [5.1 Folder 00 — Setup](#51-folder-00--setup)
   - [5.2 Folder 01 — Health Check](#52-folder-01--health-check)
   - [5.3 Folder 02 — Guest Mode & Login Wall](#53-folder-02--guest-mode--login-wall)
   - [5.4 Folder 03 — Auth](#54-folder-03--auth)
   - [5.5 Folder 04 — Tasks — Bank Tugas](#55-folder-04--tasks--bank-tugas)
   - [5.6 Folder 05 — Templates](#56-folder-05--templates)
   - [5.7 Folder 06 — Dashboard — Rule of 3](#57-folder-06--dashboard--rule-of-3)
   - [5.8 Folder 07 — Focus](#58-folder-07--focus)
   - [5.9 Folder 08 — Energy](#59-folder-08--energy)
   - [5.10 Folder 09 — Notifications — In App](#510-folder-09--notifications--in-app)
   - [5.11 Folder 10 — Deadline Reminder Lifecycle](#511-folder-10--deadline-reminder-lifecycle)
   - [5.12 Folder 11 — Negative & Security Cases](#512-folder-11--negative--security-cases)
   - [5.13 Folder 12 — Cleanup](#513-folder-12--cleanup)
6. [Urutan Eksekusi Full Testing](#6-urutan-eksekusi-full-testing)
7. [Catatan Penting Selama Testing](#7-catatan-penting-selama-testing)
8. [Hasil Full Integration Testing](#8-hasil-full-integration-testing)
9. [Kesimpulan](#9-kesimpulan)

---

## 1. Overview

Testing Postman pada Bento-do disusun untuk memastikan seluruh backend core modules bekerja secara terintegrasi, bukan hanya per endpoint secara terpisah. ✅

Testing ini mencakup:
- validasi endpoint dasar
- flow guest → user
- tasks CRUD
- templates
- dashboard Rule of 3
- focus session
- energy system
- notifications
- deadline reminder lifecycle
- negative cases dan security checks
- cleanup data test

Dokumentasi ini dipakai sebagai:
- panduan testing manual
- bukti full integration testing
- referensi reviewer saat membaca PR
- acuan regression testing jika ada perubahan di masa depan

---

## 2. Tujuan Testing Postman

Testing Postman disusun agar bisa membuktikan bahwa backend Bento-do:

- 🟢 berjalan normal secara teknis
- 🔐 aman dari akses yang tidak valid
- 👤 mendukung guest mode dengan login wall
- 📝 mampu menangani seluruh lifecycle task
- 🎯 menjalankan Rule of 3 di dashboard
- ⏱️ mendukung focus session dengan baik
- ⚡ menghitung energy secara konsisten
- 🔔 menampilkan dan mengelola notifications
- ⏰ menjaga sinkronisasi deadline reminder dengan lifecycle task
- 🧹 bisa dibersihkan kembali setelah testing

---

## 3. Environment Postman

Environment yang digunakan selama full testing:

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

task_id_life_create =
task_id_life_done =
task_id_life_delete =
task_id_life_focus =
focus_session_id_life =
guest_session_token_life =
task_id_life_guest =
token_life_guest_migrated =
user_id_life_guest_migrated =
````

### Catatan

* variabel diisi otomatis lewat script Postman
* sebagian variabel dipakai untuk testing lifecycle dan ownership
* token user utama dan user kedua dipakai untuk security test

---

## 4. Struktur Collection Testing

Collection testing Bento-do dibagi menjadi 13 folder:

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

Struktur ini disusun agar:

* testing mudah dibaca
* setiap module punya ruang terpisah
* urutan testing end-to-end tetap jelas
* hasil testing lebih mudah diverifikasi ulang

---

## 5. Penjelasan Folder per Fitur

---

## 5.1 Folder 00 — Setup

### Tujuan

Menyiapkan environment dan memastikan variabel dasar Postman sudah benar.

### Isi utama

* pengecekan `base_root`
* pengecekan `base_url`
* sanity check awal sebelum menjalankan folder lain

### Hasil yang diharapkan

* environment aktif
* variabel dasar terisi
* collection siap dijalankan

---

## 5.2 Folder 01 — Health Check

### Tujuan

Memastikan backend aktif dan root endpoint merespons dengan benar.

### Endpoint utama

* `GET /`

### Yang diverifikasi

* status `200`
* response JSON valid
* field `success` dan `message` tersedia

### Hasil

* server berjalan normal
* base URL tidak salah

---

## 5.3 Folder 02 — Guest Mode & Login Wall

### Tujuan

Menguji flow guest dari awal sampai login wall.

### Yang diuji

* create guest session
* create task 1–3 sebagai guest
* guest diblok saat mencoba task ke-4
* guest dashboard tetap bisa diakses

### Hasil yang diharapkan

* guest session berhasil dibuat
* guest token tersimpan
* task ke-4 ditolak dengan:

  * `require_login = true`
  * `code = GUEST_TASK_LIMIT_REACHED`

---

## 5.4 Folder 03 — Auth

### Tujuan

Menguji register, login, duplicate email, invalid password, dan guest migration.

### Yang diuji

* register user 1
* login user 1
* register user 2
* login user 2
* register guest migration user
* login invalid password
* duplicate register

### Hasil yang diharapkan

* JWT token tersimpan
* user ID tersimpan
* duplicate email ditolak
* invalid password ditolak
* task guest berhasil dimigrasikan ke user

---

## 5.5 Folder 04 — Tasks — Bank Tugas

### Tujuan

Menguji CRUD tasks dan integrasinya dengan response pagination/energy.

### Yang diuji

* create task basic
* create task dengan deadline
* get tasks list
* get task by ID
* update task
* mark task done
* delete task
* invalid UUID

### Hasil yang diharapkan

* task berhasil dibuat dan diupdate
* pagination berjalan
* mark done bisa memunculkan `energy` dan `energy_effects`
* delete berjalan dengan benar
* invalid UUID ditolak

---

## 5.6 Folder 05 — Templates

### Tujuan

Menguji templates hardcoded dan login wall pada templates.

### Template aktif yang diuji

* `makalah`
* `presentasi`
* `praktikum`
* `ujian`

### Yang diuji

* get templates
* apply template makalah
* apply template presentasi
* apply template praktikum
* apply template ujian
* verifikasi task hasil template masuk ke task list
* guest diblok oleh login wall
* invalid template key ditolak

### Hasil yang diharapkan

* semua template berhasil di-apply
* `source_template` tersimpan sesuai nama template
* guest tidak bisa memakai template tanpa login

---

## 5.7 Folder 06 — Dashboard — Rule of 3

### Tujuan

Menguji endpoint dashboard zen dan memastikan Rule of 3 benar-benar diterapkan di backend.

### Yang diuji

* get zen dashboard
* verifikasi maksimal 3 task
* verifikasi `hidden_count`
* verifikasi `hidden_message`
* akses dashboard sebagai user 2
* observasi dashboard tanpa auth

### Hasil yang diharapkan

* `data.length <= 3`
* field energy summary tersedia
* hidden task logic bekerja

---

## 5.8 Folder 07 — Focus

### Tujuan

Menguji lifecycle focus session.

### Yang diuji

* create focus task
* start focus
* get active focus
* stop focus `escaped`
* stop focus `completed`
* conflict saat masih ada active session
* cleanup focus
* observasi zombie auto-stop

### Hasil yang diharapkan

* focus session bisa dimulai dan dihentikan
* task jadi `done` saat `completed`
* conflict terdeteksi saat double active session
* cleanup berhasil

---

## 5.9 Folder 08 — Energy

### Tujuan

Menguji energy summary, energy logs, dan efek energi dari task/focus.

### Yang diuji

* get energy summary
* get energy logs
* retroactive deduction
* timer deduction
* dopamine rescue
* leftover trap
* energy depleted

### Hasil yang diharapkan

* summary energi valid
* logs energi valid
* `retroactive_deduction` muncul pada task tanpa timer
* `timer_deduction` muncul pada focus
* kondisi khusus seperti dopamine rescue dan depleted berhasil diuji

---

## 5.10 Folder 09 — Notifications — In App

### Tujuan

Menguji inbox notifications user.

### Yang diuji

* get notifications
* filter unread
* filter by type
* mark one as read
* mark all as read
* delete notification
* invalid UUID
* ownership notification user lain

### Hasil yang diharapkan

* unread count valid
* mark read bekerja
* mark all bekerja
* delete notification berhasil
* user 2 tidak bisa mengakses notification milik user 1

---

## 5.11 Folder 10 — Deadline Reminder Lifecycle

### Tujuan

Menguji sinkronisasi deadline reminder terhadap lifecycle task.

### Yang diuji

* create task with deadline
* update deadline
* remove deadline
* mark done removes reminder
* delete removes reminder
* focus completed removes reminder
* guest task migration creates reminder

### Metode verifikasi

* API response
* query manual ke database

### Hasil yang diharapkan

* reminder dibuat saat task punya deadline
* reminder diupdate saat deadline berubah
* reminder di-soft delete saat tidak relevan lagi
* reminder dibuat saat guest task dimigrasikan ke user

---

## 5.12 Folder 11 — Negative & Security Cases

### Tujuan

Menguji guardrail backend.

### Yang diuji

* no auth access ke endpoint protected
* invalid payload
* invalid UUID
* duplicate register
* user 2 membaca task user 1
* user 2 update task user 1
* user 2 read notification user 1
* invalid template key

### Hasil yang diharapkan

* semua request invalid ditolak
* ownership checks bekerja
* auth checks bekerja
* validation checks bekerja

---

## 5.13 Folder 12 — Cleanup

### Tujuan

Membersihkan data test setelah full integration testing.

### Yang diuji / dilakukan

* cek focus session aktif
* stop active focus jika masih ada
* cleanup task test via SQL
* cleanup notification test via SQL
* verifikasi bahwa data test sudah soft delete

### Hasil yang diharapkan

* tidak ada active focus tertinggal
* task test tidak lagi aktif
* notification test tidak lagi aktif

---

## 6. Urutan Eksekusi Full Testing

Urutan yang dipakai saat full integration testing:

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

### Alasan urutan ini

* environment dan server diverifikasi dulu
* guest flow dan auth harus siap sebelum feature lain
* tasks menjadi dasar bagi dashboard, focus, energy, dan notifications
* deadline lifecycle dites setelah semua module inti siap
* cleanup diletakkan paling akhir

---

## 7. Catatan Penting Selama Testing

### 7.1 Notifications Visibility

Inbox notifications hanya menampilkan row yang memenuhi:

* `scheduled_at <= NOW()`
* `deleted_at IS NULL`

Jadi:

* reminder bisa sudah ada di database
* tetapi belum muncul di endpoint `/notifications`

### 7.2 Beberapa skenario butuh verifikasi DB manual

Khusus untuk deadline reminder lifecycle, verifikasi tidak cukup hanya dari response API.
Digunakan query SQL manual untuk memastikan:

* row notification dibuat
* row diupdate
* row di-soft delete

### 7.3 Beberapa skenario bersifat stateful

Contohnya:

* dopamine rescue
* leftover trap
* energy depleted
* zombie auto-stop

Karena itu beberapa request ditandai sebagai:

* optional
* observational
* state-dependent

### 7.4 Cleanup penting

Karena testing memakai banyak task dengan prefix seperti:

* `FULL-`
* `LIFE-`
* `NEG-`

maka cleanup perlu dijalankan agar database development tetap rapi.

---

## 8. Hasil Full Integration Testing

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

### Ringkasan hasil

* semua endpoint inti berjalan normal
* semua feature utama lulus integrasi
* security/ownership checks lulus
* guest flow lulus
* rule of 3 lulus
* focus dan energy lulus
* notifications dan deadline reminder lifecycle lulus
* cleanup selesai

---

## 9. Kesimpulan

🎉 Full integration testing backend Bento-do melalui Postman **telah selesai dan berhasil**.

Dari hasil pengujian ini dapat disimpulkan bahwa:

* backend core modules sudah berjalan stabil
* arsitektur backend sudah final untuk scope MVP saat ini
* seluruh flow utama dari guest hingga notifications sudah terverifikasi
* sistem aman terhadap invalid input dan ownership violation
* dokumentasi testing dapat dipakai sebagai acuan regression test berikutnya

### Scope backend yang dianggap final

* Auth
* Guest session
* Tasks / Bank Tugas
* Templates
* Dashboard / Rule of 3
* Focus
* Energy
* In-app notifications
* Deadline reminder lifecycle

### Di luar scope final saat ini

* push notification / FCM ke device atau browser

---
