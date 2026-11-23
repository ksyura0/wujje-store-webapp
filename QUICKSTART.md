# ⚡ Wujje Store - Quick Start Guide

## 🎯 За 5 минут до работы

### Шаг 1: Скачать Bot Token (2 мин)

Откройте Telegram и напишите @BotFather:

```
/newbot

Enter a name for your bot: Wujje Store
Enter a username for your bot: wujje_store_bot
```

Скопируйте токен: `123456789:ABCdefGHIjklmnoPQRstuvWXYZ`

### Шаг 2: Узнать свой ID (1 мин)

Напишите @userinfobot в Telegram - получите свой ID: `987654321`

### Шаг 3: Создать .env (1 мин)

```bash
cp .env.example .env
```

Отредактируйте `.env`:

```env
WUJJE_BOT_TOKEN=123456789:ABCdefGHIjklmnoPQRstuvWXYZ
ADMIN_ID=987654321
WUJJE_API_PORT=5000
```

### Шаг 4: Запустить! (1 мин)

```bash
# Вариант 1: Запустить оба компонента сразу
python startup.py

# Вариант 2: Отдельно запустить API
python wujje_api.py

# Вариант 3: В другом терминале запустить Bot
python wujje_bot.py
```

### Шаг 5: Тестировать (1 мин)

```bash
# В новом терминале
python test_api.py
```

## ✅ Если всё работает:

```
✅ ALL COMPONENTS STARTED SUCCESSFULLY!

API Backend:   http://localhost:5000
Telegram Bot:  Running
```

## 🧪 Быстрые тесты

### Проверить API живой?
```bash
curl http://localhost:5000/api/health
```

### Получить все подарки?
```bash
curl http://localhost:5000/api/gifts
```

### Создать тестовый заказ?
```bash
curl -X POST http://localhost:5000/api/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 123456789,
    "gift_id": "chill-flame",
    "payment_method": "ton"
  }'
```

## 🔧 Если что-то не работает

### API не запускается
```bash
# Проверить что Python установлен
python --version

# Проверить зависимости
pip install -r requirements.txt

# Проверить что порт 5000 свободен
netstat -an | grep 5000
```

### Bot не отвечает
```bash
# Проверить что WUJJE_BOT_TOKEN правильный
echo $WUJJE_BOT_TOKEN

# Проверить что API запущена
curl http://localhost:5000/api/health
```

### Ошибка "Address already in use"
```bash
# Порт уже занят, используйте другой
export WUJJE_API_PORT=5001
python wujje_api.py
```

## 🎁 Следующие шаги

После успешного запуска:

1. **Обновить WebApp** ссылку на API:
   ```html
   const API_BASE = "http://localhost:5000";
   ```

2. **Получить токены маркетплейсов** (опционально):
   - Fragment initData
   - Tonnel initData
   - Portals initData

3. **Настроить автоматическую покупку**:
   - Добавить credentials в .env
   - Обновить wujje_bot.py с логикой покупки

4. **Деплой на production**:
   - Арендовать VPS
   - Настроить systemd/supervisor
   - Использовать https

## 📚 Полная документация

- [DEPLOYMENT.md](DEPLOYMENT.md) — Полный гайд деплоя
- [README-NFT-PERFORMANCE.md](README-NFT-PERFORMANCE.md) — Оптимизация
- [config.js](config.js) — Конфигурация фронтенда

## 🆘 Поддержка

Если помощь нужна:

1. Проверьте логи API
2. Запустите test_api.py
3. Проверьте что .env имеет правильные значения
4. Убедитесь что все зависимости установлены

## 🚀 Готово!

Теперь ты готов! Запускай:

```bash
python startup.py
```

И начинай продавать NFT подарки! 🎉
