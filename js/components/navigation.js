/**
 * Navigation Component Module
 * Handles smooth scrolling, mobile menu, active section highlighting, and keyboard navigation
 * 
 * @module components/navigation
 * @requires utils/validation
 */

/**
 * Navigation state management
 * @private
 */
const NavigationState = {
  isMenuOpen: false,
  activeSection: 'home',
  scrollTimeout: null,
  isScrolling: false,
  lastScrollPosition: 0,
};

/**
 * Navigation configuration
 * @private
 */
const NavigationConfig = {
  scrollOffset: 80, // Header height offset
  scrollBehavior: 'smooth',
  debounceDelay: 100,
  intersectionThreshold: 0.5,
  mobileBreakpoint: 768,
};

/**
 * DOM element cache for performance
 * @private
 */
const DOMCache = {
  header: null,
  nav: null,
  navLinks: null,
  mobileMenuToggle: null,
  sections: null,
  body: null,
};

/**
 * Initialize DOM cache
 * @private
 * @throws {Error} If required DOM elements are not found
 */
function initializeDOMCache() {
  DOMCache.header = document.querySelector('.header');
  DOMCache.nav = document.querySelector('.nav');
  DOMCache.navLinks = document.querySelectorAll('.nav-link');
  DOMCache.mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  DOMCache.body = document.body;
  
  // Cache all sections with IDs
  DOMCache.sections = Array.from(document.querySelectorAll('section[id]'));

  // Validate required elements
  if (!DOMCache.header || !DOMCache.nav || !DOMCache.mobileMenuToggle) {
    throw new Error('Required navigation elements not found in DOM');
  }

  if (DOMCache.navLinks.length === 0) {
    console.warn('No navigation links found');
  }

  if (DOMCache.sections.length === 0) {
    console.warn('No sections with IDs found for navigation');
  }
}

/**
 * Smooth scroll to target element
 * @param {string} targetId - ID of target element
 * @param {number} [offset=NavigationConfig.scrollOffset] - Scroll offset in pixels
 * @returns {boolean} Success status
 */
function smoothScrollTo(targetId, offset = NavigationConfig.scrollOffset) {
  try {
    const targetElement = document.getElementById(targetId);
    
    if (!targetElement) {
      console.error(`Target element with ID "${targetId}" not found`);
      return false;
    }

    const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - offset;

    // Check for native smooth scroll support
    if ('scrollBehavior' in document.documentElement.style) {
      window.scrollTo({
        top: targetPosition,
        behavior: NavigationConfig.scrollBehavior,
      });
    } else {
      // Fallback for browsers without smooth scroll support
      window.scrollTo(0, targetPosition);
    }

    return true;
  } catch (error) {
    console.error('Error during smooth scroll:', error);
    return false;
  }
}

/**
 * Handle navigation link click
 * @private
 * @param {Event} event - Click event
 */
function handleNavLinkClick(event) {
  const link = event.currentTarget;
  const href = link.getAttribute('href');

  // Only handle internal anchor links
  if (!href || !href.startsWith('#')) {
    return;
  }

  event.preventDefault();

  const targetId = href.substring(1);
  
  // Close mobile menu if open
  if (NavigationState.isMenuOpen) {
    closeMobileMenu();
  }

  // Perform smooth scroll
  const scrollSuccess = smoothScrollTo(targetId);

  if (scrollSuccess) {
    // Update active state
    updateActiveNavLink(targetId);
    
    // Update URL without triggering scroll
    if (window.history && window.history.pushState) {
      window.history.pushState(null, '', href);
    }

    // Set focus to target for accessibility
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      targetElement.setAttribute('tabindex', '-1');
      targetElement.focus();
      targetElement.removeAttribute('tabindex');
    }
  }
}

/**
 * Update active navigation link
 * @private
 * @param {string} sectionId - Active section ID
 */
function updateActiveNavLink(sectionId) {
  if (NavigationState.activeSection === sectionId) {
    return;
  }

  NavigationState.activeSection = sectionId;

  DOMCache.navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    const isActive = href === `#${sectionId}`;
    
    if (isActive) {
      link.setAttribute('aria-current', 'page');
      link.classList.add('active');
    } else {
      link.removeAttribute('aria-current');
      link.classList.remove('active');
    }
  });
}

/**
 * Toggle mobile menu
 * @private
 */
function toggleMobileMenu() {
  if (NavigationState.isMenuOpen) {
    closeMobileMenu();
  } else {
    openMobileMenu();
  }
}

/**
 * Open mobile menu
 * @private
 */
function openMobileMenu() {
  NavigationState.isMenuOpen = true;
  
  DOMCache.mobileMenuToggle.setAttribute('aria-expanded', 'true');
  DOMCache.nav.classList.add('nav--open');
  DOMCache.body.classList.add('menu-open');
  
  // Trap focus within menu
  trapFocusInMenu();
  
  // Add escape key listener
  document.addEventListener('keydown', handleMenuEscapeKey);
}

/**
 * Close mobile menu
 * @private
 */
function closeMobileMenu() {
  NavigationState.isMenuOpen = false;
  
  DOMCache.mobileMenuToggle.setAttribute('aria-expanded', 'false');
  DOMCache.nav.classList.remove('nav--open');
  DOMCache.body.classList.remove('menu-open');
  
  // Remove escape key listener
  document.removeEventListener('keydown', handleMenuEscapeKey);
  
  // Return focus to toggle button
  DOMCache.mobileMenuToggle.focus();
}

/**
 * Handle escape key in mobile menu
 * @private
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleMenuEscapeKey(event) {
  if (event.key === 'Escape' && NavigationState.isMenuOpen) {
    closeMobileMenu();
  }
}

/**
 * Trap focus within mobile menu
 * @private
 */
function trapFocusInMenu() {
  const focusableElements = DOMCache.nav.querySelectorAll(
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  
  if (focusableElements.length === 0) {
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  function handleTabKey(event) {
    if (event.key !== 'Tab') {
      return;
    }

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  DOMCache.nav.addEventListener('keydown', handleTabKey);
}

/**
 * Debounce function for performance optimization
 * @private
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, delay) {
  let timeoutId;
  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Handle scroll event for active section highlighting
 * @private
 */
function handleScroll() {
  NavigationState.isScrolling = true;

  // Clear existing timeout
  if (NavigationState.scrollTimeout) {
    clearTimeout(NavigationState.scrollTimeout);
  }

  // Set timeout to detect scroll end
  NavigationState.scrollTimeout = setTimeout(() => {
    NavigationState.isScrolling = false;
  }, NavigationConfig.debounceDelay);

  // Find active section
  const scrollPosition = window.pageYOffset + NavigationConfig.scrollOffset + 50;
  
  let activeSection = null;

  for (let i = DOMCache.sections.length - 1; i >= 0; i--) {
    const section = DOMCache.sections[i];
    const sectionTop = section.offsetTop;
    
    if (scrollPosition >= sectionTop) {
      activeSection = section.id;
      break;
    }
  }

  // Default to first section if none found
  if (!activeSection && DOMCache.sections.length > 0) {
    activeSection = DOMCache.sections[0].id;
  }

  if (activeSection) {
    updateActiveNavLink(activeSection);
  }

  // Update scroll position
  NavigationState.lastScrollPosition = window.pageYOffset;
}

/**
 * Initialize Intersection Observer for section visibility
 * @private
 */
function initializeIntersectionObserver() {
  // Check for Intersection Observer support
  if (!('IntersectionObserver' in window)) {
    console.warn('Intersection Observer not supported, falling back to scroll events');
    return;
  }

  const observerOptions = {
    root: null,
    rootMargin: `-${NavigationConfig.scrollOffset}px 0px -50% 0px`,
    threshold: NavigationConfig.intersectionThreshold,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !NavigationState.isScrolling) {
        updateActiveNavLink(entry.target.id);
      }
    });
  }, observerOptions);

  // Observe all sections
  DOMCache.sections.forEach((section) => {
    observer.observe(section);
  });
}

/**
 * Handle window resize for responsive behavior
 * @private
 */
function handleResize() {
  const isMobile = window.innerWidth < NavigationConfig.mobileBreakpoint;
  
  // Close mobile menu on resize to desktop
  if (!isMobile && NavigationState.isMenuOpen) {
    closeMobileMenu();
  }
}

/**
 * Initialize keyboard navigation
 * @private
 */
function initializeKeyboardNavigation() {
  // Handle arrow key navigation in nav links
  DOMCache.navLinks.forEach((link, index) => {
    link.addEventListener('keydown', (event) => {
      let targetIndex = -1;

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          targetIndex = (index + 1) % DOMCache.navLinks.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          targetIndex = (index - 1 + DOMCache.navLinks.length) % DOMCache.navLinks.length;
          break;
        case 'Home':
          event.preventDefault();
          targetIndex = 0;
          break;
        case 'End':
          event.preventDefault();
          targetIndex = DOMCache.navLinks.length - 1;
          break;
        default:
          return;
      }

      if (targetIndex >= 0) {
        DOMCache.navLinks[targetIndex].focus();
      }
    });
  });
}

/**
 * Initialize navigation component
 * @public
 * @throws {Error} If initialization fails
 */
function initializeNavigation() {
  try {
    // Initialize DOM cache
    initializeDOMCache();

    // Add click event listeners to navigation links
    DOMCache.navLinks.forEach((link) => {
      link.addEventListener('click', handleNavLinkClick);
    });

    // Add mobile menu toggle listener
    DOMCache.mobileMenuToggle.addEventListener('click', toggleMobileMenu);

    // Initialize scroll handling with debounce
    const debouncedScroll = debounce(handleScroll, NavigationConfig.debounceDelay);
    window.addEventListener('scroll', debouncedScroll, { passive: true });

    // Initialize Intersection Observer
    initializeIntersectionObserver();

    // Initialize resize handler
    const debouncedResize = debounce(handleResize, 250);
    window.addEventListener('resize', debouncedResize, { passive: true });

    // Initialize keyboard navigation
    initializeKeyboardNavigation();

    // Set initial active section
    handleScroll();

    console.log('Navigation component initialized successfully');
  } catch (error) {
    console.error('Failed to initialize navigation component:', error);
    throw error;
  }
}

/**
 * Cleanup navigation component
 * @public
 */
function cleanupNavigation() {
  try {
    // Remove event listeners
    DOMCache.navLinks.forEach((link) => {
      link.removeEventListener('click', handleNavLinkClick);
    });

    if (DOMCache.mobileMenuToggle) {
      DOMCache.mobileMenuToggle.removeEventListener('click', toggleMobileMenu);
    }

    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('resize', handleResize);
    document.removeEventListener('keydown', handleMenuEscapeKey);

    // Close mobile menu if open
    if (NavigationState.isMenuOpen) {
      closeMobileMenu();
    }

    // Clear timeouts
    if (NavigationState.scrollTimeout) {
      clearTimeout(NavigationState.scrollTimeout);
    }

    console.log('Navigation component cleaned up successfully');
  } catch (error) {
    console.error('Error during navigation cleanup:', error);
  }
}

/**
 * Public API
 */
export {
  initializeNavigation,
  cleanupNavigation,
  smoothScrollTo,
};