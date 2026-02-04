import { useState } from 'react'
import vk from '../vk'
import PaymentButton from './PaymentButton'
import './PostForm.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function PostForm({ launchParams }) {
  const [text, setText] = useState('')
  const [photos, setPhotos] = useState([])
  const [price, setPrice] = useState(100) // Базовая цена в рублях
  const [customErid, setCustomErid] = useState('') // Собственный ERID рекламодателя (опционально)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 10) {
      setError('Можно загрузить не более 10 фотографий')
      return
    }
    setPhotos(files)
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!text.trim()) {
      setError('Введите текст поста')
      return
    }

    // Для разработки разрешаем без group_id (с предупреждением)
    if (!launchParams?.vk_group_id) {
      const proceed = window.confirm(
        'Группа не указана. Это нормально для разработки.\n\n' +
        'В продакшене откройте приложение через кнопку в группе.\n\n' +
        'Продолжить с тестовыми данными?'
      )
      if (!proceed) {
        return
      }
      // Используем тестовый group_id для разработки
      launchParams.vk_group_id = 123456789 // Тестовый ID
    }

    setIsSubmitting(true)

    try {
      // Создаём FormData для отправки фото
      const formData = new FormData()
      formData.append('text', text)
      formData.append('group_id', launchParams.vk_group_id)
      formData.append('user_id', launchParams.vk_user_id || '')
      formData.append('price', price)
      
      // Добавляем собственный ERID, если указан
      if (customErid.trim()) {
        formData.append('custom_erid', customErid.trim())
      }
      
      photos.forEach((photo, index) => {
        formData.append(`photos`, photo)
      })

      // Отправляем на backend
      const response = await fetch(`${API_URL}/api/create-order`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при создании заказа')
      }

      // Если используется VK Pay
      if (data.payment_type === 'vk_pay') {
        const orderResult = await vk.showOrderBox({
          item: data.order.item,
          amount: data.order.amount,
          currency: 'RUB',
          description: data.order.description
        })

        if (orderResult.status === 'success') {
          // После успешной оплаты отправляем подтверждение на backend
          const confirmResponse = await fetch(`${API_URL}/api/confirm-payment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              order_id: data.order_id,
              payment_id: orderResult.order_id || orderResult.payment_id
            })
          })

          const confirmData = await confirmResponse.json()

          if (!confirmResponse.ok) {
            throw new Error(confirmData.error || 'Ошибка при публикации поста')
          }

          vk.showNotification('Пост успешно опубликован!', 'success')
          
          // Очищаем форму
          setText('')
          setPhotos([])
          setCustomErid('')
        } else {
          throw new Error('Оплата не была завершена')
        }
      } else {
        // Для внешних платёжных систем - редирект на ссылку оплаты
        if (data.payment_url) {
          window.location.href = data.payment_url
        }
      }
    } catch (err) {
      console.error('Submit error:', err)
      setError(err.message || 'Произошла ошибка. Попробуйте ещё раз.')
      vk.showNotification(err.message || 'Ошибка при отправке', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="post-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="text">Текст поста *</label>
        <textarea
          id="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Введите текст поста..."
          rows={6}
          maxLength={2000}
          required
        />
        <div className="char-count">{text.length}/2000</div>
      </div>

      <div className="form-group">
        <label htmlFor="photos">
          Фотографии (до 10 шт.)
          <span className="field-hint">
            Поддерживаются форматы: JPG, PNG, GIF, WEBP. Максимальный размер файла: 10 МБ
          </span>
        </label>
        <input
          type="file"
          id="photos"
          accept="image/*"
          multiple
          onChange={handlePhotoChange}
        />
        {photos.length > 0 && (
          <div className="photos-preview">
            <p>📷 Выбрано фотографий: {photos.length} / 10</p>
            <div className="photos-list">
              {Array.from(photos).map((photo, index) => (
                <div key={index} className="photo-item">
                  <span>📄 {photo.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const newPhotos = Array.from(photos)
                      newPhotos.splice(index, 1)
                      setPhotos(newPhotos)
                    }}
                    aria-label="Удалить фото"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="price">
          Стоимость размещения (₽)
          <span className="field-hint">
            Укажите стоимость размещения поста в рублях
          </span>
        </label>
        <input
          type="number"
          id="price"
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          min="1"
          step="1"
          required
          placeholder="100"
        />
      </div>

      <div className="form-group">
        <label htmlFor="custom_erid">
          Ваш ERID (опционально)
          <span className="field-hint">
            Если у вас уже есть ERID от ОРД, укажите его здесь. 
            Иначе система автоматически зарегистрирует рекламу и получит ERID.
          </span>
        </label>
        <input
          type="text"
          id="custom_erid"
          value={customErid}
          onChange={(e) => setCustomErid(e.target.value)}
          placeholder="Например: 12345678-ABCD-1234-EFGH-123456789012"
          pattern="[A-Z0-9-]{8,}"
          title="ERID должен содержать буквы, цифры и дефисы (минимум 8 символов)"
        />
        {customErid && (
          <div className="field-info">
            Будет использован ваш ERID. Система не будет регистрировать рекламу в ОРД.
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      <PaymentButton
        type="submit"
        disabled={isSubmitting || !text.trim()}
        isLoading={isSubmitting}
        price={price}
      />
    </form>
  )
}

export default PostForm

