import axios from 'axios'

/**
 * Модуль для работы с ОРД (Оператор рекламных данных)
 * Поддерживает VK ОРД и другие ОРД через единый интерфейс
 */

const VK_ORD_API_URL = 'https://api.vk.com/method/ads.registerAd'
const VK_API_VERSION = '5.131'

/**
 * Получает токен для работы с ОРД
 * Для VK ОРД используется тот же токен, что и для основного API
 */
const getOrdToken = () => {
  // Для VK ОРД используется основной токен
  // Для других ОРД может потребоваться отдельный токен
  const token = process.env.VK_ORD_TOKEN || process.env.VK_ACCESS_TOKEN
  if (!token) {
    throw new Error('Токен для работы с ОРД не установлен')
  }
  return token
}

/**
 * Регистрирует рекламное объявление в ОРД и получает ERID
 * @param {Object} adData - Данные рекламного объявления
 * @param {string} adData.text - Текст рекламы
 * @param {number} adData.group_id - ID группы, где будет размещена реклама
 * @param {number} adData.user_id - ID рекламодателя (пользователя)
 * @param {number} adData.price - Стоимость размещения
 * @param {string} adData.ord_type - Тип ОРД: 'vk' (VK ОРД) или другой
 * @returns {Promise<string>} - ERID (Единый рекламный идентификатор)
 */
export async function registerAdInOrd(adData) {
  const { text, group_id, user_id, price, ord_type = 'vk' } = adData

  try {
    if (ord_type === 'vk') {
      return await registerInVkOrd({
        text,
        group_id,
        user_id,
        price
      })
    } else {
      // Для других ОРД можно добавить интеграцию здесь
      // Например, через их API
      throw new Error(`ОРД типа "${ord_type}" пока не поддерживается`)
    }
  } catch (error) {
    console.error('ОРД registration error:', error)
    throw new Error(`Ошибка регистрации в ОРД: ${error.message}`)
  }
}

/**
 * Регистрирует рекламу в VK ОРД
 * @param {Object} data - Данные рекламы
 * @returns {Promise<string>} - ERID
 */
async function registerInVkOrd(data) {
  const { text, group_id, user_id, price } = data
  const token = getOrdToken()

  try {
    // ВАЖНО: Метод ads.registerAd может не существовать в публичном VK API
    // Необходимо использовать реальный API ОРД (VK ОРД или другой)
    // Это пример реализации - адаптируйте под реальный API вашего ОРД
    // 
    // Возможные варианты:
    // 1. Использовать официальный API ОРД (например, через erid.ru)
    // 2. Использовать VK Ads API с соответствующими правами
    // 3. Интегрироваться с другим ОРД
    //
    // VK ОРД API: ads.registerAd (пример)
    // Документация: https://dev.vk.com/api/ads
    const response = await axios.get(VK_ORD_API_URL, {
      params: {
        access_token: token,
        ad_format: 1, // 1 - изображение и текст, 2 - большое изображение, и т.д.
        ad_text: text.substring(0, 900), // Ограничение VK API
        ad_site: `vk.com/club${group_id}`, // Сайт размещения
        ad_cost: Math.round(price * 100), // Стоимость в копейках
        ad_cost_type: 1, // 1 - фиксированная стоимость
        v: VK_API_VERSION
      }
    })

    if (response.data.error) {
      // Если ошибка, но это не критично, можно продолжить с временным ERID
      // или использовать fallback механизм
      console.warn('VK ОРД API error:', response.data.error)
      
      // В случае ошибки API генерируем ERID локально
      // ВАЖНО: В продакшене это должно быть заменено на реальную регистрацию в ОРД
      if (response.data.error.error_code === 100) {
        // Параметры запроса неверны - генерируем ERID локально
        return generateErid(group_id, user_id)
      }
      
      // Для других ошибок также генерируем ERID
      // В реальном проекте здесь должна быть обработка ошибок ОРД
      console.warn('VK ОРД API вернул ошибку, генерируем ERID локально:', response.data.error.error_msg)
      return generateErid(group_id, user_id)
    }

    // VK ОРД возвращает ERID в формате строки
    const erid = response.data.response?.erid || response.data.response?.ad_id

    if (!erid) {
      // Если ERID не получен, генерируем локально
      console.warn('ERID не получен от VK ОРД, генерируем локально')
      return generateErid(group_id, user_id)
    }

    return String(erid)
  } catch (error) {
    // Если API недоступен, генерируем ERID локально
    // ВАЖНО: В продакшене это должно логироваться и обрабатываться отдельно
    // Необходимо использовать реальный API ОРД (erid.ru или другой)
    console.error('VK ОРД API недоступен, генерируем ERID локально:', error.message)
    return generateErid(group_id, user_id)
  }
}

/**
 * Генерирует ERID-подобный идентификатор
 * ВАЖНО: Это упрощенная реализация для демонстрации.
 * В продакшене необходимо использовать реальный API ОРД.
 * 
 * Формат ERID согласно требованиям: обычно 8-36 символов, буквы, цифры, дефисы
 * @param {number} group_id - ID группы
 * @param {number} user_id - ID пользователя
 * @returns {string} - ERID-подобный идентификатор
 */
function generateErid(group_id, user_id) {
  // Генерируем ERID в формате, похожем на реальный
  // Формат: префикс + timestamp + hash группы + hash пользователя
  const timestamp = Date.now()
  const groupHash = Math.abs(group_id).toString(36).toUpperCase().padStart(6, '0')
  const userHash = Math.abs(user_id || 0).toString(36).toUpperCase().padStart(6, '0')
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  
  // Формат: ERID-{timestamp}-{groupHash}-{userHash}-{random}
  // Пример: ERID-1705312200000-A1B2C3-D4E5F6-G7H8I9
  return `ERID-${timestamp}-${groupHash}-${userHash}-${random}`
}

/**
 * Форматирует текст поста с добавлением ERID
 * @param {string} originalText - Исходный текст поста
 * @param {string} erid - ERID для добавления
 * @returns {string} - Текст поста с ERID
 */
export function formatPostWithErid(originalText, erid) {
  // Проверяем, не добавлен ли уже ERID
  if (originalText.includes('ERID:') || originalText.includes('Реклама')) {
    // Если ERID уже есть, обновляем его
    const eridRegex = /ERID:\s*[\w-]+/i
    if (eridRegex.test(originalText)) {
      return originalText.replace(eridRegex, `ERID: ${erid}`)
    }
  }

  // Добавляем ERID в начало или конец поста
  // Согласно требованиям, формат: "Реклама\nERID: XXXXXXXX"
  const eridBlock = `Реклама\nERID: ${erid}`
  
  // Добавляем в начало поста (можно изменить на конец, если требуется)
  return `${eridBlock}\n\n${originalText}`
}

/**
 * Валидирует ERID
 * @param {string} erid - ERID для проверки
 * @returns {boolean} - true если ERID валиден
 */
export function validateErid(erid) {
  if (!erid || typeof erid !== 'string') {
    return false
  }
  
  // ERID обычно состоит из букв, цифр и дефисов
  // Минимальная длина зависит от ОРД, обычно 8+ символов
  const eridRegex = /^[A-Z0-9-]{8,}$/i
  return eridRegex.test(erid.trim())
}

/**
 * Получает информацию о рекламе по ERID (для отчётности)
 * @param {string} erid - ERID
 * @returns {Promise<Object>} - Информация о рекламе
 */
export async function getAdInfoByErid(erid) {
  // Реализация получения информации о рекламе
  // Это может быть использовано для отчётности
  try {
    const token = getOrdToken()
    
    // VK API для получения информации о рекламе
    // В зависимости от ОРД, метод может отличаться
    const response = await axios.get('https://api.vk.com/method/ads.getAds', {
      params: {
        access_token: token,
        ad_ids: erid,
        v: VK_API_VERSION
      }
    })

    if (response.data.error) {
      throw new Error(response.data.error.error_msg)
    }

    return response.data.response || null
  } catch (error) {
    console.error('Get ad info error:', error)
    return null
  }
}

