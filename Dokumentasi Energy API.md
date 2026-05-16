
# ⚡ Dokumentasi REST API — Energy Bento-do

> Stack: Express.js · PostgreSQL (Neon) · Energy Log · Focus Session Integration · Retroactive Deduction · Dopamine Rescue

---

## 📑 Daftar Isi

1. [Overview](#1-overview)
2. [Tujuan Module Energy](#2-tujuan-module-energy)
3. [Struktur Folder](#3-struktur-folder)
4. [Cara Kerja Energy System](#4-cara-kerja-energy-system)
   - [4.1 Max Energy Harian](#41-max-energy-harian)
   - [4.2 Energy Summary](#42-energy-summary)
   - [4.3 Energy Logs](#43-energy-logs)
   - [4.4 Retroactive Deduction](#44-retroactive-deduction)
   - [4.5 Timer Deduction](#45-timer-deduction)
   - [4.6 Dopamine Rescue](#46-dopamine-rescue)
   - [4.7 Leftover Trap](#47-leftover-trap)
   - [4.8 Energy Depleted](#48-energy-depleted)
5. [Setup Postman](#5-setup-postman)
6. [API Reference](#6-api-reference)
   - [6.1 Get Energy Summary](#61-get-energy-summary)
   - [6.2 Get Energy Logs](#62-get-energy-logs)
7. [Energy Effect Object](#7-energy-effect-object)
8. [Business Rules Penting](#8-business-rules-penting)
9. [Status Code yang Umum Dipakai](#9-status-code-yang-umum-dipakai)
10. [Catatan Penting](#10-catatan-penting)

---

## 1. Overview

Module Energy di Bento-do dipakai untuk membatasi beban kerja harian user agar tidak mengerjakan semuanya sekaligus. 🔋

Energy system terhubung langsung dengan:
- task completion
- focus session
- dashboard prioritization
- dopamine rescue
- leftover trap
- energy depletion guard

Base URL lokal:

```text
http://localhost:5000/api/v1/energy
````

Endpoint utama:

* `GET /api/v1/energy`
* `GET /api/v1/energy/logs`

---

## 2. Tujuan Module Energy

Module Energy dibuat agar user:

* ⚖️ punya batas kerja harian yang realistis
* 🧠 tidak terus memaksakan task berat
* 🎯 lebih sadar energi saat memilih task
* 📉 menerima pengurangan energi secara konsisten
* 💚 mendapat recovery kecil pada kondisi tertentu

Energy di Bento-do bukan sekadar angka display, tapi benar-benar memengaruhi:

* focus session
* task completion reward/penalty
* dashboard behavior

---

## 3. Struktur Folder

```text id="s1jv8p"
src/
└── modules/
    └── energy/
        ├── energy.controller.js
        ├── energy.service.js
        ├── energy.repository.js
        ├── energy.routes.js
        └── energy.validation.js
```

Module Energy juga terintegrasi dengan:

* `tasks.service.js`
* `focus.service.js`
* `dashboard.service.js`

---

## 4. Cara Kerja Energy System

### 4.1 Max Energy Harian

Setiap user memiliki:

* `max_energy = 240`

Ini merepresentasikan kapasitas kerja harian.

Field penting:

* `current_energy`
* `max_energy`
* `is_critical_energy`
* `energy_reset_at`

---

### 4.2 Energy Summary

Energy summary diambil dari endpoint:

```text id="mv1mbo"
GET /api/v1/energy
```

Response summary dipakai untuk:

* mengetahui sisa energi user
* mendeteksi apakah energi sedang kritis
* menentukan apakah focus session masih bisa dimulai

---

### 4.3 Energy Logs

Semua perubahan energi dicatat sebagai histori.

Contoh perubahan yang dicatat:

* task selesai tanpa timer
* focus berjalan lalu dihentikan
* dopamine rescue
* efek lain yang memengaruhi energi

Logs diambil dari endpoint:

```text id="utjlwm"
GET /api/v1/energy/logs?page=1&limit=20
```

---

### 4.4 Retroactive Deduction

Kalau task diselesaikan **tanpa focus timer**, backend menerapkan pengurangan energi statis berdasarkan beban task.

#### Nilai umum:

* `Ringan` → `-15`
* `Sedang` → `-30`
* `Berat` → `-60`

Reason yang tercatat:

```json id="jlwm50"
{
  "reason": "retroactive_deduction"
}
```

---

### 4.5 Timer Deduction

Kalau task dikerjakan lewat focus session, energi dikurangi sesuai durasi aktual focus.

Reason yang tercatat:

```json id="jlwm51"
{
  "reason": "timer_deduction"
}
```

Nilainya bisa berbeda-beda sesuai lama sesi.

---

### 4.6 Dopamine Rescue

Kalau energi user sedang **kritis** dan user menyelesaikan task **Ringan**, backend bisa memberi recovery kecil:

* `+15`

Reason yang tercatat:

```json id="fjjlwm"
{
  "reason": "dopamine_rescue"
}
```

Ini adalah mekanisme pemulihan kecil agar user tetap bisa bergerak saat energinya hampir habis.

---

### 4.7 Leftover Trap

Kalau energi user tinggal sedikit, backend akan membatasi durasi focus session berikutnya.

Contoh:

* energi tersisa 20
* user mencoba start focus pada task berat
* backend tetap mengizinkan, tetapi `session_limit_minutes` dipaksa menjadi 20

Ini disebut **leftover trap**.

---

### 4.8 Energy Depleted

Kalau energi user benar-benar habis, backend menolak start focus.

Response error:

```json id="j3rjlwm"
{
  "success": false,
  "message": "Energi harian kamu habis. Tunggu reset berikutnya untuk memulai fokus lagi.",
  "code": "ENERGY_DEPLETED"
}
```

---

## 5. Setup Postman

### 5.1 Environment

Tambahkan variabel berikut di Postman:

```text id="0wj7kp"
base_url = http://localhost:5000/api/v1
token_user =
task_id_energy =
task_id_energy_timer =
task_id_energy_dopamine =
focus_session_id =
energy_before =
energy_after =
```

### 5.2 Auth untuk User

Gunakan header:

```text id="z6q4y0"
Authorization: Bearer {{token_user}}
```

---

## 6. API Reference

---

## 6.1 Get Energy Summary

### `GET /api/v1/energy`

Mengambil summary energi user saat ini.

### Headers

```text id="w79sbd"
Authorization: Bearer {{token_user}}
```

### Response `200`

```json id="jlwm53"
{
  "success": true,
  "data": {
    "current_energy": 240,
    "max_energy": 240,
    "is_critical_energy": false,
    "energy_reset_at": "2026-05-12T08:28:50.737Z"
  }
}
```

---

## 6.2 Get Energy Logs

### `GET /api/v1/energy/logs?page=1&limit=20`

Mengambil histori perubahan energi user dengan pagination.

### Headers

```text id="jlwm54"
Authorization: Bearer {{token_user}}
```

### Response `200`

```json id="jlwm55"
{
  "success": true,
  "page": 1,
  "limit": 20,
  "total_items": 3,
  "total_pages": 1,
  "data": [
    {
      "id": "uuid-log",
      "change_amount": -15,
      "reason": "retroactive_deduction",
      "energy_before": 240,
      "energy_after": 225,
      "task_id": "uuid-task",
      "focus_session_id": null,
      "created_at": "timestamp"
    }
  ]
}
```

---

## 7. Energy Effect Object

Bentuk umum object perubahan energi:

```json id="jlwm56"
{
  "id": "uuid-log",
  "change_amount": -15,
  "reason": "retroactive_deduction",
  "energy_before": 240,
  "energy_after": 225,
  "task_id": "uuid-task",
  "focus_session_id": null,
  "created_at": "timestamp"
}
```

### Penjelasan field

* `change_amount` → besar perubahan energi
* `reason` → alasan perubahan energi
* `energy_before` → energi sebelum perubahan
* `energy_after` → energi sesudah perubahan
* `task_id` → task yang terkait
* `focus_session_id` → focus session yang terkait, jika ada

---

## 8. Business Rules Penting

### 8.1 Max Energy = 240

User memiliki kapasitas energi maksimum harian sebesar `240`.

### 8.2 Energy Tidak Boleh Negatif Sembarangan

Backend menjaga agar flow energy tetap masuk akal dan tidak memicu sesi fokus tanpa batas.

### 8.3 Retroactive Deduction untuk Task Tanpa Timer

Task yang selesai tanpa timer tetap mengurangi energi.

### 8.4 Timer Deduction untuk Focus Session

Focus session mengurangi energi berdasarkan durasi aktual.

### 8.5 Dopamine Rescue Hanya pada Kondisi Tertentu

Dopamine rescue hanya relevan saat:

* energi kritis
* task yang diselesaikan adalah `Ringan`

### 8.6 Leftover Trap Membatasi Sesi Berikutnya

Kalau energi tinggal sedikit, durasi focus berikutnya akan dibatasi.

### 8.7 Energy Depleted Memblokir Start Focus

Kalau energi habis, user tidak bisa memulai focus session baru.

### 8.8 Dashboard Bisa Bersifat Energy-Aware

Dashboard zen dapat mempertimbangkan kondisi energi saat memilih task prioritas.

---

## 9. Status Code yang Umum Dipakai

| Status Code | Arti                                           |
| ----------- | ---------------------------------------------- |
| `200`       | Get energy summary/logs berhasil               |
| `400`       | Query/payload tidak valid                      |
| `401`       | Auth/token tidak valid                         |
| `403`       | Energi habis / aksi diblok karena state energi |

---

## 10. Catatan Penting

### ✅ Yang sudah diverifikasi saat testing

* Get energy summary berhasil
* Get energy logs berhasil
* Retroactive deduction task Ringan berhasil
* Timer deduction dari focus berhasil
* Dopamine rescue berhasil diuji pada kondisi yang sesuai
* Leftover trap berhasil diobservasi
* Energy depleted guard berhasil diuji

### ⚠️ Catatan implementasi

* Endpoint aktif yang dipakai project:

```text id="jlwm57"
GET /api/v1/energy
GET /api/v1/energy/logs
```

* Perubahan energi sering muncul sebagai bagian dari response:

  * update task
  * stop focus
* Jadi module Energy tidak selalu berdiri sebagai endpoint mutlak, tetapi juga hadir sebagai efek dari module lain

### 🧪 Folder Postman terkait energy

```text id="jlwm58"
08 - Energy
├── 08.1 - Get Energy Summary
├── 08.2 - Get Energy Logs
├── 08.3 - Create Retroactive Task Ringan
├── 08.4 - Complete Retroactive Task Ringan
├── 08.5 - Create Timer Task
├── 08.6 - Start Focus Timer Task
├── 08.7 - Stop Focus Timer Task Escaped
├── 08.8 - Optional Get Energy Logs After Effects
├── 08.9 - Optional Create Dopamine Rescue Task
├── 08.10 - Optional Complete Dopamine Rescue Task
├── 08.11 - Optional Start Focus Leftover Trap
└── 08.12 - Optional Start Focus When Energy Depleted
```

### ✅ Status akhir

Module **Energy** sudah diuji dan **pass** dalam full integration testing.

---

