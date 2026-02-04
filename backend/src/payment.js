import { saveOrder, getOrder, updateOrder, saveOrderPhoto } from './database.js'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import logger from './logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Директория для хранения фото
const photosDir = path.join(__dirname, '..', 'uploads')

// Создаём директорию для фото, если её нет
async function ensurePhotosDir() {
  try {
    await mkdir(photosDir, { recursive: true })
  } catch (error) {
    // Директория уже существует
  }
}

ensurePhotosDir()

/**
 * Сохраняет фото на диск
 */
async function savePhotoToDisk(photo, orderId) {
  const ext = path.extname(photo.originalname) || '.jpg'
  const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`
  const filePath = path.join(photosDir, filename)
  
  await writeFile(filePath, photo.buffer)
  
  return { filename, filePath }
}

/**
 * Создаёт заказ на оплату
 * @param {Object} data - Данные заказа
 * @returns {Promise<Object>} - Информация о заказе
 */
export async function createOrder(data) {
  const { text, group_id, user_id, price, photos = [], custom_erid = null } = data

  const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`

  try {
    // Сохраняем заказ в БД
    saveOrder({
      id: orderId,
      text,
      group_id: parseInt(group_id),
      user_id: user_id ? parseInt(user_id) : null,
      price: parseFloat(price),
      custom_erid: custom_erid || null,
      status: 'pending',
      created_at: new Date().toISOString()
    })

    // Сохраняем фото на диск и в БД
    for (const photo of photos) {
      const { filename, filePath } = await savePhotoToDisk(photo, orderId)
      saveOrderPhoto(orderId, photo, filePath)
    }

    logger.info('Order created', { orderId, group_id, user_id, price })

    // Определяем тип оплаты (VK Pay или внешняя система)
    const paymentType = process.env.PAYMENT_TYPE || 'vk_pay'

    if (paymentType === 'vk_pay') {
      // Формируем заказ для VK Pay
      return {
        id: orderId,
        payment_type: 'vk_pay',
        vk_order: {
          item: `Размещение поста в группе ${group_id}`,
          description: `Публикация поста в сообществе. Текст: ${text.substring(0, 100)}...`,
          amount: Math.round(price * 100) // VK Pay использует копейки
        }
      }
    } else {
      // Для внешних платёжных систем (ЮKassa, Tinkoff и т.д.)
      return {
        id: orderId,
        payment_type: 'external',
        payment_url: `${process.env.FRONTEND_URL}/payment/${orderId}`
      }
    }
  } catch (error) {
    logger.error('Error creating order', { error: error.message, orderId })
    throw error
  }
}

/**
 * Получает статус заказа
 * @param {string} orderId - ID заказа
 * @param {string} paymentId - ID платежа (опционально)
 * @returns {Promise<Object>} - Статус заказа
 */
export async function getOrderStatus(orderId, paymentId = null) {
  const order = getOrder(orderId)

  if (!order) {
    throw new Error('Заказ не найден')
  }

  return {
    order_id: orderId,
    status: order.status,
    order_data: order
  }
}

/**
 * Подтверждает оплату и обновляет статус заказа
 * @param {string} orderId - ID заказа
 * @param {string} paymentId - ID платежа
 * @returns {Promise<Object>} - Обновлённый заказ
 */
export async function confirmPayment(orderId, paymentId) {
  const order = getOrder(orderId)

  if (!order) {
    throw new Error('Заказ не найден')
  }

  if (order.status === 'paid') {
    throw new Error('Заказ уже оплачен')
  }

  // Обновляем статус в БД
  updateOrder(orderId, {
    status: 'paid',
    payment_id: paymentId,
    paid_at: new Date().toISOString()
  })

  logger.info('Payment confirmed', { orderId, paymentId })

  // Получаем обновлённый заказ
  return getOrder(orderId)
}
