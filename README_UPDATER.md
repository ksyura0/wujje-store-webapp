# Wujje Store Gifts Updater

Автоматический парсер для обновления цен NFT-подарков Telegram с наценкой и конвертацией в рубли.

## Что он делает?

1. **Загружает floor price** из Getgems API
2. **Применяет наценку** (5-10%, по умолчанию 7.5%)
3. **Конвертирует TON → RUB** по актуальному курсу CoinGecko
4. **Создаёт backup** старого `gifts.json` перед перезаписью
5. **Сохраняет обновленные цены** в `gifts.json`

## Установка

### 1. Установи Python 3.8+
- **Windows**: https://www.python.org/downloads/
- **macOS/Linux**: `brew install python3` или `apt install python3`

### 2. Установи зависимости

```bash
pip install -r requirements.txt
```

Или:

```bash
python -m pip install requests
```

## Использование

### Локальный запуск

```bash
python update_gifts.py
```

Вывод:
```
[2026-11-22 21:40:15] INFO: Starting Wujje Store Gifts Updater
[2026-11-22 21:40:15] INFO: Fetching TON/USD rate from CoinGecko...
[2026-11-22 21:40:16] INFO: TON rate: $5.47 / ₽465.00
[2026-11-22 21:40:17] INFO: Fetching NFT collections from Getgems...
[2026-11-22 21:40:18] INFO: Found 42 collections with floor prices
[2026-11-22 21:40:18] INFO: Applied markup and converted 42 gifts to RUB
[2026-11-22 21:40:18] INFO: Backup created: wujje-backups/gifts/gifts_20261122_214015.json
[2026-11-22 21:40:18] INFO: Saved 42 gifts to gifts.json
[2026-11-22 21:40:18] INFO: ========================================================
[2026-11-22 21:40:18] INFO: Update completed successfully!
```

### Автоматический запуск по расписанию

#### Windows (Task Scheduler)
```powershell
# 1. Создай задачу
$trigger = New-ScheduledTaskTrigger -Daily -At 10:00AM
$action = New-ScheduledTaskAction -Execute "python" -Argument "c:\path\to\update_gifts.py"
Register-ScheduledTask -TaskName "UpdateWujjeGifts" -Trigger $trigger -Action $action
```

#### macOS/Linux (Cron)
```bash
# Запускать каждый день в 10:00 AM
0 10 * * * cd /path/to/wujje-store && python update_gifts.py

# Добавить в crontab
crontab -e
# Вставить строку выше и сохранить (Ctrl+X, Y, Enter)
```

#### Docker (для сервера)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY update_gifts.py .

# Запускать каждый день
CMD while true; do python update_gifts.py; sleep 86400; done
```

## Файлы

- **`update_gifts.py`** — основной скрипт парсера
- **`requirements.txt`** — зависимости Python
- **`gifts.json`** — обновляемый файл с ценами
- **`wujje-backups/gifts/`** — папка с backup'ами (автоматическая)

## Настройка

Отредактируй `update_gifts.py`, строка 10-17:

```python
CONFIG = {
    "MARKUP_PERCENT": 7.5,        # ← Измени наценку (5-10%)
    "RUB_RATE": 85,               # ← Fallback курс если CoinGecko недоступен
}
```

## Troubleshooting

### "ModuleNotFoundError: No module named 'requests'"
```bash
pip install requests
```

### "Connection timeout"
- Проверь интернет
- Getgems/CoinGecko API может быть недоступен (используется fallback)

### "Permission denied"
```bash
# macOS/Linux
chmod +x update_gifts.py

# Windows (запусти PowerShell от admin)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Примечания

- **Fallback режим**: Если Getgems не отвечает, используются hardcoded примеры
- **CoinGecko API** бесплатна, нет ограничений на базовые запросы
- **Backup** сохраняются в `wujje-backups/gifts/` с timestamp'ом
- Скрипт логирует все действия в консоль

## Интеграция с GitHub Actions (CI/CD)

Создай `.github/workflows/update-gifts.yml`:

```yaml
name: Update Wujje Gifts

on:
  schedule:
    - cron: '0 10 * * *'  # Каждый день в 10 AM UTC

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: python update_gifts.py
      - uses: stefanzweifel/git-auto-commit-action@v4
        with:
          commit_message: "chore: update gifts prices"
```

Тогда prices будут обновляться автоматически каждый день! 🚀
