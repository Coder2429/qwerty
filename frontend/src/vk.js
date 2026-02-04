import bridge from '@vkontakte/vk-bridge'

class VKService {
  constructor() {
    this.launchParams = null
    this.initialized = false
  }

  async init() {
    if (this.initialized) {
      return this.launchParams
    }

    // Проверяем, запущено ли приложение внутри VK
    const isVK = typeof window !== 'undefined' && 
                 (window.location.href.includes('vk.com') || 
                  window.location.href.includes('vk.ru') ||
                  window.parent !== window)

    // Если не в VK, сразу возвращаем тестовые параметры
    if (!isVK) {
      console.log('Приложение запущено вне VK, используем тестовые параметры')
      this.launchParams = {
        vk_user_id: null,
        vk_group_id: null,
        vk_is_app_user: 0,
        vk_platform: 'desktop_web'
      }
      this.initialized = true
      return this.launchParams
    }

    try {
      // Таймаут для инициализации (5 секунд)
      const initPromise = bridge.send('VKWebAppInit')
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('VK Bridge timeout')), 5000)
      )

      await Promise.race([initPromise, timeoutPromise])

      // Получаем параметры запуска
      const paramsPromise = bridge.send('VKWebAppGetLaunchParams')
      const paramsTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('GetLaunchParams timeout')), 3000)
      )

      const params = await Promise.race([paramsPromise, paramsTimeoutPromise])
      
      this.launchParams = params
      this.initialized = true
      return params
    } catch (error) {
      console.warn('VK Bridge initialization error (используем тестовые параметры):', error)
      // Для разработки вне VK или при ошибке
      this.launchParams = {
        vk_user_id: null,
        vk_group_id: null,
        vk_is_app_user: 0,
        vk_platform: 'desktop_web'
      }
      this.initialized = true
      return this.launchParams
    }
  }

  getLaunchParams() {
    return this.launchParams
  }

  getGroupId() {
    return this.launchParams?.vk_group_id || null
  }

  getUserId() {
    return this.launchParams?.vk_user_id || null
  }

  async showOrderBox(order) {
    try {
      const result = await bridge.send('VKWebAppShowOrderBox', {
        type: 'item',
        item: order.item,
        amount: order.amount, // Сумма в копейках
        currency: order.currency || 'RUB',
        description: order.description || '',
        merchant_data: order.merchant_data || ''
      })
      return result
    } catch (error) {
      console.error('VK Pay error:', error)
      throw error
    }
  }

  async showNotification(text, type = 'info') {
    try {
      await bridge.send('VKWebAppShowSnackbar', {
        text: text,
        type: type
      })
    } catch (error) {
      console.error('Notification error:', error)
      // Fallback для разработки
      alert(text)
    }
  }
}

export default new VKService()

