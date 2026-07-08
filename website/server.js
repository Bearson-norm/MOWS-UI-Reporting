const express = require('express')
const sqlite3 = require('sqlite3').verbose()
const { Pool } = require('pg')
const path = require('path')
const cors = require('cors')
const crypto = require('crypto')
const bcrypt = require('bcryptjs')

try {
  require('dotenv').config({ path: path.join(__dirname, '.env') })
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
} catch (err) {
  // dotenv is optional; PM2/shell env vars still work
}

const app = express()
const PORT = process.env.PORT || 4001
const HOST = process.env.HOST || '0.0.0.0'
const SESSION_EXPIRY_HOURS = parseInt(process.env.SESSION_EXPIRY_HOURS || '24', 10)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

function normalizeMoStatus(status, endTime) {
  if (status == null || String(status).trim() === '') {
    return endTime ? 'completed' : 'pending'
  }

  const normalized = String(status).trim().toLowerCase()

  if (['completed', 'complete', 'selesai', 'done', 'finished', 'finish'].includes(normalized)) {
    return 'completed'
  }
  if (['in_progress', 'in progress', 'inprogress', 'progress', 'sedang berjalan', 'weighing', 'active', 'running'].includes(normalized)) {
    return 'in_progress'
  }
  if (['reject', 'rejected', 'ditolak', 'cancelled', 'canceled', 'cancel'].includes(normalized)) {
    return 'reject'
  }
  if (['pending', 'waiting', 'open', 'new'].includes(normalized)) {
    return endTime ? 'completed' : 'pending'
  }

  return endTime ? 'completed' : 'pending'
}

// Legacy API helpers only — used by /api/mo/receive, /api/mo-list, /api/mo-receiver/*
function flattenLegacyPayload(body) {
  if (!body || typeof body !== 'object') return body

  const workOrder = body.workOrder || body.work_order_object
  if (!workOrder || typeof workOrder !== 'object') return body

  return {
    ...workOrder,
    work_order: body.work_order || workOrder.work_order,
    ingredients: body.ingredients || workOrder.ingredients || [],
    operator_name: body.operator_name || workOrder.operator_name || workOrder.operator_full_name
  }
}

function isIngredientWeighed(ingredient) {
  if (!ingredient || typeof ingredient !== 'object') return false

  const status = String(ingredient.current_status || ingredient.status || '').trim().toLowerCase()
  if (['completed', 'complete', 'selesai', 'done', 'finished'].includes(status)) return true

  if (Array.isArray(ingredient.sessions) && ingredient.sessions.length > 0) {
    return ingredient.sessions.every((session) => {
      const sessionStatus = String(session.status || '').trim().toLowerCase()
      return ['completed', 'complete', 'selesai', 'done', 'finished'].includes(sessionStatus)
    })
  }

  return parseFloat(ingredient.current_accumulated_mass || 0) > 0
}

function hasCompletedWeighing(ingredients) {
  if (!Array.isArray(ingredients) || ingredients.length === 0) return false
  return ingredients.every(isIngredientWeighed)
}

function resolveLegacyStoredData(fullData, row = {}) {
  const nested = fullData.workOrder && typeof fullData.workOrder === 'object' ? fullData.workOrder : {}
  const ingredients = fullData.ingredients || nested.ingredients || []
  const sku = row.sku || fullData.sku || nested.sku || nested.product_name || null
  const formulation_name = row.formulation_name || fullData.formulation_name || nested.formulation_name || sku || ingredients[0]?.ingredient_name || null
  const production_date = row.production_date || fullData.production_date || nested.production_date || null
  const operator_name = row.operator_name || fullData.operator_name || nested.operator_name || nested.operator_full_name || null
  const end_time = row.end_time || fullData.end_time || nested.end_time || nested.completed_at || null
  let planned_quantity = row.planned_quantity ?? fullData.planned_quantity ?? nested.planned_quantity

  if ((planned_quantity == null || Number(planned_quantity) === 0) && ingredients.length > 0) {
    planned_quantity = ingredients.reduce((sum, ingredient) => sum + parseFloat(ingredient.target_mass || 0), 0)
  }

  let status = row.status || fullData.status || nested.status
  status = normalizeMoStatus(status, end_time)
  if (status === 'pending' && hasCompletedWeighing(ingredients)) {
    status = 'completed'
  }

  return {
    work_order: row.work_order || fullData.work_order || nested.work_order,
    sku,
    formulation_name,
    production_date,
    planned_quantity,
    operator_name,
    end_time,
    status,
    ingredients
  }
}

// Database configuration
const DB_TYPE = process.env.DB_TYPE || 'sqlite' // 'sqlite' or 'postgresql'
let db = null
let dbType = DB_TYPE
let dbReady = false

// Middleware
app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: dbReady ? 'ready' : 'initializing',
    dbType: DB_TYPE,
    dbReady
  })
})

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


const SCHEMA_STATEMENTS = {
  postgresql: [
    `CREATE TABLE IF NOT EXISTS received_work_orders (
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
    )`,
    `CREATE TABLE IF NOT EXISTS received_work_orders_v2 (
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
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      access_legacy_report INTEGER DEFAULT 1,
      access_v2_report INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS app_settings (
      key VARCHAR(255) PRIMARY KEY,
      value TEXT NOT NULL
    )`
  ],
  sqlite: [
    `CREATE TABLE IF NOT EXISTS received_work_orders (
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
    )`,
    `CREATE TABLE IF NOT EXISTS received_work_orders_v2 (
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
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      access_legacy_report INTEGER DEFAULT 1,
      access_v2_report INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`
  ]
}

function runSchemaStatements(statements, index, callback) {
  if (index >= statements.length) {
    return callback(null)
  }

  if (DB_TYPE === 'postgresql') {
    db.query(statements[index], (err) => {
      if (err) return callback(err)
      runSchemaStatements(statements, index + 1, callback)
    })
  } else {
    db.run(statements[index], (err) => {
      if (err) return callback(err)
      runSchemaStatements(statements, index + 1, callback)
    })
  }
}

function migrateUsersRole(callback) {
  if (DB_TYPE === 'postgresql') {
    db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'", (err) => {
      if (err) return callback(err)
      dbRun(
        "UPDATE users SET role = 'admin' WHERE username = ? AND (role IS NULL OR role = 'user')",
        [ADMIN_USERNAME],
        callback
      )
    })
  } else {
    db.all('PRAGMA table_info(users)', [], (err, columns) => {
      if (err) return callback(err)
      const hasRole = columns && columns.some((col) => col.name === 'role')
      const addColumn = (next) => {
        if (hasRole) return next(null)
        db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'", next)
      }
      addColumn((alterErr) => {
        if (alterErr) return callback(alterErr)
        dbRun(
          "UPDATE users SET role = 'admin' WHERE username = ? AND (role IS NULL OR role = 'user')",
          [ADMIN_USERNAME],
          callback
        )
      })
    })
  }
}

function migrateUserReportAccess(callback) {
  const addColumnsPg = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS access_legacy_report INTEGER DEFAULT 1',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS access_v2_report INTEGER DEFAULT 1'
  ]

  if (DB_TYPE === 'postgresql') {
    let index = 0
    const runNext = (err) => {
      if (err) return callback(err)
      if (index >= addColumnsPg.length) return callback(null)
      db.query(addColumnsPg[index++], runNext)
    }
    runNext(null)
  } else {
    db.all('PRAGMA table_info(users)', [], (err, columns) => {
      if (err) return callback(err)
      const columnNames = (columns || []).map((col) => col.name)
      const statements = []
      if (!columnNames.includes('access_legacy_report')) {
        statements.push('ALTER TABLE users ADD COLUMN access_legacy_report INTEGER DEFAULT 1')
      }
      if (!columnNames.includes('access_v2_report')) {
        statements.push('ALTER TABLE users ADD COLUMN access_v2_report INTEGER DEFAULT 1')
      }

      let index = 0
      const runNext = (alterErr) => {
        if (alterErr) return callback(alterErr)
        if (index >= statements.length) return callback(null)
        db.run(statements[index++], runNext)
      }
      runNext(null)
    })
  }
}

const DEFAULT_REPORT_LEGACY_NAME = 'Report Legacy'
const DEFAULT_REPORT_V2_NAME = 'Report Format Baru'

function seedDefaultSettings(callback) {
  const defaults = [
    ['report_legacy_name', DEFAULT_REPORT_LEGACY_NAME],
    ['report_v2_name', DEFAULT_REPORT_V2_NAME]
  ]

  let index = 0
  const insertNext = (err) => {
    if (err) return callback(err)
    if (index >= defaults.length) return callback(null)

    const [key, value] = defaults[index++]
    const sql = DB_TYPE === 'postgresql'
      ? 'INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING'
      : 'INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)'

    if (DB_TYPE === 'postgresql') {
      db.query(sql, [key, value], insertNext)
    } else {
      db.run(sql, [key, value], insertNext)
    }
  }

  insertNext(null)
}

function getSetting(key, callback) {
  dbGet('SELECT value FROM app_settings WHERE key = ?', [key], (err, row) => {
    if (err) return callback(err, null)
    callback(null, row ? row.value : null)
  })
}

function setSetting(key, value, callback) {
  if (DB_TYPE === 'postgresql') {
    db.query(
      `INSERT INTO app_settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, value],
      (err) => callback(err)
    )
  } else {
    dbRun(
      'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, value],
      (err) => callback(err)
    )
  }
}

function getReportLabels(callback) {
  getSetting('report_legacy_name', (err1, legacyName) => {
    if (err1) return callback(err1, null)
    getSetting('report_v2_name', (err2, v2Name) => {
      if (err2) return callback(err2, null)
      callback(null, {
        legacyName: legacyName || DEFAULT_REPORT_LEGACY_NAME,
        v2Name: v2Name || DEFAULT_REPORT_V2_NAME
      })
    })
  })
}

function validateReportLabel(name, fieldLabel) {
  const trimmed = typeof name === 'string' ? name.trim() : ''
  if (!trimmed) {
    return { valid: false, error: `${fieldLabel} is required` }
  }
  if (trimmed.length > 100) {
    return { valid: false, error: `${fieldLabel} must be at most 100 characters` }
  }
  return { valid: true, value: trimmed }
}

function seedAdminUser(callback) {
  dbGet('SELECT id FROM users LIMIT 1', [], (err, row) => {
    if (err) return callback(err)
    if (row) return callback(null)

    const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10)
    dbRun(
      "INSERT INTO users (username, password_hash, role, access_legacy_report, access_v2_report) VALUES (?, ?, 'admin', 1, 1)",
      [ADMIN_USERNAME, passwordHash],
      (insertErr) => {
        if (insertErr) return callback(insertErr)
        console.log(`Admin user seeded: ${ADMIN_USERNAME}`)
        callback(null)
      }
    )
  })
}

let serverStarted = false

function startServer() {
  if (serverStarted) return
  serverStarted = true

  app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`)
    console.log(`API endpoint for receiving data: http://${HOST}:${PORT}/api/mo/receive`)
    console.log(`API endpoint for receiving v2 data: http://${HOST}:${PORT}/api/mo-v2/receive`)
    console.log(`API endpoint for MO list: http://${HOST}:${PORT}/api/mo-list`)
    console.log(`For external access, use your VPS IP: http://YOUR_VPS_IP:${PORT}`)
  })
}

// Initialize database tables
function initializeDatabase() {
  const statements = DB_TYPE === 'postgresql' ? SCHEMA_STATEMENTS.postgresql : SCHEMA_STATEMENTS.sqlite

  runSchemaStatements(statements, 0, (err) => {
    if (err) {
      console.error('Error creating tables:', err.message)
      return
    }

    console.log(`${DB_TYPE} tables ready`)
    migrateUsersRole((migrateErr) => {
      if (migrateErr) {
        console.error('Error migrating users role:', migrateErr.message)
        return
      }
      migrateUserReportAccess((accessErr) => {
        if (accessErr) {
          console.error('Error migrating user report access:', accessErr.message)
          return
        }
        seedAdminUser((seedErr) => {
          if (seedErr) {
            console.error('Error seeding admin user:', seedErr.message)
            return
          }
          seedDefaultSettings((settingsErr) => {
            if (settingsErr) {
              console.error('Error seeding default settings:', settingsErr.message)
              return
            }
            dbReady = true
            console.log('Database initialization completed')
            startServer()
          })
        })
      })
    })
  })
}

// Initialize Database

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

    const data = flattenLegacyPayload(req.body)

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
      status: rawStatus,
      operator_name,
      end_time
    } = data

    const status = normalizeMoStatus(rawStatus, end_time)
    const resolvedStatus = status === 'pending' && hasCompletedWeighing(data.ingredients) ? 'completed' : status
    const resolvedSku = sku || data.ingredients?.[0]?.ingredient_name || null
    const resolvedFormulation = formulation_name || resolvedSku

    // Store complete JSON for later retrieval
    const dataJson = JSON.stringify({ ...data, status: resolvedStatus, sku: resolvedSku, formulation_name: resolvedFormulation })

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
        resolvedSku,
        resolvedFormulation,
        production_date,
        planned_quantity,
        resolvedStatus,
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
        resolvedSku,
        resolvedFormulation,
        production_date,
        planned_quantity,
        resolvedStatus,
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
      end_time,
      created_at,
      updated_at,
      data_json
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
      data: (rows || []).map((row) => {
        let resolved = {
          ...row,
          status: normalizeMoStatus(row.status, row.end_time)
        }

        if (row.data_json) {
          try {
            const fullData = JSON.parse(row.data_json)
            const merged = resolveLegacyStoredData(fullData, row)
            resolved = {
              id: row.id,
              work_order: merged.work_order,
              sku: merged.sku,
              formulation_name: merged.formulation_name,
              status: merged.status,
              production_date: merged.production_date,
              planned_quantity: merged.planned_quantity,
              operator_name: merged.operator_name,
              end_time: merged.end_time,
              created_at: row.created_at,
              updated_at: row.updated_at
            }
          } catch (parseError) {
            console.error('Error parsing MO list data_json:', parseError.message)
          }
        }

        return resolved
      }).map(({ data_json, ...item }) => item)
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
      const resolved = resolveLegacyStoredData(fullData, {})

      const responseData = {
        workOrder: {
          work_order: resolved.work_order,
          sku: resolved.sku,
          formulation_name: resolved.formulation_name,
          production_date: resolved.production_date,
          planned_quantity: resolved.planned_quantity,
          status: resolved.status,
          operator_name: resolved.operator_name,
          end_time: resolved.end_time
        },
        ingredients: resolved.ingredients
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

// ==================== AUTH HELPERS & ENDPOINTS ====================

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex')
}

function getSessionExpiryDate() {
  return new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()
}

function requireSession(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Session required'
    })
  }

  const token = authHeader.substring(7)
  const expiryCheck = DB_TYPE === 'postgresql'
    ? 's.expires_at > CURRENT_TIMESTAMP'
    : "datetime(s.expires_at) > datetime('now')"

  const sql = `
    SELECT s.user_id, u.username, u.role, u.access_legacy_report, u.access_v2_report
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND ${expiryCheck}
  `

  dbGet(sql, [token], (err, row) => {
    if (err) {
      console.error('Error validating session:', err.message)
      return res.status(500).json({
        success: false,
        error: 'Failed to validate session'
      })
    }

    if (!row) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session'
      })
    }

    req.user = formatUserResponse(row)
    req.sessionToken = token
    next()
  })
}

function toBool(value) {
  return value === true || value === 1 || value === '1'
}

function formatUserResponse(user) {
  const isAdmin = user.role === 'admin'
  return {
    id: user.id || user.user_id,
    username: user.username,
    role: user.role || 'user',
    accessLegacyReport: isAdmin || toBool(user.access_legacy_report),
    accessV2Report: isAdmin || toBool(user.access_v2_report)
  }
}

function parseAccessFlag(value, defaultValue = true) {
  if (value === undefined || value === null) return defaultValue ? 1 : 0
  return toBool(value) ? 1 : 0
}

function requireReportAccess(reportType) {
  return (req, res, next) => {
    if (req.user.role === 'admin') return next()

    const allowed = reportType === 'legacy'
      ? req.user.accessLegacyReport
      : req.user.accessV2Report

    if (!allowed) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have access to this report'
      })
    }

    next()
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Admin access required'
    })
  }
  next()
}

function isValidRole(role) {
  return role === 'admin' || role === 'user'
}

function countAdmins(callback) {
  dbGet("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'", [], (err, row) => {
    if (err) return callback(err, null)
    callback(null, parseInt(row.count, 10) || 0)
  })
}

function verifyBearerToken(req, res) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing or invalid authorization token'
    })
    return false
  }
  return true
}

/**
 * POST /api/auth/login
 */
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {}

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'username and password are required'
    })
  }

  dbGet('SELECT id, username, password_hash, role, access_legacy_report, access_v2_report FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      console.error('Error during login:', err.message)
      return res.status(500).json({
        success: false,
        error: 'Login failed'
      })
    }

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      })
    }

    const token = generateSessionToken()
    const expiresAt = getSessionExpiryDate()

    dbRun(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, token, expiresAt],
      (sessionErr) => {
        if (sessionErr) {
          console.error('Error creating session:', sessionErr.message)
          return res.status(500).json({
            success: false,
            error: 'Failed to create session'
          })
        }

        res.json({
          success: true,
          token,
          expiresAt,
          user: formatUserResponse(user)
        })
      }
    )
  })
})

/**
 * POST /api/auth/logout
 */
app.post('/api/auth/logout', requireSession, (req, res) => {
  dbRun('DELETE FROM sessions WHERE token = ?', [req.sessionToken], (err) => {
    if (err) {
      console.error('Error during logout:', err.message)
      return res.status(500).json({
        success: false,
        error: 'Logout failed'
      })
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    })
  })
})

/**
 * GET /api/auth/me
 */
app.get('/api/auth/me', requireSession, (req, res) => {
  res.json({
    success: true,
    user: req.user
  })
})

// ==================== ADMIN USER MANAGEMENT ====================

/**
 * GET /api/admin/users
 */
app.get('/api/admin/users', requireSession, requireAdmin, (req, res) => {
  const sql = `
    SELECT id, username, role, access_legacy_report, access_v2_report, created_at
    FROM users
    ORDER BY created_at ASC
  `

  dbQuery(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching users:', err.message)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch users'
      })
    }

    res.json({
      success: true,
      data: (rows || []).map((row) => ({
        id: row.id,
        username: row.username,
        role: row.role || 'user',
        accessLegacyReport: toBool(row.access_legacy_report),
        accessV2Report: toBool(row.access_v2_report),
        created_at: row.created_at
      }))
    })
  })
})

/**
 * POST /api/admin/users
 */
app.post('/api/admin/users', requireSession, requireAdmin, (req, res) => {
  const { username, password, role, accessLegacyReport, accessV2Report } = req.body || {}
  const trimmedUsername = typeof username === 'string' ? username.trim() : ''

  if (!trimmedUsername || trimmedUsername.length < 3) {
    return res.status(400).json({
      success: false,
      error: 'username is required and must be at least 3 characters'
    })
  }

  if (!password || password.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'password is required and must be at least 6 characters'
    })
  }

  const userRole = role || 'user'
  if (!isValidRole(userRole)) {
    return res.status(400).json({
      success: false,
      error: "role must be 'admin' or 'user'"
    })
  }

  const passwordHash = bcrypt.hashSync(password, 10)

  const legacyAccess = parseAccessFlag(accessLegacyReport, true)
  const v2Access = parseAccessFlag(accessV2Report, true)

  dbRun(
    'INSERT INTO users (username, password_hash, role, access_legacy_report, access_v2_report) VALUES (?, ?, ?, ?, ?)',
    [trimmedUsername, passwordHash, userRole, legacyAccess, v2Access],
    (err, result) => {
      if (err) {
        if ((err.message && err.message.includes('UNIQUE')) || err.code === '23505') {
          return res.status(409).json({
            success: false,
            error: 'Username already exists'
          })
        }
        console.error('Error creating user:', err.message)
        return res.status(500).json({
          success: false,
          error: 'Failed to create user'
        })
      }

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        id: result.lastID
      })
    }
  )
})

/**
 * PUT /api/admin/users/:id
 */
app.put('/api/admin/users/:id', requireSession, requireAdmin, (req, res) => {
  const { id } = req.params
  const { password, role, accessLegacyReport, accessV2Report } = req.body || {}

  dbGet('SELECT id, username, role, access_legacy_report, access_v2_report FROM users WHERE id = ?', [id], (err, user) => {
    if (err) {
      console.error('Error fetching user:', err.message)
      return res.status(500).json({
        success: false,
        error: 'Failed to update user'
      })
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    const updates = []
    const params = []

    if (password !== undefined && password !== '') {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'password must be at least 6 characters'
        })
      }
      updates.push('password_hash = ?')
      params.push(bcrypt.hashSync(password, 10))
    }

    if (role !== undefined) {
      if (!isValidRole(role)) {
        return res.status(400).json({
          success: false,
          error: "role must be 'admin' or 'user'"
        })
      }

      if (user.role === 'admin' && role === 'user') {
        return countAdmins((countErr, adminCount) => {
          if (countErr) {
            return res.status(500).json({
              success: false,
              error: 'Failed to update user'
            })
          }
          if (adminCount <= 1) {
            return res.status(400).json({
              success: false,
              error: 'Cannot demote the last admin user'
            })
          }
          applyUserUpdate()
        })
      }
    }

    function applyUserUpdate() {
      if (role !== undefined) {
        updates.push('role = ?')
        params.push(role)
      }

      if (accessLegacyReport !== undefined) {
        updates.push('access_legacy_report = ?')
        params.push(parseAccessFlag(accessLegacyReport, false))
      }

      if (accessV2Report !== undefined) {
        updates.push('access_v2_report = ?')
        params.push(parseAccessFlag(accessV2Report, false))
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update'
        })
      }

      params.push(id)
      const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`

      dbRun(sql, params, (updateErr, result) => {
        if (updateErr) {
          console.error('Error updating user:', updateErr.message)
          return res.status(500).json({
            success: false,
            error: 'Failed to update user'
          })
        }

        if (result.changes === 0) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          })
        }

        res.json({
          success: true,
          message: 'User updated successfully'
        })
      })
    }

    if (role !== undefined && user.role === 'admin' && role === 'user') {
      return
    }

    applyUserUpdate()
  })
})

/**
 * DELETE /api/admin/users/:id
 */
app.delete('/api/admin/users/:id', requireSession, requireAdmin, (req, res) => {
  const { id } = req.params
  const targetId = parseInt(id, 10)

  if (req.user.id === targetId) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete your own account'
    })
  }

  dbGet('SELECT id, role FROM users WHERE id = ?', [targetId], (err, user) => {
    if (err) {
      console.error('Error fetching user:', err.message)
      return res.status(500).json({
        success: false,
        error: 'Failed to delete user'
      })
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    const performDelete = () => {
      dbRun('DELETE FROM users WHERE id = ?', [targetId], (deleteErr, result) => {
        if (deleteErr) {
          console.error('Error deleting user:', deleteErr.message)
          return res.status(500).json({
            success: false,
            error: 'Failed to delete user'
          })
        }

        if (result.changes === 0) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          })
        }

        res.json({
          success: true,
          message: 'User deleted successfully'
        })
      })
    }

    if (user.role === 'admin') {
      return countAdmins((countErr, adminCount) => {
        if (countErr) {
          return res.status(500).json({
            success: false,
            error: 'Failed to delete user'
          })
        }
        if (adminCount <= 1) {
          return res.status(400).json({
            success: false,
            error: 'Cannot delete the last admin user'
          })
        }
        performDelete()
      })
    }

    performDelete()
  })
})

/**
 * GET /api/settings/reports
 */
app.get('/api/settings/reports', requireSession, (req, res) => {
  getReportLabels((err, labels) => {
    if (err) {
      console.error('Error fetching report labels:', err.message)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch report labels'
      })
    }

    res.json({
      success: true,
      data: labels
    })
  })
})

/**
 * PUT /api/admin/settings/reports
 */
app.put('/api/admin/settings/reports', requireSession, requireAdmin, (req, res) => {
  const { legacyName, v2Name } = req.body || {}

  const legacyValidation = validateReportLabel(legacyName, 'Legacy report name')
  if (!legacyValidation.valid) {
    return res.status(400).json({ success: false, error: legacyValidation.error })
  }

  const v2Validation = validateReportLabel(v2Name, 'New report name')
  if (!v2Validation.valid) {
    return res.status(400).json({ success: false, error: v2Validation.error })
  }

  setSetting('report_legacy_name', legacyValidation.value, (err1) => {
    if (err1) {
      console.error('Error saving legacy report name:', err1.message)
      return res.status(500).json({
        success: false,
        error: 'Failed to save report labels'
      })
    }

    setSetting('report_v2_name', v2Validation.value, (err2) => {
      if (err2) {
        console.error('Error saving v2 report name:', err2.message)
        return res.status(500).json({
          success: false,
          error: 'Failed to save report labels'
        })
      }

      res.json({
        success: true,
        message: 'Report labels updated successfully',
        data: {
          legacyName: legacyValidation.value,
          v2Name: v2Validation.value
        }
      })
    })
  })
})

// ==================== API V2 ENDPOINTS ====================

/**
 * POST /api/mo-v2/receive
 * Endpoint untuk menerima data MO format nested workOrder
 */
app.post('/api/mo-v2/receive', (req, res) => {
  try {
    if (!verifyBearerToken(req, res)) return

    const data = req.body
    const workOrder = data.workOrder

    if (!workOrder || !workOrder.work_order) {
      return res.status(400).json({
        success: false,
        error: 'workOrder.work_order is required'
      })
    }

    const {
      work_order,
      sku,
      formulation_name,
      production_date,
      planned_quantity,
      status: rawStatus,
      operator_name,
      end_time
    } = workOrder

    const status = rawStatus
    const dataJson = JSON.stringify(data)

    if (DB_TYPE === 'postgresql') {
      const upsertSql = `
        INSERT INTO received_work_orders_v2
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
        operator_name || workOrder.operator_full_name,
        end_time,
        dataJson
      ], (err, result) => {
        if (err) {
          console.error('Error saving v2 data:', err.message)
          return res.status(500).json({
            success: false,
            error: 'Failed to save data: ' + err.message
          })
        }

        if (result.rows.length === 0) {
          db.query('SELECT id FROM received_work_orders_v2 WHERE work_order = $1', [work_order], (idErr, idResult) => {
            if (idErr) {
              return res.status(500).json({
                success: false,
                error: 'Failed to save data: ' + idErr.message
              })
            }
            res.json({
              success: true,
              message: 'Data received and stored successfully',
              work_order,
              id: idResult.rows[0]?.id || null
            })
          })
        } else {
          res.json({
            success: true,
            message: 'Data received and stored successfully',
            work_order,
            id: result.rows[0].id
          })
        }
      })
    } else {
      const sql = `
        INSERT INTO received_work_orders_v2
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
        operator_name || workOrder.operator_full_name,
        end_time,
        dataJson
      ], function(err) {
        if (err) {
          console.error('Error saving v2 data:', err.message)
          return res.status(500).json({
            success: false,
            error: 'Failed to save data: ' + err.message
          })
        }

        db.get('SELECT id FROM received_work_orders_v2 WHERE work_order = ?', [work_order], (idErr, row) => {
          if (idErr) {
            console.error('Error fetching v2 ID:', idErr.message)
            return res.status(500).json({
              success: false,
              error: 'Failed to save data: ' + idErr.message
            })
          }

          res.json({
            success: true,
            message: 'Data received and stored successfully',
            work_order,
            id: row ? row.id : this.lastID
          })
        })
      })
    }
  } catch (error) {
    console.error('Error processing v2 request:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message
    })
  }
})

/**
 * GET /api/mo-v2-list
 */
app.get('/api/mo-v2-list', requireSession, requireReportAccess('v2'), (req, res) => {
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
      end_time,
      created_at,
      updated_at
    FROM received_work_orders_v2
    ORDER BY updated_at DESC
  `

  dbQuery(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching MO v2 list:', err.message)
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
 * GET /api/mo-v2-receiver/:id
 */
app.get('/api/mo-v2-receiver/:id', requireSession, requireReportAccess('v2'), (req, res) => {
  const { id } = req.params

  const sql = `
    SELECT data_json
    FROM received_work_orders_v2
    WHERE id = ?
  `

  dbGet(sql, [id], (err, row) => {
    if (err) {
      console.error('Error fetching MO v2 detail:', err.message)
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
      const responseData = {
        workOrder: fullData.workOrder || {},
        ingredients: fullData.ingredients || []
      }

      res.json({
        success: true,
        data: responseData
      })
    } catch (parseError) {
      console.error('Error parsing v2 JSON data:', parseError)
      return res.status(500).json({
        success: false,
        error: 'Failed to parse stored data'
      })
    }
  })
})

/**
 * DELETE /api/mo-v2-receiver/:id
 */
app.delete('/api/mo-v2-receiver/:id', requireSession, requireReportAccess('v2'), (req, res) => {
  const { id } = req.params

  const sql = `DELETE FROM received_work_orders_v2 WHERE id = ?`

  dbRun(sql, [id], (err, result) => {
    if (err) {
      console.error('Error deleting MO v2:', err.message)
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

