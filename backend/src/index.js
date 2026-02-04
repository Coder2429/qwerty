import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import multer from 'multer'
import { readFile } from 'fs/promises'
import { createOrder, confirmPayment, getOrderStatus } from './payment.js'
import { uploadPhotosAndPublish } from './vk_api.js'
import { registerAdInOrd, formatPostWithErid, validateErid } from './ord.js'
import { updateOrder } from './database.js'
import logger from './logger.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}))
app.use(express.json())

// Настройка multer для загрузки файлов
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB на файл
    files: 10 // максимум 10 файлов
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Разрешены только изображения'), false)
    }
  }
})

// Middleware для логирования запросов
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  })
  next()
})

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'paypost-backend',
    version: '1.0.0'
  })
})

// Создание заказа на оплату
app.post('/api/create-order', upload.array('photos', 10), async (req, res) => {
  try {
    const { text, group_id, user_id, price, custom_erid } = req.body
    const photos = req.files || []

    if (!text || !group_id) {
      return res.status(400).json({ error: 'Отсутствуют обязательные поля' })
    }

    // Валидация собственного ERID, если указан
    if (custom_erid && !validateErid(custom_erid)) {
      return res.status(400).json({ error: 'Неверный формат ERID' })
    }

    // Создаём заказ
    const order = await createOrder({
      text,
      group_id: parseInt(group_id),
      user_id: user_id ? parseInt(user_id) : null,
      price: parseFloat(price) || 100,
      photos,
      custom_erid: custom_erid || null // Сохраняем собственный ERID, если указан
    })

    logger.info('Order created successfully', { orderId: order.id })

    res.json({
      order_id: order.id,
      payment_type: order.payment_type,
      order: order.vk_order || null,
      payment_url: order.payment_url || null
    })
  } catch (error) {
    logger.error('Create order error', { error: error.message, stack: error.stack })
    res.status(500).json({ error: error.message || 'Ошибка при создании заказа' })
  }
})

// Подтверждение оплаты и публикация поста
app.post('/api/confirm-payment', async (req, res) => {
  try {
    const { order_id, payment_id } = req.body

    if (!order_id) {
      return res.status(400).json({ error: 'Отсутствует order_id' })
    }

    // Подтверждаем оплату
    const order = await confirmPayment(order_id, payment_id)

    logger.info('Processing payment confirmation', { orderId: order_id })

    // Определяем ERID: используем собственный или регистрируем в ОРД
    let erid = order.custom_erid

    if (!erid) {
      // Регистрируем рекламу в ОРД и получаем ERID
      try {
        logger.info('Registering ad in ORD', { orderId: order_id, groupId: order.group_id })
        erid = await registerAdInOrd({
          text: order.text,
          group_id: order.group_id,
          user_id: order.user_id,
          price: order.price,
          ord_type: process.env.ORD_TYPE || 'vk'
        })
        logger.info('ERID received from ORD', { orderId: order_id, erid })
      } catch (ordError) {
        logger.error('ORD registration error', { 
          error: ordError.message, 
          orderId: order_id,
          stack: ordError.stack 
        })
        // В случае ошибки ОРД генерируем ERID локально
        erid = `ERID-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
        logger.warn('Using generated ERID', { orderId: order_id, erid })
      }
    } else {
      logger.info('Using custom ERID', { orderId: order_id, erid })
    }

    // Сохраняем ERID в БД
    updateOrder(order_id, { erid })

    // Форматируем текст поста с ERID
    const postTextWithErid = formatPostWithErid(order.text, erid)

    // Загружаем фото из файловой системы
    const photoBuffers = []
    for (const photo of order.photos) {
      try {
        const buffer = await readFile(photo.file_path)
        photoBuffers.push(buffer)
      } catch (error) {
        logger.error('Error reading photo file', { 
          filePath: photo.file_path, 
          error: error.message 
        })
        // Продолжаем без этого фото
      }
    }
    
    // Публикуем пост
    logger.info('Publishing post', { orderId: order_id, groupId: order.group_id })
    const postResult = await uploadPhotosAndPublish({
      text: postTextWithErid,
      group_id: order.group_id,
      photoBuffers
    })

    // Обновляем заказ в БД
    updateOrder(order_id, {
      post_id: postResult.post_id,
      published_at: new Date().toISOString(),
      status: 'published'
    })

    logger.info('Post published successfully', { 
      orderId: order_id, 
      postId: postResult.post_id,
      erid 
    })

    res.json({
      success: true,
      post_id: postResult.post_id,
      erid: erid,
      message: 'Пост успешно опубликован с ERID'
    })
  } catch (error) {
    logger.error('Confirm payment error', { 
      error: error.message, 
      orderId: req.body.order_id,
      stack: error.stack 
    })
    res.status(500).json({ error: error.message || 'Ошибка при публикации поста' })
  }
})

// Webhook для внешних платёжных систем (например, ЮKassa)
app.post('/api/webhook/payment', async (req, res) => {
  try {
    // Здесь обрабатываем webhook от платёжной системы
    // Пример для ЮKassa:
    // const { event, object } = req.body
    // if (event === 'payment.succeeded') {
    //   await confirmPaymentAndPublish(object.metadata.order_id)
    // }

    res.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

// Получение статуса заказа
app.get('/api/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params
    const status = await getOrderStatus(orderId)
    res.json(status)
  } catch (error) {
    console.error('Get order status error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Обработка ошибок
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  })
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  })
})

app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
  })
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`📊 Logs: ./logs/`)
  console.log(`💾 Database: ./data/orders.db`)
})

