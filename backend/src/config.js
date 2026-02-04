import dotenv from 'dotenv'

dotenv.config()

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // VK API
  vk: {
    accessToken: process.env.VK_ACCESS_TOKEN,
    apiVersion: process.env.VK_API_VERSION || '5.131'
  },
  
  // Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Payment
  payment: {
    type: process.env.PAYMENT_TYPE || 'vk_pay', // 'vk_pay' | 'yookassa' | 'tinkoff' | 'cloudpayments'
    // Для внешних платёжных систем:
    yookassa: {
      shopId: process.env.YOOKASSA_SHOP_ID,
      secretKey: process.env.YOOKASSA_SECRET_KEY
    },
    tinkoff: {
      terminalKey: process.env.TINKOFF_TERMINAL_KEY,
      password: process.env.TINKOFF_PASSWORD
    }
  },
  
  // Database (если будете использовать)
  database: {
    url: process.env.DATABASE_URL
  },
  
  // ОРД (Оператор рекламных данных)
  ord: {
    type: process.env.ORD_TYPE || 'vk', // 'vk' - VK ОРД, можно добавить другие
    vkToken: process.env.VK_ORD_TOKEN || process.env.VK_ACCESS_TOKEN // Токен для VK ОРД
  }
}

// Валидация обязательных переменных
if (!config.vk.accessToken) {
  console.warn('⚠️  VK_ACCESS_TOKEN не установлен. Публикация постов не будет работать.')
}

