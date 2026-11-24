# FunPay Steam AutoBuy Integration Guide

## Overview

The **FunPay AutoBuy** module automatically purchases Steam balance from FunPay when a customer orders "Steam Pополнение" through the Wujje Store WebApp.

## Features

- 🤖 **Automated Offer Search**: Finds the cheapest Steam balance offer matching customer's region
- 🔒 **Account Security**: Uses secure session cookies (golden_key) for FunPay authentication
- ⭐ **Quality Filtering**: Only selects sellers with rating ≥ 4.7, online status, and auto-delivery enabled
- 💰 **Price Protection**: Rejects offers with excessive markups (configurable limit)
- 📊 **Detailed Logging**: Complete audit trail of every transaction
- 🔄 **Idempotency**: Prevents duplicate purchases for the same order
- ⏱️ **Status Tracking**: Monitors order fulfillment on FunPay

## Setup

### 1. Get FunPay Golden Key

1. Log in to your FunPay account at https://funpay.com
2. Open browser DevTools (F12)
3. Go to **Application** → **Cookies** → **https://funpay.com**
4. Find cookie named `golden_key`
5. Copy its value (long string starting with numbers/letters)

### 2. Configure .env

```bash
# Copy template
cp .env.example .env

# Edit .env and add:
FUNPAY_GOLDEN_KEY=YOUR_GOLDEN_KEY_VALUE_HERE
FUNPAY_MAX_PRICE_MARKUP=1.15      # Max 15% above base price
ADMIN_ID=YOUR_TELEGRAM_ID         # For admin notifications
```

### 3. Install Dependencies

```bash
pip install requests
```

## Module Files

| File | Purpose |
|------|---------|
| `funpay_autobuy.py` | Core FunPay API client & purchase logic |
| `funpay_integration.py` | Handler for Wujje Store integration |

## How to Integrate

### In `wujje_api.py`

```python
from funpay_integration import handle_steam_order

# When receiving Steam order from WebApp:
@app.route('/api/order/steam', methods=['POST'])
def process_steam_order():
    order_data = request.json
    
    # Process through FunPay
    result = handle_steam_order({
        "steam_login": order_data.get("steam_login"),
        "currency": order_data.get("currency", "RUB"),
        "amount_rub": float(order_data.get("amount_rub", 0)),
        "order_id": order_data.get("order_id"),
        "user_id": order_data.get("user_id")
    })
    
    # Update database
    if result["success"]:
        save_order_status(order_data["order_id"], "completed", {
            "funpay_order": result["funpay_order_id"],
            "balance_after": result["balance_after"]
        })
        return jsonify({"ok": True, "funpay_order_id": result["funpay_order_id"]})
    else:
        save_order_status(order_data["order_id"], "failed", {
            "error": result["message"]
        })
        return jsonify({"ok": False, "error": result["message"]}), 400
```

### In `wujje_bot.py`

```python
from funpay_integration import handle_steam_order

async def process_steam_payment(user_id, steam_login, amount_rub, currency="RUB"):
    """Process Steam payment through FunPay"""
    
    result = handle_steam_order({
        "steam_login": steam_login,
        "currency": currency,
        "amount_rub": amount_rub,
        "order_id": f"wujje_steam_{user_id}_{int(time.time())}",
        "user_id": user_id
    })
    
    if result["success"]:
        await bot.send_message(
            user_id,
            f"✅ Steam order completed!\n"
            f"FunPay Order: {result['funpay_order_id']}\n"
            f"Status: {result['status']}"
        )
        
        # Notify admin
        await bot.send_message(
            ADMIN_ID,
            f"✅ Steam AutoBuy Success\n"
            f"User: {user_id}\n"
            f"Amount: {amount_rub} ₽\n"
            f"FunPay: {result['funpay_order_id']}\n"
            f"Balance After: {result['balance_after']:.2f} ₽"
        )
    else:
        await bot.send_message(
            user_id,
            f"❌ Steam order failed: {result['message']}"
        )
        
        # Notify admin of error
        await bot.send_message(
            ADMIN_ID,
            f"❌ Steam AutoBuy Failed\n"
            f"User: {user_id}\n"
            f"Error: {result['message']}"
        )
```

## Testing

### Test Mode (Offline)

```bash
# No real purchases - just logs
python funpay_autobuy.py
```

### Live Test with Real Order

```python
from funpay_integration import handle_steam_order

# Test with small amount
result = handle_steam_order({
    "steam_login": "test_account",
    "currency": "RUB",
    "amount_rub": 50.0,  # Small test amount
    "order_id": "wujje_test_001",
    "user_id": 12345
})

print(result)
# Check logs for detailed trace
```

### Verify FunPay Balance

```python
from funpay_autobuy import FunPayAutoBuy
import os

autobuy = FunPayAutoBuy(
    golden_key=os.getenv("FUNPAY_GOLDEN_KEY"),
    admin_id=int(os.getenv("ADMIN_ID"))
)

balance = autobuy.check_balance()
print(f"Current FunPay balance: {balance}")
```

## Logging Output

Each Steam order produces detailed logs:

```
🚀 Processing Steam order wujje_001
   Steam login: test_account
   Amount: 500 ₽ (RUB)
🔍 Searching best offer: 500 ₽ (RUB)
✅ Best offer found:
   Seller: TopSeller (rating: 4.9)
   Price: 475.00 RUB
   Per unit: 0.9500
📊 FunPay balance: 1250.50 ₽
💳 Processing purchase from TopSeller...
✅ Order created: fp_12345678
   Seller: TopSeller
   Amount: 500 ₽
   Steam login: test_account
📋 Order fp_12345678 status: completed
✅ Steam order wujje_001 processed successfully
   FunPay order: fp_12345678
   Status: completed
   Balance: 1250.50 → 775.50 ₽
```

## Configuration Options

| Variable | Default | Purpose |
|----------|---------|---------|
| `FUNPAY_GOLDEN_KEY` | - | Session cookie for FunPay auth (required) |
| `FUNPAY_MAX_PRICE_MARKUP` | 1.15 | Max 15% price increase threshold |
| `ADMIN_ID` | - | Telegram ID for error notifications |

## Troubleshooting

### "FUNPAY_GOLDEN_KEY not set in .env"

**Solution**: 
1. Copy .env.example to .env
2. Add your golden_key from FunPay account
3. Restart bot

### "No valid Steam balance offers found"

**Causes**:
- No sellers online at this moment
- All sellers too expensive (markup > 1.15)
- Requested currency not available

**Solution**: 
- Wait and retry
- Increase `FUNPAY_MAX_PRICE_MARKUP` temporarily
- Check FunPay website manually

### "Insufficient balance on FunPay"

**Solution**: 
- Top up FunPay account balance
- Reduce order amount
- Wait for FunPay transaction to complete

### "Order stuck on 'pending'"

**Solution**:
- Check FunPay website manually
- Verify seller completed delivery
- Contact FunPay support if needed

## Security Notes

⚠️ **Never commit golden_key to Git!**
- Always use `.env` file (in `.gitignore`)
- Keep golden_key confidential
- Rotate golden_key periodically
- Use strong Telegram admin ID verification

## Support

For issues or questions:
1. Check logs in `LOG_LEVEL=DEBUG` mode
2. Verify .env configuration
3. Test manually: `python funpay_autobuy.py`
4. Contact admin with error message
