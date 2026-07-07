/**
 * Migrate legacy mo_data.db (normalized tables) to kmi_receiver.db (received_work_orders).
 *
 * Usage:
 *   node migrate-mo-data.js [source_mo_data.db] [target_kmi_receiver.db]
 *
 * Example:
 *   node migrate-mo-data.js /var/www/mo-reporting/data/mo_data.db /opt/mo-receiver/website/kmi_receiver.db
 */

const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const SOURCE_DB = process.argv[2] || '/var/www/mo-reporting/data/mo_data.db'
const TARGET_DB = process.argv[3] || path.join(__dirname, 'kmi_receiver.db')

function openDb(dbPath, mode = sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, mode, (err) => {
      if (err) reject(err)
      else resolve(db)
    })
  })
}

function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err)
      else resolve(row)
    })
  })
}

function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err)
      else resolve(rows || [])
    })
  })
}

function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err)
      else resolve({ changes: this.changes, lastID: this.lastID })
    })
  })
}

async function ensureTargetSchema(db) {
  await dbRun(
    db,
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
    )`
  )
}

async function loadLegacyWorkOrders(sourceDb) {
  const workOrders = await dbAll(sourceDb, 'SELECT * FROM work_orders ORDER BY id')
  const result = []

  for (const wo of workOrders) {
    const ingredients = await dbAll(
      sourceDb,
      'SELECT * FROM ingredients WHERE work_order_id = ? ORDER BY id',
      [wo.id]
    )

    const ingredientPayload = []
    for (const ingredient of ingredients) {
      const expDates = await dbAll(
        sourceDb,
        'SELECT exp_date, actual_weight FROM exp_dates WHERE ingredient_id = ? ORDER BY id',
        [ingredient.id]
      )

      const sessions = await dbAll(
        sourceDb,
        `SELECT session_id, session_number, actual_mass, accumulated_mass,
                tolerance_min, tolerance_max, status, notes,
                session_started_at, session_completed_at
         FROM sessions
         WHERE ingredient_id = ?
         ORDER BY session_number, id`,
        [ingredient.id]
      )

      ingredientPayload.push({
        ingredient_id: ingredient.ingredient_id,
        ingredient_code: ingredient.ingredient_code,
        ingredient_name: ingredient.ingredient_name,
        target_mass: ingredient.target_mass,
        current_accumulated_mass: ingredient.current_accumulated_mass,
        current_status: ingredient.current_status,
        tolerance_min: ingredient.tolerance_min,
        tolerance_max: ingredient.tolerance_max,
        exp_dates: expDates.map((row) => ({
          exp_date: row.exp_date,
          actual_weight: row.actual_weight
        })),
        sessions: sessions.map((row) => ({
          session_id: row.session_id,
          session_number: row.session_number,
          actual_mass: row.actual_mass,
          accumulated_mass: row.accumulated_mass,
          status: row.status,
          tolerance_min: row.tolerance_min,
          tolerance_max: row.tolerance_max,
          session_started_at: row.session_started_at,
          session_completed_at: row.session_completed_at,
          notes: row.notes
        }))
      })
    }

    result.push({
      work_order: wo.work_order,
      sku: wo.sku,
      formulation_name: wo.formulation_name,
      production_date: wo.production_date,
      planned_quantity: wo.planned_quantity,
      status: wo.status,
      operator_name: wo.operator_name,
      end_time: wo.end_time,
      ingredients: ingredientPayload
    })
  }

  return result
}

async function upsertTargetRecord(targetDb, payload) {
  const dataJson = JSON.stringify(payload)
  await dbRun(
    targetDb,
    `INSERT INTO received_work_orders
      (work_order, sku, formulation_name, production_date, planned_quantity, status, operator_name, end_time, data_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(work_order) DO UPDATE SET
      sku = excluded.sku,
      formulation_name = excluded.formulation_name,
      production_date = excluded.production_date,
      planned_quantity = excluded.planned_quantity,
      status = excluded.status,
      operator_name = excluded.operator_name,
      end_time = excluded.end_time,
      data_json = excluded.data_json,
      updated_at = CURRENT_TIMESTAMP`,
    [
      payload.work_order,
      payload.sku,
      payload.formulation_name,
      payload.production_date,
      payload.planned_quantity,
      payload.status,
      payload.operator_name,
      payload.end_time,
      dataJson
    ]
  )
}

async function main() {
  console.log('Legacy source :', SOURCE_DB)
  console.log('Target DB     :', TARGET_DB)

  const sourceDb = await openDb(SOURCE_DB, sqlite3.OPEN_READONLY)
  const targetDb = await openDb(TARGET_DB)

  try {
    await ensureTargetSchema(targetDb)

    const sourceCountRow = await dbGet(sourceDb, 'SELECT COUNT(*) AS count FROM work_orders')
    const sourceCount = sourceCountRow ? sourceCountRow.count : 0
    console.log(`Found ${sourceCount} work order(s) in legacy database`)

    if (sourceCount === 0) {
      console.log('Nothing to migrate. Legacy database is empty.')
      return
    }

    const payloads = await loadLegacyWorkOrders(sourceDb)
    let migrated = 0

    for (const payload of payloads) {
      await upsertTargetRecord(targetDb, payload)
      migrated += 1
      console.log(`Migrated: ${payload.work_order} (${payload.ingredients.length} ingredient(s))`)
    }

    const targetCountRow = await dbGet(targetDb, 'SELECT COUNT(*) AS count FROM received_work_orders')
    console.log(`Done. Migrated ${migrated} record(s). Target now has ${targetCountRow.count} row(s).`)
  } finally {
    await new Promise((resolve, reject) => {
      sourceDb.close((err) => (err ? reject(err) : resolve()))
    })
    await new Promise((resolve, reject) => {
      targetDb.close((err) => (err ? reject(err) : resolve()))
    })
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
