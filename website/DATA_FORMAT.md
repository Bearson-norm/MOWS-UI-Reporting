# 📋 Format Data - Panduan Lengkap

Dokumentasi lengkap untuk format data yang diterima oleh MO Receiver API.

## ✅ Format Data yang Didukung

Sistem ini mendukung **DUA format data** untuk mengirim informasi exp_date:

---

## Format 1: Array `exp_dates` Terpisah (Format Lama)

Format ini memiliki array `exp_dates` yang terpisah dari sessions:

```json
{
  "work_order": "MO-2024-001",
  "sku": "SKU-001",
  "formulation_name": "Formula Name",
  "production_date": "2024-01-15T08:30:00.000Z",
  "planned_quantity": 1000.0,
  "status": "completed",
  "operator_name": "John Doe",
  "end_time": "2024-01-15T14:45:00.000Z",
  "ingredients": [
    {
      "ingredient_id": "550e8400-e29b-41d4-a716-446655440001",
      "ingredient_code": "ING-001",
      "ingredient_name": "MENTHOLIC CRYSTALS",
      "target_mass": 100.0,
      "current_accumulated_mass": 100.5,
      "current_status": "completed",
      "tolerance_min": 95.0,
      "tolerance_max": 105.0,
      "exp_dates": [
        {
          "exp_date": "2025-12-31",
          "actual_weight": 50.0
        },
        {
          "exp_date": "2026-01-15",
          "actual_weight": 50.5
        }
      ],
      "sessions": [
        {
          "session_id": "session-001",
          "session_number": 1,
          "actual_mass": 50.0,
          "accumulated_mass": 50.0,
          "status": "completed",
          "tolerance_min": 95.0,
          "tolerance_max": 105.0,
          "session_started_at": "2024-01-15T09:00:00.000Z",
          "session_completed_at": "2024-01-15T09:05:00.000Z",
          "notes": "Session notes"
        }
      ]
    }
  ]
}
```

### Karakteristik Format 1:
- ✅ Memiliki array `exp_dates` di level ingredient
- ✅ Setiap exp_date memiliki `actual_weight`
- ✅ Sessions terpisah dari exp_dates

---

## Format 2: `exp_date` di dalam Sessions (Format Baru) ⭐

Format ini menyimpan exp_date langsung di setiap session:

```json
{
  "work_order": "MO-2024-001",
  "sku": "SKU-001",
  "formulation_name": "Formula Produk A",
  "production_date": "2024-01-15T08:30:00.000Z",
  "planned_quantity": 1000.0,
  "status": "completed",
  "operator_name": "John Doe",
  "end_time": "2024-01-15T14:45:00.000Z",
  "ingredients": [
    {
      "ingredient_id": "550e8400-e29b-41d4-a716-446655440001",
      "ingredient_code": "ING-001",
      "ingredient_name": "MENTHOLIC CRYSTALS",
      "target_mass": 100.0,
      "current_accumulated_mass": 100.5,
      "current_status": "completed",
      "tolerance_min": 95.0,
      "tolerance_max": 105.0,
      "sessions": [
        {
          "session_id": "660e8400-e29b-41d4-a716-446655440001",
          "session_number": 1,
          "actual_mass": 50.0,
          "accumulated_mass": 50.0,
          "status": "completed",
          "tolerance_min": 95.0,
          "tolerance_max": 105.0,
          "session_started_at": "2024-01-15T09:00:00.000Z",
          "session_completed_at": "2024-01-15T09:05:00.000Z",
          "notes": "{\"exp_date\":\"30/08/2027\"}",
          "exp_date": "30/08/2027"
        },
        {
          "session_id": "660e8400-e29b-41d4-a716-446655440002",
          "session_number": 2,
          "actual_mass": 50.5,
          "accumulated_mass": 100.5,
          "status": "completed",
          "tolerance_min": 95.0,
          "tolerance_max": 105.0,
          "session_started_at": "2024-01-15T09:10:00.000Z",
          "session_completed_at": "2024-01-15T09:15:00.000Z",
          "notes": "{\"exp_date\":\"30/08/2027\"}",
          "exp_date": "30/08/2027"
        }
      ]
    }
  ]
}
```

### Karakteristik Format 2:
- ✅ **TIDAK** memiliki array `exp_dates` terpisah
- ✅ Setiap session memiliki field `exp_date` langsung
- ✅ exp_date juga bisa disimpan di `notes` sebagai JSON string
- ✅ `actual_mass` di session akan digunakan sebagai actual_weight

### Bagaimana Format 2 Diproses:

Sistem akan **otomatis mengkonversi** Format 2 ke Format 1 dengan cara:

1. Mengekstrak `exp_date` dari setiap session
2. Mengambil `exp_date` dari field langsung atau dari `notes` (JSON string)
3. Mengelompokkan sessions berdasarkan exp_date yang sama
4. Menjumlahkan `actual_mass` untuk exp_date yang sama
5. Membuat array `exp_dates` dengan `actual_weight` yang sudah dijumlahkan

**Contoh transformasi:**

Input:
```json
{
  "sessions": [
    { "exp_date": "30/08/2027", "actual_mass": 50.0 },
    { "exp_date": "30/08/2027", "actual_mass": 50.5 }
  ]
}
```

Output (yang disimpan):
```json
{
  "exp_dates": [
    { "exp_date": "30/08/2027", "actual_weight": 100.5 }
  ],
  "sessions": [...]
}
```

---

## 📋 Field Reference

### Work Order Fields (Top Level)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| work_order | string | ✅ Yes | Nomor Manufacturing Order (unique) |
| sku | string | ⚪ No | SKU name |
| formulation_name | string | ⚪ No | Nama formula produk |
| production_date | string (ISO 8601) | ⚪ No | Tanggal produksi |
| planned_quantity | number | ⚪ No | Quantity yang direncanakan |
| status | string | ⚪ No | Status: `completed`, `in_progress`, `pending`, `reject` |
| operator_name | string | ⚪ No | Nama operator |
| end_time | string (ISO 8601) | ⚪ No | Waktu selesai |
| ingredients | array | ⚪ No | Array ingredients (lihat detail di bawah) |

### Ingredient Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| ingredient_id | string | ✅ Yes | Unique identifier untuk ingredient |
| ingredient_code | string | ⚪ No | Kode ingredient |
| ingredient_name | string | ⚪ No | Nama ingredient |
| target_mass | number | ⚪ No | Target mass yang diinginkan (gram) |
| current_accumulated_mass | number | ⚪ No | Total mass yang sudah ditimbang |
| current_status | string | ⚪ No | Status: `completed`, `weighing`, `pending` |
| tolerance_min | number | ⚪ No | Batas minimum toleransi |
| tolerance_max | number | ⚪ No | Batas maksimum toleransi |
| exp_dates | array | ⚪ No | Array exp dates (Format 1 only) |
| sessions | array | ⚪ No | Array sessions penimbangan |

### Exp Date Fields (Format 1)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| exp_date | string | ✅ Yes | Tanggal expired (format bebas: DD/MM/YYYY atau YYYY-MM-DD) |
| actual_weight | number | ✅ Yes | Berat actual untuk exp date ini (gram) |

### Session Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| session_id | string | ✅ Yes | Unique identifier untuk session |
| session_number | number | ✅ Yes | Nomor urut session |
| actual_mass | number | ✅ Yes | Mass yang ditimbang di session ini |
| accumulated_mass | number | ⚪ No | Total accumulated mass sampai session ini |
| status | string | ⚪ No | Status session: `completed`, `active` |
| tolerance_min | number | ⚪ No | Batas minimum toleransi |
| tolerance_max | number | ⚪ No | Batas maksimum toleransi |
| session_started_at | string (ISO 8601) | ⚪ No | Waktu mulai session |
| session_completed_at | string (ISO 8601) | ⚪ No | Waktu selesai session |
| notes | string/object | ⚪ No | Catatan session (bisa JSON string) |
| exp_date | string | ⚪ No | Exp date (Format 2 only) |

---

## 🧪 Testing Format Data

### Test Format 1 (Lama):
```bash
node test-send-data.js
```

### Test Format 2 (Baru):
```bash
node test-new-format.js
```

---

## 🔄 Migrasi dari Format Lama ke Baru

Jika Anda ingin menggunakan Format 2 (exp_date di sessions):

### Sebelum:
```javascript
const data = {
  ingredients: [{
    exp_dates: [
      { exp_date: "2025-12-31", actual_weight: 100.5 }
    ],
    sessions: [...]
  }]
}
```

### Sesudah:
```javascript
const data = {
  ingredients: [{
    // Hapus exp_dates array
    sessions: [
      {
        session_id: "...",
        actual_mass: 50.0,
        exp_date: "2025-12-31"  // ← Tambahkan di session
      },
      {
        session_id: "...",
        actual_mass: 50.5,
        exp_date: "2025-12-31"  // ← Sama exp_date = akan digabung
      }
    ]
  }]
}
```

---

## ⚠️ Catatan Penting

### 1. Format Tanggal

Sistem menerima berbagai format tanggal:
- ✅ `DD/MM/YYYY` (contoh: `30/08/2027`)
- ✅ `YYYY-MM-DD` (contoh: `2027-08-30`)
- ✅ ISO 8601 full (contoh: `2024-01-15T08:30:00.000Z`)

### 2. exp_date null

Jika session tidak memiliki exp_date (null), sistem akan:
- Skip session tersebut saat membuat exp_dates array
- Menggunakan `current_accumulated_mass` sebagai fallback untuk total weight

### 3. Notes Field

Field `notes` bisa berisi:
- String biasa: `"Session notes"`
- JSON string: `"{\"exp_date\":\"30/08/2027\"}"`
- Jika JSON string, sistem akan coba extract exp_date dari dalamnya

### 4. Prioritas exp_date

Jika ada `exp_dates` array DAN `exp_date` di sessions:
- Sistem akan **prioritaskan** `exp_dates` array yang sudah ada
- `exp_date` di sessions akan diabaikan

---

## 🎯 Rekomendasi

### Untuk Integrasi Baru:
Gunakan **Format 2** (exp_date di sessions) karena:
- ✅ Lebih natural - exp_date terkait langsung dengan session
- ✅ Lebih mudah untuk tracking per session
- ✅ Otomatis dikonversi ke format internal yang benar

### Untuk Sistem Legacy:
Tetap gunakan **Format 1** jika:
- Sudah ada kode yang mengirim format lama
- Tidak ingin mengubah existing integration
- Sistem sudah stabil dan berjalan

---

## 📞 Contoh Integrasi

### JavaScript/Node.js

```javascript
// Format 2 - Recommended
const moData = {
  work_order: "MO-2024-001",
  sku: "SKU-001",
  // ... other fields
  ingredients: [
    {
      ingredient_id: "ing-001",
      ingredient_name: "Sugar",
      target_mass: 100.0,
      sessions: [
        {
          session_id: "sess-001",
          session_number: 1,
          actual_mass: 50.0,
          exp_date: "31/12/2025"  // ← Exp date di session
        },
        {
          session_id: "sess-002",
          session_number: 2,
          actual_mass: 50.0,
          exp_date: "31/12/2025"  // ← Akan digabung dengan sess-001
        }
      ]
    }
  ]
}

// Kirim ke API
fetch('http://your-vps-ip:4000/api/mo/receive', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify(moData)
})
.then(res => res.json())
.then(data => console.log('Success:', data))
.catch(err => console.error('Error:', err))
```

---

## ✅ Kesimpulan

**Jawaban untuk pertanyaan Anda:**

> Apakah format ini kompatibel dengan yang ada sekarang?

**Jawab:** ✅ **YA, 100% KOMPATIBEL!**

Format data yang Anda kirim (dengan `exp_date` di sessions) akan:
1. ✅ Diterima oleh sistem
2. ✅ Otomatis dikonversi ke format internal
3. ✅ Ditampilkan dengan benar di report summary
4. ✅ Exp dates di-group berdasarkan tanggal yang sama
5. ✅ Actual weight otomatis dijumlahkan per exp_date

**Anda bisa langsung menggunakan format tersebut tanpa modifikasi!** 🎉

---

**Last Updated:** December 19, 2024  
**Version:** 2.0

