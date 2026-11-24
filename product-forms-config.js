/**
 * Product Form Configuration
 * Defines form fields for each product category
 */

const PRODUCT_FORM_TYPES = {
  // Telegram Stars / Premium
  tg_stars: {
    fields: [
      { type: "text", id: "targetUsername", label: "Кому отправить Stars (@username)", placeholder: "@username", required: true }
    ],
    buttons: ["self", "clear"]
  },
  tg_premium: {
    fields: [
      { type: "text", id: "targetUsername", label: "Ваш @username в Telegram", placeholder: "@username", required: true }
    ],
    buttons: ["self", "clear"]
  },

  // Spotify Premium
  spotify: {
    type: "toggle", // Переключатель между двумя вариантами
    options: [
      {
        label: "Со входом в аккаунт",
        fields: [
          { type: "text", id: "spotifyEmail", label: "Email Spotify", placeholder: "user@example.com", required: true },
          { type: "password", id: "spotifyPassword", label: "Пароль от аккаунта", placeholder: "••••••••", required: true }
        ]
      },
      {
        label: "Без входа (инвайт / смена региона)",
        fields: [
          { type: "text", id: "inviteEmail", label: "Email для приглашения", placeholder: "user@example.com", required: true }
        ],
        hint: "Семейная подписка должна быть неактивна"
      }
    ]
  },

  // Roblox
  roblox: {
    tabs: ["instant", "gamepass"],
    instant: {
      type: "toggle",
      options: [
        {
          label: "Получить код активации",
          fields: [
            { type: "text", id: "robloxUsername", label: "Никнейм Roblox", placeholder: "YourUsername", required: true }
          ]
        },
        {
          label: "Вход в аккаунт",
          fields: [
            { type: "text", id: "robloxLoginEmail", label: "Email или никнейм", placeholder: "user@example.com", required: true },
            { type: "password", id: "robloxLoginPassword", label: "Пароль", placeholder: "••••••••", required: true }
          ]
        }
      ]
    },
    gamepass: {
      fields: [
        { type: "text", id: "robloxUsername", label: "Никнейм Roblox (создатель пасса)", placeholder: "YourUsername", required: true },
        { type: "text", id: "gamepassLink", label: "Ссылка на созданный Game Pass", placeholder: "https://www.roblox.com/game-pass/...", required: true }
      ],
      hint: "Комиссия Roblox 30%. Зачисление 5-7 дней. Калькулятор Robux с учётом комиссии: Math.ceil(robux / 0.7)"
    }
  },

  // Minecraft
  minecraft: {
    fields: [
      { type: "text", id: "minecraftEmail", label: "Email для отправки ключа", placeholder: "player@example.com", required: true }
    ],
    hint: "Ключ будет отправлен на почту сразу после оплаты"
  },

  // Xbox Game Pass
  xbox: {
    type: "toggle",
    options: [
      {
        label: "Ключ активации",
        fields: [
          { type: "text", id: "xboxEmail", label: "Email для ключа", placeholder: "user@example.com", required: true }
        ]
      },
      {
        label: "Активация на аккаунт",
        fields: [
          { type: "text", id: "microsoftLogin", label: "Логин Microsoft", placeholder: "user@example.com", required: true },
          { type: "password", id: "microsoftPassword", label: "Пароль", placeholder: "••••••••", required: true }
        ]
      }
    ]
  },

  // Discord
  discord_nitro: {
    type: "toggle",
    options: [
      {
        label: "Со входом в аккаунт",
        fields: [
          { type: "text", id: "discordEmailPhone", label: "Email или телефон", placeholder: "user@example.com", required: true },
          { type: "password", id: "discordPassword", label: "Пароль", placeholder: "••••••••", required: true }
        ]
      },
      {
        label: "Подарочной ссылкой (Gift)",
        fields: [
          { type: "text", id: "discordContact", label: "Email или @username для связи", placeholder: "user@example.com", required: true }
        ]
      }
    ]
  },

  discord_boost: {
    fields: [
      { type: "text", id: "discordServerInvite", label: "Ссылка-приглашение на Discord сервер", placeholder: "https://discord.gg/...", required: true }
    ],
    hint: "Ссылка должна быть бессрочной (не имеет срока действия)"
  },

  // AI & Нейросети
  ai: {
    type: "toggle",
    options: [
      {
        label: "Активация на ваш аккаунт",
        fields: [
          { type: "text", id: "aiEmail", label: "Email", placeholder: "user@example.com", required: true },
          { type: "password", id: "aiPassword", label: "Пароль", placeholder: "••••••••", required: true }
        ]
      },
      {
        label: "Готовый аккаунт / API-ключ",
        fields: [
          { type: "text", id: "aiDataEmail", label: "Email для получения данных", placeholder: "your-email@example.com", required: true }
        ]
      }
    ]
  }
};

/**
 * Map product IDs to form types
 */
const PRODUCT_FORM_MAP = {
  // Telegram
  "tg_stars_500": "tg_stars",
  "tg_stars_1000": "tg_stars",
  "tg_prem_3": "tg_premium",
  "tg_prem_12": "tg_premium",

  // Spotify
  "spot_1m": "spotify",
  "spot_3m": "spotify",
  "spot_12m": "spotify",

  // Roblox
  "rbx_400": "roblox",
  "rbx_800": "roblox",
  "rbx_1700": "roblox",
  "rbx_4500": "roblox",
  "rbx_gamepass": "roblox",

  // Minecraft
  "mc_key_ms": "minecraft",
  "mc_realms": "minecraft",
  "mc_coins": "minecraft",

  // Xbox
  "gp_core_1m": "xbox",
  "gp_pc_1m": "xbox",
  "gp_ult_1m": "xbox",
  "gp_ult_3m": "xbox",
  "gp_ult_6m": "xbox",
  "gp_ult_12m": "xbox",

  // Discord
  "dc_basic_1m": "discord_nitro",
  "dc_basic_12m": "discord_nitro",
  "dc_full_1m": "discord_nitro",
  "dc_full_12m": "discord_nitro",
  "dc_boost_1m": "discord_boost",
  "dc_boost_3m": "discord_boost",

  // AI
  "ai_chatgpt": "ai",
  "ai_claude": "ai",
  "ai_midjourney": "ai",
  "ai_perplexity": "ai",
  "ai_openai_credits": "ai",
  "ai_anthropic_credits": "ai"
};

/**
 * Get form configuration for a product
 * @param {string} productId - Product ID
 * @returns {object} Form configuration
 */
function getProductFormConfig(productId) {
  const formType = PRODUCT_FORM_MAP[productId];
  return formType ? PRODUCT_FORM_TYPES[formType] : PRODUCT_FORM_TYPES.tg_premium; // Default fallback
}
