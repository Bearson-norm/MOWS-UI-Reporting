# 📡 API Documentation

Dokumentasi lengkap untuk semua API endpoints yang tersedia di MO Receiver Website.

## Base URL

```
http://localhost:4000
```

Untuk production/VPS, ganti dengan IP atau domain server Anda:
```
http://YOUR_VPS_IP:4000
```

---

## Authentication

Semua endpoint yang membutuhkan authentication menggunakan Bearer Token di header:

```
Authorization: Bearer YOUR_TOKEN_HERE
```

---

## Endpoints

### 1. POST /api/mo/receive

Endpoint untuk menerima data Manufacturing Order dari website eksternal.

#### Headers

| Header | Value | Required |
|--------|-------|----------|
| Content-Type | application/json | ✅ Yes |
| Authorization | Bearer {token} | ✅ Yes |

#### Request Body

```json
{
  "work_order": "string (required)",
  "sku": "string (optional)",
  "formulation_name": "string (optional)",
  "production_date": "ISO 8601 datetime (optional)",
  "planned_quantity": "number (optional)",
  "status": "string (optional)",
  "operator_name": "string (optional)",
  "end_time": "ISO 8601 datetime (optional)",
  "ingredients": [
    {
      "ingredient_id": "string (required)",
      "ingredient_code": "string (optional)",
      "ingredient_name": "string (optional)",
      "target_mass": "number (required)",
      "current_accumulated_mass": "number (required)",
      "current_status": "string (optional)",
      "tolerance_min": "number (optional)",
      "tolerance_max": "number (optional)",
      "exp_dates": [
        {
          "exp_date": "string (date format)",
          "actual_weight": "number"
        }
      ],
      "sessions": [
        {
          "session_id": "string (required)",
          "session_number": "integer (required)",
          "actual_mass": "number (required)",
          "accumulated_mass": "number (required)",
          "status": "string (optional)",
          "tolerance_min": "number (optional)",
          "tolerance_max": "number (optional)",
          "session_started_at": "ISO 8601 datetime (optional)",
          "session_completed_at": "ISO 8601 datetime (optional)",
          "notes": "string (optional)"
        }
      ]
    }
  ]
}
```

#### Response Success (200)

```json
{
  "success": true,
  "message": "Data received and stored successfully",
  "work_order": "MO-2024-001",
  "id": 1
}
```

#### Response Error (400/401/500)

```json
{
  "success": false,
  "error": "Error message description"
}
```

#### cURL Example

```bash
curl -X POST http://localhost:3000/api/mo/receive \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "work_order": "MO-2024-001",
    "sku": "SKU-001",
    "formulation_name": "Test Formula",
    "production_date": "2024-12-19T10:00:00Z",
    "planned_quantity": 1000.0,
    "status": "completed",
    "operator_name": "John Doe",
    "end_time": "2024-12-19T12:00:00Z",
    "ingredients": []
  }'
```

#### JavaScript Example

```javascript
const response = await fetch('http://localhost:4000/api/mo/receive', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify(moData)
})

const result = await response.json()
console.log(result)
```

#### Notes

- Jika `work_order` sudah ada di database, data akan di-update (bukan create baru)
- Field `work_order` wajib ada dan harus unique
- Data lengkap disimpan sebagai JSON di database untuk kemudahan retrieval

---

### 2. GET /api/mo-list

Mendapatkan daftar semua Manufacturing Order yang telah diterima.

#### Headers

Tidak memerlukan authentication.

#### Query Parameters

Tidak ada query parameters.

#### Response Success (200)

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
      "production_date": "2024-12-19T10:00:00Z",
      "planned_quantity": 1000.0,
      "operator_name": "John Doe",
      "created_at": "2024-12-19T10:00:00.000Z",
      "updated_at": "2024-12-19T10:00:00.000Z"
    },
    {
      "id": 2,
      "work_order": "MO-2024-002",
      "sku": "SKU-002",
      "formulation_name": "Another Formula",
      "status": "in_progress",
      "production_date": "2024-12-19T11:00:00Z",
      "planned_quantity": 2000.0,
      "operator_name": "Jane Smith",
      "created_at": "2024-12-19T11:00:00.000Z",
      "updated_at": "2024-12-19T11:00:00.000Z"
    }
  ]
}
```

#### Response Error (500)

```json
{
  "success": false,
  "error": "Error message"
}
```

#### cURL Example

```bash
curl http://localhost:4000/api/mo-list
```

#### JavaScript Example

```javascript
const response = await fetch('http://localhost:4000/api/mo-list')
const result = await response.json()

if (result.success) {
  console.log('MO List:', result.data)
}
```

#### Notes

- Data diurutkan berdasarkan `updated_at` DESC (terbaru di atas)
- Tidak mengembalikan full JSON data, hanya field summary
- Tidak memerlukan authentication

---

### 3. GET /api/mo-receiver/:id

Mendapatkan detail lengkap Manufacturing Order berdasarkan ID.

#### Headers

Tidak memerlukan authentication.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | ID dari work order (bukan work_order number) |

#### Response Success (200)

```json
{
  "success": true,
  "data": {
    "workOrder": {
      "work_order": "MO-2024-001",
      "sku": "SKU-001",
      "formulation_name": "Formula Name",
      "production_date": "2024-12-19T10:00:00Z",
      "planned_quantity": 1000.0,
      "status": "completed",
      "operator_name": "John Doe",
      "end_time": "2024-12-19T12:00:00Z"
    },
    "ingredients": [
      {
        "ingredient_id": "ing-001",
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
            "notes": "Session notes"
          }
        ]
      }
    ]
  }
}
```

#### Response Error (404/500)

```json
{
  "success": false,
  "error": "Work order not found"
}
```

#### cURL Example

```bash
curl http://localhost:4000/api/mo-receiver/1
```

#### JavaScript Example

```javascript
const moId = 1
const response = await fetch(`http://localhost:4000/api/mo-receiver/${moId}`)
const result = await response.json()

if (result.success) {
  console.log('Work Order:', result.data.workOrder)
  console.log('Ingredients:', result.data.ingredients)
}
```

#### Notes

- Mengembalikan full JSON data yang telah disimpan
- Data di-transform ke format yang cocok untuk frontend component
- Digunakan untuk menampilkan detail report di UI

---

### 4. DELETE /api/mo-receiver/:id

Menghapus data Manufacturing Order dari database.

#### Headers

Tidak memerlukan authentication (consider adding auth for production).

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | ID dari work order yang akan dihapus |

#### Response Success (200)

```json
{
  "success": true,
  "message": "Work order deleted successfully"
}
```

#### Response Error (404/500)

```json
{
  "success": false,
  "error": "Work order not found"
}
```

#### cURL Example

```bash
curl -X DELETE http://localhost:4000/api/mo-receiver/1
```

#### JavaScript Example

```javascript
const moId = 1
const response = await fetch(`http://localhost:4000/api/mo-receiver/${moId}`, {
  method: 'DELETE'
})

const result = await response.json()
console.log(result)
```

#### Notes

- Penghapusan bersifat permanen dan tidak dapat di-undo
- Sebaiknya tambahkan authentication di production
- Akan menghapus seluruh data termasuk ingredients dan sessions

---

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Missing or invalid token |
| 404 | Not Found - Resource tidak ditemukan |
| 500 | Internal Server Error - Server error |

---

## Data Types & Formats

### Date Format

Semua date menggunakan format ISO 8601:
```
2024-12-19T10:00:00Z
```

### Status Values

**Work Order Status:**
- `pending` - Belum dimulai
- `in_progress` - Sedang berjalan
- `completed` - Selesai
- `reject` - Ditolak
- `cancelled` - Dibatalkan

**Ingredient Status:**
- `pending` - Belum ditimbang
- `weighing` - Sedang ditimbang
- `completed` - Selesai ditimbang

**Session Status:**
- `active` - Sedang aktif
- `completed` - Selesai

---

## Error Handling

Semua error response mengikuti format:

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

### Common Errors

**401 Unauthorized**
```json
{
  "success": false,
  "error": "Unauthorized: Missing or invalid authorization token"
}
```

**400 Bad Request**
```json
{
  "success": false,
  "error": "work_order is required"
}
```

**404 Not Found**
```json
{
  "success": false,
  "error": "Work order not found"
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "error": "Failed to save data: database error message"
}
```

---

## Rate Limiting

Saat ini tidak ada rate limiting. Untuk production, pertimbangkan untuk menambahkan rate limiting menggunakan packages seperti `express-rate-limit`.

---

## CORS Configuration

Server sudah dikonfigurasi untuk menerima request dari semua origin (`*`). Untuk production, sebaiknya batasi origin yang diizinkan:

```javascript
app.use(cors({
  origin: 'https://mows.moof-set.web.id'
}))
```

---

## Testing

### Postman Collection

Anda bisa import endpoint-endpoint ini ke Postman untuk testing.

### Automated Test

Gunakan test script yang sudah disediakan:

```bash
node test-send-data.js
```

Atau dengan file JSON:

```bash
curl -X POST http://localhost:3000/api/mo/receive \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TEST_TOKEN" \
  -d @sample-data.json
```

---

## Webhook Integration

Untuk integrasi otomatis, website eksternal bisa mengirim data setiap kali ada work order yang selesai:

```javascript
// Di website eksternal (https://mows.moof-set.web.id)
async function sendToReceiver(workOrderData) {
  try {
    const response = await fetch('http://your-receiver-server:4000/api/mo/receive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_SECRET_TOKEN'
      },
      body: JSON.stringify(workOrderData)
    })
    
    const result = await response.json()
    
    if (result.success) {
      console.log('Data sent successfully:', result)
    } else {
      console.error('Failed to send data:', result.error)
    }
  } catch (error) {
    console.error('Network error:', error)
  }
}
```

---

## Security Recommendations

### Production Checklist:

- [ ] Ganti default token dengan token yang kuat
- [ ] Implementasi proper token verification
- [ ] Tambahkan HTTPS/SSL certificate
- [ ] Batasi CORS origin ke domain yang spesifik
- [ ] Tambahkan rate limiting
- [ ] Implementasi logging untuk audit trail
- [ ] Tambahkan authentication untuk DELETE endpoint
- [ ] Gunakan environment variables untuk sensitive data
- [ ] Setup firewall rules
- [ ] Regular backup database

---

## Support

Jika ada pertanyaan atau masalah dengan API, silakan:
- Cek dokumentasi di README.md
- Review QUICK_START.md untuk troubleshooting
- Contact developer

---

**Version:** 1.0.0  
**Last Updated:** December 19, 2024

