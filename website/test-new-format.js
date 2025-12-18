/**
 * Test Script untuk Format Data Baru (dengan exp_date di sessions)
 * 
 * Cara pakai:
 * 1. Pastikan server sudah running: npm start
 * 2. Jalankan script ini: node test-new-format.js
 */

const sampleDataNewFormat = {
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
    },
    {
      "ingredient_id": "550e8400-e29b-41d4-a716-446655440002",
      "ingredient_code": "ING-002",
      "ingredient_name": "NICOTINE BENZOAT POWDER",
      "target_mass": 60.0,
      "current_accumulated_mass": 60.0,
      "current_status": "completed",
      "tolerance_min": 57.0,
      "tolerance_max": 63.0,
      "sessions": [
        {
          "session_id": "660e8400-e29b-41d4-a716-446655440003",
          "session_number": 1,
          "actual_mass": 60.0,
          "accumulated_mass": 60.0,
          "status": "completed",
          "tolerance_min": 57.0,
          "tolerance_max": 63.0,
          "session_started_at": "2024-01-15T09:20:00.000Z",
          "session_completed_at": "2024-01-15T09:25:00.000Z",
          "notes": "{\"exp_date\":\"15/12/2025\"}",
          "exp_date": "15/12/2025"
        }
      ]
    },
    {
      "ingredient_id": "550e8400-e29b-41d4-a716-446655440003",
      "ingredient_code": "ING-003",
      "ingredient_name": "MATERIAL PG SKPIC",
      "target_mass": 900.0,
      "current_accumulated_mass": 900.0,
      "current_status": "completed",
      "tolerance_min": 855.0,
      "tolerance_max": 945.0,
      "sessions": [
        {
          "session_id": "660e8400-e29b-41d4-a716-446655440004",
          "session_number": 1,
          "actual_mass": 450.0,
          "accumulated_mass": 450.0,
          "status": "completed",
          "tolerance_min": 855.0,
          "tolerance_max": 945.0,
          "session_started_at": "2024-01-15T10:00:00.000Z",
          "session_completed_at": "2024-01-15T10:10:00.000Z",
          "notes": "{\"exp_date\":\"20/06/2026\"}",
          "exp_date": "20/06/2026"
        },
        {
          "session_id": "660e8400-e29b-41d4-a716-446655440005",
          "session_number": 2,
          "actual_mass": 450.0,
          "accumulated_mass": 900.0,
          "status": "completed",
          "tolerance_min": 855.0,
          "tolerance_max": 945.0,
          "session_started_at": "2024-01-15T10:15:00.000Z",
          "session_completed_at": "2024-01-15T10:25:00.000Z",
          "notes": "{\"exp_date\":\"25/07/2026\"}",
          "exp_date": "25/07/2026"
        }
      ]
    },
    {
      "ingredient_id": "550e8400-e29b-41d4-a716-446655440004",
      "ingredient_code": "ING-004",
      "ingredient_name": "PROPYLENE GLYCOL (PG)",
      "target_mass": 200.0,
      "current_accumulated_mass": 200.0,
      "current_status": "completed",
      "tolerance_min": 190.0,
      "tolerance_max": 210.0,
      "sessions": [
        {
          "session_id": "660e8400-e29b-41d4-a716-446655440006",
          "session_number": 1,
          "actual_mass": 200.0,
          "accumulated_mass": 200.0,
          "status": "completed",
          "tolerance_min": 190.0,
          "tolerance_max": 210.0,
          "session_started_at": "2024-01-15T11:00:00.000Z",
          "session_completed_at": "2024-01-15T11:05:00.000Z",
          "notes": null,
          "exp_date": null
        }
      ]
    },
    {
      "ingredient_id": "550e8400-e29b-41d4-a716-446655440005",
      "ingredient_code": "ING-005",
      "ingredient_name": "VEGETABLE GLYCERIN (VG)",
      "target_mass": 640.0,
      "current_accumulated_mass": 640.0,
      "current_status": "completed",
      "tolerance_min": 608.0,
      "tolerance_max": 672.0,
      "sessions": [
        {
          "session_id": "660e8400-e29b-41d4-a716-446655440007",
          "session_number": 1,
          "actual_mass": 640.0,
          "accumulated_mass": 640.0,
          "status": "completed",
          "tolerance_min": 608.0,
          "tolerance_max": 672.0,
          "session_started_at": "2024-01-15T11:30:00.000Z",
          "session_completed_at": "2024-01-15T11:40:00.000Z",
          "notes": "{\"exp_date\":\"31/12/2025\"}",
          "exp_date": "31/12/2025"
        }
      ]
    }
  ]
}

async function sendTestData() {
  try {
    console.log('🚀 Testing NEW FORMAT data ke server...\n')
    console.log('Work Order:', sampleDataNewFormat.work_order)
    console.log('SKU:', sampleDataNewFormat.sku)
    console.log('Ingredients:', sampleDataNewFormat.ingredients.length)
    console.log('\n📋 Format: exp_date ada di SESSIONS (bukan array exp_dates terpisah)')
    console.log('')

    const response = await fetch('http://localhost:4000/api/mo/receive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer TEST_TOKEN_123'
      },
      body: JSON.stringify(sampleDataNewFormat)
    })

    const result = await response.json()

    if (result.success) {
      console.log('✅ Data berhasil dikirim!')
      console.log('Response:', JSON.stringify(result, null, 2))
      console.log('\n📊 Buka browser dan akses: http://localhost:4000')
      console.log('💡 Data akan otomatis dikonversi ke format yang kompatibel')
      console.log('💡 Exp dates dari sessions akan ditampilkan dengan benar')
    } else {
      console.error('❌ Gagal mengirim data!')
      console.error('Error:', result.error)
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('\n⚠️  Pastikan server sudah running dengan: npm start')
  }
}

// Jalankan test
sendTestData()

