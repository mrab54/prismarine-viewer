/**
 * Socket message validation schemas
 * @module lib/schemas/socketMessages
 */

/**
 * Simple schema validator
 * @param {Object} data - Data to validate
 * @param {Object} schema - Schema definition
 * @returns {{valid: boolean, errors: string[]}}
 */
function validate (data, schema) {
  const errors = []

  if (data === null || data === undefined) {
    return { valid: false, errors: ['Data is required'] }
  }

  if (typeof data !== 'object') {
    return { valid: false, errors: ['Data must be an object'] }
  }

  for (const [key, rules] of Object.entries(schema)) {
    const value = data[key]

    // Check required fields
    if (rules.required && (value === undefined || value === null)) {
      errors.push(`Field '${key}' is required`)
      continue
    }

    // Skip validation if field is optional and not present
    if (value === undefined || value === null) {
      continue
    }

    // Type checking
    if (rules.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value
      if (rules.type === 'array' && !Array.isArray(value)) {
        errors.push(`Field '${key}' must be an array`)
      } else if (rules.type !== 'array' && actualType !== rules.type) {
        errors.push(`Field '${key}' must be of type ${rules.type}, got ${actualType}`)
      }
    }

    // Number range validation
    if (rules.type === 'number' && typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`Field '${key}' must be >= ${rules.min}`)
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`Field '${key}' must be <= ${rules.max}`)
      }
      if (rules.integer && !Number.isInteger(value)) {
        errors.push(`Field '${key}' must be an integer`)
      }
    }

    // String validation
    if (rules.type === 'string' && typeof value === 'string') {
      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        errors.push(`Field '${key}' must be at most ${rules.maxLength} characters`)
      }
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`Field '${key}' does not match required pattern`)
      }
    }

    // Array validation
    if (rules.type === 'array' && Array.isArray(value)) {
      if (rules.maxItems !== undefined && value.length > rules.maxItems) {
        errors.push(`Field '${key}' must have at most ${rules.maxItems} items`)
      }
    }

    // Enum validation
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(`Field '${key}' must be one of: ${rules.enum.join(', ')}`)
    }

    // Nested object validation
    if (rules.properties && typeof value === 'object' && !Array.isArray(value)) {
      const nestedResult = validate(value, rules.properties)
      if (!nestedResult.valid) {
        errors.push(...nestedResult.errors.map(e => `${key}.${e}`))
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

// Schema definitions for socket messages

const vec3Schema = {
  x: { type: 'number', required: true },
  y: { type: 'number', required: true },
  z: { type: 'number', required: true }
}

const schemas = {
  // Position update from server
  position: {
    pos: { type: 'object', required: true, properties: vec3Schema },
    yaw: { type: 'number' },
    pitch: { type: 'number' },
    addMesh: { type: 'boolean' }
  },

  // Block clicked event
  blockClicked: {
    block: { type: 'object', required: true },
    face: { type: 'number', required: true, min: 0, max: 5, integer: true },
    button: { type: 'number', required: true, min: 0, max: 2, integer: true }
  },

  // Mouse click from client
  mouseClick: {
    origin: { type: 'object', required: true, properties: vec3Schema },
    direction: { type: 'object', required: true, properties: vec3Schema },
    button: { type: 'number', required: true, min: 0, max: 2, integer: true }
  },

  // Load chunk
  loadChunk: {
    x: { type: 'number', required: true, integer: true },
    z: { type: 'number', required: true, integer: true },
    chunk: { type: 'object', required: true }
  },

  // Unload chunk
  unloadChunk: {
    x: { type: 'number', required: true, integer: true },
    z: { type: 'number', required: true, integer: true }
  },

  // Block update
  blockUpdate: {
    pos: { type: 'object', required: true, properties: vec3Schema },
    stateId: { type: 'number', required: true, integer: true, min: 0 }
  },

  // Entity update
  entity: {
    id: { required: true },
    name: { type: 'string', maxLength: 100 },
    pos: { type: 'object', properties: vec3Schema },
    width: { type: 'number', min: 0, max: 100 },
    height: { type: 'number', min: 0, max: 100 },
    username: { type: 'string', maxLength: 50 },
    yaw: { type: 'number' },
    pitch: { type: 'number' },
    delete: { type: 'boolean' }
  },

  // Primitive drawing
  primitive: {
    id: { required: true },
    type: { type: 'string', enum: ['line', 'boxgrid', 'points'] },
    points: { type: 'array', maxItems: 10000 },
    color: {},
    size: { type: 'number', min: 0, max: 100 },
    start: { type: 'object', properties: vec3Schema },
    end: { type: 'object', properties: vec3Schema }
  },

  // Version
  version: {
    type: 'string',
    pattern: /^\d+\.\d+(\.\d+)?$/,
    maxLength: 20
  }
}

/**
 * Validate a socket message against its schema
 * @param {string} messageType - Type of message
 * @param {Object} data - Message data
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateMessage (messageType, data) {
  const schema = schemas[messageType]
  if (!schema) {
    // Unknown message types pass through (backwards compatibility)
    return { valid: true, errors: [] }
  }

  // Handle primitive types (like version which is just a string)
  if (schema.type && schema.type !== 'object') {
    const actualType = typeof data
    const expectedType = schema.type
    if (actualType !== expectedType) {
      return { valid: false, errors: [`Expected ${expectedType}, got ${actualType}`] }
    }
    if (schema.pattern && !schema.pattern.test(data)) {
      return { valid: false, errors: ['Value does not match required pattern'] }
    }
    if (schema.maxLength && data.length > schema.maxLength) {
      return { valid: false, errors: [`Value exceeds maximum length of ${schema.maxLength}`] }
    }
    return { valid: true, errors: [] }
  }

  return validate(data, schema)
}

/**
 * Create a validating wrapper for socket event handlers
 * @param {string} messageType - Type of message to validate
 * @param {Function} handler - Event handler function
 * @returns {Function} Wrapped handler that validates before calling original
 */
function withValidation (messageType, handler) {
  return function (data, ...args) {
    const result = validateMessage(messageType, data)
    if (!result.valid) {
      console.warn(`Invalid ${messageType} message:`, result.errors)
      return // Drop invalid messages
    }
    return handler.call(this, data, ...args)
  }
}

module.exports = {
  validate,
  validateMessage,
  withValidation,
  schemas
}
