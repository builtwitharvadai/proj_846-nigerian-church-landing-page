/**
 * Main JavaScript Entry Point
 * 
 * Initializes all interactive features for the church landing page including
 * navigation, contact form, and lazy loading. Implements graceful degradation
 * for browsers without JavaScript support and comprehensive error handling.
 * 
 * @module main
 */

import { initializeNavigation, cleanupNavigation } from './components/navigation.js';
import { initContactForm, cleanupContactForm } from './components/contact-form.js';
import { initLazyLoading } from './utils/lazy-loading.js';

/**
 * Application state management
 * @private
 */
const AppState = {
  initialized: false,
  features: {
    navigation: false,
    contactForm: false,
    lazyLoading: false
  },
  lazyLoadInstance: null,
  startTime: null
};

/**
 * Feature flags for progressive enhancement
 * @private
 */
const FeatureFlags = Object.freeze({
  NAVIGATION: true,
  CONTACT_FORM: true,
  LAZY_LOADING: true,
  PERFORMANCE_MONITORING: true
});

/**
 * Logs structured messages with context
 * @param {string} level - Log level (info, warn, error)
 * @param {string} message - Log message
 * @param {Object} context - Additional context
 * @private
 */
function log(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    module: 'main',
    message,
    ...context
  };

  if (level === 'error') {
    console.error(`[Main] ${message}`, logEntry);
  } else if (level === 'warn') {
    console.warn(`[Main] ${message}`, logEntry);
  } else {
    console.log(`[Main] ${message}`, logEntry);
  }
}

/**
 * Checks if browser supports required features
 * @returns {Object} Feature support status
 * @private
 */
function checkBrowserSupport() {
  const support = {
    es6: true,
    modules: true,
    intersectionObserver: 'IntersectionObserver' in window,
    fetch: 'fetch' in window,
    promises: 'Promise' in window,
    asyncAwait: true
  };

  try {
    // Test ES6 features
    eval('const test = () => {};');
  } catch (error) {
    support.es6 = false;
    support.asyncAwait = false;
  }

  return support;
}

/**
 * Displays browser compatibility warning
 * @param {Object} support - Browser support object
 * @private
 */
function showCompatibilityWarning(support) {
  const missingFeatures = Object.entries(support)
    .filter(([_key, value]) => !value)
    .map(([key]) => key);

  if (missingFeatures.length === 0) {
    return;
  }

  log('warn', 'Browser missing some features', { missingFeatures });

  const warningBanner = document.createElement('div');
  warningBanner.className = 'browser-warning';
  warningBanner.setAttribute('role', 'alert');
  warningBanner.innerHTML = `
    <p>
      Your browser may not support all features of this website.
      For the best experience, please update to a modern browser.
    </p>
    <button class="browser-warning__close" aria-label="Close warning">×</button>
  `;

  const closeButton = warningBanner.querySelector('.browser-warning__close');
  closeButton.addEventListener('click', () => {
    warningBanner.remove();
  });

  document.body.insertBefore(warningBanner, document.body.firstChild);
}

/**
 * Initializes navigation component with error handling
 * @returns {Promise<boolean>} Success status
 * @private
 */
async function initNavigation() {
  if (!FeatureFlags.NAVIGATION) {
    log('info', 'Navigation feature disabled by flag');
    return false;
  }

  try {
    initializeNavigation();
    AppState.features.navigation = true;
    log('info', 'Navigation initialized successfully');
    return true;
  } catch (error) {
    log('error', 'Failed to initialize navigation', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
}

/**
 * Initializes contact form component with error handling
 * @returns {Promise<boolean>} Success status
 * @private
 */
async function initForm() {
  if (!FeatureFlags.CONTACT_FORM) {
    log('info', 'Contact form feature disabled by flag');
    return false;
  }

  try {
    initContactForm();
    AppState.features.contactForm = true;
    log('info', 'Contact form initialized successfully');
    return true;
  } catch (error) {
    log('error', 'Failed to initialize contact form', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
}

/**
 * Initializes lazy loading for images with error handling
 * @returns {Promise<boolean>} Success status
 * @private
 */
async function initImageLazyLoading() {
  if (!FeatureFlags.LAZY_LOADING) {
    log('info', 'Lazy loading feature disabled by flag');
    return false;
  }

  try {
    const images = document.querySelectorAll('img[data-src]');
    
    if (images.length === 0) {
      log('info', 'No images found for lazy loading');
      return true;
    }

    AppState.lazyLoadInstance = initLazyLoading('img[data-src]', {
      rootMargin: '50px',
      threshold: 0.01
    });

    AppState.features.lazyLoading = true;
    log('info', 'Lazy loading initialized successfully', {
      imageCount: images.length
    });
    return true;
  } catch (error) {
    log('error', 'Failed to initialize lazy loading', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
}

/**
 * Adds no-js class removal for progressive enhancement
 * @private
 */
function enableJavaScript() {
  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');
  log('info', 'JavaScript enabled class added');
}

/**
 * Monitors page performance metrics
 * @private
 */
function monitorPerformance() {
  if (!FeatureFlags.PERFORMANCE_MONITORING) {
    return;
  }

  try {
    if ('performance' in window && 'getEntriesByType' in performance) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const perfData = performance.getEntriesByType('navigation')[0];
          
          if (perfData) {
            const metrics = {
              domContentLoaded: Math.round(perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart),
              loadComplete: Math.round(perfData.loadEventEnd - perfData.loadEventStart),
              domInteractive: Math.round(perfData.domInteractive - perfData.fetchStart),
              totalLoadTime: Math.round(perfData.loadEventEnd - perfData.fetchStart)
            };

            log('info', 'Performance metrics collected', metrics);

            // Track with analytics if available
            if (typeof window.gtag === 'function') {
              window.gtag('event', 'timing_complete', {
                name: 'page_load',
                value: metrics.totalLoadTime,
                event_category: 'Performance'
              });
            }
          }
        }, 0);
      });
    }
  } catch (error) {
    log('warn', 'Performance monitoring failed', {
      error: error.message
    });
  }
}

/**
 * Sets up global error handlers
 * @private
 */
function setupErrorHandlers() {
  window.addEventListener('error', (event) => {
    log('error', 'Uncaught error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error?.stack
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    log('error', 'Unhandled promise rejection', {
      reason: event.reason,
      promise: event.promise
    });
  });
}

/**
 * Initializes all application features
 * @returns {Promise<void>}
 * @private
 */
async function initializeApp() {
  if (AppState.initialized) {
    log('warn', 'Application already initialized');
    return;
  }

  AppState.startTime = performance.now();

  try {
    log('info', 'Starting application initialization');

    // Check browser support
    const support = checkBrowserSupport();
    showCompatibilityWarning(support);

    // Enable JavaScript enhancements
    enableJavaScript();

    // Setup error handlers
    setupErrorHandlers();

    // Initialize features in parallel for better performance
    const results = await Promise.allSettled([
      initNavigation(),
      initForm(),
      initImageLazyLoading()
    ]);

    // Log initialization results
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failureCount = results.length - successCount;

    log('info', 'Application initialization complete', {
      duration: Math.round(performance.now() - AppState.startTime),
      successful: successCount,
      failed: failureCount,
      features: AppState.features
    });

    // Monitor performance
    monitorPerformance();

    AppState.initialized = true;

  } catch (error) {
    log('error', 'Critical error during initialization', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Cleans up application resources
 * @private
 */
function cleanupApp() {
  try {
    log('info', 'Starting application cleanup');

    if (AppState.features.navigation) {
      cleanupNavigation();
    }

    if (AppState.features.contactForm) {
      cleanupContactForm();
    }

    if (AppState.lazyLoadInstance) {
      AppState.lazyLoadInstance.destroy();
    }

    AppState.initialized = false;
    AppState.features = {
      navigation: false,
      contactForm: false,
      lazyLoading: false
    };

    log('info', 'Application cleanup complete');
  } catch (error) {
    log('error', 'Error during cleanup', {
      error: error.message,
      stack: error.stack
    });
  }
}

/**
 * Handles page visibility changes for resource optimization
 * @private
 */
function handleVisibilityChange() {
  if (document.hidden) {
    log('info', 'Page hidden - pausing non-critical operations');
  } else {
    log('info', 'Page visible - resuming operations');
  }
}

/**
 * Initialize application when DOM is ready
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeApp().catch(error => {
      log('error', 'Failed to initialize application', {
        error: error.message,
        stack: error.stack
      });
    });
  });
} else {
  initializeApp().catch(error => {
    log('error', 'Failed to initialize application', {
      error: error.message,
      stack: error.stack
    });
  });
}

// Handle page visibility changes
document.addEventListener('visibilitychange', handleVisibilityChange);

// Cleanup on page unload
window.addEventListener('beforeunload', cleanupApp);

// Export for testing purposes
export {
  initializeApp,
  cleanupApp,
  AppState
};