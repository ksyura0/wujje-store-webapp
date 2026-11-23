# Wujje Store - Closed Marketplace Architecture

## 🎯 Концепция

Покупатель видит только твой маркет. Бот работает за кулисами:

```
Покупатель (Telegram)
    ↓
Wujje Store WebApp
    ↓
API Backend (Flask)
    ↓
Bot (автоматизация)
    ↓
Fragment/Tonnel/Portals
```

## 🔧 Компоненты

### 1. **Frontend** (index.html)
- Веб-приложение внутри Telegram
- Показывает NFT подарки БЕЗ ссылок на внешние маркеты
- Пользователь платит только тебе

### 2. **Backend API** (wujje_api.py)
- Flask сервер
- Обрабатывает покупки
- Хранит заказы
- Предоставляет статистику

### 3. **Bot** (wujje_bot.py)
- Автоматизирует покупку NFT
- Отправляет подарки пользователям
- Управляет инвентарем

## 🚀 Установка и запуск

### Шаг 1: Установить зависимости

```bash
pip install -r requirements.txt
```

### Шаг 2: Настроить переменные окружения

```bash
# .env файл

# Bot
WUJJE_BOT_TOKEN=123456789:ABCdefGHIjklmnoPQRstuvWXYZ
ADMIN_ID=987654321

# API
WUJJE_API_PORT=5000

# Marketplaces (опционально)
FRAGMENT_AUTH="initData_from_fragment"
TONNEL_AUTH="initData_from_tonnel"
PORTALS_AUTH="initData_from_portals"
```

### Шаг 3: Запустить API Backend

```bash
python wujje_api.py
# API запустится на http://localhost:5000
```

### Шаг 4: Запустить Bot

```bash
python wujje_bot.py
# Bot начнет полинг
```

### Шаг 5: Проверить статус

```bash
curl http://localhost:5000/api/health
```

## 📋 API Endpoints

### Получить все подарки
```bash
GET /api/gifts
```

Ответ:
```json
{
  "ok": true,
  "items": [
    {
      "id": "chill-flame",
      "title": "Chill Flame",
      "floor_ton": 820.0,
      "floor_rub": 147600,
      "attributes": {...}
    }
  ],
  "total": 10
}
```

### Создать заказ
```bash
POST /api/purchase
Content-Type: application/json

{
  "user_id": 123456789,
  "username": "@username",
  "gift_id": "chill-flame",
  "payment_method": "ton",
  "amount_ton": 820.0,
  "amount_rub": 147600
}
```

Ответ:
```json
{
  "ok": true,
  "order_id": "ord_1234567890",
  "status": "pending",
  "message": "Order created. Processing..."
}
```

### Проверить статус заказа
```bash
GET /api/orders/{order_id}/status
```

### Получить заказы пользователя
```bash
GET /api/orders/{user_id}
```

### Статистика (админ)
```bash
GET /api/admin/stats
```

## 🔐 Безопасность

### Что закрыто:
- ❌ Нет ссылок на внешние маркеты
- ❌ Пользователь не может выйти в сеть
- ❌ Все данные контролируются тобой
- ❌ Бот хранит ключи доступа

### Что открыто:
- ✅ API доступен только с твоего сервера
- ✅ Все платежи проходят через тебя
- ✅ Ты видишь все заказы и статистику

## 📊 Поток покупки

1. **Пользователь видит NFT** в WebApp (без ссылок)
2. **Нажимает "Купить"** → создается заказ в API
3. **Платит через Telegram Stars или TON** (тебе)
4. **API отправляет сигнал боту** о новом заказе
5. **Бот автоматически** покупает NFT с маркета
6. **Бот отправляет подарок** пользователю
7. **Статус обновляется** в WebApp ("Получено ✅")

## 🛠️ Деплой на Production

### Option 1: VPS (рекомендую)
```bash
# На сервере
sudo apt install python3-pip
pip install -r requirements.txt

# Запустить с systemd
sudo systemctl start wujje-api
sudo systemctl start wujje-bot
```

### Option 2: Docker
```dockerfile
FROM python:3.11

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# API
EXPOSE 5000
CMD ["python", "wujje_api.py"]
```

```bash
docker build -t wujje-store .
docker run -p 5000:5000 -e WUJJE_BOT_TOKEN=... wujje-store
```

### Option 3: Heroku / Railway
```bash
# Создать Procfile
web: python wujje_api.py
worker: python wujje_bot.py
```

## 🔄 Continuous Updates

Парсер NFT обновляет цены каждый час:

```bash
# Запустить периодически
0 * * * * python nft_parser.py >> /var/log/wujje/parser.log 2>&1
```

## 📝 Порядок действий

1. ✅ Получить Bot Token от @BotFather
2. ✅ Получить initData для маркетплейсов (опционально)
3. ✅ Настроить .env
4. ✅ Запустить API Backend
5. ✅ Запустить Bot
6. ✅ Обновить WebApp ссылку на API
7. ✅ Тестировать на тестовой сети TON

## 🐛 Отладка

### Проверить логи API
```bash
tail -f /var/log/wujje/api.log
```

### Проверить статус бота
```bash
curl http://localhost:5000/api/admin/stats
```

### Тестировать покупку
```bash
curl -X POST http://localhost:5000/api/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 123456,
    "gift_id": "chill-flame",
    "payment_method": "ton"
  }'
```

## ⚠️ Важные моменты

1. **Маркетплейсы требуют auth_data** - нужно получить из localStorage
2. **Бот должен быть админом в группе** (если используешь)
3. **API Backend должен быть доступен** из WebApp
4. **Все данные в nft-gifts-data.json** шифруются на сервере

## 📞 Поддержка

Если что не работает:
1. Проверь логи
2. Убедись что API запущена
3. Убедись что Bot имеет корректный токен
4. Проверь окружение переменные

---

**Вся архитектура закрыта для пользователя - они видят только твой маркет!** 🔐
