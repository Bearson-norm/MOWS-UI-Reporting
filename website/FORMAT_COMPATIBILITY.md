# 📋 Format Compatibility Guide

Panduan lengkap untuk format data yang didukung oleh MO Receiver API.

---

## 🎯 Format yang Didukung

API mendukung **2 format data**:

1. **Format Original** (Flat Structure)
2. **Format Baru** (Nested Structure) - Memerlukan transformasi

---

## 📦 Format Original (Flat Structure)

Format ini **langsung kompatibel** dengan API tanpa perlu transformasi.

### Struktur:

```json
{
  "work_order": "string",
  "sku": "string",
  "formulation_name": "string",
  "production_date": "ISO 8601 datetime",
  "planned_quantity": number,
  "status": "string",
  "operator_name": "string",
  "end_time": "ISO 8601 datetime",
  "ingredients": [...]
}
```

### Contoh Lengkap:

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
      "ingredient_id": "ing-001",
      "ingredient_code": "MC-001",
      "ingredient_name": "MENTHOLIC CRYSTALS",
      "target_mass": 100.0,
      "current_accumulated_mass": 100.5,
      "current_status": "completed",
      "tolerance_min": 95.0,
      "tolerance_max": 105.0,
      "exp_dates": [
        {
          "exp_date": "2027-08-30",
          "actual_weight": 100.5
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
          "notes": "Batch pertama"
        }
      ]
    }
  ]
}
```

### Karakteristik:
- ✅ Work order fields di **root level**
- ✅ Exp date format: `YYYY-MM-DD`
- ✅ Exp dates dalam array `exp_dates`

---

## 🆕 Format Baru (Nested Structure)

Format ini memerlukan **transformasi** sebelum dikirim ke API.

### Struktur:

```json
{
  "workOrder": {
    "work_order": "string",
    "sku": "string",
    "formulation_name": "string",
    "production_date": "ISO 8601 datetime",
    "planned_quantity": number,
    "status": "string",
    "operator_name": "string",
    "end_time": "ISO 8601 datetime",
    ...extra fields...
  },
  "ingredients": [...],
  "reject_reason": null
}
```

### Contoh Lengkap:

```json
{
  "workOrder": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "work_order": "MO-2024-001",
    "formulation_id": "660e8400-e29b-41d4-a716-446655440000",
    "planned_quantity": 1000.0,
    "status": "completed",
    "production_date": "2024-01-15T08:30:00.000Z",
    "end_time": "2024-01-15T14:45:00.000Z",
    "formulation_name": "Formula Produk A",
    "sku": "SKU-001",
    "operator_name": "John Doe",
    "operator_full_name": "John Doe"
  },
  "ingredients": [
    {
      "ingredient_id": "550e8400-e29b-41d4-a716-446655440001",
      "ingredient_code": "MC-001",
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
        }
      ],
      "exp_dates": [
        {
          "exp_date": "30/08/2027",
          "actual_weight": 100.5
        }
      ]
    }
  ],
  "reject_reason": null
}
```

### Karakteristik:
- ⚠️ Work order fields **nested** dalam object `workOrder`
- ⚠️ Exp date format: `DD/MM/YYYY`
- ⚠️ Exp date juga ada di session level (sebagai field dan dalam notes)
- ⚠️ Extra fields: `id`, `formulation_id`, `operator_full_name`, etc.

---

## 🔄 Cara Transform Format Baru

### Option 1: Gunakan Script Test (Recommended)

```bash
# Test di localhost
node test-send-data-new-format.js

# Test ke VPS
node test-send-data-new-format.js https://mows.moof-set.web.id
```

Script ini akan otomatis transform format baru ke format yang diterima API.

### Option 2: Manual Transform dalam Code

```javascript
function transformToServerFormat(newData) {
  const { workOrder, ingredients } = newData
  
  return {
    // Flatten workOrder ke root level
    work_order: workOrder.work_order,
    sku: workOrder.sku,
    formulation_name: workOrder.formulation_name,
    production_date: workOrder.production_date,
    planned_quantity: workOrder.planned_quantity,
    status: workOrder.status,
    operator_name: workOrder.operator_name || workOrder.operator_full_name,
    end_time: workOrder.end_time,
    
    // Transform ingredients
    ingredients: ingredients.map(ing => ({
      ...ing,
      // Convert exp_dates format dari DD/MM/YYYY ke YYYY-MM-DD
      exp_dates: ing.exp_dates.map(exp => ({
        exp_date: convertDateDDMMYYYYtoYYYYMMDD(exp.exp_date),
        actual_weight: exp.actual_weight
      }))
    }))
  }
}

function convertDateDDMMYYYYtoYYYYMMDD(dateStr) {
  if (!dateStr) return null
  
  // Jika sudah format YYYY-MM-DD, return as is
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr
  
  // Convert DD/MM/YYYY to YYYY-MM-DD
  const [day, month, year] = dateStr.split('/')
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

// Gunakan transform sebelum kirim ke API
const transformedData = transformToServerFormat(newFormatData)
const response = await fetch('http://your-server:4000/api/mo/receive', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify(transformedData)
})
```

---

## 📝 Perbedaan Detail

| Aspek | Format Original | Format Baru |
|-------|----------------|-------------|
| **Work Order Structure** | Flat (root level) | Nested dalam `workOrder` |
| **Exp Date Format** | `YYYY-MM-DD` | `DD/MM/YYYY` |
| **Exp Date Location** | Array `exp_dates` | Array `exp_dates` + session field |
| **Extra Fields** | Minimal | Banyak (id, formulation_id, dll) |
| **Kompatibilitas** | ✅ Langsung | ⚠️ Perlu transform |

---

## 🎯 Rekomendasi

### Untuk Development Baru:
- **Gunakan Format Original** untuk kompatibilitas langsung
- Lebih sederhana dan straightforward

### Untuk Integrasi dengan Sistem Existing:
- Jika sistem Anda menggunakan **Format Baru**:
  - Gunakan script transformer yang disediakan
  - Atau buat middleware transformer di backend

### Untuk API Endpoint:
- API akan tetap menerima **Format Original**
- Transform di client-side sebelum kirim data

---

## 🧪 Testing

### Test Format Original:

```bash
node test-send-data.js
```

### Test Format Baru:

```bash
# Local
node test-send-data-new-format.js

# VPS
node test-send-data-new-format.js https://mows.moof-set.web.id
```

### Test Manual dengan cURL:

**Format Original:**
```bash
curl -X POST http://localhost:4000/api/mo/receive \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d @sample-data.json
```

**Format Baru (sudah ditransform):**
```bash
curl -X POST http://localhost:4000/api/mo/receive \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d @sample-data-new-format-transformed.json
```

---

## ❓ FAQ

### Q: Apakah API akan support format baru langsung?
**A:** Saat ini tidak. API dirancang untuk format original. Gunakan transformer untuk convert format baru.

### Q: Bagaimana jika saya punya field tambahan di workOrder?
**A:** Field tambahan akan diabaikan. API hanya mengambil field yang diperlukan.

### Q: Apakah exp_date di session level digunakan?
**A:** API menggunakan data dari array `exp_dates`. Exp date di session level bisa disimpan dalam `notes` sebagai informasi tambahan.

### Q: Format date mana yang lebih baik?
**A:** **YYYY-MM-DD** lebih universal dan mudah di-parse. Tapi transformer bisa handle kedua format.

---

## 🔧 Troubleshooting

### Error: "work_order is required"
- Pastikan field `work_order` ada di root level (bukan nested dalam `workOrder`)
- Gunakan transformer jika menggunakan format baru

### Error: Invalid date format
- Pastikan exp_date dalam format `YYYY-MM-DD`
- Gunakan transformer untuk convert dari `DD/MM/YYYY`

### Data tidak muncul sesuai expected
- Cek format yang dikirim ke API (gunakan `console.log` sebelum kirim)
- Cek response dari API untuk error message

---

## 📞 Support

Untuk pertanyaan lebih lanjut, silakan:
- Baca [README.md](README.md)
- Baca [API.md](API.md)
- Contact developer

---

**Last Updated:** December 19, 2024






