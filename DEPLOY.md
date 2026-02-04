# Инструкция по деплою

## 🚀 Деплой Frontend на Vercel

### Шаг 1: Подготовка

1. Убедитесь, что проект собран:
```bash
cd frontend
npm install
npm run build
```

2. Создайте файл `vercel.json` в папке `frontend`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Шаг 2: Деплой через Vercel CLI

```bash
# Установите Vercel CLI
npm i -g vercel

# Войдите в аккаунт
vercel login

# В папке frontend выполните
cd frontend
vercel

# Следуйте инструкциям:
# - Link to existing project? No
# - Project name: paypost-miniapp (или любое другое)
# - Directory: ./
# - Override settings? No
```

### Шаг 3: Настройка переменных окружения

В панели Vercel:
1. Откройте проект
2. Settings → Environment Variables
3. Добавьте:
   - `VITE_API_URL` = `https://your-backend-domain.com`

### Шаг 4: Обновление URL в VK

1. Откройте https://dev.vk.com
2. Ваше приложение → Настройки
3. В поле "Базовый домен" укажите домен Vercel (например: `paypost-miniapp.vercel.app`)
4. Сохраните

---

## 🖥️ Деплой Backend на VPS

### Требования

- Ubuntu 22.04 / Debian 12
- Минимум 1-2 ГБ RAM
- Node.js 20+
- Nginx (опционально, для HTTPS)

### Шаг 1: Подключение к серверу

```bash
ssh root@your-server-ip
```

### Шаг 2: Обновление системы

```bash
sudo apt update && sudo apt upgrade -y
```

### Шаг 3: Установка Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Проверка версии
node -v  # Должно быть v20.x.x
npm -v
```

### Шаг 4: Установка PM2

```bash
sudo npm install -g pm2
```

### Шаг 5: Загрузка проекта

#### Вариант A: Через Git

```bash
# Установка Git (если нет)
sudo apt install -y git

# Клонирование репозитория
cd /var/www
git clone https://github.com/your-username/paypost-miniapp.git
cd paypost-miniapp/backend
```

#### Вариант B: Через SCP (если нет Git)

На локальной машине:
```bash
scp -r backend root@your-server-ip:/var/www/paypost-backend
```

На сервере:
```bash
cd /var/www/paypost-backend
```

### Шаг 6: Установка зависимостей

```bash
npm install --production
```

### Шаг 7: Настройка переменных окружения

```bash
nano .env
```

Вставьте:
```env
PORT=5000
NODE_ENV=production
VK_ACCESS_TOKEN=your_vk_token_here
FRONTEND_URL=https://your-frontend-domain.vercel.app
PAYMENT_TYPE=vk_pay
```

Сохраните (Ctrl+O, Enter, Ctrl+X)

### Шаг 8: Запуск через PM2

```bash
# Запуск приложения
pm2 start src/index.js --name paypost-backend

# Сохранение конфигурации PM2
pm2 save

# Настройка автозапуска при перезагрузке
pm2 startup
# Выполните команду, которую выведет PM2 (обычно что-то вроде:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root)
```

### Шаг 9: Полезные команды PM2

```bash
# Просмотр статуса
pm2 status

# Просмотр логов
pm2 logs paypost-backend

# Перезапуск
pm2 restart paypost-backend

# Остановка
pm2 stop paypost-backend

# Удаление из PM2
pm2 delete paypost-backend
```

### Шаг 10: Настройка Nginx (для HTTPS)

#### Установка Nginx

```bash
sudo apt install -y nginx
```

#### Создание конфигурации

```bash
sudo nano /etc/nginx/sites-available/paypost-backend
```

Вставьте:
```nginx
server {
    listen 80;
    server_name your-domain.com;

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
    }
}
```

Активируйте конфигурацию:
```bash
sudo ln -s /etc/nginx/sites-available/paypost-backend /etc/nginx/sites-enabled/
sudo nginx -t  # Проверка конфигурации
sudo systemctl restart nginx
```

#### Установка SSL (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com

# Автоматическое обновление (уже настроено в certbot)
sudo certbot renew --dry-run
```

### Шаг 11: Настройка Firewall

```bash
# Разрешить HTTP и HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Разрешить SSH (если ещё не разрешён)
sudo ufw allow 22/tcp

# Включить firewall
sudo ufw enable
```

---

## 🔄 Обновление приложения

### Frontend (Vercel)

Просто сделайте push в Git - Vercel автоматически задеплоит:

```bash
git add .
git commit -m "Update"
git push
```

### Backend (VPS)

```bash
# Подключитесь к серверу
ssh root@your-server-ip

# Перейдите в папку проекта
cd /var/www/paypost-backend

# Обновите код (если используете Git)
git pull

# Или загрузите новые файлы через SCP

# Переустановите зависимости (если нужно)
npm install --production

# Перезапустите приложение
pm2 restart paypost-backend

# Проверьте логи
pm2 logs paypost-backend --lines 50
```

---

## 🐛 Отладка

### Проверка работы Backend

```bash
# На сервере
curl http://localhost:5000/health

# С внешнего компьютера
curl http://your-domain.com/health
```

### Просмотр логов

```bash
# PM2 логи
pm2 logs paypost-backend

# Nginx логи
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Проверка портов

```bash
sudo netstat -tlnp | grep :5000
```

---

## 📝 Чеклист перед запуском

- [ ] Frontend задеплоен на Vercel
- [ ] Backend запущен на VPS
- [ ] Переменные окружения настроены
- [ ] VK_ACCESS_TOKEN установлен и работает
- [ ] VK Pay включён в настройках приложения
- [ ] Домен указан в настройках VK приложения
- [ ] HTTPS настроен (для продакшена)
- [ ] Кнопка настроена в тестовой группе
- [ ] Протестирован полный цикл: форма → оплата → публикация

---

## 🔐 Безопасность

1. **Никогда не коммитьте `.env` файлы в Git**
2. **Используйте HTTPS в продакшене**
3. **Ограничьте CORS только нужными доменами**
4. **Регулярно обновляйте зависимости**: `npm audit fix`
5. **Используйте сильные пароли для SSH**
6. **Настройте fail2ban для защиты от брутфорса**

---

## 💡 Полезные ссылки

- [Vercel Documentation](https://vercel.com/docs)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)

