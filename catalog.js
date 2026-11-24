/* Wujje Store — Product Catalog & Configuration (Extracted from app.js) */

// ===== STAR PACKAGES =====
const PACKAGES_BASE = [
  { stars: 50, rub: 76 },
  { stars: 75, rub: 114 },
  { stars: 100, rub: 152 },
  { stars: 150, rub: 227 },
  { stars: 250, rub: 379 },
  { stars: 350, rub: 530 },
  { stars: 500, rub: 758 },
  { stars: 750, rub: 1137 },
  { stars: 1000, rub: 1515 },
  { stars: 1500, rub: 2273 },
  { stars: 2500, rub: 3787 },
  { stars: 5000, rub: 7575 },
  { stars: 10000, rub: 15150 }
];

// Will be extended with TON conversion in app.js
let PACKAGES = [];

// ===== NFT GIFT COLLECTIONS (122 items) =====
const RAW_122_GIFTS = [
  ["Algorithm Cups", 3450], ["Artisan Bricks", 85], ["Astral Shards", 147], ["B-Day Candles", 6],
  ["Berry Boxes", 10], ["Big Years", 5], ["Bling Binkies", 29], ["Bonded Rings", 45],
  ["Bow Ties", 7], ["Bunny Muffins", 9], ["Candy Canes", 5], ["Chill Flames", 5],
  ["Clover Pins", 6], ["Cookie Hearts", 6], ["Crystal Balls", 14], ["Cupid Charms", 25],
  ["Desk Calendars", 7], ["Diamond Rings", 36], ["Durov's Caps", 470], ["Durov's Glasses", 229],
  ["Easter Eggs", 5], ["Electric Skulls", 35], ["Eternal Candles", 7], ["Eternal Roses", 35],
  ["Evil Eyes", 9], ["Faith Amulets", 7], ["Fine Pens", 9], ["Flying Brooms", 14],
  ["Fresh Socks", 6], ["Gem Signets", 72], ["Genie Lamps", 40], ["Ginger Cookies", 6],
  ["Hanging Stars", 11], ["Happy Brownies", 5], ["Heart Lockets", 1444], ["Heroic Helmets", 199],
  ["Hex Pots", 7], ["Holiday Drinks", 5], ["Homemade Cakes", 6], ["Hypno Lollipops", 5],
  ["Ice Creams", 5], ["Input Keys", 8], ["Instant Ramens", 5], ["Intelligence Cups", 3099],
  ["Ion Gems", 85], ["Ionic Dryers", 19], ["Jacks-in-the-Box", 6], ["Jelly Bunnies", 9],
  ["Jester Hats", 5], ["Jingle Bells", 11], ["Jolly Chimps", 8], ["Joyful Bundles", 11],
  ["Khabib's Papakhas", 27], ["Kissed Frogs", 59], ["Liberty Figures", 6], ["Light Swords", 7],
  ["Lol Pops", 5], ["Loot Bags", 141], ["Love Candles", 12], ["Love Potions", 16],
  ["Low Riders", 62], ["Lunar Snakes", 5], ["Lush Bouquets", 7], ["Mad Pumpkins", 21],
  ["Magic Potions", 75], ["Mighty Arms", 150], ["Mini Oscars", 78], ["Mirage Lamps", 5],
  ["Money Pots", 6], ["Mood Packs", 5], ["Moon Pendants", 7], ["Mousse Cakes", 6],
  ["Nail Bracelets", 149], ["Neko Helmets", 45], ["Party Sparklers", 6], ["Perfume Bottles", 86],
  ["Pet Snakes", 5], ["Plush Pepes", 7000], ["Pool Floats", 5], ["Precious Peaches", 290],
  ["Pretty Posies", 6], ["Rare Birds", 30], ["Record Players", 13], ["Resistance Dogs", 800],
  ["Restless Jars", 6], ["Sakura Flowers", 12], ["Santa Hats", 7], ["Scared Cats", 299],
  ["Sharp Tongues", 55], ["Signet Rings", 40], ["Skull Flowers", 14], ["Sky Stilettos", 20],
  ["Sleigh Bells", 12], ["Snake Boxes", 5], ["Snoop Cigars", 19], ["Snoop Doggs", 6],
  ["Snow Globes", 7], ["Snow Mittens", 10], ["Spiced Wines", 5], ["Spring Baskets", 6],
  ["Spy Agarics", 7], ["Star Notepads", 5], ["Stellar Rockets", 6], ["Surge Boards", 8],
  ["Swag Bags", 6], ["Swiss Watches", 65], ["Tama Gadgets", 5], ["Timeless Books", 5],
  ["Top Hats", 11], ["Toy Bears", 36], ["Trapped Hearts", 18], ["UFC Strikes", 18],
  ["Valentine Boxes", 13], ["Vice Creams", 5], ["Victory Medals", 6], ["Vintage Cigars", 46],
  ["Voodoo Dolls", 43], ["Westside Signs", 128], ["Whip Cupcakes", 5], ["Winter Wreaths", 6],
  ["Witch Hats", 10], ["Xmas Stockings", 5]
];

// ===== PALETTE CONFIGS (for NFT SVG art) =====
const PALETTES = [
  ["#17112e", "#a855f7", "🎁"],
  ["#241029", "#ec4899", "✨"],
  ["#0c2119", "#34d399", "💎"],
  ["#21180b", "#fbbf24", "👑"],
  ["#0b1d2b", "#38bdf8", "🔮"]
];

// Will be populated in app.js after utility functions are defined
let NFT_COLLECTIONS = [];

// ===== PRODUCT CATEGORIES =====
const CATEGORIES_BASE = [
  {
    id: "telegram", group: "telegram", img: "./icons/telegram.png", emoji: "✈️",
    title: "Telegram", desc: "Stars и Telegram Premium", badge: "В наличии",
    items: [
      { id: "tg_stars", title: "Telegram Stars", sub: "Любое кол-во или пакеты 50–10 000 ⭐ · В наличии", tag: "В наличии", action: "openStars" },
      { id: "tg_prem_3", title: "Telegram Premium (3 мес)", sub: "Подарком по @username · В наличии", priceText: "1 390 ₽", rub: 1390, tag: "В наличии", inputLabel: "Ваш @username в Telegram", inputPlaceholder: "@username", allowSelf: true, action: "openProduct" },
      { id: "tg_prem_12", title: "Telegram Premium (12 мес)", sub: "Годовая подписка подарком · В наличии", priceText: "3 890 ₽", rub: 3890, tag: "В наличии", inputLabel: "Ваш @username в Telegram", inputPlaceholder: "@username", allowSelf: true, action: "openProduct" }
    ]
  },
  {
    id: "nft_gifts", group: "nft", img: "./icons/nft.png", emoji: "🎁",
    title: "NFT подарки", desc: "122 коллекции, модели и флор", badge: "122 в наличии",
    action: "openNftList"
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

// Will be populated in app.js with TON conversion + NFT catalog integration
let CATEGORIES = [];

// ===== THEME DEFINITIONS =====
const THEMES = [
  { id: "violet", name: "Cyber Violet", tag: "Неон · Игровой", swatch: "linear-gradient(135deg,#a855f7,#4c1d95)", icon: "⚡", logo: "./icons/theme-violet.jpg" },
  { id: "sapphire", name: "Midnight Sapphire", tag: "Глубокий синий", swatch: "linear-gradient(135deg,#38bdf8,#1e3a8a)", icon: "🌙", logo: "./icons/theme-sapphire.jpg" },
  { id: "emerald", name: "Carbon Emerald", tag: "Изумруд · Крипто", swatch: "linear-gradient(135deg,#10b981,#064e3b)", icon: "💎", logo: "./icons/theme-emerald.jpg" },
  { id: "ice", name: "Ice Glass", tag: "Светлая тема", swatch: "linear-gradient(135deg,#ffffff,#93c5fd)", icon: "❄️", logo: "./icons/theme-ice.jpg" }
];
