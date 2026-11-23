/**
 * Performance Optimization Utilities
 * Оптимизация производительности для слабых Android устройств
 */

// ============================================
// 1. LAZY LOADING ИЗОБРАЖЕНИЙ
// ============================================

function setupLazyLoading() {
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.dataset.src;
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      }
    });
  }, {
    rootMargin: '50px' // Загружать за 50px до появления в viewport
  });

  document.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
  });
}

// ============================================
// 2. DEBOUNCE ДЛЯ ПОИСКА И СКРОЛЛА
// ============================================

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ============================================
// 3. ВИРТУАЛИЗАЦИЯ СПИСКОВ NFT
// ============================================

class VirtualList {
  constructor(container, items, renderItem, itemHeight = 100) {
    this.container = container;
    this.items = items;
    this.renderItem = renderItem;
    this.itemHeight = itemHeight;
    this.visibleCount = Math.ceil(window.innerHeight / itemHeight) + 2;
    this.startIndex = 0;

    this.init();
  }

  init() {
    // Создаем контейнер для скролла
    this.scrollContainer = document.createElement('div');
    this.scrollContainer.style.height = `${this.items.length * this.itemHeight}px`;
    this.scrollContainer.style.position = 'relative';

    // Контейнер для видимых элементов
    this.viewport = document.createElement('div');
    this.viewport.style.position = 'absolute';
    this.viewport.style.top = '0';
    this.viewport.style.width = '100%';

    this.scrollContainer.appendChild(this.viewport);
    this.container.appendChild(this.scrollContainer);

    this.render();

    // Оптимизированный обработчик скролла
    this.container.addEventListener('scroll', debounce(() => {
      this.render();
    }, 16)); // 60fps
  }

  render() {
    const scrollTop = this.container.scrollTop;
    this.startIndex = Math.floor(scrollTop / this.itemHeight);
    const endIndex = Math.min(this.startIndex + this.visibleCount, this.items.length);

    this.viewport.style.transform = `translateY(${this.startIndex * this.itemHeight}px)`;
    this.viewport.innerHTML = '';

    for (let i = this.startIndex; i < endIndex; i++) {
      const item = this.renderItem(this.items[i], i);
      this.viewport.appendChild(item);
    }
  }

  update(newItems) {
    this.items = newItems;
    this.scrollContainer.style.height = `${this.items.length * this.itemHeight}px`;
    this.render();
  }
}

// ============================================
// 4. ОПТИМИЗАЦИЯ АНИМАЦИЙ
// ============================================

function optimizeAnimations() {
  // Добавляем will-change только во время анимации
  const animatedElements = document.querySelectorAll('.modal, .sheet, .card');

  animatedElements.forEach(el => {
    el.addEventListener('transitionstart', () => {
      el.style.willChange = 'transform, opacity';
    });

    el.addEventListener('transitionend', () => {
      el.style.willChange = 'auto';
    });
  });
}

// ============================================
// 5. УМЕНЬШЕНИЕ SVG COMPLEXITY
// ============================================

function simplifiedSvgArt(title, floorLabel, bgHex, accentHex, symbol) {
  // Упрощенная версия без градиентов для слабых устройств
  const isLowEnd = navigator.hardwareConcurrency <= 4 ||
                   /Android [1-9]\./i.test(navigator.userAgent);

  if (isLowEnd) {
    // Простая версия без градиентов
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
        <rect width="256" height="256" rx="32" fill="${bgHex}"/>
        <circle cx="128" cy="100" r="50" fill="${accentHex}" opacity="0.3"/>
        <text x="128" y="120" text-anchor="middle" font-size="48">${symbol}</text>
        <text x="128" y="180" text-anchor="middle" fill="#fff" font-size="16" font-weight="700">${title}</text>
        <text x="128" y="210" text-anchor="middle" fill="#ddd" font-size="12">${floorLabel}</text>
      </svg>
    `)}`;
  }

  // Полная версия для мощных устройств
  return svgArt(title, floorLabel, bgHex, accentHex, symbol);
}

// ============================================
// 6. ОПТИМИЗАЦИЯ РЕНДЕРИНГА NFT КОЛЛЕКЦИЙ
// ============================================

function renderNftListOptimized(collections, containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  // Используем виртуализацию для больших списков
  if (collections.length > 20) {
    const virtualList = new VirtualList(
      container,
      collections,
      (collection, index) => {
        const card = document.createElement('div');
        card.className = 'nft-card';
        card.dataset.colIdx = index;

        // Используем data-src для lazy loading
        card.innerHTML = `
          <img data-src="${collection.img}" alt="${collection.title}" class="nft-img">
          <div class="nft-info">
            <h3>${collection.title}</h3>
            <p>Floor: ${collection.floorRub} ₽</p>
          </div>
        `;

        return card;
      },
      120 // высота карточки
    );

    // Настраиваем lazy loading для новых изображений
    setTimeout(() => setupLazyLoading(), 100);
  } else {
    // Обычный рендеринг для малых списков
    renderNftList(collections);
  }
}

// ============================================
// 7. DETECT LOW-END DEVICE
// ============================================

function isLowEndDevice() {
  const memory = navigator.deviceMemory; // GB RAM
  const cores = navigator.hardwareConcurrency;
  const connection = navigator.connection?.effectiveType;

  return (
    (memory && memory < 4) ||
    (cores && cores <= 4) ||
    connection === '2g' ||
    connection === '3g' ||
    /Android [1-9]\./i.test(navigator.userAgent)
  );
}

// ============================================
// 8. ADAPTIVE QUALITY MODE
// ============================================

function setupAdaptiveQuality() {
  const lowEnd = isLowEndDevice();

  if (lowEnd) {
    // Отключаем сложные анимации
    document.documentElement.classList.add('low-end-mode');

    // Уменьшаем качество изображений
    document.querySelectorAll('img').forEach(img => {
      if (img.src && img.src.includes('?')) {
        img.src += '&quality=low';
      }
    });

    // Используем упрощенные SVG
    window.svgArt = simplifiedSvgArt;
  }
}

// ============================================
// 9. ИНИЦИАЛИЗАЦИЯ
// ============================================

function initPerformanceOptimizations() {
  // 1. Определяем тип устройства
  setupAdaptiveQuality();

  // 2. Настраиваем lazy loading
  setupLazyLoading();

  // 3. Оптимизируем анимации
  optimizeAnimations();

  // 4. Добавляем debounce на поиск
  const searchInput = document.querySelector('input[type="search"]');
  if (searchInput) {
    const originalHandler = searchInput.oninput;
    searchInput.oninput = debounce(originalHandler, 300);
  }
}

// Экспортируем для использования в index.html
if (typeof window !== 'undefined') {
  window.perfOptimizations = {
    init: initPerformanceOptimizations,
    debounce,
    VirtualList,
    setupLazyLoading,
    isLowEndDevice,
    simplifiedSvgArt
  };
}
