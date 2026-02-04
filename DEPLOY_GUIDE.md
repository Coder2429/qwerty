# Руководство по деплою

Это руководство поможет вам развернуть фронтенд на GitHub Pages и бекенд на VPS сервере.

## 📋 Содержание

1. [Деплой фронтенда на GitHub Pages](#деплой-фронтенда-на-github-pages)
2. [Деплой бекенда на VPS](#деплой-бекенда-на-vps)
3. [Настройка переменных окружения](#настройка-переменных-окружения)

---

## 🚀 Деплой фронтенда на GitHub Pages

### Шаг 1: Подготовка репозитория

1. Создайте репозиторий на GitHub (если ещё не создан)
2. Загрузите код в репозиторий:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/Coder2429/qwerty.git
   git push -u origin main
   ```

### Шаг 2: Настройка GitHub Pages

1. Перейдите в **Settings** → **Pages** вашего репозитория
2. В разделе **Source** выберите:
   - **Source**: `GitHub Actions`
3. Сохраните изменения

### Шаг 3: Настройка Secrets

1. Перейдите в **Settings** → **Secrets and variables** → **Actions**
2. Добавьте следующие секреты:
   - `VITE_API_URL` - URL вашего бекенда на VPS (например: `https://api.yourdomain.com` или `http://176.117.76.227:5000`)
   - `BASE_PATH` - базовый путь для GitHub Pages (если репозиторий не в корне, например: `/Vkbot/`)

### Шаг 4: Активация деплоя

1. После настройки GitHub Actions автоматически запустится при следующем push в ветку `main`
2. Или запустите вручную: **Actions** → выберите workflow → **Run workflow**

### Шаг 5: Получение URL

После успешного деплоя ваш фронтенд будет доступен по адресу:
- `https://ВАШ_USERNAME.github.io/ВАШ_РЕПОЗИТОРИЙ/`

---

## 🖥️ Деплой бекенда на VPS

### Требования

- VPS сервер с Ubuntu 20.04+ (или другой Linux дистрибутив)
- Установленный Node.js 18+ и npm
- Доступ по SSH
- Домен (опционально, но рекомендуется)

### Шаг 1: Подключение к серверу

```bash
ssh root@your-vps-ip
# или
ssh username@your-vps-ip
```

### Шаг 2: Установка Node.js (если не установлен)

```bash
# Для Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Проверка версии
node --version
npm --version
```

### Шаг 3: Установка PM2 (менеджер процессов)

```bash
sudo npm install -g pm2
```

### Шаг 4: Клонирование проекта

```bash
# Создайте директорию для проекта
mkdir -p /var/www/vkbot
cd /var/www/vkbot

# Клонируйте репозиторий (или загрузите файлы через SCP/SFTP)
git clone https://github.com/ВАШ_USERNAME/ВАШ_РЕПОЗИТОРИЙ.git .

# Или загрузите только папку backend
# scp -r backend/ user@your-vps-ip:/var/www/vkbot/backend/
```

### Шаг 5: Установка зависимостей

```bash
cd /var/www/vkbot/backend
npm install --production
```

### Шаг 6: Настройка переменных окружения

```bash
cd /var/www/vkbot/backend
nano .env
```

Создайте файл `.env` со следующим содержимым:

```env
# Порт сервера
PORT=5000

# Окружение
NODE_ENV=production

# VK API
VK_ACCESS_TOKEN=ваш_vk_access_token
VK_API_VERSION=5.131

# Frontend URL (URL вашего GitHub Pages)
FRONTEND_URL=https://ВАШ_USERNAME.github.io

# Платежи (опционально)
PAYMENT_TYPE=vk_pay
# Для других платёжных систем:
# YOOKASSA_SHOP_ID=ваш_shop_id
# YOOKASSA_SECRET_KEY=ваш_secret_key

# ОРД
ORD_TYPE=vk
VK_ORD_TOKEN=ваш_vk_ord_token
```

Сохраните файл (Ctrl+O, Enter, Ctrl+X).

### Шаг 7: Инициализация базы данных

```bash
cd /var/www/vkbot/backend
npm run init-db
```

### Шаг 8: Создание директорий

```bash
mkdir -p /var/www/vkbot/backend/uploads
mkdir -p /var/www/vkbot/backend/logs
mkdir -p /var/www/vkbot/backend/data
```

### Шаг 9: Запуск через PM2

```bash
cd /var/www/vkbot/backend
pm2 start src/index.js --name vkbot-backend
pm2 save
pm2 startup
```

### Шаг 10: Настройка автозапуска

Выполните команду, которую выведет `pm2 startup`, например:
```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u username --hp /home/username
```

### Шаг 11: Настройка Nginx (рекомендуется)

Установите Nginx:
```bash
sudo apt update
sudo apt install nginx
```

Создайте конфигурацию:
```bash
sudo nano /etc/nginx/sites-available/vkbot
```

Добавьте следующую конфигурацию:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Замените на ваш домен или IP

    # Проксирование на Node.js приложение
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Увеличение лимитов для загрузки файлов
        client_max_body_size 100M;
    }
}
```

Активируйте конфигурацию:
```bash
sudo ln -s /etc/nginx/sites-available/vkbot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Шаг 12: Настройка SSL (опционально, но рекомендуется)

Установите Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
```

Получите SSL сертификат:
```bash
sudo certbot --nginx -d your-domain.com
```

---

## 🔧 Настройка переменных окружения

### Фронтенд (GitHub Pages)

В GitHub репозитории:
1. **Settings** → **Secrets and variables** → **Actions**
2. Добавьте `VITE_API_URL` с URL вашего бекенда

### Бекенд (VPS)

В файле `/var/www/vkbot/backend/.env` настройте все необходимые переменные (см. Шаг 6 выше).

---

## 📝 Полезные команды

### PM2

```bash
# Просмотр статуса
pm2 status

# Просмотр логов
pm2 logs vkbot-backend

# Перезапуск
pm2 restart vkbot-backend

# Остановка
pm2 stop vkbot-backend

# Удаление из автозапуска
pm2 delete vkbot-backend
```

### Nginx

```bash
# Перезапуск
sudo systemctl restart nginx

# Проверка конфигурации
sudo nginx -t

# Просмотр логов
sudo tail -f /var/log/nginx/error.log
```

### Обновление бекенда

```bash
cd /var/www/vkbot
git pull
cd backend
npm install --production
pm2 restart vkbot-backend
```

---

## 🔍 Проверка работы

### Фронтенд

Откройте в браузере: `https://ВАШ_USERNAME.github.io/ВАШ_РЕПОЗИТОРИЙ/`

### Бекенд

Проверьте health check:
```bash
curl http://your-vps-ip:5000/health
# или
curl https://your-domain.com/health
```

---

## ⚠️ Важные замечания

1. **Безопасность**: Не коммитьте файл `.env` в репозиторий
2. **CORS**: Убедитесь, что `FRONTEND_URL` в бекенде соответствует URL вашего GitHub Pages
3. **Firewall**: Откройте необходимые порты на VPS:
   ```bash
   sudo ufw allow 22    # SSH
   sudo ufw allow 80    # HTTP
   sudo ufw allow 443   # HTTPS
   sudo ufw allow 5000  # Node.js (если не используете Nginx)
   sudo ufw enable
   ```
4. **Мониторинг**: Настройте мониторинг логов и автоматические уведомления об ошибках

---

## 🆘 Решение проблем

### Фронтенд не загружается

- Проверьте, что workflow выполнился успешно в GitHub Actions
- Убедитесь, что `BASE_PATH` настроен правильно
- Проверьте консоль браузера на наличие ошибок

### Бекенд не отвечает

- Проверьте логи: `pm2 logs vkbot-backend`
- Убедитесь, что сервер запущен: `pm2 status`
- Проверьте, что порт открыт: `netstat -tulpn | grep 5000`
- Проверьте переменные окружения: `pm2 env vkbot-backend`

### CORS ошибки

- Убедитесь, что `FRONTEND_URL` в `.env` бекенда соответствует URL GitHub Pages
- Проверьте, что в `backend/src/index.js` правильно настроен CORS

---

## 📞 Поддержка

Если возникли проблемы, проверьте:
- Логи бекенда: `pm2 logs vkbot-backend`
- Логи Nginx: `sudo tail -f /var/log/nginx/error.log`
- GitHub Actions logs в репозитории

