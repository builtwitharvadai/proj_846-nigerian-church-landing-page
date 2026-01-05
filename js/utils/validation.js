/**
 * Form Validation Utility Module
 * 
 * Provides comprehensive form validation functions with real-time feedback
 * for email, phone, required fields, and message length validation.
 * 
 * @module validation
 */

/**
 * Validation result object structure
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether the validation passed
 * @property {string} message - User-friendly error message if invalid
 */

/**
 * Email validation regex pattern
 * Validates standard email format with proper domain structure
 * @private
 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Phone validation regex pattern
 * Supports international formats with optional country codes
 * @private
 */
const PHONE_REGEX = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;

/**
 * Name validation regex pattern
 * Allows letters, spaces, hyphens, and apostrophes
 * @private
 */
const NAME_REGEX = /^[A-Za-z\s'-]+$/;

/**
 * Validation constraints
 * @private
 */
const CONSTRAINTS = Object.freeze({
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  MESSAGE_MIN_LENGTH: 10,
  MESSAGE_MAX_LENGTH: 1000,
  PHONE_MIN_LENGTH: 7,
  PHONE_MAX_LENGTH: 20
});

/**
 * Validates required field is not empty
 * 
 * @param {string} value - Field value to validate
 * @param {string} fieldName - Human-readable field name for error messages
 * @returns {ValidationResult} Validation result with status and message
 */
export function validateRequired(value, fieldName) {
  const trimmedValue = String(value || '').trim();
  
  if (!trimmedValue) {
    return {
      valid: false,
      message: `${fieldName} is required`
    };
  }
  
  return {
    valid: true,
    message: ''
  };
}

/**
 * Validates email address format
 * 
 * @param {string} email - Email address to validate
 * @returns {ValidationResult} Validation result with status and message
 */
export function validateEmail(email) {
  const trimmedEmail = String(email || '').trim();
  
  if (!trimmedEmail) {
    return {
      valid: false,
      message: 'Email address is required'
    };
  }
  
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return {
      valid: false,
      message: 'Please enter a valid email address (e.g., name@example.com)'
    };
  }
  
  if (trimmedEmail.length > 254) {
    return {
      valid: false,
      message: 'Email address is too long'
    };
  }
  
  return {
    valid: true,
    message: ''
  };
}

/**
 * Validates phone number format
 * Supports international formats with optional country codes
 * 
 * @param {string} phone - Phone number to validate
 * @param {boolean} required - Whether phone is required field
 * @returns {ValidationResult} Validation result with status and message
 */
export function validatePhone(phone, required = false) {
  const trimmedPhone = String(phone || '').trim();
  
  if (!trimmedPhone) {
    if (required) {
      return {
        valid: false,
        message: 'Phone number is required'
      };
    }
    return {
      valid: true,
      message: ''
    };
  }
  
  if (trimmedPhone.length < CONSTRAINTS.PHONE_MIN_LENGTH) {
    return {
      valid: false,
      message: 'Phone number is too short'
    };
  }
  
  if (trimmedPhone.length > CONSTRAINTS.PHONE_MAX_LENGTH) {
    return {
      valid: false,
      message: 'Phone number is too long'
    };
  }
  
  if (!PHONE_REGEX.test(trimmedPhone)) {
    return {
      valid: false,
      message: 'Please enter a valid phone number (e.g., +234 801 234 5678)'
    };
  }
  
  return {
    valid: true,
    message: ''
  };
}

/**
 * Validates name field (full name, first name, etc.)
 * 
 * @param {string} name - Name to validate
 * @returns {ValidationResult} Validation result with status and message
 */
export function validateName(name) {
  const trimmedName = String(name || '').trim();
  
  if (!trimmedName) {
    return {
      valid: false,
      message: 'Name is required'
    };
  }
  
  if (trimmedName.length < CONSTRAINTS.NAME_MIN_LENGTH) {
    return {
      valid: false,
      message: `Name must be at least ${CONSTRAINTS.NAME_MIN_LENGTH} characters`
    };
  }
  
  if (trimmedName.length > CONSTRAINTS.NAME_MAX_LENGTH) {
    return {
      valid: false,
      message: `Name must not exceed ${CONSTRAINTS.NAME_MAX_LENGTH} characters`
    };
  }
  
  if (!NAME_REGEX.test(trimmedName)) {
    return {
      valid: false,
      message: 'Name can only contain letters, spaces, hyphens, and apostrophes'
    };
  }
  
  return {
    valid: true,
    message: ''
  };
}

/**
 * Validates message/textarea length
 * 
 * @param {string} message - Message text to validate
 * @returns {ValidationResult} Validation result with status and message
 */
export function validateMessage(message) {
  const trimmedMessage = String(message || '').trim();
  
  if (!trimmedMessage) {
    return {
      valid: false,
      message: 'Message is required'
    };
  }
  
  if (trimmedMessage.length < CONSTRAINTS.MESSAGE_MIN_LENGTH) {
    const remaining = CONSTRAINTS.MESSAGE_MIN_LENGTH - trimmedMessage.length;
    return {
      valid: false,
      message: `Message must be at least ${CONSTRAINTS.MESSAGE_MIN_LENGTH} characters (${remaining} more needed)`
    };
  }
  
  if (trimmedMessage.length > CONSTRAINTS.MESSAGE_MAX_LENGTH) {
    const excess = trimmedMessage.length - CONSTRAINTS.MESSAGE_MAX_LENGTH;
    return {
      valid: false,
      message: `Message must not exceed ${CONSTRAINTS.MESSAGE_MAX_LENGTH} characters (${excess} too many)`
    };
  }
  
  return {
    valid: true,
    message: ''
  };
}

/**
 * Validates select/dropdown field has a value selected
 * 
 * @param {string} value - Selected value to validate
 * @param {string} fieldName - Human-readable field name for error messages
 * @returns {ValidationResult} Validation result with status and message
 */
export function validateSelect(value, fieldName) {
  const trimmedValue = String(value || '').trim();
  
  if (!trimmedValue || trimmedValue === '') {
    return {
      valid: false,
      message: `Please select a ${fieldName.toLowerCase()}`
    };
  }
  
  return {
    valid: true,
    message: ''
  };
}

/**
 * Displays validation error message for a field
 * 
 * @param {HTMLElement} field - Form field element
 * @param {string} message - Error message to display
 */
export function showError(field, message) {
  if (!field) {
    console.error('showError: field element is required');
    return;
  }
  
  const errorId = field.getAttribute('aria-describedby');
  const errorElement = errorId ? document.getElementById(errorId) : null;
  
  field.setAttribute('aria-invalid', 'true');
  field.classList.add('error');
  
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }
}

/**
 * Clears validation error message for a field
 * 
 * @param {HTMLElement} field - Form field element
 */
export function clearError(field) {
  if (!field) {
    console.error('clearError: field element is required');
    return;
  }
  
  const errorId = field.getAttribute('aria-describedby');
  const errorElement = errorId ? document.getElementById(errorId) : null;
  
  field.setAttribute('aria-invalid', 'false');
  field.classList.remove('error');
  
  if (errorElement) {
    errorElement.textContent = '';
    errorElement.style.display = 'none';
  }
}

/**
 * Clears all validation errors in a form
 * 
 * @param {HTMLFormElement} form - Form element to clear errors from
 */
export function clearAllErrors(form) {
  if (!form) {
    console.error('clearAllErrors: form element is required');
    return;
  }
  
  const fields = form.querySelectorAll('[aria-invalid="true"]');
  fields.forEach(field => clearError(field));
}

/**
 * Validates a single form field and displays feedback
 * 
 * @param {HTMLElement} field - Form field element to validate
 * @returns {boolean} True if field is valid, false otherwise
 */
export function validateField(field) {
  if (!field) {
    console.error('validateField: field element is required');
    return false;
  }
  
  const fieldType = field.type;
  const fieldName = field.name;
  const fieldValue = field.value;
  const isRequired = field.hasAttribute('required');
  
  let result;
  
  switch (fieldType) {
    case 'email':
      result = validateEmail(fieldValue);
      break;
      
    case 'tel':
      result = validatePhone(fieldValue, isRequired);
      break;
      
    case 'text':
      if (fieldName === 'name') {
        result = validateName(fieldValue);
      } else if (isRequired) {
        const label = field.labels?.[0]?.textContent || 'This field';
        result = validateRequired(fieldValue, label);
      } else {
        result = { valid: true, message: '' };
      }
      break;
      
    case 'select-one':
      if (isRequired) {
        const label = field.labels?.[0]?.textContent || 'This field';
        result = validateSelect(fieldValue, label);
      } else {
        result = { valid: true, message: '' };
      }
      break;
      
    case 'textarea':
      result = validateMessage(fieldValue);
      break;
      
    default:
      if (isRequired) {
        const label = field.labels?.[0]?.textContent || 'This field';
        result = validateRequired(fieldValue, label);
      } else {
        result = { valid: true, message: '' };
      }
  }
  
  if (result.valid) {
    clearError(field);
    return true;
  } else {
    showError(field, result.message);
    return false;
  }
}

/**
 * Validates entire form and displays all errors
 * 
 * @param {HTMLFormElement} form - Form element to validate
 * @returns {boolean} True if form is valid, false otherwise
 */
export function validateForm(form) {
  if (!form) {
    console.error('validateForm: form element is required');
    return false;
  }
  
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
 * Displays success message to user
 * 
 * @param {HTMLElement} container - Container element for success message
 * @param {string} message - Success message to display
 */
export function showSuccess(container, message) {
  if (!container) {
    console.error('showSuccess: container element is required');
    return;
  }
  
  container.innerHTML = `
    <div class="success-message" role="status" aria-live="polite">
      <p>${message}</p>
    </div>
  `;
  container.style.display = 'block';
  
  setTimeout(() => {
    container.style.display = 'none';
    container.innerHTML = '';
  }, 5000);
}

/**
 * Displays general error message to user
 * 
 * @param {HTMLElement} container - Container element for error message
 * @param {string} message - Error message to display
 */
export function showFormError(container, message) {
  if (!container) {
    console.error('showFormError: container element is required');
    return;
  }
  
  container.innerHTML = `
    <div class="error-message" role="alert" aria-live="assertive">
      <p>${message}</p>
    </div>
  `;
  container.style.display = 'block';
}

/**
 * Sanitizes user input to prevent XSS attacks
 * 
 * @param {string} input - User input to sanitize
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input) {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}