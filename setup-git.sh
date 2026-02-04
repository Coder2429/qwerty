#!/bin/bash

# Настройка Git для коммита
git config --global user.name "Coder2429"
git config --global user.email "coder2429@users.noreply.github.com"

# Проверка настроек
echo "Git настроен:"
git config --global user.name
git config --global user.email

# Создание коммита
git add .
git commit -m "Initial commit"

# Push в репозиторий
git push -u origin main

echo "Готово! Код загружен в GitHub."

