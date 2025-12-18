/**
 * Test Script untuk Mengirim Sample Data ke API
 * 
 * Cara pakai:
 * 1. Pastikan server sudah running: npm start
 * 2. Jalankan script ini: node test-send-data.js
 */

const sampleData = {
  work_order: "MO-2024-001",
  sku: "SKU-SAMPLE-001",
  formulation_name: "Formula Sample Test",
  production_date: "2024-12-19T08:00:00Z",
  planned_quantity: 1500.0,
  status: "completed",
  operator_name: "John Doe",
  end_time: "2024-12-19T14:30:00Z",
  ingredients: [
    {
      ingredient_id: "ing-uuid-001",
      ingredient_code: "ING-001",
      ingredient_name: "Bahan A",
      target_mass: 500.0,
      current_accumulated_mass: 502.5,
      current_status: "completed",
      tolerance_min: 475.0,
      tolerance_max: 525.0,
      exp_dates: [
        {
          exp_date: "2025-12-31",
          actual_weight: 300.5
        },
        {
          exp_date: "2026-01-15",
          actual_weight: 202.0
        }
      ],
      sessions: [
        {
          session_id: "session-uuid-001",
          session_number: 1,
          actual_mass: 300.5,
          accumulated_mass: 300.5,
          status: "completed",
          tolerance_min: 475.0,
          tolerance_max: 525.0,
          session_started_at: "2024-12-19T08:00:00Z",
          session_completed_at: "2024-12-19T08:15:00Z",
          notes: "Batch pertama dengan exp date 2025-12-31"
        },
        {
          session_id: "session-uuid-002",
          session_number: 2,
          actual_mass: 202.0,
          accumulated_mass: 502.5,
          status: "completed",
          tolerance_min: 475.0,
          tolerance_max: 525.0,
          session_started_at: "2024-12-19T08:20:00Z",
          session_completed_at: "2024-12-19T08:30:00Z",
          notes: "Batch kedua dengan exp date 2026-01-15"
        }
      ]
    },
    {
      ingredient_id: "ing-uuid-002",
      ingredient_code: "ING-002",
      ingredient_name: "Bahan B",
      target_mass: 300.0,
      current_accumulated_mass: 301.2,
      current_status: "completed",
      tolerance_min: 285.0,
      tolerance_max: 315.0,
      exp_dates: [
        {
          exp_date: "2025-11-30",
          actual_weight: 301.2
        }
      ],
      sessions: [
        {
          session_id: "session-uuid-003",
          session_number: 1,
          actual_mass: 301.2,
          accumulated_mass: 301.2,
          status: "completed",
          tolerance_min: 285.0,
          tolerance_max: 315.0,
          session_started_at: "2024-12-19T09:00:00Z",
          session_completed_at: "2024-12-19T09:10:00Z",
          notes: "Satu batch langsung selesai"
        }
      ]
    },
    {
      ingredient_id: "ing-uuid-003",
      ingredient_code: "ING-003",
      ingredient_name: "Bahan C",
      target_mass: 700.0,
      current_accumulated_mass: 698.5,
      current_status: "completed",
      tolerance_min: 665.0,
      tolerance_max: 735.0,
      exp_dates: [
        {
          exp_date: "2026-03-15",
          actual_weight: 350.0
        },
        {
          exp_date: "2026-04-20",
          actual_weight: 348.5
        }
      ],
      sessions: [
        {
          session_id: "session-uuid-004",
          session_number: 1,
          actual_mass: 350.0,
          accumulated_mass: 350.0,
          status: "completed",
          tolerance_min: 665.0,
          tolerance_max: 735.0,
          session_started_at: "2024-12-19T10:00:00Z",
          session_completed_at: "2024-12-19T10:20:00Z",
          notes: "Batch pertama exp 2026-03-15"
        },
        {
          session_id: "session-uuid-005",
          session_number: 2,
          actual_mass: 348.5,
          accumulated_mass: 698.5,
          status: "completed",
          tolerance_min: 665.0,
          tolerance_max: 735.0,
          session_started_at: "2024-12-19T10:25:00Z",
          session_completed_at: "2024-12-19T10:40:00Z",
          notes: "Batch kedua exp 2026-04-20"
        }
      ]
    }
  ]
}

async function sendTestData() {
  try {
    console.log('🚀 Mengirim sample data ke server...\n')
    console.log('Work Order:', sampleData.work_order)
    console.log('SKU:', sampleData.sku)
    console.log('Ingredients:', sampleData.ingredients.length)
    console.log('')

    const response = await fetch('http://localhost:3000/api/mo/receive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer TEST_TOKEN_123'
      },
      body: JSON.stringify(sampleData)
    })

    const result = await response.json()

    if (result.success) {
      console.log('✅ Data berhasil dikirim!')
      console.log('Response:', JSON.stringify(result, null, 2))
      console.log('\n📊 Buka browser dan akses: http://localhost:3000')
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

