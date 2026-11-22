# Wujje Store Webapp

> Digital marketplace for Telegram Stars, NFT gifts, game subscriptions, and more.

## 🏗️ Architecture

### File Structure

```
├── index.html              # Main app (UI + logic, 2300+ lines)
├── offer.html              # Public offer & terms of service
├── config.js               # Configuration, validators, API helpers ⭐
├── gifts.json              # NFT collections data
├── tonconnect-manifest.json # TON Connect configuration
├── .env.example            # Environment variables template
├── .gitignore              # Git exclusion rules
└── icons/                  # Service icons (Telegram, Roblox, etc.)
```

## 📦 Key Components

### `config.js` - Centralized Configuration

Exports three main objects:

#### **CONFIG** - Constants
```javascript
CONFIG.TON_RATE_RUB        // Exchange rate (84 ₽/TON)
CONFIG.SAFE_MARKUP         // Price markup (1.12x)
CONFIG.API_BASE            // API endpoint
CONFIG.RECEIVER_WALLET     // TON wallet address
CONFIG.MANIFEST_URL        // TonConnect manifest URL
```

#### **VALIDATORS** - Input Validation
```javascript
VALIDATORS.isValidUsername(username)    // @-prefixed, 5-32 chars
VALIDATORS.isValidStarsAmount(stars)    // 1-100,000
VALIDATORS.isValidRubAmount(rub)        // 10-999,999
VALIDATORS.isValidPromoCode(code)       // 3-20 uppercase alphanumeric
```

#### **API** - Safe API Calls
```javascript
API.call(endpoint, payload)              // Generic POST with error handling
API.resolveUsername(username)            // Get Telegram user info
API.syncBalance(initData)                // Fetch current balance
API.payWithBalance(initData, stars, target)  // Pay from balance
API.getReferralInfo(initData)            // Fetch referral stats
API.applyPromoCode(initData, code)       // Validate & apply promo
API.requestTopup(initData, amountRub)    // Request SBP QR code
```

#### **STORAGE** - localStorage Helpers
```javascript
STORAGE.getJSON(key, default)            // Safe JSON parse
STORAGE.setJSON(key, value)              // Safe JSON stringify
STORAGE.getOrders()                      // Get order history
STORAGE.saveOrder(order)                 // Save new order
STORAGE.getRecentUsers()                 // Get recent @usernames
STORAGE.saveRecentUser(username)         // Add to recent list
```

## 🔄 Usage Example

**Before (scattered constants):**
```javascript
const API_BASE = "https://taxes-emotions-note-expense.trycloudflare.com";
const RECEIVER_WALLET = "UQACI8bEF...";
// ... hardcoded URLs everywhere, no validation

try {
  const res = await fetch(`${API_BASE}/api/pay_balance`, {...});
  const d = await res.json();
  localStorage.setItem("orders", JSON.stringify(orders));
} catch (e) {}
```

**After (using config.js):**
```javascript
// Validate input
if (!VALIDATORS.isValidUsername(target)) {
  statusNote.textContent = "Invalid username";
  return;
}

// Make API call with built-in error handling
const d = await API.payWithBalance(tg.initData, 100, target);

// Use STORAGE helpers
STORAGE.saveOrder({...});
STORAGE.saveRecentUser(target);
```

## 🔐 Security Features

### Environment Variables
- Sensitive values in `.env` (not committed)
- Template in `.env.example` for setup
- Never hardcode API keys, tokens, or wallets

### Input Validation
- All user inputs validated before API calls
- Username format checked (`@username`)
- Amount ranges enforced (₽ and ⭐)
- Promo codes sanitized

### Error Handling
- API calls wrapped in try-catch
- Failed fetches return `null` gracefully
- User-friendly error messages
- No token/key exposure in console

### .gitignore
- `.env` files excluded
- `.env.example` tracked (shows what's needed)
- `push-to-github.ps1` excluded (tokens in scripts)
- IDE configs, logs, temp files ignored

## 💰 Pricing Configuration

Stars packages in `index.html` (lines ~1007-1021):

```javascript
const PACKAGES = [
  { stars: 50, rub: 76 },      // 1.52 ₽/star
  { stars: 100, rub: 152 },    // 1.52 ₽/star
  { stars: 500, rub: 758 },    // 1.516 ₽/star
  { stars: 1000, rub: 1515 },  // 1.515 ₽/star
  // ... up to 10,000 stars
]
```

**To adjust prices:**
1. Edit `PACKAGES` array in `index.html`
2. Keep `₽/star` competitive (1.50-1.55 range)
3. Commit & push
4. Live on next reload

## 🚀 Deployment

### Local Development
```bash
# No build needed—pure HTML/CSS/JS
# Open in browser or Telegram WebApp
open index.html
```

### Production (GitHub Pages)
```bash
git add -A
git commit -m "chore: update prices and features"
git push origin main
# Live at: https://ksyura0.github.io/wujje-store-webapp
```

## 📋 Changelog

### v1.1 (Current)
- ✅ Centralized config in `config.js`
- ✅ Input validators for all user data
- ✅ Safe API wrapper with error handling
- ✅ Storage helpers for localStorage
- ✅ `.gitignore` to prevent token leaks
- ✅ `.env.example` template
- ✅ All constants moved from inline → CONFIG object

### v1.0
- Initial release with 122 NFT collections
- Stars, Telegram Premium, Roblox, Minecraft
- TON and balance payment methods
- Referral system & achievements

## 🔗 Links

- **Bot:** https://t.me/wujje_store_bot
- **WebApp:** https://ksyura0.github.io/wujje-store-webapp
- **GitHub:** https://github.com/ksyura0/wujje-store-webapp
- **Offer:** ./offer.html

## 📝 Notes

- All times in `ru-RU` locale (Russian formatting)
- Prices in ₽ (Rubles) and TON
- NFT floor prices calculated from base TON + 12% markup
- Rare = 1.45x floor, Mythic = 2.1x floor
- Balance sync on app load and after transactions
