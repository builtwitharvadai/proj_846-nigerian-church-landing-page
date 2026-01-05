/**
 * Contact Form Component Module
 * 
 * Handles contact form functionality including real-time validation,
 * form submission to Formspree, success/error message display,
 * form reset, and loading states with comprehensive error handling.
 * 
 * @module contact-form
 */

import {
  validateName,
  validateEmail,
  validatePhone,
  validateSelect,
  validateMessage,
  validateField,
  clearError,
  clearAllErrors,
  showSuccess,
  showFormError,
  sanitizeInput
} from '../utils/validation.js';

/**
 * Formspree configuration
 * @private
 */
const FORMSPREE_CONFIG = Object.freeze({
  ENDPOINT: 'https://formspree.io/f/YOUR_FORM_ID',
  TIMEOUT: 10000,
  MAX_RETRIES: 2,
  RETRY_DELAY: 1000
});

/**
 * Form state management
 * @private
 */
const formState = {
  isSubmitting: false,
  retryCount: 0,
  abortController: null
};

/**
 * Initializes contact form functionality
 * Sets up event listeners and validation
 * 
 * @returns {void}
 */
export function initContactForm() {
  const form = document.querySelector('.contact-form');
  
  if (!form) {
    console.warn('Contact form not found on page');
    return;
  }

  try {
    setupFormValidation(form);
    setupFormSubmission(form);
    setupFormReset(form);
    
    console.info('Contact form initialized successfully');
  } catch (error) {
    console.error('Failed to initialize contact form:', error);
    showFormError(
      getStatusContainer(form),
      'Failed to initialize contact form. Please refresh the page.'
    );
  }
}

/**
 * Sets up real-time validation for form fields
 * 
 * @param {HTMLFormElement} form - Form element
 * @private
 */
function setupFormValidation(form) {
  const fields = form.querySelectorAll('input, select, textarea');
  
  fields.forEach(field => {
    // Validate on blur for better UX
    field.addEventListener('blur', () => {
      if (field.value.trim() || field.hasAttribute('required')) {
        validateField(field);
      }
    });

    // Clear errors on input
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') {
        clearError(field);
      }
    });

    // Special handling for select fields
    if (field.tagName === 'SELECT') {
      field.addEventListener('change', () => {
        validateField(field);
      });
    }
  });
}

/**
 * Sets up form submission handling
 * 
 * @param {HTMLFormElement} form - Form element
 * @private
 */
function setupFormSubmission(form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    if (formState.isSubmitting) {
      console.warn('Form submission already in progress');
      return;
    }

    await handleFormSubmit(form);
  });
}

/**
 * Sets up form reset handling
 * 
 * @param {HTMLFormElement} form - Form element
 * @private
 */
function setupFormReset(form) {
  const resetButton = form.querySelector('button[type="reset"]');
  
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      clearAllErrors(form);
      clearStatusMessages(form);
      formState.retryCount = 0;
    });
  }
}

/**
 * Handles form submission with validation and API call
 * 
 * @param {HTMLFormElement} form - Form element
 * @returns {Promise<void>}
 * @private
 */
async function handleFormSubmit(form) {
  const statusContainer = getStatusContainer(form);
  const submitButton = form.querySelector('button[type="submit"]');
  
  try {
    // Clear previous status messages
    clearStatusMessages(form);
    
    // Validate all fields
    if (!validateAllFields(form)) {
      showFormError(
        statusContainer,
        'Please correct the errors in the form before submitting.'
      );
      return;
    }

    // Collect and sanitize form data
    const formData = collectFormData(form);
    
    // Set loading state
    setLoadingState(submitButton, true);
    formState.isSubmitting = true;

    // Submit to Formspree
    const result = await submitToFormspree(formData);

    if (result.success) {
      handleSubmissionSuccess(form, statusContainer);
    } else {
      handleSubmissionError(form, statusContainer, result.error);
    }

  } catch (error) {
    console.error('Form submission error:', error);
    handleSubmissionError(
      form,
      statusContainer,
      'An unexpected error occurred. Please try again.'
    );
  } finally {
    setLoadingState(submitButton, false);
    formState.isSubmitting = false;
  }
}

/**
 * Validates all form fields
 * 
 * @param {HTMLFormElement} form - Form element
 * @returns {boolean} True if all fields are valid
 * @private
 */
function validateAllFields(form) {
  clearAllErrors(form);
  
  const fields = form.querySelectorAll('input, select, textarea');
  let isValid = true;
  let firstInvalidField = null;

  fields.forEach(field => {
    const fieldValid = validateField(field);
    if (!fieldValid) {
      isValid = false;
      if (!firstInvalidField) {
        firstInvalidField = field;
      }
    }
  });

  if (!isValid && firstInvalidField) {
    firstInvalidField.focus();
  }

  return isValid;
}

/**
 * Collects and sanitizes form data
 * 
 * @param {HTMLFormElement} form - Form element
 * @returns {Object} Sanitized form data
 * @private
 */
function collectFormData(form) {
  const formData = new FormData(form);
  const data = {};

  for (const [key, value] of formData.entries()) {
    data[key] = sanitizeInput(String(value).trim());
  }

  // Add metadata
  data._subject = `Contact Form: ${data.subject || 'General Inquiry'}`;
  data._replyto = data.email;
  data._gotcha = ''; // Honeypot field for spam protection

  return data;
}

/**
 * Submits form data to Formspree with retry logic
 * 
 * @param {Object} data - Form data to submit
 * @returns {Promise<{success: boolean, error?: string}>}
 * @private
 */
async function submitToFormspree(data) {
  formState.abortController = new AbortController();
  
  try {
    const response = await fetchWithTimeout(
      FORMSPREE_CONFIG.ENDPOINT,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data),
        signal: formState.abortController.signal
      },
      FORMSPREE_CONFIG.TIMEOUT
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || 
        `Server responded with status ${response.status}`
      );
    }

    const result = await response.json();
    
    if (result.ok) {
      formState.retryCount = 0;
      return { success: true };
    } else {
      throw new Error(result.error || 'Form submission failed');
    }

  } catch (error) {
    if (error.name === 'AbortError') {
      return { 
        success: false, 
        error: 'Request timed out. Please check your connection and try again.' 
      };
    }

    // Retry logic for network errors
    if (shouldRetry(error) && formState.retryCount < FORMSPREE_CONFIG.MAX_RETRIES) {
      formState.retryCount++;
      console.warn(`Retrying form submission (attempt ${formState.retryCount})...`);
      
      await delay(FORMSPREE_CONFIG.RETRY_DELAY * formState.retryCount);
      return submitToFormspree(data);
    }

    return { 
      success: false, 
      error: getErrorMessage(error) 
    };
  } finally {
    formState.abortController = null;
  }
}

/**
 * Fetch with timeout support
 * 
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>}
 * @private
 */
async function fetchWithTimeout(url, options, timeout) {
  const timeoutId = setTimeout(() => {
    if (options.signal) {
      options.signal.abort();
    }
  }, timeout);

  try {
    const response = await fetch(url, options);
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Determines if request should be retried
 * 
 * @param {Error} error - Error object
 * @returns {boolean}
 * @private
 */
function shouldRetry(error) {
  const retryableErrors = [
    'Failed to fetch',
    'NetworkError',
    'Network request failed',
    'ECONNREFUSED',
    'ETIMEDOUT'
  ];

  return retryableErrors.some(msg => 
    error.message.includes(msg)
  );
}

/**
 * Gets user-friendly error message
 * 
 * @param {Error} error - Error object
 * @returns {string}
 * @private
 */
function getErrorMessage(error) {
  if (error.message.includes('Failed to fetch')) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }
  
  if (error.message.includes('NetworkError')) {
    return 'Network error occurred. Please check your connection and try again.';
  }

  return error.message || 'An error occurred while submitting the form. Please try again.';
}

/**
 * Handles successful form submission
 * 
 * @param {HTMLFormElement} form - Form element
 * @param {HTMLElement} statusContainer - Status message container
 * @private
 */
function handleSubmissionSuccess(form, statusContainer) {
  showSuccess(
    statusContainer,
    'Thank you for your message! We will get back to you as soon as possible.'
  );

  // Reset form after successful submission
  form.reset();
  clearAllErrors(form);

  // Announce success to screen readers
  announceToScreenReader('Form submitted successfully');

  // Track submission (if analytics available)
  trackFormSubmission('success');
}

/**
 * Handles form submission error
 * 
 * @param {HTMLFormElement} form - Form element
 * @param {HTMLElement} statusContainer - Status message container
 * @param {string} errorMessage - Error message to display
 * @private
 */
function handleSubmissionError(form, statusContainer, errorMessage) {
  showFormError(statusContainer, errorMessage);

  // Announce error to screen readers
  announceToScreenReader(`Form submission failed: ${errorMessage}`);

  // Track submission error (if analytics available)
  trackFormSubmission('error', errorMessage);
}

/**
 * Sets loading state for submit button
 * 
 * @param {HTMLButtonElement} button - Submit button
 * @param {boolean} isLoading - Loading state
 * @private
 */
function setLoadingState(button, isLoading) {
  if (!button) {
    return;
  }

  const buttonText = button.querySelector('.button-text');
  
  if (isLoading) {
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    
    if (buttonText) {
      buttonText.textContent = 'Sending...';
    }
    
    button.classList.add('loading');
  } else {
    button.disabled = false;
    button.setAttribute('aria-busy', 'false');
    
    if (buttonText) {
      buttonText.textContent = 'Send Message';
    }
    
    button.classList.remove('loading');
  }
}

/**
 * Gets status message container
 * 
 * @param {HTMLFormElement} form - Form element
 * @returns {HTMLElement}
 * @private
 */
function getStatusContainer(form) {
  let container = form.parentElement.querySelector('.form-status');
  
  if (!container) {
    container = document.createElement('div');
    container.className = 'form-status';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    form.parentElement.appendChild(container);
  }

  return container;
}

/**
 * Clears status messages
 * 
 * @param {HTMLFormElement} form - Form element
 * @private
 */
function clearStatusMessages(form) {
  const statusContainer = getStatusContainer(form);
  statusContainer.innerHTML = '';
  statusContainer.style.display = 'none';
}

/**
 * Announces message to screen readers
 * 
 * @param {string} message - Message to announce
 * @private
 */
function announceToScreenReader(message) {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Tracks form submission for analytics
 * 
 * @param {string} status - Submission status
 * @param {string} [error] - Error message if failed
 * @private
 */
function trackFormSubmission(status, error) {
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'form_submission', {
        event_category: 'Contact Form',
        event_label: status,
        value: error || undefined
      });
    }
  } catch (err) {
    console.warn('Analytics tracking failed:', err);
  }
}

/**
 * Delays execution
 * 
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 * @private
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Cleanup function for form
 * Cancels pending requests and removes event listeners
 * 
 * @returns {void}
 */
export function cleanupContactForm() {
  if (formState.abortController) {
    formState.abortController.abort();
    formState.abortController = null;
  }
  
  formState.isSubmitting = false;
  formState.retryCount = 0;
  
  console.info('Contact form cleaned up');
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContactForm);
} else {
  initContactForm();
}