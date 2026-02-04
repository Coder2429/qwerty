# Примеры использования API

## 📡 Endpoints

### 1. Health Check

**GET** `/health`

Проверка работоспособности сервера.

**Ответ:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### 2. Создание заказа

**POST** `/api/create-order`

Создаёт заказ на оплату и публикацию поста.

**Content-Type:** `multipart/form-data`

**Параметры:**
- `text` (string, обязательный) - Текст поста (до 2000 символов)
- `group_id` (number, обязательный) - ID группы ВКонтакте
- `user_id` (number, опционально) - ID пользователя
- `price` (number, обязательный) - Стоимость в рублях
- `photos` (File[], опционально) - Фотографии (до 10 шт., до 10MB каждая)

**Пример запроса (cURL):**
```bash
curl -X POST http://localhost:5000/api/create-order \
  -F "text=Привет! Это тестовый пост" \
  -F "group_id=123456789" \
  -F "price=100" \
  -F "photos=@photo1.jpg" \
  -F "photos=@photo2.jpg"
```

**Пример запроса (JavaScript/Fetch):**
```javascript
const formData = new FormData()
formData.append('text', 'Привет! Это тестовый пост')
formData.append('group_id', '123456789')
formData.append('price', '100')
formData.append('photos', photoFile1)
formData.append('photos', photoFile2)

const response = await fetch('http://localhost:5000/api/create-order', {
  method: 'POST',
  body: formData
})

const data = await response.json()
console.log(data)
```

**Ответ (VK Pay):**
```json
{
  "order_id": "order_1705312200000_1",
  "payment_type": "vk_pay",
  "order": {
    "item": "Размещение поста в группе 123456789",
    "description": "Публикация поста в сообществе. Текст: Привет! Это тестовый пост...",
    "amount": 10000
  }
}
```

**Ответ (внешняя платёжная система):**
```json
{
  "order_id": "order_1705312200000_1",
  "payment_type": "external",
  "payment_url": "https://payment-gateway.com/pay/order_123"
}
```

---

### 3. Подтверждение оплаты

**POST** `/api/confirm-payment`

Подтверждает оплату и публикует пост в группе.

**Content-Type:** `application/json`

**Тело запроса:**
```json
{
  "order_id": "order_1705312200000_1",
  "payment_id": "payment_123456"
}
```

**Пример запроса (cURL):**
```bash
curl -X POST http://localhost:5000/api/confirm-payment \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "order_1705312200000_1",
    "payment_id": "payment_123456"
  }'
```

**Пример запроса (JavaScript/Fetch):**
```javascript
const response = await fetch('http://localhost:5000/api/confirm-payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    order_id: 'order_1705312200000_1',
    payment_id: 'payment_123456'
  })
})

const data = await response.json()
console.log(data)
```

**Ответ:**
```json
{
  "success": true,
  "post_id": 12345,
  "message": "Пост успешно опубликован"
}
```

**Ошибки:**
- `400` - Отсутствует order_id или оплата не подтверждена
- `500` - Ошибка при публикации поста

---

### 4. Получение статуса заказа

**GET** `/api/order/:orderId`

Получает информацию о статусе заказа.

**Пример запроса:**
```bash
curl http://localhost:5000/api/order/order_1705312200000_1
```

**Ответ:**
```json
{
  "order_id": "order_1705312200000_1",
  "status": "paid",
  "order_data": {
    "id": "order_1705312200000_1",
    "text": "Привет! Это тестовый пост",
    "group_id": 123456789,
    "user_id": 987654321,
    "price": 100,
    "status": "paid",
    "created_at": "2024-01-15T10:30:00.000Z",
    "paid_at": "2024-01-15T10:31:00.000Z",
    "payment_id": "payment_123456"
  }
}
```

**Статусы заказа:**
- `pending` - Ожидает оплаты
- `paid` - Оплачен
- `published` - Опубликован (если добавите этот статус)

---

### 5. Webhook для внешних платёжных систем

**POST** `/api/webhook/payment`

Принимает уведомления от платёжных систем (ЮKassa, Tinkoff и т.д.).

**Пример для ЮKassa:**
```json
{
  "type": "notification",
  "event": "payment.succeeded",
  "object": {
    "id": "payment_123",
    "status": "succeeded",
    "amount": {
      "value": "100.00",
      "currency": "RUB"
    },
    "metadata": {
      "order_id": "order_1705312200000_1"
    }
  }
}
```

---

## 🔐 Аутентификация

В текущей версии API не требует аутентификации. Для продакшена рекомендуется:

1. Добавить API ключи
2. Использовать JWT токены
3. Ограничить доступ по IP (для webhook)

---

## 📝 Примеры интеграции

### React компонент

```jsx
import { useState } from 'react'

function PostCreator({ groupId }) {
  const [text, setText] = useState('')
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('text', text)
      formData.append('group_id', groupId)
      formData.append('price', '100')
      
      photos.forEach(photo => {
        formData.append('photos', photo)
      })

      const response = await fetch('https://api.example.com/api/create-order', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      
      if (data.payment_type === 'vk_pay') {
        // Обработка VK Pay
        const result = await window.vkBridge.send('VKWebAppShowOrderBox', {
          type: 'item',
          item: data.order.item,
          amount: data.order.amount,
          currency: 'RUB'
        })

        if (result.status === 'success') {
          // Подтверждение оплаты
          await fetch('https://api.example.com/api/confirm-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_id: data.order_id,
              payment_id: result.order_id
            })
          })
        }
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <textarea value={text} onChange={e => setText(e.target.value)} />
      <input 
        type="file" 
        multiple 
        onChange={e => setPhotos(Array.from(e.target.files))} 
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Отправка...' : 'Опубликовать'}
      </button>
    </form>
  )
}
```

### Python пример

```python
import requests

def create_order(text, group_id, price, photos=None):
    url = 'https://api.example.com/api/create-order'
    
    files = []
    if photos:
        for photo in photos:
            files.append(('photos', open(photo, 'rb')))
    
    data = {
        'text': text,
        'group_id': group_id,
        'price': price
    }
    
    response = requests.post(url, files=files, data=data)
    return response.json()

def confirm_payment(order_id, payment_id):
    url = 'https://api.example.com/api/confirm-payment'
    
    data = {
        'order_id': order_id,
        'payment_id': payment_id
    }
    
    response = requests.post(url, json=data)
    return response.json()

# Использование
order = create_order(
    text='Привет!',
    group_id=123456789,
    price=100,
    photos=['photo1.jpg', 'photo2.jpg']
)

print(f"Order ID: {order['order_id']}")

# После оплаты
result = confirm_payment(
    order_id=order['order_id'],
    payment_id='payment_123'
)

print(f"Post ID: {result['post_id']}")
```

---

## ⚠️ Ограничения

- Максимальный размер текста: 2000 символов
- Максимальное количество фото: 10
- Максимальный размер одного фото: 10MB
- Поддерживаемые форматы фото: jpg, png, gif, webp

---

## 🐛 Обработка ошибок

Все endpoints возвращают ошибки в следующем формате:

```json
{
  "error": "Описание ошибки"
}
```

**HTTP коды:**
- `400` - Неверные параметры запроса
- `500` - Внутренняя ошибка сервера

**Пример обработки:**
```javascript
try {
  const response = await fetch('/api/create-order', { ... })
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || 'Unknown error')
  }
  
  // Успешный ответ
  console.log(data)
} catch (error) {
  console.error('Error:', error.message)
}
```

