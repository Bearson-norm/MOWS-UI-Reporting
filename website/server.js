const express = require('express')
const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 4000
const HOST = process.env.HOST || '0.0.0.0'

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static('public'))

// Initialize SQLite Database
const db = new sqlite3.Database('./mo_receiver.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message)
  } else {
    console.log('Connected to SQLite database')
    initializeDatabase()
  }
})

// Initialize database tables
function initializeDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS received_work_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_order TEXT UNIQUE NOT NULL,
      sku TEXT,
      formulation_name TEXT,
      production_date TEXT,
      planned_quantity REAL,
      status TEXT,
      operator_name TEXT,
      end_time TEXT,
      data_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating table:', err.message)
    } else {
      console.log('Database table ready')
    }
  })
}

// ==================== API ENDPOINTS ====================

/**
 * POST /api/mo/receive
 * Endpoint untuk menerima data MO dari website eksternal
 * Header: Authorization: Bearer YOUR_TOKEN_HERE
 */
app.post('/api/mo/receive', (req, res) => {
  try {
    // Verify authorization (optional - implement your token verification)
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing or invalid authorization token'
      })
    }

    const token = authHeader.substring(7)
    // TODO: Verify token here if needed
    // For now, we accept any token for testing

    const data = req.body

    // Handle both formats: nested workOrder object or root level fields
    // Priority: workOrder object > root level fields
    const workOrderData = data.workOrder || {}
    
    // Get work_order from workOrder object first, then fall back to root level
    const work_order = workOrderData.work_order || data.work_order

    // Validate required fields
    if (!work_order) {
      return res.status(400).json({
        success: false,
        error: 'work_order is required'
      })
    }

    // Extract main fields - prioritize workOrder object, fallback to root level
    const sku = workOrderData.sku || data.sku || null
    const formulation_name = workOrderData.formulation_name || data.formulation_name || null
    const production_date = workOrderData.production_date || data.production_date || null
    const planned_quantity = workOrderData.planned_quantity !== undefined ? workOrderData.planned_quantity : (data.planned_quantity !== undefined ? data.planned_quantity : null)
    const status = workOrderData.status || data.status || null
    const operator_name = workOrderData.operator_name || data.operator_name || null
    const end_time = workOrderData.end_time || data.end_time || null

    // Store complete JSON for later retrieval
    const dataJson = JSON.stringify(data)

    // Insert or update data
    const sql = `
      INSERT INTO received_work_orders 
        (work_order, sku, formulation_name, production_date, planned_quantity, status, operator_name, end_time, data_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(work_order) 
      DO UPDATE SET
        sku = excluded.sku,
        formulation_name = excluded.formulation_name,
        production_date = excluded.production_date,
        planned_quantity = excluded.planned_quantity,
        status = excluded.status,
        operator_name = excluded.operator_name,
        end_time = excluded.end_time,
        data_json = excluded.data_json,
        updated_at = CURRENT_TIMESTAMP
    `

    db.run(sql, [
      work_order,
      sku,
      formulation_name,
      production_date,
      planned_quantity,
      status,
      operator_name,
      end_time,
      dataJson
    ], function(err) {
      if (err) {
        console.error('Error saving data:', err.message)
        return res.status(500).json({
          success: false,
          error: 'Failed to save data: ' + err.message
        })
      }

      // Get the ID - query after insert/update to ensure we have the correct ID
      // (this.lastID only works reliably for INSERT, not UPDATE via ON CONFLICT)
      db.get('SELECT id FROM received_work_orders WHERE work_order = ?', [work_order], (err, row) => {
        if (err) {
          console.error('Error fetching ID:', err.message)
          return res.status(500).json({
            success: false,
            error: 'Failed to save data: ' + err.message
          })
        }
        
        res.json({
          success: true,
          message: 'Data received and stored successfully',
          work_order: work_order,
          id: row ? row.id : null
        })
      })
    })

  } catch (error) {
    console.error('Error processing request:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message
    })
  }
})

/**
 * GET /api/mo-list
 * Endpoint untuk mendapatkan list semua MO yang diterima
 */
app.get('/api/mo-list', (req, res) => {
  const sql = `
    SELECT 
      id,
      work_order,
      sku,
      formulation_name,
      status,
      production_date,
      planned_quantity,
      operator_name,
      created_at,
      updated_at
    FROM received_work_orders
    ORDER BY updated_at DESC
  `

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching MO list:', err.message)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch data: ' + err.message
      })
    }

    res.json({
      success: true,
      data: rows
    })
  })
})

/**
 * GET /api/mo-receiver/:id
 * Endpoint untuk mendapatkan detail MO berdasarkan ID
 */
app.get('/api/mo-receiver/:id', (req, res) => {
  const { id } = req.params

  const sql = `
    SELECT data_json
    FROM received_work_orders
    WHERE id = ?
  `

  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error('Error fetching MO detail:', err.message)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch data: ' + err.message
      })
    }

    if (!row) {
      return res.status(404).json({
        success: false,
        error: 'Work order not found'
      })
    }

    try {
      const fullData = JSON.parse(row.data_json)
      
      // Handle both formats: nested workOrder object or root level fields
      // Priority: workOrder object > root level fields
      const workOrderData = fullData.workOrder || {}
      
      // Extract work_order - prioritize workOrder object, fallback to root level
      const work_order = workOrderData.work_order || fullData.work_order
      
      // Transform data to match the expected format
      const responseData = {
        workOrder: {
          work_order: work_order,
          sku: workOrderData.sku !== undefined ? workOrderData.sku : (fullData.sku !== undefined ? fullData.sku : null),
          formulation_name: workOrderData.formulation_name || fullData.formulation_name || null,
          production_date: workOrderData.production_date || fullData.production_date || null,
          planned_quantity: workOrderData.planned_quantity !== undefined ? workOrderData.planned_quantity : (fullData.planned_quantity !== undefined ? fullData.planned_quantity : null),
          status: workOrderData.status || fullData.status || null,
          operator_name: workOrderData.operator_name || fullData.operator_name || null,
          end_time: workOrderData.end_time || fullData.end_time || null
        },
        ingredients: fullData.ingredients || []
      }

      res.json({
        success: true,
        data: responseData
      })
    } catch (parseError) {
      console.error('Error parsing JSON data:', parseError)
      return res.status(500).json({
        success: false,
        error: 'Failed to parse stored data'
      })
    }
  })
})

/**
 * DELETE /api/mo-receiver/:id
 * Endpoint untuk menghapus data MO (optional)
 */
app.delete('/api/mo-receiver/:id', (req, res) => {
  const { id } = req.params

  const sql = `DELETE FROM received_work_orders WHERE id = ?`

  db.run(sql, [id], function(err) {
    if (err) {
      console.error('Error deleting MO:', err.message)
      return res.status(500).json({
        success: false,
        error: 'Failed to delete data: ' + err.message
      })
    }

    if (this.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Work order not found'
      })
    }

    res.json({
      success: true,
      message: 'Work order deleted successfully'
    })
  })
})

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// Start server
app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`)
  console.log(`API endpoint for receiving data: http://${HOST}:${PORT}/api/mo/receive`)
  console.log(`API endpoint for MO list: http://${HOST}:${PORT}/api/mo-list`)
  console.log(`For external access, use your VPS IP: http://YOUR_VPS_IP:${PORT}`)
})

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message)
    } else {
      console.log('Database connection closed')
    }
    process.exit(0)
  })
})

