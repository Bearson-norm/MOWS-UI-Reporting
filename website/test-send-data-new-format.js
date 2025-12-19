/**
 * Test Script untuk Format Baru dengan Transformer
 * 
 * Format baru memiliki struktur:
 * - workOrder (nested object)
 * - exp_date dalam format DD/MM/YYYY
 * - exp_date di session level
 * 
 * Script ini akan transform format baru ke format yang diterima server
 * 
 * Cara pakai:
 * 1. Pastikan server sudah running: npm start
 * 2. Jalankan script ini: node test-send-data-new-format.js
 * 3. Atau test ke VPS: node test-send-data-new-format.js https://mows.moof-set.web.id
 */

// Data sample dalam format baru
const newFormatData = {
  "workOrder": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "work_order": "MO-2024-001",
    "formulation_id": "660e8400-e29b-41d4-a716-446655440000",
    "planned_quantity": 1000.0,
    "status": "completed",
    "production_date": "2024-01-15T08:30:00.000Z",
    "end_time": "2024-01-15T14:45:00.000Z",
    "opened_at": null,
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
      ],
      "exp_dates": [
        {
          "exp_date": "30/08/2027",
          "actual_weight": 100.5
        }
      ]
    },
    {
      "ingredient_id": "550e8400-e29b-41d4-a716-446655440002",
      "ingredient_code": "MB-002",
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
      ],
      "exp_dates": [
        {
          "exp_date": "15/12/2025",
          "actual_weight": 60.0
        }
      ]
    },
    {
      "ingredient_id": "550e8400-e29b-41d4-a716-446655440003",
      "ingredient_code": "MP-001",
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
      ],
      "exp_dates": [
        {
          "exp_date": "20/06/2026",
          "actual_weight": 450.0
        },
        {
          "exp_date": "25/07/2026",
          "actual_weight": 450.0
        }
      ]
    },
    {
      "ingredient_id": "550e8400-e29b-41d4-a716-446655440004",
      "ingredient_code": "PG-001",
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
      ],
      "exp_dates": [
        {
          "exp_date": null,
          "actual_weight": 200.0
        }
      ]
    },
    {
      "ingredient_id": "550e8400-e29b-41d4-a716-446655440005",
      "ingredient_code": "VG-001",
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
      ],
      "exp_dates": [
        {
          "exp_date": "31/12/2025",
          "actual_weight": 640.0
        }
      ]
    }
  ],
  "reject_reason": null
}

/**
 * Convert date from DD/MM/YYYY to YYYY-MM-DD
 */
function convertDateFormat(dateStr) {
  if (!dateStr || dateStr === 'null' || dateStr === null) {
    return null
  }
  
  // Jika sudah format YYYY-MM-DD, return as is
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr
  }
  
  // Convert DD/MM/YYYY to YYYY-MM-DD
  const parts = dateStr.split('/')
  if (parts.length === 3) {
    const [day, month, year] = parts
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  
  return dateStr
}

/**
 * Transform format baru ke format yang diterima server
 */
function transformToServerFormat(newData) {
  const { workOrder, ingredients, reject_reason } = newData
  
  // Flatten workOrder ke root level
  const transformed = {
    work_order: workOrder.work_order,
    sku: workOrder.sku,
    formulation_name: workOrder.formulation_name,
    production_date: workOrder.production_date,
    planned_quantity: workOrder.planned_quantity,
    status: workOrder.status,
    operator_name: workOrder.operator_name || workOrder.operator_full_name,
    end_time: workOrder.end_time,
    ingredients: ingredients.map(ingredient => ({
      ingredient_id: ingredient.ingredient_id,
      ingredient_code: ingredient.ingredient_code,
      ingredient_name: ingredient.ingredient_name,
      target_mass: ingredient.target_mass,
      current_accumulated_mass: ingredient.current_accumulated_mass,
      current_status: ingredient.current_status,
      tolerance_min: ingredient.tolerance_min,
      tolerance_max: ingredient.tolerance_max,
      // Convert exp_dates format
      exp_dates: ingredient.exp_dates.map(exp => ({
        exp_date: convertDateFormat(exp.exp_date),
        actual_weight: exp.actual_weight
      })),
      // Keep sessions as is (exp_date sudah ada di session level)
      sessions: ingredient.sessions
    }))
  }
  
  // Add reject_reason if exists
  if (reject_reason) {
    transformed.reject_reason = reject_reason
  }
  
  return transformed
}

/**
 * Send data to server
 */
async function sendTestData(serverUrl = 'http://localhost:4000') {
  try {
    console.log('🔄 Transform data dari format baru ke format server...\n')
    
    // Transform data
    const transformedData = transformToServerFormat(newFormatData)
    
    console.log('📊 Data Info:')
    console.log('Work Order:', transformedData.work_order)
    console.log('SKU:', transformedData.sku)
    console.log('Formula:', transformedData.formulation_name)
    console.log('Status:', transformedData.status)
    console.log('Ingredients:', transformedData.ingredients.length)
    console.log('')
    
    console.log('🚀 Mengirim data ke:', serverUrl + '/api/mo/receive')
    console.log('')

    const response = await fetch(serverUrl + '/api/mo/receive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer TEST_TOKEN_123'
      },
      body: JSON.stringify(transformedData)
    })

    const result = await response.json()

    if (result.success) {
      console.log('✅ Data berhasil dikirim!')
      console.log('')
      console.log('📋 Response:')
      console.log(JSON.stringify(result, null, 2))
      console.log('')
      console.log('📊 Buka browser dan akses:')
      console.log('   ' + serverUrl)
      console.log('')
      console.log('🔗 View detail report:')
      console.log('   ' + serverUrl + '/WeighingReceiverDetail.html?id=' + result.id)
    } else {
      console.error('❌ Gagal mengirim data!')
      console.error('Error:', result.error)
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('')
    console.error('⚠️  Troubleshooting:')
    console.error('   1. Pastikan server sudah running')
    console.error('   2. Cek URL server sudah benar')
    console.error('   3. Cek koneksi network')
    console.error('')
    console.error('   Local: npm start')
    console.error('   VPS: pm2 status')
  }
}

// Get server URL from command line argument or use default
const serverUrl = process.argv[2] || 'http://localhost:4000'

console.log('========================================')
console.log('  Test Send Data - New Format Support  ')
console.log('========================================')
console.log('')

// Jalankan test
sendTestData(serverUrl)






