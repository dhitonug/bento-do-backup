
# ⏱️ Dokumentasi REST API — Focus Bento-do

> Stack: Express.js · PostgreSQL (Neon) · Guest/User Identity · Energy System · Focus Session Tracking

---

## 📑 Daftar Isi

1. [Overview](#1-overview)
2. [Tujuan Module Focus](#2-tujuan-module-focus)
3. [Struktur Folder](#3-struktur-folder)
4. [Cara Kerja Focus Session](#4-cara-kerja-focus-session)
   - [4.1 Start Focus](#41-start-focus)
   - [4.2 Get Active Focus](#42-get-active-focus)
   - [4.3 Stop Focus](#43-stop-focus)
   - [4.4 End Reason](#44-end-reason)
   - [4.5 Integrasi dengan Energy](#45-integrasi-dengan-energy)
5. [Setup Postman](#5-setup-postman)
6. [API Reference](#6-api-reference)
   - [6.1 Start Focus](#61-start-focus)
   - [6.2 Get Active Focus](#62-get-active-focus)
   - [6.3 Stop Focus](#63-stop-focus)
7. [Response Object Focus](#7-response-object-focus)
8. [Business Rules Penting](#8-business-rules-penting)
9. [Status Code yang Umum Dipakai](#9-status-code-yang-umum-dipakai)
10. [Catatan Penting](#10-catatan-penting)

---

## 1. Overview

Module Focus dipakai untuk menjalankan sesi kerja terfokus terhadap satu task tertentu. 🎯

Focus session di Bento-do berfungsi untuk:
- memulai mode fokus terhadap satu task
- melacak sesi aktif
- menghentikan sesi secara manual
- menandai task selesai jika sesi berakhir dengan `completed`
- terhubung langsung ke sistem energy
- menangani kondisi otomatis seperti `zombie_limit`

Base URL lokal:

```text
http://localhost:5000/api/v1/focus
````

Endpoint utama:

* `POST /api/v1/focus/start`
* `GET /api/v1/focus/active`
* `POST /api/v1/focus/:id/stop`

---

## 2. Tujuan Module Focus

Module Focus dibuat agar user bisa:

* ⏳ bekerja fokus pada satu task
* 🧠 menghindari multitasking berlebihan
* 🔄 mengetahui apakah masih ada sesi fokus aktif
* ✅ menyelesaikan task langsung dari flow focus
* ⚡ mencatat dampak focus ke energy system

Focus adalah jembatan antara:

* **task**
* **energy**
* **deadline reminder lifecycle**

---

## 3. Struktur Folder

```text id="vl96b5"
src/
├── middlewares/
│   └── guestOrAuth.middleware.js
└── modules/
    └── focus/
        ├── focus.controller.js
        ├── focus.service.js
        ├── focus.repository.js
        ├── focus.routes.js
        └── focus.validation.js
```

Route aktif yang digunakan:

```js id="q02t0t"
// POST /api/v1/focus/start
// GET /api/v1/focus/active
// POST /api/v1/focus/:id/stop
```

---

## 4. Cara Kerja Focus Session

### 4.1 Start Focus

Saat client memanggil:

```text id="tq6omt"
POST /api/v1/focus/start
```

backend akan:

1. memvalidasi `task_id`
2. memastikan task milik requester
3. memastikan tidak ada sesi fokus aktif lain
4. menghitung batas durasi sesi berdasarkan kondisi energi
5. membuat focus session baru
6. mengembalikan data sesi

Kalau masih ada sesi aktif, backend menolak request dengan status conflict.

---

### 4.2 Get Active Focus

Saat client memanggil:

```text id="9w7ix1"
GET /api/v1/focus/active
```

backend akan:

* mengembalikan sesi aktif jika ada
* mengembalikan `null` jika tidak ada sesi aktif
* dalam kondisi tertentu, bisa sekaligus mengembalikan info `auto_stopped_session`

Ini penting untuk:

* restore state saat frontend reload
* mendeteksi apakah user masih punya sesi fokus berjalan
* mendeteksi zombie auto-stop

---

### 4.3 Stop Focus

Saat client memanggil:

```text id="x8yn8m"
POST /api/v1/focus/:id/stop
```

backend akan:

1. mencari focus session berdasarkan ID
2. memastikan sesi milik requester
3. menghitung elapsed time
4. menerapkan efek energy sesuai durasi aktual
5. memperbarui task jika end reason = `completed`
6. mengembalikan session result

---

### 4.4 End Reason

Focus session dapat berakhir dengan beberapa `end_reason`:

#### `escaped`

User berhenti sebelum selesai.
Task tidak otomatis menjadi `done`.

#### `completed`

User menyelesaikan task melalui focus.
Task akan diupdate menjadi `done`.

#### `zombie_limit`

Backend menghentikan sesi otomatis karena sudah melewati batas maksimum yang diizinkan.

---

### 4.5 Integrasi dengan Energy

Focus terhubung langsung ke Energy Module.

Beberapa efek yang mungkin muncul:

* `timer_deduction`
* `completion_reward_if_eligible`
* pembatasan `session_limit_minutes`
* `ENERGY_DEPLETED` jika energi habis

Jadi module Focus tidak berdiri sendiri, tapi menjadi salah satu sumber perubahan energi paling utama.

---

## 5. Setup Postman

### 5.1 Environment

Tambahkan variabel berikut di Postman:

```text id="pnuqpb"
base_url = http://localhost:5000/api/v1
token_user =
guest_session_token =
task_id_focus =
task_id_2 =
task_id_3 =
focus_session_id =
focus_session_id_life =
```

### 5.2 Request sebagai User

Gunakan header:

```text id="8qg4vc"
Authorization: Bearer {{token_user}}
```

### 5.3 Request sebagai Guest

Jika flow focus mendukung guest di projectmu, gunakan:

```text id="a0f1rj"
x-guest-session-token: {{guest_session_token}}
```

### 5.4 Auto Save Focus Session ID

Di request start focus, tempel script ini di tab **Tests**:

```javascript id="5l0zkj"
const json = pm.response.json();

pm.environment.set("focus_session_id", json.data.id);
```

---

## 6. API Reference

---

## 6.1 Start Focus

### `POST /api/v1/focus/start`

Memulai focus session untuk task tertentu.

### Headers

```text id="c00y5l"
Authorization: Bearer {{token_user}}
Content-Type: application/json
```

### Body

```json id="zyj2pp"
{
  "task_id": "uuid-task"
}
```

### Response `200/201`

```json id="7c9mkl"
{
  "success": true,
  "message": "Sesi fokus berhasil dimulai.",
  "data": {
    "id": "uuid-session",
    "user_id": "uuid-user",
    "guest_session_id": null,
    "task_id": "uuid-task",
    "task_title": "FULL-FOCUS Task A",
    "energy_weight": "Ringan",
    "started_at": "timestamp",
    "ended_at": null,
    "duration_minutes": null,
    "end_reason": null,
    "session_limit_minutes": 60,
    "elapsed_minutes": 0,
    "remaining_minutes": 60,
    "zombie_limit_reached": false,
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

---

### Conflict: Active Session Exists

Jika requester masih punya sesi aktif:

**Response `409`**

```json id="dqpb6d"
{
  "success": false,
  "message": "Masih ada sesi fokus aktif. Selesaikan atau hentikan sesi yang berjalan terlebih dahulu.",
  "code": "ACTIVE_FOCUS_SESSION_EXISTS"
}
```

---

### Energy Depleted

Jika energi user habis:

**Response `403`**

```json id="fdb6oz"
{
  "success": false,
  "message": "Energi harian kamu habis. Tunggu reset berikutnya untuk memulai fokus lagi.",
  "code": "ENERGY_DEPLETED"
}
```

---

## 6.2 Get Active Focus

### `GET /api/v1/focus/active`

Mengambil sesi fokus aktif saat ini.

### Headers

```text id="1no6ng"
Authorization: Bearer {{token_user}}
```

### Response `200` — Active Session Exists

```json id="pzpzo1"
{
  "success": true,
  "active_session": {
    "id": "uuid-session",
    "user_id": "uuid-user",
    "guest_session_id": null,
    "task_id": "uuid-task",
    "task_title": "FULL-FOCUS Task A",
    "energy_weight": "Ringan",
    "started_at": "timestamp",
    "ended_at": null,
    "duration_minutes": null,
    "end_reason": null,
    "created_at": "timestamp",
    "updated_at": "timestamp"
  },
  "auto_stopped_session": null
}
```

### Response `200` — No Active Session

```json id="9w8x2t"
{
  "success": true,
  "active_session": null,
  "auto_stopped_session": null
}
```

### Response `200` — Auto Stopped by Zombie Limit

```json id="zqsyf0"
{
  "success": true,
  "active_session": null,
  "auto_stopped_session": {
    "session": {
      "id": "uuid-session",
      "task_id": "uuid-task",
      "end_reason": "zombie_limit"
    },
    "task": {
      "id": "uuid-task",
      "status": "in_progress"
    },
    "energy": {
      "current_energy": 120,
      "max_energy": 240,
      "is_critical_energy": false,
      "energy_reset_at": "timestamp"
    },
    "energy_effects": [
      {
        "change_amount": -60,
        "reason": "timer_deduction"
      }
    ],
    "message": "Sesi fokus dihentikan otomatis karena mencapai batas maksimal durasi yang diizinkan."
  }
}
```

---

## 6.3 Stop Focus

### `POST /api/v1/focus/:id/stop`

Menghentikan focus session.

### Headers

```text id="8x6kpn"
Authorization: Bearer {{token_user}}
Content-Type: application/json
```

---

### Contoh 1 — Stop Escaped

#### URL

```text id="0c7xfy"
POST /api/v1/focus/{{focus_session_id}}/stop
```

#### Body

```json id="7to14g"
{
  "end_reason": "escaped"
}
```

#### Response `200`

```json id="2a3utp"
{
  "success": true,
  "session": {
    "id": "uuid-session",
    "task_id": "uuid-task",
    "end_reason": "escaped"
  },
  "task": {
    "id": "uuid-task",
    "status": "in_progress"
  },
  "energy": {
    "current_energy": 233,
    "max_energy": 240,
    "is_critical_energy": false,
    "energy_reset_at": "timestamp"
  },
  "energy_effects": [
    {
      "change_amount": -7,
      "reason": "timer_deduction"
    }
  ]
}
```

---

### Contoh 2 — Stop Completed

#### Body

```json id="rdi0wn"
{
  "end_reason": "completed"
}
```

#### Response `200`

```json id="v2o8p4"
{
  "success": true,
  "session": {
    "id": "uuid-session",
    "task_id": "uuid-task",
    "end_reason": "completed"
  },
  "task": {
    "id": "uuid-task",
    "status": "done"
  },
  "energy": {
    "current_energy": 180,
    "max_energy": 240,
    "is_critical_energy": false,
    "energy_reset_at": "timestamp"
  },
  "energy_effects": [
    {
      "change_amount": -30,
      "reason": "timer_deduction"
    }
  ]
}
```

---

## 7. Response Object Focus

### Start Focus Response

Field utama:

* `id`
* `task_id`
* `task_title`
* `energy_weight`
* `session_limit_minutes`
* `elapsed_minutes`
* `remaining_minutes`
* `zombie_limit_reached`

### Get Active Focus Response

Field utama:

* `active_session`
* `auto_stopped_session`

### Stop Focus Response

Field utama:

* `session`
* `task`
* `energy`
* `energy_effects`

---

## 8. Business Rules Penting

### 8.1 Hanya Satu Sesi Aktif

Satu requester hanya boleh memiliki **1 focus session aktif** pada satu waktu.

### 8.2 Task Harus Valid dan Milik Requester

Task yang dipakai untuk start focus harus milik requester.

### 8.3 `escaped` Tidak Menyelesaikan Task

Jika stop reason = `escaped`, task tidak otomatis jadi `done`.

### 8.4 `completed` Menyelesaikan Task

Jika stop reason = `completed`, task diupdate menjadi `done`.

### 8.5 Zombie Limit Bisa Menghentikan Sesi Otomatis

Jika sesi aktif melewati batas yang diizinkan, backend bisa mengubah sesi menjadi `zombie_limit`.

### 8.6 Focus Mempengaruhi Energy

Stop focus dapat menghasilkan `timer_deduction`.

### 8.7 Session Limit Bergantung pada Energi

Dalam kondisi tertentu, `session_limit_minutes` bisa lebih kecil dari durasi normal karena leftover trap.

---

## 9. Status Code yang Umum Dipakai

| Status Code | Arti                                    |
| ----------- | --------------------------------------- |
| `200`       | Get/start/stop focus berhasil           |
| `201`       | Start focus dianggap create             |
| `400`       | Payload atau input tidak valid          |
| `401`       | Auth/token tidak valid                  |
| `403`       | Energi habis / tidak boleh mulai fokus  |
| `404`       | Focus session atau task tidak ditemukan |
| `409`       | Masih ada focus session aktif           |

---

## 10. Catatan Penting

### ✅ Yang sudah diverifikasi saat testing

* Create task untuk focus berhasil
* Start focus berhasil
* Get active focus berhasil
* Stop focus dengan `escaped` berhasil
* Stop focus dengan `completed` berhasil
* Task berubah menjadi `done` saat completed
* Conflict saat mencoba start focus kedua berhasil terdeteksi
* Cleanup focus session berhasil
* Zombie auto-stop berhasil diobservasi pada testing manual
* Focus terintegrasi dengan energy response

### ⚠️ Catatan implementasi

* Endpoint aktif yang dipakai project:

```text id="1ksw50"
POST /api/v1/focus/start
GET /api/v1/focus/active
POST /api/v1/focus/:id/stop
```

* Focus session terhubung langsung dengan:

  * task status
  * energy deduction
  * deadline reminder lifecycle

### 🧪 Folder Postman terkait focus

```text id="38ler2"
07 - Focus
├── 07.1 - Create Focus Task A
├── 07.2 - Start Focus Task A
├── 07.3 - Get Active Focus
├── 07.4 - Stop Focus Escaped
├── 07.5 - Create Focus Task B
├── 07.6 - Start Focus Task B
├── 07.7 - Stop Focus Completed
├── 07.8 - Create Focus Task C
├── 07.9 - Start Focus Task C
├── 07.10 - Start Focus Task C Again - Should Conflict
├── 07.11 - Stop Focus Task C Cleanup
└── 07.12 - Optional Get Active Focus Final
```

### ✅ Status akhir

Module **Focus** sudah diuji dan **pass** dalam full integration testing.


