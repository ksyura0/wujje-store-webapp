/**
 * Wujje Store Configuration & Utilities
 * Contains constants, validators, and helper functions
 */

const CONFIG = {
  // Rate and Markup
  TON_RATE_RUB: 84,
  SAFE_MARKUP: 1.12,

  // API Configuration
  API_BASE: "https://golf-each-hook-solve.trycloudflare.com",
  DEFAULT_PAY_URL: "https://t.tb.ru/pm_short/2L0Yb9q9Ehb",

  // Blockchain
  RECEIVER_WALLET: "UQACI8bEF66IOMZr7mNEsxR3dQi-eEp29G2fH18Wrr03gmxp",
  MANIFEST_URL: "https://ksyura0.github.io/wujje-store-webapp/tonconnect-manifest.json",

  // Storage Keys (localStorage)
  ORDERS_KEY: "wujje_orders_history_v1",
  RECENT_KEY: "wujje_recent_usernames_v1",
  PROMO_KEY: "wujje_applied_promo_v1",
  THEME_KEY: "wujje_theme_v1",
  BALANCE_KEY: "wujje_rub_balance"
};

/**
 * Input Validators
 */
const VALIDATORS = {
  /**
   * Validate username format
   * @param {string} username - Username to validate
   * @returns {boolean}
   */
  isValidUsername(username) {
    if (!username || typeof username !== "string") return false;
    const clean = username.trim();
    const norm = clean.startsWith("@") ? clean : `@${clean}`;
    return norm.length >= 5 && /^@[a-zA-Z0-9_]{4,32}$/.test(norm);
  },

  /**
   * Validate stars amount
   * @param {number} stars - Stars count
   * @returns {boolean}
   */
  isValidStarsAmount(stars) {
    const n = Number(stars);
    return Number.isInteger(n) && n >= 1 && n <= 100000;
  },

  /**
   * Validate RUB amount
   * @param {number} rub - Rubles amount
   * @returns {boolean}
   */
  isValidRubAmount(rub) {
    const n = Number(rub);
    return !isNaN(n) && n >= 10 && n <= 999999;
  },

  /**
   * Validate promo code format
   * @param {string} code - Promo code
   * @returns {boolean}
   */
  isValidPromoCode(code) {
    if (!code || typeof code !== "string") return false;
    return /^[A-Z0-9]{3,20}$/.test(code.trim().toUpperCase());
  }
};

/**
 * API Helper
 */
const API = {
  /**
   * Safe fetch with error handling
   * @param {string} endpoint - API endpoint
   * @param {object} payload - Request payload
   * @returns {Promise<object|null>}
   */
  async call(endpoint, payload = {}) {
    try {
      const response = await fetch(`${CONFIG.API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return null;
    }
  },

  /**
   * Resolve Telegram username
   */
  async resolveUsername(username) {
    if (!VALIDATORS.isValidUsername(username)) return null;
    const clean = username.startsWith("@") ? username : `@${username}`;
    return await this.call("/api/resolve_username", { username: clean });
  },

  /**
   * Sync user balance
   */
  async syncBalance(initData) {
    if (!initData) return null;
    return await this.call("/api/balance", { initData });
  },

  /**
   * Process payment
   */
  async payWithBalance(initData, stars, target) {
    if (!VALIDATORS.isValidUsername(target)) return null;
    return await this.call("/api/pay_balance", { initData, stars, target });
  },

  /**
   * Get referral info
   */
  async getReferralInfo(initData) {
    if (!initData) return null;
    return await this.call("/api/referral", { initData });
  },

  /**
   * Claim referral earnings
   */
  async claimReferral(initData) {
    if (!initData) return null;
    return await this.call("/api/referral/claim", { initData });
  },

  /**
   * Apply promo code
   */
  async applyPromoCode(initData, code) {
    if (!VALIDATORS.isValidPromoCode(code)) return null;
    return await this.call("/api/promo", { initData, code: code.toUpperCase() });
  },

  /**
   * Request topup
   */
  async requestTopup(initData, amountRub, method = "СБП / QR", promoCode = null) {
    if (!VALIDATORS.isValidRubAmount(amountRub)) return null;
    return await this.call("/api/topup", {
      initData,
      amount_rub: amountRub,
      method,
      promo_code: promoCode
    });
  },

  /**
   * Get gifts list
   */
  async getGifts() {
    try {
      const response = await fetch(`${CONFIG.API_BASE}/api/gifts`, { method: "GET" });
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      return null;
    }
  },

  /**
   * Pay with balance for gift
   */
  async payGiftWithBalance(initData, target, giftId) {
    return await this.call("/api/pay_balance", {
      initData,
      target,
      gift_id: giftId
    });
  },

  /**
   * Pay with balance for stars
   */
  async payStarsWithBalance(initData, stars, target) {
    return await this.call("/api/pay_balance", {
      initData,
      stars,
      target
    });
  }
};

/**
 * Storage Helper
 */
const STORAGE = {
  /**
   * Safe JSON parse from localStorage
   */
  getJSON(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      return defaultValue;
    }
  },

  /**
   * Safe JSON stringify to localStorage
   */
  setJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get orders list
   */
  getOrders() {
    return this.getJSON(CONFIG.ORDERS_KEY, []);
  },

  /**
   * Save order
   */
  saveOrder(order) {
    const list = this.getOrders();
    list.unshift(order);
    return this.setJSON(CONFIG.ORDERS_KEY, list.slice(0, 50));
  },

  /**
   * Clear orders
   */
  clearOrders() {
    try {
      localStorage.removeItem(CONFIG.ORDERS_KEY);
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get recent usernames
   */
  getRecentUsers() {
    return this.getJSON(CONFIG.RECENT_KEY, []);
  },

  /**
   * Add to recent usernames
   */
  saveRecentUser(username) {
    if (!VALIDATORS.isValidUsername(username)) return false;
    const list = this.getRecentUsers()
      .filter(u => u.toLowerCase() !== username.toLowerCase());
    list.unshift(username);
    return this.setJSON(CONFIG.RECENT_KEY, list.slice(0, 4));
  }
};

// Export for use in HTML
if (typeof window !== "undefined") {
  window.CONFIG = CONFIG;
  window.VALIDATORS = VALIDATORS;
  window.API = API;
  window.STORAGE = STORAGE;
}
