import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Путь к базе данных
const dbPath = path.join(__dirname, '..', 'data', 'orders.db')

// Создаём директорию data, если её нет
const dataDir = path.dirname(dbPath)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// Создаём подключение к БД
const db = new Database(dbPath)

// Включаем foreign keys
db.pragma('foreign_keys = ON')

// Создаём таблицы при первом запуске
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    group_id INTEGER NOT NULL,
    user_id INTEGER,
    price REAL NOT NULL,
    custom_erid TEXT,
    erid TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_id TEXT,
    post_id INTEGER,
    created_at TEXT NOT NULL,
    paid_at TEXT,
    published_at TEXT
  );

  CREATE TABLE IF NOT EXISTS order_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    mimetype TEXT NOT NULL,
    file_path TEXT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_group_id ON orders(group_id);
  CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
`)

/**
 * Сохраняет заказ в БД
 */
export function saveOrder(orderData) {
  const stmt = db.prepare(`
    INSERT INTO orders (
      id, text, group_id, user_id, price, custom_erid, 
      status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    orderData.id,
    orderData.text,
    orderData.group_id,
    orderData.user_id,
    orderData.price,
    orderData.custom_erid || null,
    orderData.status || 'pending',
    orderData.created_at || new Date().toISOString()
  )

  return orderData.id
}

/**
 * Сохраняет фото заказа
 */
export function saveOrderPhoto(orderId, photoData, filePath) {
  const stmt = db.prepare(`
    INSERT INTO order_photos (order_id, filename, mimetype, file_path)
    VALUES (?, ?, ?, ?)
  `)

  stmt.run(
    orderId,
    photoData.originalname,
    photoData.mimetype,
    filePath
  )
}

/**
 * Получает заказ по ID
 */
export function getOrder(orderId) {
  const stmt = db.prepare('SELECT * FROM orders WHERE id = ?')
  const order = stmt.get(orderId)

  if (!order) {
    return null
  }

  // Загружаем фото
  const photosStmt = db.prepare('SELECT * FROM order_photos WHERE order_id = ?')
  const photos = photosStmt.all(orderId)

  return {
    ...order,
    photos: photos.map(photo => ({
      filename: photo.filename,
      mimetype: photo.mimetype,
      file_path: photo.file_path
    }))
  }
}

/**
 * Обновляет заказ
 */
export function updateOrder(orderId, updates) {
  const fields = []
  const values = []

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`)
      values.push(value)
    }
  }

  if (fields.length === 0) {
    return
  }

  values.push(orderId)

  const sql = `UPDATE orders SET ${fields.join(', ')} WHERE id = ?`
  const stmt = db.prepare(sql)
  stmt.run(...values)
}

/**
 * Получает все заказы с фильтрацией
 */
export function getOrders(filters = {}) {
  let sql = 'SELECT * FROM orders WHERE 1=1'
  const params = []

  if (filters.status) {
    sql += ' AND status = ?'
    params.push(filters.status)
  }

  if (filters.group_id) {
    sql += ' AND group_id = ?'
    params.push(filters.group_id)
  }

  if (filters.user_id) {
    sql += ' AND user_id = ?'
    params.push(filters.user_id)
  }

  sql += ' ORDER BY created_at DESC'

  if (filters.limit) {
    sql += ' LIMIT ?'
    params.push(filters.limit)
  }

  const stmt = db.prepare(sql)
  return stmt.all(...params)
}

/**
 * Удаляет старые заказы (старше указанного количества дней)
 */
export function deleteOldOrders(days = 30) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  const stmt = db.prepare('DELETE FROM orders WHERE created_at < ?')
  return stmt.run(cutoffDate.toISOString()).changes
}

// Экспортируем db для прямого доступа (если нужно)
export { db }

