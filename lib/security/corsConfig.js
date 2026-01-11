/**
 * CORS Configuration utilities
 * @module lib/security/corsConfig
 */

/**
 * Get CORS options based on environment
 * @param {Object} options - Configuration options
 * @param {string[]} options.allowedOrigins - Explicitly allowed origins
 * @param {boolean} options.development - Whether running in development mode
 * @returns {Object} CORS configuration object
 */
function getCorsOptions (options = {}) {
  const {
    allowedOrigins = [],
    development = process.env.NODE_ENV !== 'production'
  } = options

  // In development, allow localhost origins
  const devOrigins = [
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080'
  ]

  // Build the allowed origins list
  const origins = development
    ? [...new Set([...devOrigins, ...allowedOrigins])]
    : allowedOrigins

  return {
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) {
        return callback(null, true)
      }

      // Check if origin is allowed
      if (origins.length === 0 || origins.includes(origin)) {
        return callback(null, true)
      }

      // In development, also allow any localhost origin
      if (development && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
        return callback(null, true)
      }

      callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Length'],
    maxAge: 86400 // 24 hours
  }
}

/**
 * Get Socket.io CORS options
 * @param {Object} options - Configuration options
 * @returns {Object} Socket.io CORS configuration
 */
function getSocketCorsOptions (options = {}) {
  const corsOptions = getCorsOptions(options)

  return {
    cors: {
      origin: corsOptions.origin,
      credentials: corsOptions.credentials,
      methods: corsOptions.methods
    }
  }
}

/**
 * Express CORS middleware factory
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware
 */
function createCorsMiddleware (options = {}) {
  const corsOptions = getCorsOptions(options)

  return function corsMiddleware (req, res, next) {
    const origin = req.get('Origin')

    // Handle the origin check
    corsOptions.origin(origin, (err, allowed) => {
      if (err) {
        res.status(403).json({ error: 'CORS not allowed' })
        return
      }

      if (allowed && origin) {
        res.header('Access-Control-Allow-Origin', origin)
      }

      res.header('Access-Control-Allow-Credentials', 'true')
      res.header('Access-Control-Allow-Methods', corsOptions.methods.join(', '))
      res.header('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(', '))
      res.header('Access-Control-Expose-Headers', corsOptions.exposedHeaders.join(', '))
      res.header('Access-Control-Max-Age', String(corsOptions.maxAge))

      if (req.method === 'OPTIONS') {
        return res.sendStatus(204)
      }

      next()
    })
  }
}

module.exports = {
  getCorsOptions,
  getSocketCorsOptions,
  createCorsMiddleware
}
