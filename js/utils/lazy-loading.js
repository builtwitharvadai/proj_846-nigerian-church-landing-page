/**
 * Lazy Loading Utility Module
 * 
 * Implements lazy loading for images using Intersection Observer API with fallback
 * for older browsers. Includes loading placeholders, error handling, and performance
 * optimizations.
 * 
 * @module js/utils/lazy-loading
 */

/**
 * Configuration for lazy loading behavior
 * @typedef {Object} LazyLoadConfig
 * @property {string} rootMargin - Margin around root for early loading
 * @property {number} threshold - Visibility threshold to trigger loading
 * @property {string} loadingClass - CSS class for loading state
 * @property {string} loadedClass - CSS class for loaded state
 * @property {string} errorClass - CSS class for error state
 * @property {string} placeholderClass - CSS class for placeholder
 * @property {number} retryAttempts - Number of retry attempts on error
 * @property {number} retryDelay - Delay between retries in ms
 */

/**
 * Default configuration for lazy loading
 * @type {LazyLoadConfig}
 */
const DEFAULT_CONFIG = {
  rootMargin: '50px',
  threshold: 0.01,
  loadingClass: 'lazy-loading',
  loadedClass: 'lazy-loaded',
  errorClass: 'lazy-error',
  placeholderClass: 'lazy-placeholder',
  retryAttempts: 3,
  retryDelay: 1000,
};

/**
 * Tracks loading state for each image
 * @type {WeakMap<HTMLImageElement, {attempts: number, loading: boolean}>}
 */
const imageState = new WeakMap();

/**
 * Checks if Intersection Observer API is supported
 * @returns {boolean} True if supported
 */
function isIntersectionObserverSupported() {
  return (
    'IntersectionObserver' in window &&
    'IntersectionObserverEntry' in window &&
    'intersectionRatio' in window.IntersectionObserverEntry.prototype
  );
}

/**
 * Logs structured messages with context
 * @param {string} level - Log level (info, warn, error)
 * @param {string} message - Log message
 * @param {Object} context - Additional context
 */
function log(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    module: 'lazy-loading',
    message,
    ...context,
  };

  if (level === 'error') {
    console.error(`[LazyLoad] ${message}`, logEntry);
  } else if (level === 'warn') {
    console.warn(`[LazyLoad] ${message}`, logEntry);
  } else {
    console.log(`[LazyLoad] ${message}`, logEntry);
  }
}

/**
 * Loads an image with retry logic
 * @param {HTMLImageElement} img - Image element to load
 * @param {string} src - Source URL to load
 * @param {LazyLoadConfig} config - Configuration object
 * @returns {Promise<void>}
 */
async function loadImageWithRetry(img, src, config) {
  const state = imageState.get(img) || { attempts: 0, loading: false };

  if (state.loading) {
    log('info', 'Image already loading', { src });
    return;
  }

  state.loading = true;
  imageState.set(img, state);

  const attemptLoad = (attemptNumber) => {
    return new Promise((resolve, reject) => {
      const tempImg = new Image();

      const cleanup = () => {
        tempImg.onload = null;
        tempImg.onerror = null;
      };

      tempImg.onload = () => {
        cleanup();
        resolve();
      };

      tempImg.onerror = () => {
        cleanup();
        reject(new Error(`Failed to load image: ${src}`));
      };

      tempImg.src = src;

      if (tempImg.complete) {
        cleanup();
        if (tempImg.naturalWidth > 0) {
          resolve();
        } else {
          reject(new Error(`Image loaded but invalid: ${src}`));
        }
      }
    });
  };

  for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
    try {
      state.attempts = attempt;
      imageState.set(img, state);

      log('info', 'Loading image', { src, attempt, maxAttempts: config.retryAttempts });

      await attemptLoad(attempt);

      img.src = src;
      img.classList.remove(config.loadingClass, config.placeholderClass);
      img.classList.add(config.loadedClass);

      state.loading = false;
      imageState.set(img, state);

      log('info', 'Image loaded successfully', { src, attempts: attempt });
      return;
    } catch (error) {
      log('warn', 'Image load attempt failed', {
        src,
        attempt,
        maxAttempts: config.retryAttempts,
        error: error.message,
      });

      if (attempt < config.retryAttempts) {
        await new Promise((resolve) => setTimeout(resolve, config.retryDelay * attempt));
      } else {
        img.classList.remove(config.loadingClass, config.placeholderClass);
        img.classList.add(config.errorClass);
        img.alt = `Failed to load image: ${img.alt || 'Image'}`;

        state.loading = false;
        imageState.set(img, state);

        log('error', 'Image load failed after all retries', {
          src,
          attempts: config.retryAttempts,
          error: error.message,
        });

        throw error;
      }
    }
  }
}

/**
 * Handles image intersection with viewport
 * @param {IntersectionObserverEntry[]} entries - Intersection entries
 * @param {IntersectionObserver} observer - Observer instance
 * @param {LazyLoadConfig} config - Configuration object
 */
function handleIntersection(entries, observer, config) {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const img = entry.target;
      const src = img.dataset.src;

      if (!src) {
        log('warn', 'Image missing data-src attribute', { img: img.outerHTML });
        observer.unobserve(img);
        return;
      }

      img.classList.add(config.loadingClass);

      loadImageWithRetry(img, src, config)
        .then(() => {
          observer.unobserve(img);
        })
        .catch((error) => {
          log('error', 'Failed to load image', {
            src,
            error: error.message,
          });
          observer.unobserve(img);
        });
    }
  });
}

/**
 * Fallback loading for browsers without Intersection Observer
 * @param {HTMLImageElement[]} images - Array of image elements
 * @param {LazyLoadConfig} config - Configuration object
 */
function fallbackLoad(images, config) {
  log('info', 'Using fallback loading method', { imageCount: images.length });

  const loadVisibleImages = () => {
    images.forEach((img) => {
      if (img.classList.contains(config.loadedClass) || img.classList.contains(config.errorClass)) {
        return;
      }

      const rect = img.getBoundingClientRect();
      const isVisible =
        rect.top < window.innerHeight + 50 &&
        rect.bottom > -50 &&
        rect.left < window.innerWidth + 50 &&
        rect.right > -50;

      if (isVisible) {
        const src = img.dataset.src;
        if (src) {
          img.classList.add(config.loadingClass);
          loadImageWithRetry(img, src, config).catch((error) => {
            log('error', 'Fallback load failed', {
              src,
              error: error.message,
            });
          });
        }
      }
    });
  };

  loadVisibleImages();

  let scrollTimeout;
  const handleScroll = () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(loadVisibleImages, 100);
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleScroll, { passive: true });
}

/**
 * Initializes lazy loading for images
 * @param {string|HTMLElement|NodeList} selector - Selector or elements to lazy load
 * @param {Partial<LazyLoadConfig>} userConfig - User configuration overrides
 * @returns {Object} API object with destroy method
 */
export function initLazyLoading(selector = '[data-src]', userConfig = {}) {
  const config = { ...DEFAULT_CONFIG, ...userConfig };

  let images;
  if (typeof selector === 'string') {
    images = Array.from(document.querySelectorAll(selector));
  } else if (selector instanceof NodeList) {
    images = Array.from(selector);
  } else if (selector instanceof HTMLElement) {
    images = [selector];
  } else {
    log('error', 'Invalid selector provided', { selector });
    throw new TypeError('Selector must be a string, HTMLElement, or NodeList');
  }

  if (images.length === 0) {
    log('warn', 'No images found to lazy load', { selector });
    return { destroy: () => {} };
  }

  log('info', 'Initializing lazy loading', {
    imageCount: images.length,
    config,
  });

  images.forEach((img) => {
    if (!(img instanceof HTMLImageElement)) {
      log('warn', 'Non-image element found', { element: img.tagName });
      return;
    }

    img.classList.add(config.placeholderClass);

    if (!img.hasAttribute('loading')) {
      img.setAttribute('loading', 'lazy');
    }
  });

  if (isIntersectionObserverSupported()) {
    const observerOptions = {
      rootMargin: config.rootMargin,
      threshold: config.threshold,
    };

    const observer = new IntersectionObserver(
      (entries) => handleIntersection(entries, observer, config),
      observerOptions
    );

    images.forEach((img) => {
      if (img instanceof HTMLImageElement) {
        observer.observe(img);
      }
    });

    log('info', 'Intersection Observer initialized', {
      imageCount: images.length,
      options: observerOptions,
    });

    return {
      destroy: () => {
        observer.disconnect();
        log('info', 'Lazy loading destroyed');
      },
    };
  } else {
    fallbackLoad(images.filter((img) => img instanceof HTMLImageElement), config);

    return {
      destroy: () => {
        log('info', 'Fallback lazy loading destroyed');
      },
    };
  }
}

/**
 * Preloads critical images immediately
 * @param {string[]} urls - Array of image URLs to preload
 * @returns {Promise<void[]>}
 */
export async function preloadImages(urls) {
  if (!Array.isArray(urls) || urls.length === 0) {
    log('warn', 'No URLs provided for preloading');
    return Promise.resolve([]);
  }

  log('info', 'Preloading critical images', { count: urls.length });

  const loadPromises = urls.map((url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        log('info', 'Image preloaded', { url });
        resolve();
      };

      img.onerror = () => {
        const error = new Error(`Failed to preload image: ${url}`);
        log('error', 'Image preload failed', { url, error: error.message });
        reject(error);
      };

      img.src = url;
    });
  });

  return Promise.allSettled(loadPromises);
}

export default {
  initLazyLoading,
  preloadImages,
};