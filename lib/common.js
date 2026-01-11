const path = require('path')

// Lazy-load external dependencies only when needed (for setupRoutes)
// This allows the standalone middleware functions to be tested without these deps
let compression
let express

function getCompression () {
  if (!compression) compression = require('compression')
  return compression
}

function getExpress () {
  if (!express) express = require('express')
  return express
}

/**
 * Security headers middleware
 * Provides protection against common web vulnerabilities
 */
function securityHeaders () {
  return function (req, res, next) {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN')

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff')

    // Enable XSS filter in browsers
    res.setHeader('X-XSS-Protection', '1; mode=block')

    // Control referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

    // Content Security Policy - allows Three.js to work
    // Note: 'unsafe-eval' is needed for some Three.js features
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' blob:",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "connect-src 'self' ws: wss:",
      "worker-src 'self' blob:",
      "font-src 'self'"
    ].join('; '))

    next()
  }
}

/**
 * Rate limiting middleware
 * @param {Object} options - Rate limit options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.maxRequests - Maximum requests per window
 * @returns {Function} Express middleware
 */
function rateLimit (options = {}) {
  const { windowMs = 60000, maxRequests = 100 } = options
  const requests = new Map()

  // Cleanup old entries periodically
  setInterval(() => {
    const now = Date.now()
    for (const [key, record] of requests.entries()) {
      if (now > record.resetTime) {
        requests.delete(key)
      }
    }
  }, windowMs)

  return function (req, res, next) {
    const ip = req.ip || req.connection.remoteAddress
    const now = Date.now()

    if (!requests.has(ip)) {
      requests.set(ip, { count: 1, resetTime: now + windowMs })
      return next()
    }

    const record = requests.get(ip)
    if (now > record.resetTime) {
      record.count = 1
      record.resetTime = now + windowMs
      return next()
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      })
    }

    record.count++
    next()
  }
}

/**
 * Error handling middleware
 */
function errorHandler () {
  return function (err, req, res, next) {
    console.error('Server error:', err)

    // Don't leak error details in production
    const message = process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message

    res.status(500).json({ error: message })
  }
}

/**
 * Setup common routes and middleware for the viewer server
 * @param {Object} app - Express application
 * @param {string} prefix - URL prefix for routes
 * @param {Object} options - Configuration options
 * @param {boolean} options.enableRateLimit - Enable rate limiting
 * @param {boolean} options.enableSecurityHeaders - Enable security headers
 */
function setupRoutes (app, prefix = '', options = {}) {
  const {
    enableRateLimit = true,
    enableSecurityHeaders = true
  } = options

  // Security headers
  if (enableSecurityHeaders) {
    app.use(securityHeaders())
  }

  // Compression
  app.use(getCompression()())

  // Rate limiting
  if (enableRateLimit) {
    app.use(rateLimit({ windowMs: 60000, maxRequests: 200 }))
  }

  // Static files
  app.use(prefix + '/', getExpress().static(path.join(__dirname, '../public')))

  // Error handler (should be last)
  app.use(errorHandler())
}

/**
 * Graceful shutdown handler
 * @param {Object} server - HTTP server
 * @param {Object} options - Shutdown options
 * @returns {Function} Shutdown function
 */
function createShutdownHandler (server, options = {}) {
  const { timeout = 10000, onShutdown = () => {} } = options

  return async function shutdown (signal) {
    console.log(`Received ${signal}, starting graceful shutdown...`)

    // Stop accepting new connections
    server.close(() => {
      console.log('HTTP server closed')
    })

    // Custom shutdown logic
    try {
      await onShutdown()
    } catch (error) {
      console.error('Error during shutdown:', error)
    }

    // Force exit after timeout
    setTimeout(() => {
      console.log('Forcing exit after timeout')
      process.exit(0)
    }, timeout)
  }
}

module.exports = {
  setupRoutes,
  securityHeaders,
  rateLimit,
  errorHandler,
  createShutdownHandler
}
