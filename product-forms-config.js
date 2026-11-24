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
        hint: "⚠️ Семейная подписка должна быть неактивна"
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
      hint: "⚠️ Комиссия Roblox 30%. Зачисление 5-7 дней. Калькулятор Robux с учётом комиссии: Math.ceil(robux / 0.7)"
    }
  },

  // Minecraft
  minecraft: {
    fields: [
      { type: "text", id: "minecraftEmail", label: "Email для отправки ключа", placeholder: "player@example.com", required: true }
    ],
    hint: "✅ Ключ будет отправлен на почту сразу после оплаты"
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
    hint: "⚠️ Ссылка должна быть бессрочной (не имеет срока действия)"
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
  "tg_stars": "tg_stars",
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
  "rbx_10000": "roblox",
  "rbx_22500": "roblox",
  "rbx_gamepass": "roblox",

  // Minecraft
  "mc_key_ms": "minecraft",
  "mc_realms_1m": "minecraft",
  "mc_realms_3m": "minecraft",
  "mc_coins_1720": "minecraft",
  "mc_coins_3500": "minecraft",
  "mc_hypixel_vip": "minecraft",
  "mc_hypixel_mvpplus": "minecraft",

  // Xbox
  "gp_core_1m": "xbox",
  "gp_core_3m": "xbox",
  "gp_core_12m": "xbox",
  "gp_pc_1m": "xbox",
  "gp_pc_3m": "xbox",
  "gp_ult_1m": "xbox",
  "gp_ult_3m": "xbox",
  "gp_ult_6m": "xbox",
  "gp_ult_12m": "xbox",

  // Discord
  "dc_basic_1m": "discord_nitro",
  "dc_basic_12m": "discord_nitro",
  "dc_full_1m": "discord_nitro",
  "dc_full_12m": "discord_nitro",
  "dc_full_boost_1m": "discord_nitro",
  "dc_full_boost_12m": "discord_nitro",
  "dc_boost_1m": "discord_boost",
  "dc_boost_3m": "discord_boost",

  // AI
  "ai_chatgpt_1m": "ai",
  "ai_claude_1m": "ai",
  "ai_midjourney_basic": "ai",
  "ai_midjourney_std": "ai",
  "ai_perplexity_1m": "ai",
  "ai_perplexity_12m": "ai",
  "ai_openai_credits": "ai",
  "ai_anthropic_credits": "ai",
  "ai_openrouter_credits": "ai"
};

/**
 * Get form configuration for a product
 * @param {string} productId - Product ID
 * @returns {object} Form configuration
 */
function getProductFormConfig(productId) {
  const formType = PRODUCT_FORM_MAP[productId];
  return formType ? PRODUCT_FORM_TYPES[formType] : PRODUCT_FORM_TYPES.tg_premium;
}

/**
 * Render product form based on configuration
 * @param {string} productId - Product ID
 * @param {HTMLElement} container - Container to render form into
 */
function renderProductForm(productId, container) {
  const config = getProductFormConfig(productId);
  if (!config) return;

  container.innerHTML = '';

  if (config.type === 'toggle' && config.options) {
    // Render toggle form
    const wrapper = document.createElement('div');
    wrapper.className = 'form-toggle-group';

    config.options.forEach((option, idx) => {
      const optDiv = document.createElement('div');
      optDiv.className = 'form-option ' + (idx === 0 ? 'active' : '');
      optDiv.dataset.optionIdx = idx;

      const label = document.createElement('label');
      label.className = 'form-toggle-label';
      label.textContent = option.label;
      label.style.cursor = 'pointer';

      label.addEventListener('click', () => {
        wrapper.querySelectorAll('.form-option').forEach(o => o.classList.remove('active'));
        optDiv.classList.add('active');
      });

      optDiv.appendChild(label);

      option.fields.forEach(field => {
        const fieldEl = createFormField(field);
        optDiv.appendChild(fieldEl);
      });

      if (option.hint) {
        const hint = document.createElement('div');
        hint.className = 'form-hint';
        hint.textContent = option.hint;
        hint.style.fontSize = '11px';
        hint.style.color = 'var(--muted)';
        hint.style.marginTop = '6px';
        optDiv.appendChild(hint);
      }

      wrapper.appendChild(optDiv);
    });

    container.appendChild(wrapper);
  } else if (config.tabs) {
    // Render tabs form (for Roblox)
    const tabContainer = document.createElement('div');
    tabContainer.className = 'form-tabs';

    // Tab buttons
    const btnGroup = document.createElement('div');
    btnGroup.style.display = 'flex';
    btnGroup.style.gap = '8px';
    btnGroup.style.marginBottom = '12px';

    config.tabs.forEach((tab, idx) => {
      const btn = document.createElement('button');
      btn.textContent = tab === 'instant' ? '⚡ Моментально' : '⏳ Через Game Pass';
      btn.className = 'tab-btn ' + (idx === 0 ? 'active' : '');
      btn.dataset.tab = tab;
      btn.style.flex = '1';

      btn.addEventListener('click', () => {
        btnGroup.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderTabContent(tab, config[tab], tabContent);
      });

      btnGroup.appendChild(btn);
    });

    tabContainer.appendChild(btnGroup);

    // Tab content
    const tabContent = document.createElement('div');
    tabContent.className = 'tab-content';
    renderTabContent(config.tabs[0], config[config.tabs[0]], tabContent);
    tabContainer.appendChild(tabContent);

    container.appendChild(tabContainer);
  } else {
    // Render simple form
    if (config.fields) {
      config.fields.forEach(field => {
        const fieldEl = createFormField(field);
        container.appendChild(fieldEl);
      });
    }

    if (config.buttons && config.buttons.includes('self')) {
      const btnContainer = document.createElement('div');
      btnContainer.style.display = 'flex';
      btnContainer.style.gap = '8px';
      btnContainer.style.marginTop = '10px';

      const selfBtn = document.createElement('button');
      selfBtn.textContent = 'Себе';
      selfBtn.className = 'quick-btn';

      const clearBtn = document.createElement('button');
      clearBtn.textContent = 'Очистить';
      clearBtn.className = 'quick-btn';
      clearBtn.style.background = 'var(--red-bg)';
      clearBtn.style.color = 'var(--red)';

      btnContainer.appendChild(selfBtn);
      btnContainer.appendChild(clearBtn);
      container.appendChild(btnContainer);
    }

    if (config.hint) {
      const hint = document.createElement('div');
      hint.className = 'form-hint';
      hint.textContent = config.hint;
      hint.style.fontSize = '11px';
      hint.style.color = 'var(--muted)';
      hint.style.marginTop = '8px';
      container.appendChild(hint);
    }
  }
}

/**
 * Create a single form field element
 */
function createFormField(field) {
  const container = document.createElement('div');
  container.style.marginBottom = '10px';

  if (field.label) {
    const label = document.createElement('label');
    label.className = 'field-label';
    label.textContent = field.label;
    label.style.display = 'block';
    label.style.marginBottom = '4px';
    container.appendChild(label);
  }

  const input = document.createElement('input');
  input.type = field.type || 'text';
  input.id = field.id;
  input.placeholder = field.placeholder || '';
  input.className = 'input';
  input.required = field.required || false;
  container.appendChild(input);

  return container;
}

/**
 * Render tab content
 */
function renderTabContent(tab, config, container) {
  container.innerHTML = '';

  if (config.type === 'toggle' && config.options) {
    config.options.forEach((option, idx) => {
      const optDiv = document.createElement('div');
      optDiv.className = 'form-option ' + (idx === 0 ? 'active' : '');

      const label = document.createElement('label');
      label.className = 'form-toggle-label';
      label.textContent = option.label;
      label.style.cursor = 'pointer';
      label.style.display = 'block';
      label.style.marginBottom = '10px';

      optDiv.appendChild(label);

      option.fields.forEach(field => {
        const fieldEl = createFormField(field);
        optDiv.appendChild(fieldEl);
      });

      if (option.hint) {
        const hint = document.createElement('div');
        hint.className = 'form-hint';
        hint.textContent = option.hint;
        hint.style.fontSize = '11px';
        hint.style.color = 'var(--muted)';
        hint.style.marginTop = '8px';
        optDiv.appendChild(hint);
      }

      container.appendChild(optDiv);
    });
  } else {
    config.fields.forEach(field => {
      const fieldEl = createFormField(field);
      container.appendChild(fieldEl);
    });

    if (config.hint) {
      const hint = document.createElement('div');
      hint.className = 'form-hint';
      hint.textContent = config.hint;
      hint.style.fontSize = '11px';
      hint.style.color = 'var(--muted)';
      hint.style.marginTop = '8px';
      container.appendChild(hint);
    }
  }
}

