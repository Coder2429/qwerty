import { useEffect, useState } from 'react'
import vk from './vk'
import PostForm from './components/PostForm'
import './App.css'

function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [launchParams, setLaunchParams] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    let timeoutId = null

    const initialize = async () => {
      try {
        // Добавляем таймаут на случай зависания (3 секунды)
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.warn('Инициализация занимает слишком много времени, используем тестовые параметры')
            setLaunchParams({
              vk_user_id: null,
              vk_group_id: null,
              vk_is_app_user: 0,
              vk_platform: 'desktop_web'
            })
            setIsLoading(false)
          }
        }, 3000)

        const params = await vk.init()
        
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        
        if (isMounted) {
          setLaunchParams(params)
          setIsLoading(false)
        }
      } catch (err) {
        console.error('Initialization error:', err)
        
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        
        // Даже при ошибке показываем форму с тестовыми параметрами
        if (isMounted) {
          setLaunchParams({
            vk_user_id: null,
            vk_group_id: null,
            vk_is_app_user: 0,
            vk_platform: 'desktop_web'
          })
          setIsLoading(false)
        }
      }
    }

    initialize()

    return () => {
      isMounted = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [])

  if (isLoading) {
    return (
      <div className="app-container">
        <div className="loading">Загрузка...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-container">
        <div className="error">{error}</div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <div className="app-header">
        <h1>Разместить рекламу</h1>
        <p className="subtitle">
          {launchParams?.vk_group_id 
            ? `Группа ID: ${launchParams.vk_group_id}`
            : 'Режим разработки: откройте через кнопку в группе для работы с реальной группой'}
        </p>
        {!launchParams?.vk_group_id && (
          <p style={{ fontSize: '12px', marginTop: '8px', opacity: 0.9 }}>
            ⚠️ Для тестирования можно продолжить, но в продакшене нужна реальная группа
          </p>
        )}
      </div>
      <PostForm launchParams={launchParams} />
    </div>
  )
}

export default App

