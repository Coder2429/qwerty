import { db } from '../src/database.js'

console.log('✅ Database initialized successfully')
console.log('📊 Tables created: orders, order_photos')
console.log('💾 Database location: ./data/orders.db')

// Закрываем соединение
db.close()

