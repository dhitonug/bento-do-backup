# Dokumentasi Complex Scenarios API

Stack yang digunakan:

* Express.js v5
* PostgreSQL
* JWT
* UUID

---

# 📚 Daftar Isi

* [1. Overview](#1-overview)
* [2. Scenario 1: Guest Mode - Data Persistence](#2-scenario-1-guest-mode---data-persistence)
* [3. Scenario 2: Guest Upgrade to User - Auto Sync](#3-scenario-2-guest-upgrade-to-user---auto-sync)
* [4. Testing dengan Collection Runner](#4-testing-dengan-collection-runner)

---

# 1. Overview

Dokumentasi ini menjelaskan dua skenario kompleks yang menguji integrasi antar modul pada Bento-Do API.

Skenario ini memastikan bahwa:

1. Guest data tetap tersimpan meskipun browser ditutup
2. Tasks guest dapat otomatis dipindahkan ke akun user saat register atau login

---

# 2. Scenario 1: Guest Mode - Data Persistence

## Tujuan

Membuktikan bahwa data guest tetap tersimpan di database meskipun browser atau tab ditutup.

Data guest tidak disimpan di localStorage browser, tetapi langsung disimpan di database server menggunakan `guest_session_id`.

---

## Alur

1. Client membuat guest session baru
2. Client membuat 3 task sebagai guest
3. Client menyimpan `session_token`
4. Simulasi tab tertutup dilakukan
5. Client menggunakan token yang sama untuk `GET /tasks`
6. Data task masih tersedia

---

## Verifikasi

### Request

```http id="w4p7tc"
GET /tasks
```

### Header

```http id="91r65v"
x-guest-session-token: <guest_token>
```

### Expected Response

```text id="w0b6tk"
200 OK
total_items >= 3
```

---

## Hasil yang Diharapkan

* Tasks tetap tersedia setelah simulasi tab tertutup
* Data guest tidak hilang
* Session token tetap valid
* Data tersimpan di database server

---

# 3. Scenario 2: Guest Upgrade to User - Auto Sync

## Tujuan

Membuktikan bahwa tasks yang dibuat sebagai guest otomatis dipindahkan ke akun user saat register atau login.

---

## Alur

1. Client membuat guest session baru
2. Client membuat 2 task sebagai guest
3. Client register menggunakan guest token
4. Backend melakukan auto sync tasks
5. `migrated_tasks_count = 2`
6. Client login sebagai user
7. Client mengambil data tasks sebagai user
8. Tasks sudah menjadi milik user

---

## Verifikasi Register

### Request

```http id="rjg9ix"
POST /auth/register
```

### Header

```http id="gnlzhq"
x-guest-session-token: <guest_token>
```

### Body

```json id="tcr22i"
{
  "email": "user@example.com",
  "password": "password123",
  "display_name": "Budi Santoso"
}
```

### Expected Response

```text id="d93r07"
201 Created
migrated_tasks_count = 2
```

---

## Verifikasi Tasks Berpindah

### Request

```http id="vbj5t3"
GET /tasks
```

### Header

```http id="c4umvw"
Authorization: Bearer <jwt_token>
```

### Expected Response

```text id="8v2m5l"
200 OK
total_items = 2
user_id terisi
guest_session_id = null
```

---

## Hasil yang Diharapkan

* Register berhasil
* Tasks guest otomatis dipindahkan
* `migrated_tasks_count` sesuai jumlah task guest
* `user_id` terisi
* `guest_session_id` menjadi `null`

---

# 4. Testing dengan Collection Runner

## Folder `5. COMPLEX SCENARIOS`

---

## 4.1 Guest Mode - Data Persistence

| No | Request                | Ekspektasi                       |
| -- | ---------------------- | -------------------------------- |
| 1  | `POST /guest`          | `201`, mendapatkan session token |
| 2  | `POST /tasks` guest ×3 | `201`, berhasil membuat 3 task   |
| 3  | `GET /tasks` guest     | `200`, total_items >= 3          |

---

## 4.2 Guest Upgrade to User - Auto Sync

| No | Request                             | Ekspektasi                       |
| -- | ----------------------------------- | -------------------------------- |
| 1  | `POST /guest`                       | `201`, mendapatkan session token |
| 2  | `POST /tasks` guest ×2              | `201`, berhasil membuat 2 task   |
| 3  | `POST /auth/register` + guest token | `201`, migrated_count = 2        |
| 4  | `POST /auth/login`                  | `200`, mendapatkan JWT           |
| 5  | `GET /tasks` user                   | `200`, task berhasil berpindah   |

---

# ✅ Kesimpulan

Skenario kompleks ini membuktikan bahwa:

* Guest mode memiliki data persistence yang stabil
* Data guest tidak hilang saat browser ditutup
* Sistem mendukung seamless upgrade dari guest ke user
* Auto sync tasks berjalan otomatis saat register/login
* Integrasi antar modul berjalan dengan konsisten dan aman
