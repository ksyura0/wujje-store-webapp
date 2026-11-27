    window.debugLog = function(msg) {
      // Debug logging disabled in production
    };

    // Start logging immediately
    // setTimeout(() => window.debugLog("🚀 App starting..."), 100);
    // window.debugLog("✓ catalog.js and DOM ready");
    // Core utilities - MUST be defined before any other code
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
    }

    // Format number with thousands separator
    const fmt = (n) => Number(n || 0).toLocaleString("ru-RU");

    // Haptic feedback
    const haptic = (style = "light") => {
      try {
        if (tg?.HapticFeedback) {
          if (style === "light") tg.HapticFeedback.impactOccurred("light");
          else if (style === "medium") tg.HapticFeedback.impactOccurred("medium");
          else if (style === "heavy") tg.HapticFeedback.impactOccurred("heavy");
        }
      } catch (e) {
        console.warn("Haptic feedback failed:", e);
      }
    };

    // window.debugLog("✓ Core utilities (tg, fmt, haptic) initialized");

    // Dynamic TON rate fetching
    let currentTonRate = CONFIG.TON_RATE_RUB;
    async function fetchTonRate() {
      try {
        const response = await fetch("https://tonapi.io/v2/rates?tokens=ton&currencies=RUB", {
          headers: { "accept": "application/json" }
        });
        if (!response.ok) throw new Error("Failed to fetch rate");
        const data = await response.json();
        if (data.rates?.TON?.RUB) {
          currentTonRate = Math.round(data.rates.TON.RUB);
          // window.debugLog(`✓ TON rate updated: ${currentTonRate} ₽`);
        }
      } catch (error) {
        console.warn("Failed to fetch TON rate, using default:", error);
        currentTonRate = CONFIG.TON_RATE_RUB;
      }
    }
    fetchTonRate();
    setInterval(fetchTonRate, 300000); // Update every 5 minutes

    // Lottie animation handler for NFT gifts
    const animationInstances = {};
    function playLottieAnimation(container, animationUrl) {
      if (!container || !animationUrl) return;

      const containerId = container.id || `anim-${Math.random().toString(36).substr(2, 9)}`;
      if (!container.id) container.id = containerId;

      // Stop any existing animation in this container
      if (animationInstances[containerId]) {
        animationInstances[containerId].stop();
        animationInstances[containerId].destroy();
        delete animationInstances[containerId];
      }

      // Clear container
      container.innerHTML = "";

      try {
        if (window.lottie) {
          animationInstances[containerId] = window.lottie.loadAnimation({
            container: container,
            renderer: "svg",
            autoplay: true,
            loop: true,
            path: animationUrl
          });
        }
      } catch (e) {
        // Animation failed, container will show fallback image
      }
    }

    const tonFloorToRub = (ton) => Math.max(150, Math.round(Number(ton) * currentTonRate * CONFIG.SAFE_MARKUP));
    const rubToTonSafe = (rub) => Math.max(0.05, Number((Number(rub) / currentTonRate).toFixed(2)));

    function svgArt(title, floorLabel, bgHex, accentHex, symbol) {
      const safeTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;");
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
        <defs>
          <radialGradient id="g" cx="50%" cy="40%" r="62%">
            <stop offset="0%" stop-color="${accentHex}" stop-opacity="0.55"/>
            <stop offset="100%" stop-color="${bgHex}" stop-opacity="1"/>
          </radialGradient>
        </defs>
        <rect width="512" height="512" rx="64" fill="url(#g)"/>
        <circle cx="256" cy="205" r="114" fill="rgba(255,255,255,0.08)" stroke="${accentHex}" stroke-opacity="0.55" stroke-width="3"/>
        <text x="256" y="234" text-anchor="middle" font-size="92">${symbol}</text>
        <text x="256" y="372" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="30" font-weight="800">${safeTitle}</text>
        <text x="256" y="416" text-anchor="middle" fill="#d8d0f5" font-family="sans-serif" font-size="22" font-weight="700">${floorLabel}</text>
      </svg>`;
      return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    }

    // THEMES and PACKAGES are now imported from catalog.js
    // They are set to window scope and available globally

    // Build PACKAGES with TON conversion from catalog.js with fallback
    const PACKAGES_FALLBACK = [{stars:50,rub:77},{stars:100,rub:152},{stars:150,rub:225},{stars:250,rub:370},{stars:350,rub:515},{stars:500,rub:730},{stars:750,rub:1085},{stars:1000,rub:1430},{stars:1500,rub:2130},{stars:2500,rub:3500},{stars:5000,rub:6950},{stars:10000,rub:13700}];
    let packagesData = PACKAGES_BASE || PACKAGES_FALLBACK;
    if (!Array.isArray(packagesData) || packagesData.length === 0) {
      packagesData = PACKAGES_FALLBACK;
    }
    window.PACKAGES = packagesData.map((p) => ({ ...p, ton: rubToTonSafe(p.rub) }));

    // Ensure PACKAGES is not empty before using it
    if (!window.PACKAGES || window.PACKAGES.length === 0) {
      window.PACKAGES = PACKAGES_FALLBACK.map((p) => ({ ...p, ton: rubToTonSafe(p.rub) }));
    }

    // PACKAGES is now guaranteed at window scope

    // Load gifts feed from API with real data (flat list, not collections)
    window.GIFTS_FEED = [];
    window.ADMIN_FLAG = false;  // Store admin status globally

    async function initGiftsFeed() {
      const apiData = await API.getGifts();

      // Extract admin flag from API response
      if (apiData?.is_admin === true) {
        window.ADMIN_FLAG = true;
      }

      if (apiData?.gifts && Array.isArray(apiData.gifts)) {
        // Flatten: each gift item becomes a separate card in the feed
        window.GIFTS_FEED = apiData.gifts.map((gift) => {
          const priceTon = Number(gift.price_ton || gift.floor_ton || 0);
          const priceRub = Number(gift.price_rub || gift.floor_rub || 0);
          const imageUrl = gift.image_url || gift.img || "";
          const animationUrl = gift.animation_url || gift.sticker_tgs || "";
          const marketUrl = gift.admin_market_url || gift.market_url || "";
          const slug = gift.slug || gift.id || "";
          const model = gift.model || gift.name || "";
          const backdrop = gift.backdrop || gift.attributes?.background || "";
          const number = gift.number || gift.id || "";

          return {
            id: gift.id,
            title: gift.title || "Подарок",
            model: model,
            backdrop: backdrop,
            number: number,
            slug: slug,
            priceTon: priceTon,
            priceRub: priceRub,
            img: imageUrl,
            animationUrl: animationUrl,
            marketUrl: window.ADMIN_FLAG && marketUrl ? marketUrl : "",
            searchText: `${gift.title || ""} ${model} ${backdrop} ${number}`.toLowerCase()
          };
        });
      } else {
        // Fallback: empty feed if API fails
        window.GIFTS_FEED = [];
      }
    initGiftsFeed();

    // Build NFT collections and CATEGORIES from catalog data
    window.CATEGORIES = [
      {
        id: "telegram", group: "telegram", img: "./icons/telegram.png", emoji: "✈️",
        title: "Telegram", desc: "Stars и Telegram Premium", fromText: `От ${(window.PACKAGES?.[0]?.rub) || 77} ₽`, badge: "В наличии",
        items: [
          { id: "tg_stars", title: "Telegram Stars", sub: "Любое кол-во или пакеты 50–10 000 ⭐ · В наличии", priceText: `От ${(window.PACKAGES?.[0]?.rub) || 77} ₽`, subPriceText: `от ${(window.PACKAGES?.[0]?.ton) || 1} TON`, tag: "В наличии", action: "openStars" },
          { id: "tg_prem_3", title: "Telegram Premium (3 мес)", sub: "Подарком по @username · В наличии", priceText: "1 390 ₽", rub: 1390, tag: "В наличии", inputLabel: "Ваш @username в Telegram", inputPlaceholder: "@username", allowSelf: true, action: "openProduct" },
          { id: "tg_prem_12", title: "Telegram Premium (12 мес)", sub: "Годовая подписка подарком · В наличии", priceText: "3 890 ₽", rub: 3890, tag: "В наличии", inputLabel: "Ваш @username в Telegram", inputPlaceholder: "@username", allowSelf: true, action: "openProduct" }
        ]
      },
      {
        id: "nft_gifts", group: "nft", img: "./icons/nft.png", emoji: "🎁",
        title: "NFT подарки", desc: "Простая лента подарков",
        get fromText() { return window.GIFTS_FEED?.length > 0 ? `От ${fmt(Math.min(...window.GIFTS_FEED.map(g => g.priceRub)))} ₽` : "От 150 ₽"; },
        get badge() { return `${window.GIFTS_FEED?.length || 0} в наличии`; },
        action: "openGiftsFeed"
      },
      {
        id: "roblox", group: "games", img: "./icons/roblox.png", emoji: "🧱",
        title: "Roblox", desc: "Пополнение Робуксов", fromText: "От 520 ₽", badge: "В наличии",
        items: [
          { id: "rbx_400", title: "400 Robux", sub: "Пополнение аккаунта Roblox · В наличии", priceText: "520 ₽", rub: 520, tag: "В наличии", inputLabel: "Никнейм Roblox", inputPlaceholder: "RobloxNickname", allowSelf: false, action: "openProduct" },
          { id: "rbx_800", title: "800 Robux", sub: "Пополнение аккаунта Roblox · В наличии", priceText: "990 ₽", rub: 990, tag: "В наличии", inputLabel: "Никнейм Roblox", inputPlaceholder: "RobloxNickname", allowSelf: false, action: "openProduct" },
          { id: "rbx_1700", title: "1 700 Robux", sub: "Пополнение аккаунта Roblox · В наличии", priceText: "1 990 ₽", rub: 1990, tag: "В наличии", inputLabel: "Никнейм Roblox", inputPlaceholder: "RobloxNickname", allowSelf: false, action: "openProduct" },
          { id: "rbx_4500", title: "4 500 Robux", sub: "Большой пакет Robux · В наличии", priceText: "4 890 ₽", rub: 4890, tag: "В наличии", inputLabel: "Никнейм Roblox", inputPlaceholder: "RobloxNickname", allowSelf: false, action: "openProduct" }
        ]
      },
      {
        id: "discord", group: "subs", img: "./icons/discord.png", emoji: "👾",
        title: "Discord", desc: "Nitro и бусты сервера", fromText: "От 100 ₽", badge: "В наличии",
        items: [
          { id: "dc_basic_1m", title: "Discord Nitro Basic (1 мес)", sub: "Активация подписки · В наличии", priceText: "290 ₽", rub: 290, tag: "В наличии", inputLabel: "Email Discord", inputPlaceholder: "user@example.com", allowSelf: true, action: "openProduct" },
          { id: "dc_full_1m", title: "Discord Nitro Full (1 мес)", sub: "2 буста, HD, кастомизация · В наличии", priceText: "640 ₽", rub: 640, tag: "В наличии", inputLabel: "Email Discord", inputPlaceholder: "user@example.com", allowSelf: true, action: "openProduct" },
          { id: "dc_boost_2", title: "2 буста сервера (1 мес)", sub: "Буст сервера · В наличии", priceText: "100 ₽", rub: 100, tag: "✨ Выгодно", inputLabel: "Discord сервер", inputPlaceholder: "https://discord.gg/...", allowSelf: false, action: "openProduct" },
          { id: "dc_boost_4", title: "4 буста сервера (1 мес)", sub: "Мощный буст · В наличии", priceText: "190 ₽", rub: 190, tag: "✨ Выгодно", inputLabel: "Discord сервер", inputPlaceholder: "https://discord.gg/...", allowSelf: false, action: "openProduct" }
        ]
      },
      {
        id: "spotify", group: "subs", img: "./icons/spotify.png", emoji: "🎧",
        title: "Spotify", desc: "Подписки Spotify Premium", fromText: "От 320 ₽", badge: "В наличии",
        items: [
          { id: "spot_1m", title: "Spotify Premium (1 мес)", sub: "Подписка на 1 месяц · В наличии", priceText: "320 ₽", rub: 320, tag: "В наличии", inputLabel: "Email Spotify", inputPlaceholder: "user@example.com", allowSelf: true, action: "openProduct" },
          { id: "spot_3m", title: "Spotify Premium (3 мес)", sub: "Подписка на 3 месяца · В наличии", priceText: "890 ₽", rub: 890, tag: "В наличии", inputLabel: "Email Spotify", inputPlaceholder: "user@example.com", allowSelf: true, action: "openProduct" },
          { id: "spot_12m", title: "Spotify Premium (12 мес)", sub: "Подписка на 12 месяцев · В наличии", priceText: "3 150 ₽", rub: 3150, tag: "В наличии", inputLabel: "Email Spotify", inputPlaceholder: "user@example.com", allowSelf: true, action: "openProduct" }
        ]
      },
      {
        id: "minecraft", group: "games", img: "./icons/minecraft.png", emoji: "⛏️",
        title: "Minecraft", desc: "Лицензии, Realms и монеты", fromText: "От 290 ₽", badge: "В наличии",
        items: [
          { id: "mc_key", title: "Minecraft Java & Bedrock", sub: "Лицензионный ключ · В наличии", priceText: "1 890 ₽", rub: 1890, tag: "В наличии", inputLabel: "Email", inputPlaceholder: "player@example.com", allowSelf: true, action: "openProduct" },
          { id: "mc_realms_1m", title: "Minecraft Realms Plus (1 мес)", sub: "Облачный мир · В наличии", priceText: "290 ₽", rub: 290, tag: "В наличии", inputLabel: "Email", inputPlaceholder: "player@example.com", allowSelf: true, action: "openProduct" },
          { id: "mc_coins_1720", title: "Minecoins 1720", sub: "В Minecraft Store · В наличии", priceText: "1 190 ₽", rub: 1190, tag: "В наличии", inputLabel: "Email", inputPlaceholder: "player@example.com", allowSelf: true, action: "openProduct" },
          { id: "mc_hypixel_vip", title: "Hypixel VIP (ник)", sub: "VIP статус · В наличии", priceText: "890 ₽", rub: 890, tag: "В наличии", inputLabel: "Никнейм", inputPlaceholder: "PlayerName", allowSelf: true, action: "openProduct" }
        ]
      },
      {
        id: "xbox", group: "games", img: "./icons/xbox.png", emoji: "🎮",
        title: "Xbox Game Pass", desc: "Полная линейка подписок", fromText: "От 290 ₽", badge: "В наличии",
        items: [
          { id: "gp_core_1m", title: "Game Pass Core (1 мес)", sub: "Xbox Cloud Gaming · В наличии", priceText: "290 ₽", rub: 290, tag: "В наличии", inputLabel: "Email Microsoft", inputPlaceholder: "user@example.com", allowSelf: true, action: "openProduct" },
          { id: "gp_pc_1m", title: "PC Game Pass (1 мес)", sub: "Доступ на ПК · В наличии", priceText: "790 ₽", rub: 790, tag: "В наличии", inputLabel: "Email Microsoft", inputPlaceholder: "user@example.com", allowSelf: true, action: "openProduct" },
          { id: "gp_ult_1m", title: "Xbox Game Pass Ultimate (1 мес)", sub: "PC + Console + Cloud · В наличии", priceText: "890 ₽", rub: 890, tag: "В наличии", inputLabel: "Email Microsoft", inputPlaceholder: "user@example.com", allowSelf: true, action: "openProduct" },
          { id: "gp_ult_3m", title: "Xbox Game Pass Ultimate (3 мес)", sub: "Выгодный пакет · В наличии", priceText: "2 490 ₽", rub: 2490, tag: "✨ Экономия", inputLabel: "Email Microsoft", inputPlaceholder: "user@example.com", allowSelf: true, action: "openProduct" }
        ]
      },
      {
        id: "ai", group: "subs", img: "./icons/ai.png", emoji: "🤖",
        title: "Нейросети и AI", desc: "ChatGPT, Claude, Midjourney", fromText: "От 290 ₽", badge: "В наличии",
        items: [
          { id: "ai_chatgpt", title: "ChatGPT Plus (1 мес)", sub: "Доступ к GPT-4 · В наличии", priceText: "290 ₽", rub: 290, tag: "В наличии", inputLabel: "Email OpenAI", inputPlaceholder: "user@example.com", allowSelf: true, action: "openProduct" },
          { id: "ai_claude", title: "Claude Pro (1 мес)", sub: "Быстрый Claude 3 · В наличии", priceText: "290 ₽", rub: 290, tag: "В наличии", inputLabel: "Email Anthropic", inputPlaceholder: "user@example.com", allowSelf: true, action: "openProduct" },
          { id: "ai_midjourney", title: "Midjourney Basic (1 мес)", sub: "30 минут генерации · В наличии", priceText: "890 ₽", rub: 890, tag: "В наличии", inputLabel: "Email", inputPlaceholder: "user@example.com", allowSelf: true, action: "openProduct" },
          { id: "ai_perplexity", title: "Perplexity Pro (1 мес)", sub: "Лучший поиск с AI · В наличии", priceText: "290 ₽", rub: 290, tag: "В наличии", inputLabel: "Email Perplexity", inputPlaceholder: "user@example.com", allowSelf: true, action: "openProduct" },
          { id: "ai_openai_credits", title: "OpenAI API Credits ($10)", sub: "Пополнение баланса · В наличии", priceText: "790 ₽", rub: 790, tag: "В наличии", inputLabel: "Email OpenAI", inputPlaceholder: "user@example.com", allowSelf: true, action: "openProduct" }
        ]
      },
      {
        id: "steam", group: "games", img: "./icons/steam.png", emoji: "🎮",
        title: "Пополнение Steam", desc: "Автозачисление по логину · РФ / КЗ / УА / СНГ", fromText: "От 100 ₽", badge: "Автовыдача 24/7",
        items: [
          { id: "steam_100", title: "100 ₽ пополнения Steam", sub: "Автозачисление за 1–3 минуты · Рублевый аккаунт", priceText: "109 ₽", rub: 100, tag: "Популярно", inputLabel: "Логин Steam", inputPlaceholder: "steam_username", allowSelf: false, action: "openProduct" },
          { id: "steam_250", title: "250 ₽ пополнения Steam", sub: "Автозачисление за 1–3 минуты · Рублевый аккаунт", priceText: "273 ₽", rub: 250, tag: "Популярно", inputLabel: "Логин Steam", inputPlaceholder: "steam_username", allowSelf: false, action: "openProduct" },
          { id: "steam_500", title: "500 ₽ пополнения Steam", sub: "Автозачисление за 1–3 минуты · Рублевый аккаунт", priceText: "545 ₽", rub: 500, tag: "Выгодно", inputLabel: "Логин Steam", inputPlaceholder: "steam_username", allowSelf: false, action: "openProduct" },
          { id: "steam_1000", title: "1 000 ₽ пополнения Steam", sub: "Автозачисление за 1–3 минуты · Рублевый аккаунт", priceText: "1 090 ₽", rub: 1000, tag: "Выгодно", inputLabel: "Логин Steam", inputPlaceholder: "steam_username", allowSelf: false, action: "openProduct" },
          { id: "steam_2500", title: "2 500 ₽ пополнения Steam", sub: "Автозачисление за 1–3 минуты · Рублевый аккаунт", priceText: "2 725 ₽", rub: 2500, tag: "Выгодно", inputLabel: "Логин Steam", inputPlaceholder: "steam_username", allowSelf: false, action: "openProduct" },
          { id: "steam_5000", title: "5 000 ₽ пополнения Steam", sub: "Автозачисление за 1–3 минуты · Рублевый аккаунт", priceText: "5 450 ₽", rub: 5000, tag: "Выгодно", inputLabel: "Логин Steam", inputPlaceholder: "steam_username", allowSelf: false, action: "openProduct" }
        ]
      }
    ];

    // Add TON conversion to items
    window.CATEGORIES = window.CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items ? cat.items.map((it) => (it.rub ? { ...it, ton: rubToTonSafe(it.rub), subPriceText: it.subPriceText || `${rubToTonSafe(it.rub)} TON` } : it)) : []
    }));

    // Network status check
    const isOnline = () => navigator.onLine;
    window.addEventListener("offline", () => {});
    window.addEventListener("online", () => {});

    // Gifts caching (5 min TTL)
    const GIFTS_CACHE_KEY = "wujje_gifts_cache_v1";
    const GIFTS_CACHE_TTL = 5 * 60 * 1000;

    async function loadGifts() {
      // Try cache first
      const cached = STORAGE.getJSON(GIFTS_CACHE_KEY, null);
      if (cached && cached.timestamp && Date.now() - cached.timestamp < GIFTS_CACHE_TTL) {
        return cached.data || [];
      }

      if (!isOnline()) {
        console.warn("Offline: using stale cache");
        return cached?.data || [];
      }

      const data = await API.getGifts();
      if (data) {
        STORAGE.setJSON(GIFTS_CACHE_KEY, { data, timestamp: Date.now() });
        return data;
      }

      return cached?.data || [];
    }

    function calcQuote(starsCount) {
      const n = Math.max(1, Number(starsCount) || 50);
      const exact = window.PACKAGES.find((p) => p.stars === n);
      if (exact) return { stars: n, rub: exact.rub, ton: exact.ton };

      // Base rate from first package: 76 ₽ / 50 stars = 1.52 ₽/star
      const baseRate = window.PACKAGES[0].rub / window.PACKAGES[0].stars;
      const discount = n >= 5000 ? 0.90 : n >= 1000 ? 0.94 : n >= 350 ? 0.97 : 1.0;
      const rub = Math.max(10, Math.round(n * baseRate * discount));
      return { stars: n, rub, ton: rubToTonSafe(rub) };
    }

    let selectedPackage = window.PACKAGES[0];
    let selectedProduct = null;
    let checkoutMode = "stars";
    let currentView = "hub";
    let activeCategory = null;
    let activeNftCollection = null;
    let activeFilter = "all";
    let rubBalance = Number(localStorage.getItem(CONFIG.BALANCE_KEY) || "0");
    let balanceInitialized = false;
    let resolvedRecipient = null;
    let resolveTimer = null;
    let resolveSeq = 0;
    let appliedPromo = (() => { try { return JSON.parse(localStorage.getItem(CONFIG.PROMO_KEY) || "null"); } catch { return null; } })();
    let referralStats = { total_refs: 0, verified_refs: 0, earned_rub: 0, claimed_rub: 0, available_rub: 0 };

    const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
      manifestUrl: CONFIG.MANIFEST_URL,
      buttonRootId: "ton-connect-btn"
    });

    // Track wallet connection status and balance
    let tonBalance = null;
    async function fetchTonBalance() {
      if (!tonConnectUI.wallet?.account?.address) return null;
      try {
        const address = tonConnectUI.wallet.account.address;
        // Using tonapi.io free API to get balance
        const response = await fetch(`https://tonapi.io/v2/accounts/${address}`, {
          headers: { "accept": "application/json" }
        });
        if (!response.ok) throw new Error("Failed to fetch balance");
        const data = await response.json();
        const balanceNano = BigInt(data.balance);
        const balanceTon = Number(balanceNano) / 1e9;
        tonBalance = balanceTon;
        updateTonBalanceDisplay();
        return balanceTon;
      } catch (error) {
        return null;
      }
    }

    function updateTonBalanceDisplay() {
      // Update profile balance display if on that tab
      const balanceEl = document.getElementById("profileTonBalanceVal");
      if (!balanceEl) return;
      if (tonBalance !== null) {
        balanceEl.textContent = `${tonBalance.toFixed(4)} TON`;
      } else if (tonConnectUI.wallet) {
        balanceEl.textContent = "Загрузка...";
      }
    }

    tonConnectUI.onStatusChange(async (wallet) => {
      // window.debugLog(`Wallet status changed: ${wallet ? "connected" : "disconnected"}`);
      if (wallet) {
        await fetchTonBalance();
        // Refresh balance every 30 seconds while connected
        setInterval(() => fetchTonBalance(), 30000);
      } else {
        tonBalance = null;
        updateTonBalanceDisplay();
      }
    });

    // Initial check for already connected wallet
    if (tonConnectUI.wallet) {
      fetchTonBalance();
    }

    let currentTheme = localStorage.getItem(CONFIG.THEME_KEY) || "violet";

    // Generate premium glass-morphic WS logo with Unbounded font
    function generateWSLogo(theme) {
      const configs = {
        violet: {
          bgGrad1: "#6D28D9",
          bgGrad2: "#3F1E6E",
          border: "rgba(168, 85, 247, 0.9)",
          glow: "rgba(168, 85, 247, 0.6)",
          innerGlow: "rgba(192, 132, 252, 0.5)",
          w: "#F5F3FF",
          s: "#FFFFFF",
          shadow: "rgba(109, 40, 217, 0.5)"
        },
        sapphire: {
          bgGrad1: "#0F172A",
          bgGrad2: "#1E293B",
          border: "rgba(56, 189, 248, 0.85)",
          glow: "rgba(56, 189, 248, 0.5)",
          innerGlow: "rgba(148, 163, 184, 0.4)",
          w: "#E0F2FE",
          s: "#F8FAFC",
          shadow: "rgba(15, 23, 42, 0.5)"
        },
        emerald: {
          bgGrad1: "#064E3B",
          bgGrad2: "#047857",
          border: "rgba(16, 185, 129, 0.9)",
          glow: "rgba(16, 185, 129, 0.7)",
          innerGlow: "rgba(52, 211, 153, 0.4)",
          w: "#F0FDF4",
          s: "#DCFCE7",
          shadow: "rgba(4, 120, 87, 0.5)"
        },
        ice: {
          bgGrad1: "#F1F5F9",
          bgGrad2: "#E2E8F0",
          border: "rgba(148, 163, 184, 0.7)",
          glow: "rgba(226, 232, 240, 0.6)",
          innerGlow: "rgba(255, 255, 255, 0.7)",
          w: "#0F172A",
          s: "#1E40AF",
          shadow: "rgba(15, 23, 42, 0.3)"
        }
      };
      const cfg = configs[theme] || configs.violet;
      return `<svg width="42" height="42" viewBox="0 0 42 42" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 8px ${cfg.shadow});">
        <defs>
          <linearGradient id="bgGrad-${theme}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${cfg.bgGrad1}"/>
            <stop offset="100%" style="stop-color:${cfg.bgGrad2}"/>
          </linearGradient>
          <radialGradient id="highlight-${theme}">
            <stop offset="0%" style="stop-color:${cfg.innerGlow}"/>
            <stop offset="100%" style="stop-color:${cfg.innerGlow};stop-opacity:0"/>
          </radialGradient>
          <filter id="glow-${theme}">
            <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="neon-${theme}">
            <feGaussianBlur stdDeviation="0.8" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect x="1" y="1" width="40" height="40" rx="13" fill="url(#bgGrad-${theme})" stroke="${cfg.border}" stroke-width="1.2" opacity="0.96" filter="url(#glow-${theme})"/>
        <ellipse cx="14" cy="12" rx="11" ry="9" fill="url(#highlight-${theme})" opacity="0.5"/>
        <text x="50%" y="52%" font-family="Unbounded, sans-serif" font-size="13" font-weight="700" fill="${cfg.w}" letter-spacing="0.5" text-anchor="middle" dominant-baseline="central" filter="url(#neon-${theme})" style="font-kerning: auto;">W</text>
        <text x="50%" y="52%" font-family="Unbounded, sans-serif" font-size="13" font-weight="700" fill="${cfg.s}" letter-spacing="0.5" text-anchor="middle" dominant-baseline="central" filter="url(#neon-${theme})">S</text>
      </svg>`;
    }


    function applyTheme(themeId, save = true) {
      currentTheme = THEMES.some((t) => t.id === themeId) ? themeId : "violet";
      document.documentElement.setAttribute("data-theme", currentTheme);
      const mark = document.getElementById("brandMark");
      if (mark) mark.textContent = "WS";
      if (save) localStorage.setItem(CONFIG.THEME_KEY, currentTheme);
      renderThemePickers();
    }

    function renderThemePickers() {
      const html = THEMES.map((t) => `
        <button type="button" class="theme-option ${currentTheme === t.id ? "active" : ""}" data-theme-id="${t.id}">
          <span class="theme-swatch" style="background:${t.swatch}"></span>
          <div>
            <div class="theme-icon">${t.icon}</div>
            <div class="theme-name">${t.name}</div>
            <div class="theme-tag">${t.tag}</div>
          </div>
        </button>
      `).join("");

      ["onboardThemeGrid", "profileThemeGrid"].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = html;
        el.querySelectorAll(".theme-option").forEach((btn) => {
          btn.addEventListener("click", () => {
            haptic("light");
            applyTheme(btn.dataset.themeId, true);
          });
        });
      });
    }

    const themeSheet = document.getElementById("themeSheet");
    document.getElementById("confirmThemeBtn").addEventListener("click", () => {
      haptic("medium");
      localStorage.setItem(CONFIG.THEME_KEY, currentTheme);
      themeSheet.classList.remove("open");
    });

    function switchScreen(viewName, title, sub, markImg = null) {
      currentView = viewName;
      document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
      document.getElementById(`screen-${viewName}`)?.classList.add("active");

      const mark = document.getElementById("brandMark");
      if (mark) mark.textContent = "WS";
      document.getElementById("headerTitle").textContent = title;
      document.getElementById("headerSub").textContent = sub;

      const isSub = !["hub", "orders", "profile", "faq"].includes(viewName);
      document.getElementById("backBtn")?.classList.toggle("visible", isSub);
      try { isSub ? tg?.BackButton?.show() : tg?.BackButton?.hide(); } catch (e) {}

      const activeTab = isSub ? "hub" : viewName;
      document.querySelectorAll(".dock-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === activeTab));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function goBack() {
      haptic("light");
      if (currentView === "gift-detail") openGiftsFeed();
      else if ((currentView === "stars" || currentView === "product") && activeCategory?.action === "openGiftsFeed") openGiftsFeed();
      else if ((currentView === "stars" || currentView === "product") && activeCategory && activeCategory.action !== "openGiftsFeed") openCategory(activeCategory);
      else switchScreen("hub", "Wujje Store", "Выдача 24/7 · В наличии");
    }

    document.getElementById("backBtn").addEventListener("click", goBack);
    try { tg?.BackButton?.onClick?.(goBack); } catch (e) {}

    document.querySelectorAll(".dock-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        haptic("light");
        const tab = btn.dataset.tab;
        if (tab === "hub") { if (typeof switchScreen === 'function') switchScreen("hub", "Wujje Store", "Выдача 24/7 · В наличии"); }
        if (tab === "orders") { if (typeof renderOrders === 'function') renderOrders(); if (typeof switchScreen === 'function') switchScreen("orders", "Мои заказы", "История покупок"); }
        if (tab === "profile") { if (typeof renderProfile === 'function') renderProfile(); if (typeof syncReferralInfo === 'function') syncReferralInfo(); if (typeof switchScreen === 'function') switchScreen("profile", "Профиль", "Ранги, темы и рефералка"); }
        if (tab === "faq") { if (typeof switchScreen === 'function') switchScreen("faq", "Вопросы и ответы", "Поддержка и оферта"); }
      });
    });

    function renderWeb3Info() {
      const statusEl = document.getElementById("web3Status");
      const balanceEl = document.getElementById("web3Balance");
      const rateEl = document.getElementById("web3Rate");
      const txListEl = document.getElementById("web3TxList");

      // Update status and balance
      if (tonConnectUI.wallet) {
        statusEl.textContent = "✅ Подключен";
        statusEl.style.color = "var(--accent)";
        balanceEl.textContent = tonBalance !== null ? `${tonBalance.toFixed(4)} TON` : "Загрузка...";
        rateEl.textContent = `${currentTonRate} ₽ за TON`;
      } else {
        statusEl.textContent = "❌ Не подключен";
        statusEl.style.color = "var(--muted)";
        balanceEl.textContent = "-";
        rateEl.textContent = `${currentTonRate} ₽ за TON`;
      }

      // Render transaction history
      const txList = JSON.parse(localStorage.getItem("web3_tx_list") || "[]");
      if (txList.length === 0) {
        txListEl.innerHTML = `<div style="font-size: 12.5px; color: var(--muted); text-align: center; padding: 20px; opacity: 0.6;">Нет транзакций</div>`;
      } else {
        txListEl.innerHTML = txList.slice(0, 10).map((tx) => `
          <div style="padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 12.5px;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 4px;">
              <strong>${tx.amount} TON</strong>
              <span style="font-size: 11px; color: ${tx.status === 'pending' ? 'var(--price)' : 'var(--accent)'};">${tx.status === 'pending' ? '⏳ На проверке' : '✅ Завершено'}</span>
            </div>
            <div style="color: var(--muted); font-size: 11px;">
              ${tx.to} · ${tx.item}
            </div>
            <div style="color: var(--muted); font-size: 11px; margin-top: 2px;">${tx.date}</div>
          </div>
        `).join("");
      }
    }

    const hubCustomStars = document.getElementById("hubCustomStars");
    function updateHubQuote() {
      const q = calcQuote(hubCustomStars.value);
      document.getElementById("hubQuoteRub").textContent = `${fmt(q.rub)} ₽`;
      document.getElementById("hubQuoteTon").textContent = `${q.ton} TON`;
    }
    hubCustomStars.addEventListener("input", updateHubQuote);
    document.querySelectorAll(".hub-add").forEach((b) => {
      b.addEventListener("click", () => {
        haptic("light");
        hubCustomStars.value = String(Math.min(100000, (Number(hubCustomStars.value) || 0) + Number(b.dataset.add)));
        updateHubQuote();
      });
    });

    document.getElementById("hubGoStarsBtn").addEventListener("click", () => {
      haptic("medium");
      activeCategory = CATEGORIES[0];
      switchScreen("stars", "Telegram Stars", "Telegram · Быстрое оформление", "./icons/telegram.png");
      applyCustomStars(hubCustomStars.value);
    });

    document.getElementById("heroQuickStarsBtn").addEventListener("click", () => {
      haptic("light");
      activeCategory = CATEGORIES[0];
      switchScreen("stars", "Telegram Stars", "Telegram · Выбор пакета", "./icons/telegram.png");
    });

    document.querySelectorAll(".filter-chip").forEach((c) => {
      c.addEventListener("click", () => {
        haptic("light");
        document.querySelectorAll(".filter-chip").forEach((x) => x.classList.remove("active"));
        c.classList.add("active");
        activeFilter = c.dataset.filter;
        renderCategories();
      });
    });

    function renderCategories() {
      const grid = document.getElementById("categoriesGrid");
      if (!grid) return;
      const catList = window.CATEGORIES || [];
      const list = activeFilter === "all" ? catList : catList.filter((c) => c.group === activeFilter);
      grid.innerHTML = "";
      list.forEach((cat) => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "cat-card";
        card.innerHTML = `
          <div>
            <div class="cat-top">
              <div class="cat-icon"><img src="${cat.img}" alt="${cat.title}" onerror="this.parentElement.textContent='${cat.emoji}'"></div>
              <span class="tag-pill">${cat.badge}</span>
            </div>
            <div class="cat-name">${cat.title}</div>
            <div class="cat-desc">${cat.desc}</div>
          </div>
          <div class="cat-bottom">
            <span class="cat-from">${cat.fromText}</span>
          </div>
        `;
        card.addEventListener("click", () => {
          haptic("light");
          if (cat.action === "openGiftsFeed") { activeCategory = cat; openGiftsFeed(); }
          else openCategory(cat);
        });
        grid.appendChild(card);
      });
    }

    const giftsSearchInput = document.getElementById("nftSearchInput");  // Переиспользуем существующий элемент

    function renderGiftsFeed(filterText = "") {
      const q = filterText.trim().toLowerCase();
      const filtered = window.GIFTS_FEED.filter((gift) => !q || gift.searchText.includes(q));
      const grid = document.getElementById("nftCollectionsGrid");  // Переиспользуем сетку

      const getFallbackImage = () => {
        const symbol = "🎁";
        return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Crect fill='%23333' width='160' height='160' rx='8'/%3E%3Ctext x='50%25' y='50%25' font-size='40' fill='%23999' text-anchor='middle' dominant-baseline='middle'%3E${encodeURIComponent(symbol)}%3C/text%3E%3C/svg%3E`;
      };

      grid.innerHTML = filtered.map((gift, idx) => {
        const fallback = getFallbackImage();
        const displayPrice = `${fmt(gift.priceRub)} ₽`;
        const displayTon = gift.priceTon ? `${gift.priceTon} TON` : "—";

        return `
          <div class="gift-card" data-gift-idx="${idx}">
            <div class="gift-img-wrap" data-gift-idx="${idx}">
              <img src="${gift.img}" alt="${gift.title}" onerror="this.src='${fallback}';" loading="lazy"/>
              <button type="button" class="bolt-btn gift-quick-bolt" data-gift-idx="${idx}" title="Быстрая покупка">⚡</button>
            </div>
            <div class="gift-body" data-gift-idx="${idx}">
              <div class="gift-title">${gift.title}</div>
              ${gift.model ? `<div class="gift-meta">📦 ${gift.model}</div>` : ''}
              ${gift.backdrop ? `<div class="gift-meta">🎨 ${gift.backdrop}</div>` : ''}
              <div class="gift-floor-row">
                <div>
                  <div class="gift-price">${displayPrice}</div>
                  <div class="gift-ton">${displayTon}</div>
                </div>
              </div>
              ${window.ADMIN_FLAG && gift.marketUrl ? `<div style="margin-top:6px;"><a href="${gift.marketUrl}" target="_blank" rel="noopener" style="display:inline-block;font-size:11px;color:#a855f7;padding:4px 8px;background:rgba(168,85,247,0.1);border:1px solid #a855f7;border-radius:3px;text-decoration:none;">🔗 Маркет</a></div>` : ''}
            </div>
          </div>
        `;
      }).join("");

      // Update placeholder
      if (giftsSearchInput) {
        giftsSearchInput.placeholder = `Поиск по подаркам и моделям (${window.GIFTS_FEED.length})...`;
      }

      grid.querySelectorAll(".gift-img-wrap, .gift-body").forEach((el) => {
        el.addEventListener("click", (e) => {
          if (e.target.closest(".bolt-btn") || e.target.closest("a")) return;
          haptic("light");
          openGiftDetail(filtered[Number(el.dataset.giftIdx)]);
        });
      });

      grid.querySelectorAll(".gift-quick-bolt").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          haptic("medium");
          const gift = filtered[Number(btn.dataset.giftIdx)];
          openCheckout({
            mode: "product",
            label: `${gift.title}${gift.model ? ` · ${gift.model}` : ''}`,
            rub: gift.priceRub,
            ton: gift.priceTon,
            target: tg?.initDataUnsafe?.user?.username ? `@${tg.initDataUnsafe.user.username}` : "@username"
          });
        });
      });
    }

    if (giftsSearchInput) {
      giftsSearchInput.addEventListener("input", () => renderGiftsFeed(giftsSearchInput.value));
    }

    function openGiftsFeed() {
      if (giftsSearchInput) giftsSearchInput.value = "";
      renderGiftsFeed("");
      switchScreen("gifts-feed", "NFT подарки", "Поиск и покупка ⚡", "./icons/nft.png");
    }

    // Gift detail modal
    function openGiftDetail(gift) {
      if (!gift) return;

      const modal = document.createElement("div");
      modal.className = "modal-backdrop gift-detail-modal";

      let imageHtml = `<img src="${gift.img}" alt="${gift.title}"/>`;
      if (gift.animationUrl) {
        imageHtml = `<div class="detail-animation-container" data-animation-url="${gift.animationUrl}">${imageHtml}</div>`;
      }

      let detailContent = `
        <div class="modal-content gift-detail-content">
          <button class="modal-close" type="button">✕</button>
          <div class="detail-preview">
            ${imageHtml}
          </div>
          <div class="detail-info">
            <h3 style="font-size:16px; font-weight:900; margin:0 0 8px; line-height:1.2;">${gift.title}</h3>
            ${gift.model ? `<p style="font-size:12px; color:var(--muted); margin:0 0 4px;"><b>Модель:</b> ${gift.model}</p>` : ''}
            ${gift.backdrop ? `<p style="font-size:12px; color:var(--muted); margin:0 0 4px;"><b>Фон:</b> ${gift.backdrop}</p>` : ''}
            ${gift.number ? `<p style="font-size:12px; color:var(--muted); margin:0 0 8px;"><b>№</b> ${gift.number}</p>` : ''}
            <div style="display:flex; align-items:center; gap:12px; padding:10px; background:var(--field); border-radius:12px; margin:12px 0;">
              <div>
                <div style="font-size:14px; font-weight:900; color:var(--price);">${fmt(gift.priceRub)} ₽</div>
                <div style="font-size:11px; color:var(--muted);">${gift.priceTon} TON</div>
              </div>
            </div>
            <button class="hero-btn" data-gift-buy style="width:100%; margin-bottom:8px;">⚡ Купить подарок</button>
            <a href="https://t.me/nft/${gift.slug}" target="_blank" rel="noopener" style="display:block; padding:10px; text-align:center; border:1px solid #34d399; border-radius:12px; color:#34d399; text-decoration:none; font-weight:600; font-size:12px;">📱 Смотреть на t.me/nft</a>
            ${window.ADMIN_FLAG && gift.marketUrl ? `<a href="${gift.marketUrl}" target="_blank" rel="noopener" style="display:block; padding:10px; margin-top:8px; text-align:center; border:1px solid #a855f7; border-radius:12px; color:#a855f7; text-decoration:none; font-weight:600; font-size:12px;">🔗 Маркет</a>` : ''}
          </div>
        </div>
      `;

      modal.innerHTML = detailContent;
      document.body.appendChild(modal);

      // Close button
      const closeBtn = modal.querySelector(".modal-close");
      closeBtn?.addEventListener("click", () => modal.remove());
      modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.remove();
      });

      // Buy button
      const buyBtn = modal.querySelector("[data-gift-buy]");
      buyBtn?.addEventListener("click", () => {
        modal.remove();
        openCheckout({
          mode: "product",
          label: `${gift.title}${gift.model ? ` · ${gift.model}` : ''}`,
          rub: gift.priceRub,
          ton: gift.priceTon,
          target: tg?.initDataUnsafe?.user?.username ? `@${tg.initDataUnsafe.user.username}` : "@username"
        });
      });

      // Load animation if available
      const animContainer = modal.querySelector(".detail-animation-container");
      if (animContainer && gift.animationUrl) {
        playLottieAnimation(animContainer, gift.animationUrl);
      }
    }
      activeNftCollection = col;
      document.getElementById("nftColTitle").textContent = col.title;
      document.getElementById("nftColFloorInfo").textContent = `Базовый флор: ${fmt(col.floorRub)} ₽ (${col.floorTon} TON) · Редкие модели дороже`;

      const box = document.getElementById("nftModelsContainer");
      box.innerHTML = col.models.map((m, mIdx) => {
        // Build model card HTML with animation support
        let imageHtml = `<img src="${m.img}" alt="${col.title} — ${m.name}" onerror="this.style.opacity='0.5'; this.style.filter='blur(2px)';"/>`;

        // If animation URL exists, add a Lottie container (placeholder for future implementation)
        if (m.animationUrl) {
          imageHtml = `
            <div class="model-animation-container" data-animation-url="${m.animationUrl}">
              ${imageHtml}
            </div>
          `;
        }

        return `
        <div class="model-card">
          <div class="model-specs-bar">
            <span class="spec-chip">Модель: <b>${m.name}</b></span>
            <span class="spec-chip">Шанс: <b>${m.rarity}</b></span>
            <span class="spec-chip">Фон: <b>${m.bg}</b></span>
            <span class="spec-chip">Узор: <b>${m.pattern}</b></span>
          </div>
          <div class="model-photo-box">
            ${imageHtml}
            <button type="button" class="bolt-btn model-bolt" data-m-idx="${mIdx}" title="Быстрая покупка">⚡</button>
          </div>
          <div class="model-footer">
            <div>
              <div style="font-size:14.5px; font-weight:900;">Флор: ${fmt(m.floorRub)} ₽</div>
              <div style="font-size:11.5px; color:var(--muted);">${m.floorTon} TON · В наличии</div>
            </div>
            <button type="button" class="hero-btn model-buy-btn" data-m-idx="${mIdx}" style="padding:9px 13px; font-size:12px;">⚡ Купить модель</button>
          </div>
          ${col.slug && window.ADMIN_FLAG && col.marketUrl ? `
          <div class="model-admin-row" style="display:flex; gap:6px; padding:8px 0; border-top:1px solid rgba(255,255,255,0.1);">
            <a href="https://t.me/nft/${col.slug}" target="_blank" rel="noopener" class="admin-link" style="flex:1; padding:6px; border-radius:4px; background:rgba(52,211,153,0.1); border:1px solid #34d399; color:#34d399; text-align:center; font-size:11px; text-decoration:none;">📱 t.me/nft</a>
            ${col.marketUrl ? `<a href="${col.marketUrl}" target="_blank" rel="noopener" class="admin-link" style="flex:1; padding:6px; border-radius:4px; background:rgba(168,85,247,0.1); border:1px solid #a855f7; color:#a855f7; text-align:center; font-size:11px; text-decoration:none;">🔗 Маркет</a>` : ''}
          </div>
          ` : col.slug ? `
          <div class="model-nft-link" style="padding:8px 0; border-top:1px solid rgba(255,255,255,0.1);">
            <a href="https://t.me/nft/${col.slug}" target="_blank" rel="noopener" style="display:block; padding:6px; text-align:center; font-size:11px; color:#34d399; text-decoration:none;">📱 Смотреть на t.me/nft</a>
          </div>
          ` : ''}
        </div>
      `}).join("");

      const triggerModelBuy = (mIdx) => {
        haptic("medium");
        const m = col.models[mIdx];
        openCheckout({
          mode: "product",
          label: `${col.title} · ${m.name}`,
          rub: m.floorRub,
          ton: m.floorTon,
          target: tg?.initDataUnsafe?.user?.username ? `@${tg.initDataUnsafe.user.username}` : "@username"
        });
      };

      box.querySelectorAll(".model-bolt, .model-buy-btn").forEach((btn) => {
        btn.addEventListener("click", () => triggerModelBuy(Number(btn.dataset.mIdx)));
      });

      // Initialize Lottie animations for models with animation URLs
      box.querySelectorAll(".model-animation-container").forEach((container) => {
        const animUrl = container.getAttribute("data-animation-url");
        if (animUrl) {
          playLottieAnimation(container, animUrl);
        }
      });

      switchScreen("nft-models", col.title, "Характеристики и модели", "./icons/nft.png");
    }

    function openCategory(cat) {
      activeCategory = cat;
      const box = document.getElementById("categoryItems");
      box.innerHTML = "";
      cat.items.forEach((item) => {
        const isOut = Boolean(item.disabled);
        const tagClass = item.tagType === "out" ? "out" : item.tagType === "amber" ? "amber" : "";
        const el = document.createElement("div");
        el.className = `item-card ${isOut ? "disabled-item" : ""}`;
        el.innerHTML = `
          <div class="item-left" style="flex:1; min-width:0;">
            <div class="cat-icon" style="width:38px;height:38px;"><img src="${cat.img}" alt="" onerror="this.parentElement.textContent='${cat.emoji}'"></div>
            <div>
              <div class="item-title">${item.title} <span class="tag-pill ${tagClass}" style="margin-left:4px;">${item.tag || "В наличии"}</span></div>
              <div class="item-sub">${item.sub}</div>
            </div>
          </div>
          <div class="item-right">
            <div>
              <div class="item-price">${item.priceText}</div>
              <div class="item-subprice">${item.subPriceText || ""}</div>
            </div>
          </div>
        `;
        el.addEventListener("click", () => {
          haptic("light");
          if (item.action === "openStars") { switchScreen("stars", "Telegram Stars", `${cat.title} · Выбор пакета`, cat.img); return; }
          if (isOut) return;
          openProduct(item, cat);
        });
        box.appendChild(el);
      });
      switchScreen("category", cat.title, cat.desc, cat.img);
    }

    let selectedProductCategory = null;
    let currentProductFormData = {};

    function renderProductForm(categoryId, item) {
      const container = document.getElementById("productFormContainer");
      const quickBtnsContainer = document.getElementById("productQuickBtns");
      container.innerHTML = "";
      quickBtnsContainer.innerHTML = "";
      currentProductFormData = {};

      // Telegram: Stars & Premium - with Self/Clear buttons
      if (categoryId === "telegram") {
        const input = document.createElement("input");
        input.type = "text";
        input.className = "input";
        input.placeholder = item.inputPlaceholder;
        input.id = "productUsernameInput";
        input.autocomplete = "off";
        container.appendChild(input);

        const selfBtn = document.createElement("button");
        selfBtn.className = "mini-btn";
        selfBtn.type = "button";
        selfBtn.textContent = "Себе";
        selfBtn.addEventListener("click", () => {
          const u = tg?.initDataUnsafe?.user?.username;
          if (u) input.value = `@${u}`;
        });

        const clearBtn = document.createElement("button");
        clearBtn.className = "mini-btn";
        clearBtn.type = "button";
        clearBtn.textContent = "Очистить";
        clearBtn.addEventListener("click", () => { input.value = ""; });

        quickBtnsContainer.appendChild(selfBtn);
        quickBtnsContainer.appendChild(clearBtn);

        // Store data getter
        currentProductFormData.getData = () => input.value.trim();
      }
      // Roblox: Tabs for Instant/GamePass
      else if (categoryId === "roblox") {
        // Simple form for now - toggle between modes
        const toggleContainer = document.createElement("div");
        toggleContainer.style.display = "flex";
        toggleContainer.style.gap = "8px";
        toggleContainer.style.marginBottom = "12px";

        const instantBtn = document.createElement("button");
        instantBtn.className = "mini-btn active";
        instantBtn.type = "button";
        instantBtn.textContent = "⚡ Моментально";
        instantBtn.dataset.mode = "instant";

        const gamepassBtn = document.createElement("button");
        gamepassBtn.className = "mini-btn";
        gamepassBtn.type = "button";
        gamepassBtn.textContent = "⏳ Game Pass";
        gamepassBtn.dataset.mode = "gamepass";

        toggleContainer.appendChild(instantBtn);
        toggleContainer.appendChild(gamepassBtn);
        container.appendChild(toggleContainer);

        let currentMode = "instant";

        const modeContainer = document.createElement("div");
        modeContainer.id = "robloxModeContainer";
        container.appendChild(modeContainer);

        function renderRobloxMode(mode) {
          currentMode = mode;
          modeContainer.innerHTML = "";

          if (mode === "instant") {
            const nicknameLabel = document.createElement("label");
            nicknameLabel.className = "field-label";
            nicknameLabel.textContent = "Никнейм Roblox";
            nicknameLabel.style.display = "block";
            nicknameLabel.style.marginBottom = "4px";

            const nicknameInput = document.createElement("input");
            nicknameInput.type = "text";
            nicknameInput.className = "input";
            nicknameInput.placeholder = "YourUsername";
            nicknameInput.id = "robloxNicknameInput";
            nicknameInput.autocomplete = "off";

            modeContainer.appendChild(nicknameLabel);
            modeContainer.appendChild(nicknameInput);
          } else {
            const nicknameLabel = document.createElement("label");
            nicknameLabel.className = "field-label";
            nicknameLabel.textContent = "Никнейм Roblox (создатель пасса)";
            nicknameLabel.style.display = "block";
            nicknameLabel.style.marginBottom = "4px";

            const nicknameInput = document.createElement("input");
            nicknameInput.type = "text";
            nicknameInput.className = "input";
            nicknameInput.placeholder = "YourUsername";
            nicknameInput.id = "robloxCreatorNicknameInput";
            nicknameInput.autocomplete = "off";

            const linkLabel = document.createElement("label");
            linkLabel.className = "field-label";
            linkLabel.textContent = "Ссылка на Game Pass";
            linkLabel.style.display = "block";
            linkLabel.style.marginTop = "10px";
            linkLabel.style.marginBottom = "4px";

            const linkInput = document.createElement("input");
            linkInput.type = "text";
            linkInput.className = "input";
            linkInput.placeholder = "https://www.roblox.com/game-pass/...";
            linkInput.id = "robloxGamepassLinkInput";
            linkInput.autocomplete = "off";

            const hint = document.createElement("div");
            hint.style.fontSize = "11px";
            hint.style.color = "var(--muted)";
            hint.style.marginTop = "8px";
            hint.textContent = "⚠️ Комиссия Roblox 30%. Калькулятор: Math.ceil(robux / 0.7)";

            modeContainer.appendChild(nicknameLabel);
            modeContainer.appendChild(nicknameInput);
            modeContainer.appendChild(linkLabel);
            modeContainer.appendChild(linkInput);
            modeContainer.appendChild(hint);
          }
        }

        instantBtn.addEventListener("click", () => {
          instantBtn.classList.add("active");
          gamepassBtn.classList.remove("active");
          renderRobloxMode("instant");
        });

        gamepassBtn.addEventListener("click", () => {
          gamepassBtn.classList.add("active");
          instantBtn.classList.remove("active");
          renderRobloxMode("gamepass");
        });

        renderRobloxMode("instant");

        currentProductFormData.getData = () => {
          if (currentMode === "instant") {
            return document.getElementById("robloxNicknameInput")?.value.trim() || "";
          } else {
            const nickname = document.getElementById("robloxCreatorNicknameInput")?.value.trim() || "";
            const link = document.getElementById("robloxGamepassLinkInput")?.value.trim() || "";
            return { nickname, link, mode: "gamepass" };
          }
        };
      }
      // Spotify, Discord Nitro, Xbox, AI - with toggle
      else if (["spotify", "dc_basic", "dc_full", "xbox", "ai"].includes(categoryId)) {
        const toggleContainer = document.createElement("div");
        toggleContainer.style.display = "flex";
        toggleContainer.style.flexDirection = "column";
        toggleContainer.style.gap = "10px";

        let currentOption = "with_account";

        const option1 = document.createElement("div");
        option1.style.cursor = "pointer";
        option1.style.padding = "10px";
        option1.style.border = "1px solid var(--border)";
        option1.style.borderRadius = "8px";
        option1.style.background = "var(--bg)";
        option1.className = "form-option active";

        const opt1Label = document.createElement("div");
        opt1Label.style.fontWeight = "800";
        opt1Label.style.marginBottom = "8px";
        opt1Label.textContent = "Со входом в аккаунт";
        option1.appendChild(opt1Label);

        const emailField1 = document.createElement("input");
        emailField1.type = "email";
        emailField1.className = "input";
        emailField1.placeholder = "user@example.com";
        emailField1.style.marginBottom = "8px";
        emailField1.id = "productWithAccountEmail";

        const passField1 = document.createElement("input");
        passField1.type = "password";
        passField1.className = "input";
        passField1.placeholder = "••••••••";
        passField1.id = "productWithAccountPassword";

        option1.appendChild(emailField1);
        option1.appendChild(passField1);

        const option2 = document.createElement("div");
        option2.style.cursor = "pointer";
        option2.style.padding = "10px";
        option2.style.border = "1px solid var(--border)";
        option2.style.borderRadius = "8px";
        option2.style.background = "transparent";
        option2.className = "form-option";

        const opt2Label = document.createElement("div");
        opt2Label.style.fontWeight = "800";
        opt2Label.style.marginBottom = "8px";
        opt2Label.textContent = categoryId === "spotify" ? "Без входа (инвайт)" : "Без входа / Ключ";
        option2.appendChild(opt2Label);

        const emailField2 = document.createElement("input");
        emailField2.type = "email";
        emailField2.className = "input";
        emailField2.placeholder = "user@example.com";
        emailField2.id = "productWithoutAccountEmail";

        option2.appendChild(emailField2);

        toggleContainer.appendChild(option1);
        toggleContainer.appendChild(option2);
        container.appendChild(toggleContainer);

        option1.addEventListener("click", () => {
          currentOption = "with_account";
          option1.style.background = "var(--bg)";
          option1.classList.add("active");
          option2.style.background = "transparent";
          option2.classList.remove("active");
        });

        option2.addEventListener("click", () => {
          currentOption = "without_account";
          option2.style.background = "var(--bg)";
          option2.classList.add("active");
          option1.style.background = "transparent";
          option1.classList.remove("active");
        });

        currentProductFormData.getData = () => {
          if (currentOption === "with_account") {
            return {
              mode: "with_account",
              email: document.getElementById("productWithAccountEmail")?.value.trim() || "",
              password: document.getElementById("productWithAccountPassword")?.value.trim() || ""
            };
          } else {
            return {
              mode: "without_account",
              email: document.getElementById("productWithoutAccountEmail")?.value.trim() || ""
            };
          }
        };
      }
      // Discord Boosts - server invite link
      else if (categoryId === "dc_boost") {
        const label = document.createElement("label");
        label.className = "field-label";
        label.textContent = "Ссылка-приглашение на Discord сервер";
        label.style.display = "block";
        label.style.marginBottom = "4px";

        const input = document.createElement("input");
        input.type = "text";
        input.className = "input";
        input.placeholder = "https://discord.gg/...";
        input.id = "discordInviteInput";
        input.autocomplete = "off";

        const hint = document.createElement("div");
        hint.style.fontSize = "11px";
        hint.style.color = "var(--muted)";
        hint.style.marginTop = "8px";
        hint.textContent = "⚠️ Ссылка должна быть бессрочной";

        container.appendChild(label);
        container.appendChild(input);
        container.appendChild(hint);

        currentProductFormData.getData = () => input.value.trim();
      }
      // Minecraft - email for key
      else if (categoryId === "minecraft") {
        const label = document.createElement("label");
        label.className = "field-label";
        label.textContent = "Email для отправки ключа";
        label.style.display = "block";
        label.style.marginBottom = "4px";

        const input = document.createElement("input");
        input.type = "email";
        input.className = "input";
        input.placeholder = "player@example.com";
        input.id = "minecraftEmailInput";
        input.autocomplete = "off";

        const hint = document.createElement("div");
        hint.style.fontSize = "11px";
        hint.style.color = "var(--muted)";
        hint.style.marginTop = "8px";
        hint.textContent = "✅ Ключ будет отправлен на почту сразу после оплаты";

        container.appendChild(label);
        container.appendChild(input);
        container.appendChild(hint);

        currentProductFormData.getData = () => input.value.trim();
      }
      // Steam - login & region selector
      else if (categoryId === "steam") {
        const loginLabel = document.createElement("label");
        loginLabel.className = "field-label";
        loginLabel.textContent = "Логин аккаунта Steam";
        loginLabel.style.display = "block";
        loginLabel.style.marginBottom = "4px";

        const loginInput = document.createElement("input");
        loginInput.type = "text";
        loginInput.className = "input";
        loginInput.placeholder = "your_steam_login";
        loginInput.id = "steamLoginInput";
        loginInput.autocomplete = "off";

        const loginHint = document.createElement("div");
        loginHint.style.fontSize = "11px";
        loginHint.style.color = "var(--muted)";
        loginHint.style.marginTop = "6px";
        loginHint.style.marginBottom = "14px";
        loginHint.textContent = "💡 Это логин для входа в Steam, не никнейм профиля";

        const regionLabel = document.createElement("label");
        regionLabel.className = "field-label";
        regionLabel.textContent = "Регион / валюта аккаунта";
        regionLabel.style.display = "block";
        regionLabel.style.marginBottom = "8px";

        const regionSelect = document.createElement("select");
        regionSelect.className = "input";
        regionSelect.id = "steamRegionSelect";
        regionSelect.style.cursor = "pointer";

        const regions = [
          { code: "RUB", name: "🇷🇺 Россия (RUB)" },
          { code: "KZT", name: "🇰🇿 Казахстан (KZT)" },
          { code: "UAH", name: "🇺🇦 Украина (UAH)" },
          { code: "USD", name: "🌐 СНГ / Другое (USD)" }
        ];

        regions.forEach((r) => {
          const opt = document.createElement("option");
          opt.value = r.code;
          opt.textContent = r.name;
          regionSelect.appendChild(opt);
        });

        container.appendChild(loginLabel);
        container.appendChild(loginInput);
        container.appendChild(loginHint);
        container.appendChild(regionLabel);
        container.appendChild(regionSelect);

        currentProductFormData.getData = () => ({
          steam_login: loginInput.value.trim(),
          currency: regionSelect.value
        });
      }
      // Default fallback for other categories
      else {
        const input = document.createElement("input");
        input.type = "text";
        input.className = "input";
        input.placeholder = item.inputPlaceholder || "Введи данные";
        input.id = "productDefaultInput";
        input.autocomplete = "off";
        container.appendChild(input);

        currentProductFormData.getData = () => input.value.trim();
      }
    }

    const productTargetInput = document.getElementById("productFormContainer");

    function openProduct(item, cat) {
      selectedProduct = item;
      selectedProductCategory = cat.id;
      document.getElementById("productTitle").textContent = item.title;
      document.getElementById("productDesc").textContent = item.sub;
      document.getElementById("productRub").textContent = `${fmt(item.rub)} ₽`;
      document.getElementById("productTon").textContent = `${item.ton} TON`;
      document.getElementById("productStockTag").textContent = item.tag || "В наличии";
      document.getElementById("productInputLabel").textContent = item.inputLabel;
      document.getElementById("productStatusNote").textContent = "";
      renderProductForm(cat.id, item);
      switchScreen("product", item.title, `${cat.title} · Оформление`, cat.img);
    }

    document.getElementById("proceedProductPayBtn").addEventListener("click", () => {
      haptic("medium");
      let formData = currentProductFormData.getData?.();
      if (!formData || (typeof formData === "string" && formData.length < 2)) {
        document.getElementById("productStatusNote").textContent = "Укажи данные для выдачи.";
        return;
      }

      // Steam: special handling with price recalc
      if (selectedProductCategory === "steam") {
        const steamData = formData;
        if (!steamData.steam_login || steamData.steam_login.length < 2) {
          document.getElementById("productStatusNote").textContent = "Укажи корректный логин Steam.";
          return;
        }

        const baseAmount = selectedProduct.rub;
        const needRub = Math.ceil(baseAmount * 1.09);
        const needTon = rubToTonSafe(needRub);

        const finalTarget = JSON.stringify({
          steam_login: steamData.steam_login,
          currency: steamData.currency,
          amount_rub: baseAmount,
          need_rub: needRub
        });

        openCheckout({
          mode: "product",
          label: `${selectedProduct.title} (${steamData.currency})`,
          rub: needRub,
          ton: needTon,
          target: finalTarget
        });
      } else {
        let target = typeof formData === "string" ? formData : JSON.stringify(formData);
        openCheckout({ mode: "product", label: selectedProduct.title, rub: selectedProduct.rub, ton: selectedProduct.ton, target });
      }
    });

    const targetInput = document.getElementById("targetUsername");
    const customStarsInput = document.getElementById("customStarsInput");

    // Auto-populate @username for targetInput if available from Telegram
    if (targetInput) {
      targetInput.addEventListener("focus", () => {
        if (!targetInput.value.trim()) {
          const tgUsername = tg?.initDataUnsafe?.user?.username;
          if (tgUsername) {
            targetInput.value = `@${tgUsername}`;
          }
        }
      });
    }

    function applyCustomStars(val) {
      const n = Math.max(1, Math.min(100000, Math.round(Number(val) || 50)));
      const idx = window.PACKAGES.findIndex((p) => p.stars === n);
      document.querySelectorAll(".package-card").forEach((c, i) => c.classList.toggle("active", i === idx));
      selectedPackage = idx !== -1 ? window.PACKAGES[idx] : calcQuote(n);
      customStarsInput.value = String(n);
      document.getElementById("customQuoteRub").textContent = `${fmt(selectedPackage.rub)} ₽`;
      document.getElementById("customQuoteTon").textContent = `${selectedPackage.ton} TON`;
    }

    customStarsInput.addEventListener("input", () => {
      if (!customStarsInput.value.trim()) {
        document.getElementById("customQuoteRub").textContent = "— ₽";
        document.getElementById("customQuoteTon").textContent = "— TON";
        return;
      }
      applyCustomStars(customStarsInput.value);
    });

    document.querySelectorAll(".stars-add").forEach((b) => {
      b.addEventListener("click", () => {
        haptic("light");
        applyCustomStars((Number(customStarsInput.value) || 0) + Number(b.dataset.add));
      });
    });

    function renderPackages() {
      const grid = document.getElementById("packagesGrid");
      if (!grid) return;
      grid.innerHTML = "";
      PACKAGES.forEach((pkg, idx) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "package-card" + (idx === 0 ? " active" : "");
        const badge = pkg.stars === 500 ? `<span class="package-badge">Хит</span>` : pkg.stars >= 2500 ? `<span class="package-badge">Выгодно</span>` : "";
        b.innerHTML = `
          <div class="package-top"><span class="package-title">⭐ ${fmt(pkg.stars)}</span>${badge}</div>
          <div class="package-price">${fmt(pkg.rub)} ₽ · ${pkg.ton} TON</div>
          <div class="package-rate">~${(pkg.rub / pkg.stars).toFixed(2)} ₽ / ⭐</div>
        `;
        b.addEventListener("click", () => {
          haptic("light");
          document.querySelectorAll(".package-card").forEach((x) => x.classList.remove("active"));
          b.classList.add("active");
          customStarsInput.value = "";
          document.getElementById("customQuoteRub").textContent = "— ₽";
          document.getElementById("customQuoteTon").textContent = "— TON";
          selectedPackage = pkg;
        });
        grid.appendChild(b);
      });
    }

    const userPreview = document.getElementById("userPreview");
    async function resolveUsername(raw) {
      const clean = (raw || "").trim();
      const norm = clean.startsWith("@") ? clean : (clean ? "@" + clean : "");
      if (!VALIDATORS.isValidUsername(norm)) {
        resolvedRecipient = null;
        userPreview.className = "user-preview";
        return null;
      }

      const seq = ++resolveSeq;
      userPreview.className = "user-preview visible";
      document.getElementById("userAvatar").textContent = "…";
      document.getElementById("userFullName").textContent = "Ищем профиль...";
      document.getElementById("userHandle").textContent = norm;
      document.getElementById("userStatusTag").textContent = "";

      const data = await API.resolveUsername(norm);
      if (seq !== resolveSeq) return null;

      if (data?.ok) {
        resolvedRecipient = data;
        userPreview.className = "user-preview visible found";
        document.getElementById("userFullName").textContent = data.full_name;
        document.getElementById("userHandle").textContent = data.username;
        document.getElementById("userStatusTag").innerHTML = `<span style="color:var(--green)">Найден</span>`;
        document.getElementById("userAvatar").innerHTML = data.avatar_url
          ? `<img src="${CONFIG.API_BASE}${data.avatar_url}?t=${Date.now()}" style="width:100%;height:100%;object-fit:cover;">`
          : (data.full_name?.[0] || "U").toUpperCase();
        return data;
      }

      resolvedRecipient = null;
      userPreview.className = "user-preview visible not-found";
      document.getElementById("userAvatar").textContent = "!";
      document.getElementById("userFullName").textContent = "Не найден";
      document.getElementById("userHandle").textContent = norm;
      document.getElementById("userStatusTag").innerHTML = `<span style="color:var(--red)">Ошибка</span>`;
      return null;
    }

    targetInput.addEventListener("input", () => {
      clearTimeout(resolveTimer);
      resolveTimer = setTimeout(() => resolveUsername(targetInput.value), 420);
    });

    document.getElementById("fillSelfBtn").addEventListener("click", () => {
      const u = tg?.initDataUnsafe?.user?.username;
      if (u) { targetInput.value = `@${u}`; resolveUsername(`@${u}`); }
    });
    document.getElementById("clearUsernameBtn").addEventListener("click", () => {
      targetInput.value = "";
      resolvedRecipient = null;
      userPreview.className = "user-preview";
    });

    function renderRecentUsers() {
      const list = STORAGE.getRecentUsers();
      const box = document.getElementById("recentUsernamesBox");
      box.innerHTML = list.map((u) => `<button type="button" class="recent-chip" data-u="${u}">${u}</button>`).join("");
      box.querySelectorAll(".recent-chip").forEach((c) => c.addEventListener("click", () => {
        targetInput.value = c.dataset.u;
        resolveUsername(c.dataset.u);
      }));
    }

    function saveRecentUser(u) {
      STORAGE.saveRecentUser(u);
      renderRecentUsers();
    }

    const loadOrders = () => STORAGE.getOrders();
    function saveOrder(o) {
      STORAGE.saveOrder(o);
      updateOrdersBadge();
    }
    function updateOrdersBadge() {
      const cnt = loadOrders().length;
      const b = document.getElementById("dockOrdersBadge");
      b.textContent = String(cnt);
      b.classList.toggle("show", cnt > 0);
    }

    function setRubBalance(val, animate = false) {
      const old = typeof rubBalance !== 'undefined' ? rubBalance : 0;
      rubBalance = val;
      localStorage.setItem(CONFIG.BALANCE_KEY, String(rubBalance));
      document.getElementById("rubBalanceText").textContent = `${fmt(rubBalance)} ₽`;

      const hint = document.getElementById("balanceCapacityHint");
      if (hint) {
        const maxPkg = [...PACKAGES].reverse().find((p) => p.rub <= rubBalance);
        hint.textContent = rubBalance <= 0
          ? "Баланс 0 ₽ — пополни через + или оплати через TON."
          : maxPkg ? `Хватает до пакета ⭐ ${fmt(maxPkg.stars)} Stars.` : `На балансе ${fmt(rubBalance)} ₽.`;
      }

      if (animate && old !== val) {
        const pill = document.getElementById("rubPill");
        const delta = val - old;
        const f = document.createElement("span");
        f.className = `balance-float ${delta > 0 ? "plus" : "minus"}`;
        f.textContent = `${delta > 0 ? "+" : ""}${fmt(delta)} ₽`;
        pill.appendChild(f);
        if (delta > 0) { pill.classList.add("pulse-green"); setTimeout(() => pill.classList.remove("pulse-green"), 900); }
        setTimeout(() => f.remove(), 1250);
      }
      if (typeof currentView !== 'undefined' && currentView === "profile") renderProfile();
    }

    async function syncBalance() {
      if (!tg?.initData) return;
      const data = await API.syncBalance(tg.initData);
      if (data?.ok && typeof data.balance === "number") {
        setRubBalance(data.balance, typeof balanceInitialized !== 'undefined' ? balanceInitialized : false);
        balanceInitialized = true;
      }
    }

    function renderOrders() {
      const box = document.getElementById("ordersList");
      const list = loadOrders();
      if (!list.length) { box.innerHTML = `<div style="text-align:center; padding:24px; color:var(--muted); font-size:13px;">Заказов пока нет</div>`; return; }
      box.innerHTML = list.map((o) => {
        // Format Steam recipient beautifully
        let displayTarget = o.target || "—";
        let copyText = o.target || "—";

        try {
          const parsed = JSON.parse(o.target);
          if (parsed.steam_login) {
            const amount = parsed.amount_rub || 0;
            displayTarget = `Steam: <b>${parsed.steam_login}</b> · ${fmt(amount)} ₽ (RUB)`;
            copyText = parsed.steam_login;
          }
        } catch (e) {
          // Not JSON, use as-is
        }

        return `
          <div class="order-row">
            <div class="order-top"><span>#${o.id} · ${o.itemLabel}</span><span>${o.priceLabel}</span></div>
            <div class="order-sub">Получатель: ${displayTarget} · ${o.method} · ${o.statusText}<br>${o.dateText}</div>
            <button class="order-copy-btn" data-text="${copyText.replace(/"/g, "&quot;")}" style="font-size:11px; margin-top:6px; padding:4px 8px; background:var(--border); border:none; border-radius:4px; cursor:pointer; color:var(--text); font-weight:600;">📋 Скопировать</button>
          </div>
        `;
      }).join("");

      document.querySelectorAll(".order-copy-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          try {
            await navigator.clipboard?.writeText(btn.dataset.text);
            const oldText = btn.textContent;
            btn.textContent = "✅ Скопировано!";
            setTimeout(() => { btn.textContent = oldText; }, 2000);
            haptic("light");
          } catch (e) {}
        });
      });
    }
    document.getElementById("clearOrdersBtn").addEventListener("click", () => {
      STORAGE.clearOrders();
      updateOrdersBadge();
      renderOrders();
    });

    document.getElementById("productSearchInput")?.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (!query) {
        renderCategories();
        return;
      }

      const matches = [];
      CATEGORIES.forEach((cat) => {
        if (!cat.items) return;
        cat.items.forEach((item) => {
          const title = (item.title || "").toLowerCase();
          const sub = (item.sub || "").toLowerCase();
          const catTitle = (cat.title || "").toLowerCase();
          if (title.includes(query) || sub.includes(query) || catTitle.includes(query)) {
            matches.push({ ...item, category: cat });
          }
        });
      });

      const grid = document.getElementById("categoriesGrid");
      if (!grid) return;

      if (matches.length === 0) {
        grid.innerHTML = `<div style="text-align:center; padding:24px; color:var(--muted); font-size:13px;">Ничего не найдено</div>`;
        return;
      }

      grid.innerHTML = matches.map((item) => {
        const cat = item.category;
        const isOut = Boolean(item.disabled);
        const tagClass = item.tagType === "out" ? "out" : item.tagType === "amber" ? "amber" : "";
        return `
          <div class="item-card ${isOut ? "disabled-item" : ""}" style="cursor:${isOut ? "default" : "pointer"};">
            <div class="item-left" style="flex:1; min-width:0;">
              <div class="cat-icon" style="width:38px;height:38px;"><img src="${cat.img}" alt="" onerror="this.parentElement.textContent='${cat.emoji}'"></div>
              <div>
                <div class="item-title">${item.title} <span class="tag-pill ${tagClass}" style="margin-left:4px;">${item.tag || "В наличии"}</span></div>
                <div class="item-sub">${item.sub}</div>
              </div>
            </div>
            <div class="item-right">
              <div>
                <div class="item-price">${item.priceText}</div>
                <div class="item-subprice">${item.subPriceText || ""}</div>
              </div>
            </div>
          </div>
        `;
      }).join("");

      document.querySelectorAll("#categoriesGrid .item-card").forEach((el, idx) => {
        el.addEventListener("click", () => {
          haptic("light");
          const item = matches[idx];
          if (item.disabled) return;
          if (item.action === "openStars") {
            switchScreen("stars", "Telegram Stars", `${item.category.title} · Выбор пакета`, item.category.img);
            return;
          }
          openProduct(item, item.category);
        });
      });
    });

    async function syncReferralInfo() {
      const uid = tg?.initDataUnsafe?.user?.id;
      document.getElementById("refLinkText").textContent = uid ? `https://t.me/wujje_store_bot?start=ref_${uid}` : "https://t.me/wujje_store_bot";
      if (!tg?.initData) return;
      const d = await API.getReferralInfo(tg.initData);
      if (d?.ok) {
        referralStats = d;
        document.getElementById("refCountsVal").textContent = `${d.total_refs || 0} / ${d.verified_refs || 0}`;
        document.getElementById("refAvailableVal").textContent = `${fmt(d.available_rub || 0)} ₽`;
      }
    }

    function renderProfile() {
      const u = tg?.initDataUnsafe?.user;
      const name = [u?.first_name, u?.last_name].filter(Boolean).join(" ") || "Покупатель";
      document.getElementById("profileName").textContent = name;
      document.getElementById("profileHandle").textContent = `${u?.username ? "@" + u.username : "без @username"} · ${u?.id ? "ID " + u.id : "гость"}`;
      document.getElementById("profileAvatar").innerHTML = u?.photo_url ? `<img src="${u.photo_url}" alt="">` : name[0].toUpperCase();

      const orders = loadOrders();
      let spentRub = 0, totalStars = 0;
      orders.forEach((o) => { spentRub += Number(o.rubAmount || 0); totalStars += Number(o.stars || 0); });

      document.getElementById("profileBalanceVal").textContent = `${fmt(rubBalance)} ₽`;
      document.getElementById("profileTonBalanceVal").textContent = tonBalance !== null ? `${tonBalance.toFixed(4)} TON` : (tonConnectUI.wallet ? "Загрузка..." : "Не подключен");
      document.getElementById("profileSpentVal").textContent = `${fmt(spentRub)} ₽`;
      document.getElementById("profileStarsVal").textContent = `${fmt(totalStars)} ⭐`;
      document.getElementById("profileOrdersVal").textContent = String(orders.length);

      const RANKS = [
        { name: "Новичок", icon: "🏅", minRub: 0 },
        { name: "Участник", icon: "⚡", minRub: 500 },
        { name: "Постоянник", icon: "🔥", minRub: 2500 },
        { name: "VIP", icon: "👑", minRub: 10000 }
      ];
      let rIdx = 0;
      RANKS.forEach((r, i) => { if (spentRub >= r.minRub) rIdx = i; });
      const cur = RANKS[rIdx], next = RANKS[rIdx + 1];
      document.getElementById("profileRankBadge").textContent = `${cur.icon} ${cur.name}`;
      document.getElementById("profileRankSpentLabel").textContent = `${fmt(spentRub)} ₽ потрачено`;
      document.getElementById("profileNextRankText").textContent = next ? `До «${next.name}»: ${fmt(Math.max(0, next.minRub - spentRub))} ₽` : "Макс. ранг";
      document.getElementById("profileRankBarFill").style.width = `${next ? Math.min(100, Math.round(((spentRub - cur.minRub) / (next.minRub - cur.minRub)) * 100)) : 100}%`;

      const achs = [
        { title: "🚀 Первый шаг", desc: "Оформить 1 заказ", ok: orders.length >= 1 },
        { title: "⭐ Стрелок", desc: "От 500 Stars", ok: totalStars >= 500 },
        { title: "💎 Web3", desc: "Подключить TON", ok: Boolean(tonConnectUI.wallet) },
        { title: "🎟 Промо", desc: "Ввести промокод", ok: Boolean(appliedPromo?.code) },
        { title: "🤝 Команда", desc: "Пригласить друга", ok: (referralStats.total_refs || 0) >= 1 }
      ];
      document.getElementById("achCounterText").textContent = `${achs.filter((a) => a.ok).length} / ${achs.length}`;
      document.getElementById("achievementsGrid").innerHTML = achs.map((a) => `
        <div class="ach-card ${a.ok ? "unlocked" : ""}">
          <div class="ach-title">${a.title} ${a.ok ? "✓" : ""}</div>
          <div class="ach-desc">${a.desc}</div>
        </div>
      `).join("");
      renderThemePickers();
    }

    document.getElementById("profileTopupBtn").addEventListener("click", () => openTopup());
    document.getElementById("copyRefLinkBtn").addEventListener("click", async () => {
      try { await navigator.clipboard?.writeText(document.getElementById("refLinkText").textContent); } catch (e) {}
      haptic("light");
    });
    document.getElementById("claimRefBtn").addEventListener("click", async () => {
      const btn = document.getElementById("claimRefBtn");
      const note = document.getElementById("refStatusNote");
      const wasDisabled = btn.disabled;
      btn.disabled = true;
      btn.textContent = "Зачисляем...";

      const d = await API.claimReferral(tg?.initData || "");

      if (d?.ok && typeof d.balance === "number") {
        setRubBalance(d.balance, true);
        await syncReferralInfo();
        note.textContent = "✅ Доход зачислен!";
      } else {
        note.textContent = d?.message || "Нет доступного дохода.";
      }

      btn.disabled = wasDisabled;
      btn.textContent = "Получить доход";
    });

    const topupModal = document.getElementById("topupModal");
    const topupAmountInput = document.getElementById("topupAmountInput");
    function openTopup(amt = null) {
      if (amt) topupAmountInput.value = String(Math.max(10, Math.round(amt)));
      document.getElementById("topupStatus").textContent = "";
      document.getElementById("topupQrBox").classList.remove("open");
      topupModal.classList.add("open");
    }
    document.getElementById("openTopupBtn").addEventListener("click", () => { haptic("light"); openTopup(); });
    document.getElementById("closeTopupBtn").addEventListener("click", () => topupModal.classList.remove("open"));
    topupModal.addEventListener("click", (e) => { if (e.target === topupModal) topupModal.classList.remove("open"); });
    document.querySelectorAll(".preset-chip").forEach((c) => c.addEventListener("click", () => { topupAmountInput.value = c.dataset.amount; }));

    document.getElementById("togglePromoBtn").addEventListener("click", () => document.getElementById("promoBox").classList.toggle("open"));
    document.getElementById("applyPromoBtn").addEventListener("click", async () => {
      const code = document.getElementById("promoCodeInput").value.trim().toUpperCase();
      const st = document.getElementById("promoStatusText");
      const btn = document.getElementById("applyPromoBtn");

      if (!code || !VALIDATORS.isValidPromoCode(code)) {
        st.textContent = "Некорректный формат.";
        st.className = "promo-status err";
        return;
      }

      btn.disabled = true;
      st.textContent = "Проверяем...";
      st.className = "promo-status";

      const d = await API.applyPromoCode(tg?.initData || "", code);

      st.textContent = d?.message || (d?.ok ? "Промокод применён!" : "Не найден.");
      st.className = `promo-status ${d?.ok ? "ok" : "err"}`;

      if (d?.ok) {
        appliedPromo = { code, bonus_percent: d.bonus_percent || 10 };
        STORAGE.setJSON(CONFIG.PROMO_KEY, appliedPromo);
      }

      btn.disabled = false;
    });

    document.getElementById("refreshBalanceBtn").addEventListener("click", async () => {
      await syncBalance();
      document.getElementById("topupStatus").textContent = `Актуальный баланс: ${fmt(rubBalance)} ₽`;
    });

    document.getElementById("confirmTopupBtn").addEventListener("click", async () => {
      const amount = Number(topupAmountInput.value);
      const st = document.getElementById("topupStatus");
      const btn = document.getElementById("confirmTopupBtn");

      if (!VALIDATORS.isValidRubAmount(amount)) {
        st.textContent = "Минимум 10 ₽.";
        return;
      }

      btn.disabled = true;
      st.textContent = "Готовим QR-код...";

      const d = await API.requestTopup(tg?.initData || "", amount, "СБП / QR", appliedPromo?.code || null);

      if (d?.ok) {
        st.textContent = "";
        document.getElementById("topupQrMeta").innerHTML = `Заявка <b>#${d.topup_id}</b> · Сумма: <b>${fmt(amount)} ₽</b>`;
        document.getElementById("topupQrImg").src = `${CONFIG.API_BASE}/api/sbp_qr.png?t=${Date.now()}`;
        document.getElementById("topupQrImg").onerror = () => {
          document.getElementById("topupQrImg").alt = "QR недоступен";
        };
        document.getElementById("topupPayLink").href = d.pay_url || CONFIG.DEFAULT_PAY_URL;
        document.getElementById("topupQrBox").classList.add("open");
      } else {
        // Show real error instead of masking it
        let errorMsg = "Ошибка при создании заявки";
        if (!isOnline()) {
          errorMsg = "❌ Нет интернета";
        } else if (d?.error) {
          errorMsg = `❌ ${d.error}`;
        } else if (!tg?.initData) {
          errorMsg = "❌ Откройте приложение внутри Telegram";
        } else {
          errorMsg = "❌ Сервер недоступен — проверьте соединение";
        }
        st.textContent = errorMsg;
      }

      btn.disabled = false;
    });

    const payModal = document.getElementById("payModal");
    const topupMissingBtn = document.getElementById("topupMissingBtn");
    let currentCheckoutItem = null;
    let currentCheckoutTarget = null;

    document.getElementById("closePayModalBtn").addEventListener("click", () => payModal.classList.remove("open"));
    payModal.addEventListener("click", (e) => { if (e.target === payModal) payModal.classList.remove("open"); });

    function openCheckout({ mode, label, rub, ton, target }) {
      checkoutMode = mode;
      currentCheckoutItem = { mode, label, rub, ton };
      currentCheckoutTarget = target;
      document.getElementById("payModalStatus").textContent = "";
      document.getElementById("payModalSummary").textContent = `${label}`;
      document.getElementById("payModalBalanceSub").textContent = `Доступно: ${fmt(rubBalance)} ₽`;
      document.getElementById("payModalRubPrice").textContent = `${fmt(rub)} ₽`;
      document.getElementById("payModalTonPrice").textContent = `${ton} TON`;
      const miss = Math.max(0, rub - rubBalance);
      topupMissingBtn.style.display = miss > 0 ? "block" : "none";
      if (miss > 0) topupMissingBtn.textContent = `Пополнить нехватку (+${fmt(Math.max(10, miss))} ₽)`;
      payModal.classList.add("open");
    }

    topupMissingBtn.addEventListener("click", () => {
      payModal.classList.remove("open");
      openTopup(Math.max(10, (currentCheckoutItem?.rub || 100) - rubBalance));
    });

    // ========== BLOCK 5: PAYMENT SECURITY INLINE ==========
    const processedPayments = new Map();
    const PAYMENT_TIMEOUT = 30000;

    function validateOrderData(order) {
      if (!order || typeof order !== "object") throw new Error("Invalid order");
      if (!order.id) throw new Error("Missing order ID");
      if ((order.rub || 0) <= 0 && (order.ton || 0) <= 0) throw new Error("Invalid amount");
      return true;
    }

    function checkDuplicatePayment(orderId) {
      const now = Date.now();
      const key = `${orderId}_${Math.floor(now / 60000)}`;
      if (processedPayments.has(key) && now - processedPayments.get(key) < 2000) {
        throw new Error("Платёж уже обрабатывается");
      }
      processedPayments.set(key, now);
      if (processedPayments.size > 100) {
        const firstKey = processedPayments.keys().next().value;
        processedPayments.delete(firstKey);
      }
      return true;
    }

    function withTimeout(promise, ms = PAYMENT_TIMEOUT) {
      return Promise.race([
        promise,
        new Promise((_, r) => setTimeout(() => r(new Error("Таймаут запроса")), ms))
      ]);
    }

    function logPaymentError(orderId, error) {
      const logs = JSON.parse(localStorage.getItem("payment_logs") || "[]");
      logs.push({ id: orderId, err: error?.message, ts: Date.now() });
      localStorage.setItem("payment_logs", JSON.stringify(logs.slice(-20)));
    }

    function showThankYouModal(orderData) {
      const modal = document.getElementById("thankYouModal");
      if (!modal) return;

      // Trigger success haptic
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("success");

      // Fill modal with order data
      const orderIdEl = modal.querySelector(".receipt-order-id");
      if (orderIdEl) orderIdEl.textContent = `#${orderData.orderId}`;

      const itemEl = modal.querySelector(".receipt-item");
      if (itemEl) itemEl.textContent = orderData.item || "Товар";

      const recipientEl = modal.querySelector(".receipt-recipient");
      if (recipientEl) recipientEl.textContent = orderData.recipient || "—";

      const amountEl = modal.querySelector(".receipt-amount");
      if (amountEl) amountEl.textContent = `${fmt(orderData.amount)} ₽`;

      const methodEl = modal.querySelector(".receipt-method");
      if (methodEl) methodEl.textContent = orderData.method || "Баланс ₽";

      // Add copy-to-clipboard for order ID
      const copyBtn = modal.querySelector(".receipt-order-id");
      if (copyBtn) {
        copyBtn.style.cursor = "pointer";
        copyBtn.addEventListener("click", async () => {
          try {
            await navigator.clipboard?.writeText(orderData.orderId);
            const oldText = copyBtn.textContent;
            copyBtn.textContent = "✅ Скопировано!";
            setTimeout(() => { copyBtn.textContent = oldText; }, 2000);
            haptic("light");
          } catch (e) {}
        });
      }

      // Setup action buttons
      const myOrdersBtn = modal.querySelector(".btn-my-orders");
      if (myOrdersBtn) {
        myOrdersBtn.addEventListener("click", () => {
          modal.classList.remove("open");
          renderOrders();
          switchScreen("orders", "Мои заказы", "История покупок");
        });
      }

      const reviewBtn = modal.querySelector(".btn-review");
      if (reviewBtn) {
        reviewBtn.href = "https://t.me";
        reviewBtn.target = "_blank";
      }

      const closeBtn = modal.querySelector(".btn-close-thank-you");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => modal.classList.remove("open"));
      }

      modal.classList.add("open");
    }
    // ========== END BLOCK 5 ==========

    document.getElementById("proceedPayBtn").addEventListener("click", async () => {
      haptic("medium");
      const raw = targetInput.value.trim();
      const uname = raw.startsWith("@") ? raw : (raw ? "@" + raw : "");
      if (uname.length < 5) { document.getElementById("statusNote").textContent = "Укажи корректный @username."; return; }
      const info = await resolveUsername(uname);
      if (!info) { document.getElementById("statusNote").textContent = "Юзернейм не найден."; return; }
      saveRecentUser(info.username);
      document.getElementById("statusNote").textContent = "";
      openCheckout({ mode: "stars", label: `⭐ ${fmt(selectedPackage.stars)} Stars`, rub: selectedPackage.rub, ton: selectedPackage.ton, target: info.username });
    });

    // ===== BLOCK 5: Payment Security =====
    const __payments = new Map();
    const __timeout_ms = 30000;
    function checkDuplicatePayment(id) {
      const now = Date.now(), key = `${id}_${Math.floor(now/60000)}`;
      if (__payments.has(key) && now - __payments.get(key) < 2000) throw new Error("Already processing");
      __payments.set(key, now);
      return true;
    }
    function validateOrderData(o) {
      if (!o?.id) throw new Error("Missing ID");
      if ((o.rub || 0) + (o.ton || 0) <= 0) throw new Error("Invalid amount");
      return true;
    }
    function withTimeout(p, ms = __timeout_ms) {
      return Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error("Timeout")), ms))]);
    }
    function logPaymentError(id, e) {
      const logs = JSON.parse(localStorage.getItem("logs") || "[]");
      logs.push({id, msg: e?.message, ts: Date.now()});
      localStorage.setItem("logs", JSON.stringify(logs.slice(-10)));
    }
    // ===== END BLOCK 5 =====

    document.getElementById("payWithBalanceBtn").addEventListener("click", async () => {
      if (window.isPayingBalance) return; // Prevent double-click
      window.isPayingBalance = true;
      const btn = document.getElementById("payWithBalanceBtn");
      const wasDisabled = btn.disabled;
      btn.disabled = true;
      const st = document.getElementById("payModalStatus");
      const recipient = currentCheckoutTarget || "";
      try {
        // BUG FIX: Validate recipient format for Stars
        if (!recipient || recipient.length < 2) throw new Error("Укажи корректного получателя");

        // BUG FIX: For Stars - require that recipient was successfully resolved
        if (checkoutMode === "stars") {
          if (!resolvedRecipient) {
            throw new Error("Юзернейм не найден. Пересчитай.");
          }
          if (!recipient.startsWith("@")) {
            throw new Error("Укажи @username получателя");
          }
        }

        const rub = currentCheckoutItem?.rub || 0;
        if (rub <= 0) throw new Error("Invalid amount");
        if (rubBalance < rub) throw new Error(`Недостаточно средств (нужно ${fmt(rub)} ₽, имеется ${fmt(rubBalance)} ₽)`);

        const orderId = `bal_${Date.now()}`;
        checkDuplicatePayment(orderId);
        validateOrderData({ id: orderId, rub });

        st.textContent = "Проводим оплату...";

        // Steam category: use real server endpoint
        if (selectedProductCategory === "steam") {
          const steamData = JSON.parse(recipient);
          const needRub = Math.ceil(steamData.amount_rub * 1.09);

          if (rubBalance < needRub) throw new Error(`Недостаточно средств (нужно ${fmt(needRub)} ₽, имеется ${fmt(rubBalance)} ₽)`);

          st.textContent = "Отправляем заказ на сервер...";

          const steamPayload = {
            initData: tg?.initData || "",
            steam_login: steamData.steam_login,
            currency: steamData.currency,
            amount_rub: steamData.amount_rub,
            need_rub: needRub
          };

          const d = await API.call("/api/pay_balance", steamPayload);
          if (!d?.ok) {
            const errorMsg = d?.error || "Ошибка при обработке Steam заказа";
            throw new Error(errorMsg);
          }

          setRubBalance((typeof rubBalance !== 'undefined' ? rubBalance : 0) - needRub, true);

          const formattedRecipient = `Steam: ${steamData.steam_login} · ${fmt(needRub)} ₽ (RUB)`;
          saveOrder({
            id: d.order_id || orderId,
            itemLabel: `💾 Steam пополнение ${fmt(needRub)} ₽`,
            target: formattedRecipient,
            rubAmount: needRub,
            priceLabel: `${fmt(needRub)} ₽`,
            method: "Баланс ₽",
            statusText: "⏳ Выполняется",
            dateText: new Date().toLocaleString("ru-RU")
          });

          // Show thank you modal with receipt
          showThankYouModal({
            orderId: d.order_id || orderId,
            item: `💾 Steam пополнение ${fmt(needRub)} ₽`,
            recipient: formattedRecipient,
            amount: needRub,
            method: "Баланс ₽"
          });

          payModal.classList.remove("open");
        }
        // Telegram Stars
        else if (checkoutMode === "stars" && resolvedRecipient) {
          // BUG FIX: Validate Stars amount before processing
          if (!VALIDATORS.isValidStarsAmount(selectedPackage.stars)) {
            throw new Error("Неверное количество Stars (1-100000)");
          }

          // BUG FIX: Validate that recipient exists (resolvedRecipient is set)
          if (!resolvedRecipient?.username) {
            throw new Error("Получатель не найден или недействителен");
          }

          st.textContent = "Отправляем Stars через Fragment...";

          const d = await withTimeout(API.payWithBalance(tg?.initData || "", selectedPackage.stars, recipient));
          if (!d?.ok) {
            // BUG FIX: Handle specific Fragment errors
            if (d?.error?.includes("invalid")) {
              throw new Error("Неверный юзернейм. Проверь @username получателя");
            } else if (d?.error?.includes("balance")) {
              throw new Error("Недостаточно средств на счёте. Пополни баланс");
            } else if (d?.error?.includes("timeout")) {
              throw new Error("API Fragment не ответил. Попробуй позже");
            }
            throw new Error(d?.error || "Ошибка сервера при обработке Stars");
          }

          // BUG FIX: Validate server response before updating balance
          if (!d.order_id) throw new Error("Ошибка: заказ не создан на сервере");
          if (typeof d.balance !== "number") throw new Error("Ошибка: не удалось обновить баланс");

          setRubBalance(d.balance, true);

          const orderData = {
            orderId: d.order_id,
            item: `⭐ ${fmt(selectedPackage.stars)} Stars`,
            recipient: recipient,
            amount: rub,
            method: "Баланс ₽"
          };

          // BUG FIX: Mark as "pending" until Fragment confirms, not "paid" immediately
          saveOrder({
            id: d.order_id,
            stars: selectedPackage.stars,
            itemLabel: orderData.item,
            target: recipient,
            rubAmount: rub,
            priceLabel: `${fmt(rub)} ₽`,
            method: "Баланс ₽",
            statusText: "⏳ Fragment обработка",
            dateText: new Date().toLocaleString("ru-RU")
          });

          showThankYouModal(orderData);
          payModal.classList.remove("open");
        }
        // Other products
        else {
          setRubBalance((typeof rubBalance !== 'undefined' ? rubBalance : 0) - rub, true);

          const orderData = {
            orderId: orderId,
            item: currentCheckoutItem.label,
            recipient: recipient,
            amount: rub,
            method: "Баланс ₽"
          };

          saveOrder({ id: orderId, itemLabel: currentCheckoutItem.label, target: recipient, rubAmount: rub, priceLabel: `${fmt(rub)} ₽`, method: "Баланс ₽", statusText: "✅ Оплачен", dateText: new Date().toLocaleString("ru-RU") });

          showThankYouModal(orderData);
          payModal.classList.remove("open");
        }
      } catch (e) {
        st.textContent = `❌ ${e?.message || "Ошибка"}`;
        logPaymentError(`bal_${Date.now()}`, e);
      } finally {
        window.isPayingBalance = false;
        btn.disabled = wasDisabled;
      }
    });

    document.getElementById("payWithCryptoBtn").addEventListener("click", async () => {
      const st = document.getElementById("payModalStatus");
      const recipient = currentCheckoutTarget || "";
      try {
        if (!recipient || recipient.length < 2) throw new Error("Укажи корректного получателя");
        if (!tonConnectUI.wallet) {
          await tonConnectUI.openModal();
          return;
        }

        const ton = currentCheckoutItem?.ton || 0;
        if (ton <= 0) throw new Error("Invalid TON amount");
        if (tonBalance && tonBalance < ton) throw new Error(`Недостаточно TON (нужно ${ton}, имеется ${tonBalance})`);

        const orderId = `ton_${Date.now()}`;
        checkDuplicatePayment(orderId);
        validateOrderData({ id: orderId, ton });

        st.textContent = "Подтверди в кошельке...";
        await withTimeout(tonConnectUI.sendTransaction({
          validUntil: Math.floor(Date.now() / 1000) + 300,
          messages: [{ address: CONFIG.RECEIVER_WALLET, amount: Math.round(ton * 1e9).toString() }]
        }));

        saveOrder({ id: orderId, stars: checkoutMode === "stars" ? selectedPackage.stars : null, itemLabel: currentCheckoutItem.label, target: recipient, tonAmount: ton, priceLabel: `${ton} TON`, method: "Crypto TON", statusText: "⏳ На проверке", dateText: new Date().toLocaleString("ru-RU") });

        const web3TxList = JSON.parse(localStorage.getItem("web3_tx_list") || "[]");
        web3TxList.unshift({
          id: orderId,
          amount: ton,
          to: recipient,
          item: currentCheckoutItem.label,
          date: new Date().toLocaleString("ru-RU"),
          status: "pending"
        });
        localStorage.setItem("web3_tx_list", JSON.stringify(web3TxList.slice(0, 50)));

        payModal.classList.remove("open");
        st.textContent = "";
      } catch (e) {
        const msg = e?.message || "Ошибка платежа";
        if (!msg.includes("отменена")) {
          st.textContent = `❌ ${msg}`;
          logPaymentError(`ton_${Date.now()}`, e);
        } else {
          st.textContent = "Оплата отменена пользователем";
        }
      }
    });

    if (typeof window.applyTheme === 'function') window.applyTheme(typeof currentTheme !== 'undefined' ? currentTheme : undefined, false);
    if (typeof setRubBalance === 'function') setRubBalance(typeof rubBalance !== 'undefined' ? rubBalance : 0, false);
    if (typeof updateOrdersBadge === 'function') updateOrdersBadge();
    if (typeof updateHubQuote === 'function') updateHubQuote();
    if (typeof renderRecentUsers === 'function') renderRecentUsers();
    if (!window.CATEGORIES || window.CATEGORIES.length === 0) window.CATEGORIES = window.CATEGORIES_BASE || [];
    if (!window.PACKAGES || window.PACKAGES.length === 0) window.PACKAGES = (window.PACKAGES_BASE || []).map((p) => ({ ...p, ton: rubToTonSafe(p.rub) }));
    if (typeof renderCategories === 'function') renderCategories();
    if (typeof renderPackages === 'function') renderPackages();
    if (typeof syncBalance === 'function') syncBalance();
    if (typeof syncReferralInfo === 'function') syncReferralInfo();
    if (typeof switchScreen === 'function') switchScreen("hub", "Wujje Store", "Выдача 24/7 · В наличии");

    // Hide preloader after 350ms
    setTimeout(() => {
      const loader = document.getElementById("appLoader");
      if (loader) {
        loader.classList.add("hidden");
      }
    }, 350);

    // Fallback: force hide preloader after 1500ms even if network is slow
    setTimeout(() => {
      const loader = document.getElementById("appLoader");
      if (loader) {
        loader.style.opacity = "0";
        loader.style.pointerEvents = "none";
      }
    }, 1500);

    // Emergency: hide preloader on any error
    window.addEventListener("error", () => {
      const loader = document.getElementById("appLoader");
      if (loader) {
        loader.style.opacity = "0";
        loader.style.pointerEvents = "none";
      }
    });

    setInterval(() => { if (document.visibilityState === "visible") syncBalance(); }, 5000);
