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

// ==================== HELPER FUNCTIONS ====================

/**
 * Extract exp_date from notes JSON string
 */
function extractExpDateFromNotes(notes) {
  if (!notes) return null
  try {
    if (typeof notes === 'string') {
      const parsed = JSON.parse(notes)
      return parsed.exp_date || null
    } else if (typeof notes === 'object' && notes.exp_date) {
      return notes.exp_date
    }
  } catch (e) {
    return null
  }
  return null
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

    let data = req.body
    
    // Transform data: extract exp_dates from sessions if not present
    if (data.ingredients && Array.isArray(data.ingredients)) {
      data.ingredients = data.ingredients.map(ingredient => {
        // If exp_dates array doesn't exist, build it from sessions
        if (!ingredient.exp_dates || ingredient.exp_dates.length === 0) {
          if (ingredient.sessions && Array.isArray(ingredient.sessions)) {
            const expDatesMap = {}
            
            // Group sessions by exp_date
            ingredient.sessions.forEach(session => {
              const expDate = session.exp_date || extractExpDateFromNotes(session.notes) || null
              if (expDate) {
                if (!expDatesMap[expDate]) {
                  expDatesMap[expDate] = 0
                }
                expDatesMap[expDate] += parseFloat(session.actual_mass || 0)
              }
            })
            
            // Convert map to array
            ingredient.exp_dates = Object.keys(expDatesMap).map(expDate => ({
              exp_date: expDate,
              actual_weight: expDatesMap[expDate]
            }))
          }
        }
        
        return ingredient
      })
    }

    // Validate required fields
    if (!data.work_order) {
      return res.status(400).json({
        success: false,
        error: 'work_order is required'
      })
    }

    // Extract main fields
    const {
      work_order,
      sku,
      formulation_name,
      production_date,
      planned_quantity,
      status,
      operator_name,
      end_time
    } = data

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

      res.json({
        success: true,
        message: 'Data received and stored successfully',
        work_order: work_order,
        id: this.lastID
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
      
      // Transform data to match the expected format
      const responseData = {
        workOrder: {
          work_order: fullData.work_order,
          sku: fullData.sku,
          formulation_name: fullData.formulation_name,
          production_date: fullData.production_date,
          planned_quantity: fullData.planned_quantity,
          status: fullData.status,
          operator_name: fullData.operator_name,
          end_time: fullData.end_time
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

