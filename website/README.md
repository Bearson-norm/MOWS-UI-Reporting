# MO Receiver - Manufacturing Order Data Receiver & Viewer

Website Node.js untuk menerima dan menampilkan data Manufacturing Order (MO) dari API eksternal dengan penyimpanan menggunakan SQLite.

## 📋 Fitur

- ✅ Menerima data MO dari API eksternal via POST request
- ✅ Menyimpan data ke database SQLite
- ✅ Menampilkan daftar MO yang diterima
- ✅ View detail report penimbangan per MO
- ✅ Generate dan print report summary
- ✅ Update otomatis jika MO yang sama dikirim ulang
- ✅ Hapus data MO
- ✅ Authentication dengan Bearer Token

## 🚀 Instalasi

### 1. Clone atau Download Project

```bash
cd mo-receiver-website
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Jalankan Server

```bash
# Production
npm start

# Development (dengan auto-reload)
npm run dev
```

Server akan berjalan di: **http://localhost:4000**

## 📡 API Endpoints

### 1. **POST** `/api/mo/receive` - Menerima Data MO

Endpoint untuk menerima data MO dari website eksternal.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN_HERE
```

**Request Body:**
```json
{
  "work_order": "MO-2024-001",
  "sku": "SKU-001",
  "formulation_name": "Formula Name",
  "production_date": "2024-01-01T00:00:00Z",
  "planned_quantity": 1000.0,
  "status": "completed",
  "operator_name": "Operator Name",
  "end_time": "2024-01-01T12:00:00Z",
  "ingredients": [
    {
      "ingredient_id": "uuid-here",
      "ingredient_code": "ING-001",
      "ingredient_name": "Ingredient Name",
      "target_mass": 100.0,
      "current_accumulated_mass": 100.5,
      "current_status": "completed",
      "tolerance_min": 95.0,
      "tolerance_max": 105.0,
      "exp_dates": [
        {
          "exp_date": "2025-12-31",
          "actual_weight": 50.5
        },
        {
          "exp_date": "2026-01-15",
          "actual_weight": 50.0
        }
      ],
      "sessions": [
        {
          "session_id": "uuid-here",
          "session_number": 1,
          "actual_mass": 50.0,
          "accumulated_mass": 50.0,
          "status": "completed",
          "tolerance_min": 95.0,
          "tolerance_max": 105.0,
          "session_started_at": "2024-01-01T10:00:00Z",
          "session_completed_at": "2024-01-01T10:05:00Z",
          "notes": "Session notes here"
        }
      ]
    }
  ]
}
```

**Response Success:**
```json
{
  "success": true,
  "message": "Data received and stored successfully",
  "work_order": "MO-2024-001",
  "id": 1
}
```

**Response Error:**
```json
{
  "success": false,
  "error": "Error message"
}
```

---

### 2. **GET** `/api/mo-list` - Mendapatkan Daftar MO

Endpoint untuk mendapatkan daftar semua MO yang telah diterima.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "work_order": "MO-2024-001",
      "sku": "SKU-001",
      "formulation_name": "Formula Name",
      "status": "completed",
      "production_date": "2024-01-01T00:00:00Z",
      "planned_quantity": 1000.0,
      "operator_name": "Operator Name",
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

---

### 3. **GET** `/api/mo-receiver/:id` - Mendapatkan Detail MO

Endpoint untuk mendapatkan detail lengkap MO berdasarkan ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "workOrder": {
      "work_order": "MO-2024-001",
      "sku": "SKU-001",
      "formulation_name": "Formula Name",
      "production_date": "2024-01-01T00:00:00Z",
      "planned_quantity": 1000.0,
      "status": "completed",
      "operator_name": "Operator Name",
      "end_time": "2024-01-01T12:00:00Z"
    },
    "ingredients": [...]
  }
}
```

---

### 4. **DELETE** `/api/mo-receiver/:id` - Hapus Data MO

Endpoint untuk menghapus data MO.

**Response:**
```json
{
  "success": true,
  "message": "Work order deleted successfully"
}
```

## 🧪 Testing API dengan cURL

### Mengirim Data MO

```bash
curl -X POST http://localhost:4000/api/mo/receive \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "work_order": "MO-2024-001",
    "sku": "SKU-001",
    "formulation_name": "Test Formula",
    "production_date": "2024-12-19T10:00:00Z",
    "planned_quantity": 1000.0,
    "status": "completed",
    "operator_name": "John Doe",
    "end_time": "2024-12-19T12:00:00Z",
    "ingredients": [
      {
        "ingredient_id": "ing-001",
        "ingredient_code": "ING-001",
        "ingredient_name": "Ingredient A",
        "target_mass": 100.0,
        "current_accumulated_mass": 100.5,
        "current_status": "completed",
        "tolerance_min": 95.0,
        "tolerance_max": 105.0,
        "exp_dates": [
          {
            "exp_date": "2025-12-31",
            "actual_weight": 100.5
          }
        ],
        "sessions": [
          {
            "session_id": "session-001",
            "session_number": 1,
            "actual_mass": 100.5,
            "accumulated_mass": 100.5,
            "status": "completed",
            "tolerance_min": 95.0,
            "tolerance_max": 105.0,
            "session_started_at": "2024-12-19T10:00:00Z",
            "session_completed_at": "2024-12-19T10:05:00Z",
            "notes": "Test session"
          }
        ]
      }
    ]
  }'
```

### Mendapatkan List MO

```bash
curl http://localhost:4000/api/mo-list
```

### Mendapatkan Detail MO

```bash
curl http://localhost:4000/api/mo-receiver/1
```

## 🗄️ Database Schema

Database menggunakan SQLite dengan file `mo_receiver.db`.

### Table: `received_work_orders`

| Column             | Type     | Description                        |
|--------------------|----------|------------------------------------|
| id                 | INTEGER  | Primary key (auto increment)       |
| work_order         | TEXT     | Nomor MO (unique)                  |
| sku                | TEXT     | SKU name                           |
| formulation_name   | TEXT     | Nama formula                       |
| production_date    | TEXT     | Tanggal produksi (ISO 8601)        |
| planned_quantity   | REAL     | Quantity yang direncanakan         |
| status             | TEXT     | Status (completed, in_progress, etc)|
| operator_name      | TEXT     | Nama operator                      |
| end_time           | TEXT     | Waktu selesai (ISO 8601)           |
| data_json          | TEXT     | Full JSON data                     |
| created_at         | DATETIME | Waktu data pertama kali diterima   |
| updated_at         | DATETIME | Waktu data terakhir diupdate       |

## 📱 Cara Menggunakan Website

1. **Buka Browser**
   - Akses: http://localhost:4000 (atau http://YOUR_VPS_IP:4000 untuk akses dari luar)

2. **Lihat Daftar MO**
   - Halaman utama menampilkan daftar semua MO yang diterima
   - Kolom: No, Nomor MO, Nama SKU, Formula, Status, Tanggal Update, Aksi

3. **View Report**
   - Klik tombol "📄 View Report" pada MO yang ingin dilihat
   - Akan menampilkan:
     - Info work order (MO, SKU, Formula, Status, dll)
     - Report summary penimbangan
     - Detail ingredients dengan exp date
     - Total weight dan resolution

4. **Print Report**
   - Di halaman detail, klik tombol "🖨️ Print"
   - Report akan dibuka di window baru dan siap untuk dicetak

5. **Hapus Data**
   - Klik tombol "🗑️" pada MO yang ingin dihapus
   - Konfirmasi penghapusan

## 🔧 Konfigurasi

### Mengubah Port

Edit file `server.js`:
```javascript
const PORT = process.env.PORT || 4000
```

Atau jalankan dengan environment variable:
```bash
PORT=8080 npm start
```

### Token Authentication

Token authentication sudah diimplementasi di endpoint `/api/mo/receive`. 

Untuk menambahkan validasi token yang lebih ketat, edit di `server.js`:
```javascript
// Line ~56
const token = authHeader.substring(7)
// TODO: Verify token here if needed
// Contoh:
if (token !== 'YOUR_SECRET_TOKEN') {
  return res.status(401).json({
    success: false,
    error: 'Invalid token'
  })
}
```

## 🌐 Integrasi dengan Website Eksternal

Untuk mengirim data dari website https://mows.moof-set.web.id ke website ini:

### Konfigurasi di Website Eksternal:

1. **Base URL**: `http://your-vps-ip:4000`
2. **Endpoint**: `/api/mo/receive`
3. **Method**: POST
4. **Headers**:
   - `Content-Type: application/json`
   - `Authorization: Bearer YOUR_TOKEN_HERE`
5. **Body**: JSON data sesuai format di atas

### Contoh JavaScript untuk Mengirim Data:

```javascript
async function sendDataToReceiver(moData) {
  try {
    const response = await fetch('http://your-vps-ip:4000/api/mo/receive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN_HERE'
      },
      body: JSON.stringify(moData)
    })
    
    const result = await response.json()
    
    if (result.success) {
      console.log('Data berhasil dikirim:', result)
    } else {
      console.error('Gagal mengirim data:', result.error)
    }
  } catch (error) {
    console.error('Error:', error)
  }
}
```

## 📝 Notes

- Data MO dengan `work_order` yang sama akan di-update (bukan duplikat)
- Database SQLite disimpan di file `mo_receiver.db` di root directory
- Frontend menggunakan React (via CDN) tanpa build process
- Semua tanggal menggunakan format ISO 8601 (UTC)

## 🐛 Troubleshooting

### Database Error
Jika terjadi error database, hapus file `mo_receiver.db` dan restart server. Database akan dibuat ulang otomatis.

### Port Already in Use
Jika port 4000 sudah digunakan, ubah port dengan:
```bash
PORT=8080 npm start
```

### CORS Error
Jika ada CORS error dari website eksternal, pastikan CORS sudah di-enable di `server.js` (sudah included by default).

## 📄 License

ISC

## 🤝 Support

Jika ada pertanyaan atau masalah, silakan buat issue atau hubungi developer.

