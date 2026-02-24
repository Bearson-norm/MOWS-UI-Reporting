const express = require('express')
const sqlite3 = require('sqlite3').verbose()
const { Pool } = require('pg')
const path = require('path')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 4001
const HOST = process.env.HOST || '0.0.0.0'

// Database configuration
const DB_TYPE = process.env.DB_TYPE || 'sqlite' // 'sqlite' or 'postgresql'
let db = null
let dbType = DB_TYPE

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static('public'))

// Initialize Database
if (DB_TYPE === 'postgresql') {
  // PostgreSQL configuration
  const pgConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'kmi_receiver',
    user: process.env.DB_USER || 'kmi_user',
    password: process.env.DB_PASSWORD || '',
  }

  db = new Pool(pgConfig)
  
  // Test connection
  db.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('Error connecting to PostgreSQL:', err.message)
    } else {
      console.log('Connected to PostgreSQL database:', pgConfig.database)
      initializeDatabase()
    }
  })
} else {
  // SQLite configuration
  const dbPath = process.env.DB_PATH || './kmi_receiver.db'
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err.message)
    } else {
      console.log('Connected to SQLite database:', dbPath)
      initializeDatabase()
    }
  })
}

// Initialize database tables
function initializeDatabase() {
  if (DB_TYPE === 'postgresql') {
    // PostgreSQL schema
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS received_work_orders (
        id SERIAL PRIMARY KEY,
        work_order VARCHAR(255) UNIQUE NOT NULL,
        sku VARCHAR(255),
        formulation_name VARCHAR(255),
        production_date VARCHAR(255),
        planned_quantity NUMERIC,
        status VARCHAR(255),
        operator_name VARCHAR(255),
        end_time VARCHAR(255),
        data_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    
    db.query(createTableSQL, (err) => {
      if (err) {
        console.error('Error creating table:', err.message)
      } else {
        console.log('PostgreSQL table ready')
      }
    })
  } else {
    // SQLite schema
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
        console.log('SQLite table ready')
      }
    })
  }
}

// ==================== DATABASE HELPER FUNCTIONS ====================

// Helper function to execute queries (abstracts SQLite vs PostgreSQL differences)
function dbQuery(sql, params, callback) {
  if (DB_TYPE === 'postgresql') {
    // Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
    let paramIndex = 1
    const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`)
    db.query(pgSql, params, (err, result) => {
      if (err) {
        callback(err, null)
      } else {
        // Convert PostgreSQL result to SQLite-like format
        callback(null, result.rows)
      }
    })
  } else {
    // SQLite
    db.all(sql, params, callback)
  }
}

// Helper function for single row queries
function dbGet(sql, params, callback) {
  if (DB_TYPE === 'postgresql') {
    let paramIndex = 1
    const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`)
    db.query(pgSql, params, (err, result) => {
      if (err) {
        callback(err, null)
      } else {
        callback(null, result.rows[0] || null)
      }
    })
  } else {
    // SQLite
    db.get(sql, params, callback)
  }
}

// Helper function for INSERT/UPDATE/DELETE
function dbRun(sql, params, callback) {
  if (DB_TYPE === 'postgresql') {
    let paramIndex = 1
    const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`)
    db.query(pgSql, params, (err, result) => {
      if (err) {
        callback(err)
      } else {
        // Return SQLite-like result object
        callback(null, {
          lastID: result.rows[0]?.id || null,
          changes: result.rowCount || 0
        })
      }
    })
  } else {
    // SQLite
    db.run(sql, params, function(err) {
      if (err) {
        callback(err)
      } else {
        callback(null, {
          lastID: this.lastID,
          changes: this.changes
        })
      }
    })
  }
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
    // For PostgreSQL, we need to handle ON CONFLICT differently and get the ID back
    if (DB_TYPE === 'postgresql') {
      const upsertSql = `
        INSERT INTO received_work_orders 
          (work_order, sku, formulation_name, production_date, planned_quantity, status, operator_name, end_time, data_json, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
        ON CONFLICT(work_order) 
        DO UPDATE SET
          sku = EXCLUDED.sku,
          formulation_name = EXCLUDED.formulation_name,
          production_date = EXCLUDED.production_date,
          planned_quantity = EXCLUDED.planned_quantity,
          status = EXCLUDED.status,
          operator_name = EXCLUDED.operator_name,
          end_time = EXCLUDED.end_time,
          data_json = EXCLUDED.data_json,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `
      
      db.query(upsertSql, [
        work_order,
        sku,
        formulation_name,
        production_date,
        planned_quantity,
        status,
        operator_name,
        end_time,
        dataJson
      ], (err, result) => {
        if (err) {
          console.error('Error saving data:', err.message)
          return res.status(500).json({
            success: false,
            error: 'Failed to save data: ' + err.message
          })
        }

        // If no rows returned (shouldn't happen), query for the ID
        if (result.rows.length === 0) {
          db.query('SELECT id FROM received_work_orders WHERE work_order = $1', [work_order], (err, idResult) => {
            if (err) {
              return res.status(500).json({
                success: false,
                error: 'Failed to save data: ' + err.message
              })
            }
            res.json({
              success: true,
              message: 'Data received and stored successfully',
              work_order: work_order,
              id: idResult.rows[0]?.id || null
            })
          })
        } else {
          res.json({
            success: true,
            message: 'Data received and stored successfully',
            work_order: work_order,
            id: result.rows[0].id
          })
        }
      })
    } else {
      // SQLite
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

        // For SQLite, this.lastID only works for INSERT, not UPDATE via ON CONFLICT
        // So we need to query for the ID after insert/update
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
            id: row ? row.id : this.lastID
          })
        })
      })
    }

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

  dbQuery(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching MO list:', err.message)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch data: ' + err.message
      })
    }

    res.json({
      success: true,
      data: rows || []
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

  dbGet(sql, [id], (err, row) => {
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

  dbRun(sql, [id], (err, result) => {
    if (err) {
      console.error('Error deleting MO:', err.message)
      return res.status(500).json({
        success: false,
        error: 'Failed to delete data: ' + err.message
      })
    }

    if (result.changes === 0) {
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
  if (DB_TYPE === 'postgresql') {
    db.end((err) => {
      if (err) {
        console.error('Error closing database:', err.message)
      } else {
        console.log('PostgreSQL connection closed')
      }
      process.exit(0)
    })
  } else {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message)
      } else {
        console.log('SQLite connection closed')
      }
      process.exit(0)
    })
  }
})

