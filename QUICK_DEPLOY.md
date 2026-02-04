# 🚀 Быстрый деплой

## Фронтенд на GitHub Pages (5 минут)

1. **Создайте репозиторий на GitHub** и загрузите код
2. **Settings** → **Pages** → выберите **GitHub Actions** как источник
3. **Settings** → **Secrets and variables** → **Actions** → добавьте:
   - `VITE_API_URL` = `https://ваш-vps-домен.com` (или IP:5000)
   - `BASE_PATH` = `/` (или `/ИмяРепозитория/` если не в корне)
4. **Push в main** → деплой запустится автоматически
5. Ваш сайт: `https://ваш-username.github.io/ваш-репозиторий/`

## Бекенд на VPS (10 минут)

```bash
# 1. Подключитесь к VPS
ssh user@your-vps-ip

# 2. Установите Node.js (если нет)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Установите PM2
sudo npm install -g pm2

# 4. Загрузите backend на сервер (через git или scp)
cd /var/www
git clone https://github.com/ваш-username/ваш-репозиторий.git vkbot
cd vkbot/backend

# 5. Установите зависимости
npm install --production

# 6. Создайте .env файл
nano .env
# Скопируйте содержимое из DEPLOY_GUIDE.md (Шаг 6)

# 7. Инициализируйте БД
npm run init-db

# 8. Создайте директории
mkdir -p uploads logs data

# 9. Запустите через PM2
pm2 start src/index.js --name vkbot-backend
pm2 save
pm2 startup  # выполните команду, которую выведет

# 10. Настройте Nginx (опционально, но рекомендуется)
sudo apt install nginx
sudo nano /etc/nginx/sites-available/vkbot
# Добавьте конфигурацию из DEPLOY_GUIDE.md (Шаг 11)
sudo ln -s /etc/nginx/sites-available/vkbot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## ✅ Проверка

- Фронтенд: откройте `https://ваш-username.github.io/ваш-репозиторий/`
- Бекенд: `curl http://ваш-vps-ip:5000/health`

## 📝 Важно

- В `.env` бекенда укажите правильный `FRONTEND_URL` (URL GitHub Pages)
- В GitHub Secrets укажите правильный `VITE_API_URL` (URL вашего VPS)
- Не коммитьте `.env` файлы!

Подробная инструкция: см. `DEPLOY_GUIDE.md`

