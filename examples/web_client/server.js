const express = require('express')
const netApi = require('net-browserify')
const bodyParser = require('body-parser')
const compression = require('compression')
const { validateUrl, sanitizeProxyHeaders } = require('../../lib/security/urlValidator')
const { createCorsMiddleware } = require('../../lib/security/corsConfig')

// Create our app
const app = express()

// CORS configuration - restrict to allowed origins
const corsOptions = {
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [],
  development: process.env.NODE_ENV !== 'production'
}
app.use(createCorsMiddleware(corsOptions))

app.use(compression())
app.use(netApi())
app.use(express.static('./public'))

app.use(bodyParser.json({ limit: '100kb' }))

// Rate limiting for proxy endpoint
const proxyRequests = new Map()
const RATE_LIMIT_WINDOW_MS = 60000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60 // 60 requests per minute

function rateLimitMiddleware (req, res, next) {
  const ip = req.ip || req.connection.remoteAddress
  const now = Date.now()

  if (!proxyRequests.has(ip)) {
    proxyRequests.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
    return next()
  }

  const record = proxyRequests.get(ip)
  if (now > record.resetTime) {
    record.count = 1
    record.resetTime = now + RATE_LIMIT_WINDOW_MS
    return next()
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' })
  }

  record.count++
  next()
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [ip, record] of proxyRequests.entries()) {
    if (now > record.resetTime) {
      proxyRequests.delete(ip)
    }
  }
}, RATE_LIMIT_WINDOW_MS)

// Allowed domains for proxy (whitelist mode) - set via environment variable
const ALLOWED_PROXY_DOMAINS = process.env.ALLOWED_PROXY_DOMAINS
  ? process.env.ALLOWED_PROXY_DOMAINS.split(',')
  : null // null means check only for private IPs (SSRF protection)

// Proxy endpoint with security hardening
app.all('/proxy', rateLimitMiddleware, async function (req, res) {
  const targetURL = req.header('Target-URL')

  if (!targetURL) {
    return res.status(400).json({ error: 'Target-URL header is required' })
  }

  // Validate the URL to prevent SSRF attacks
  const validationResult = validateUrl(targetURL, {
    allowedProtocols: ['http:', 'https:'],
    allowedDomains: ALLOWED_PROXY_DOMAINS,
    blockedDomains: [] // Add domains to block if needed
  })

  if (!validationResult.valid) {
    console.warn(`Blocked proxy request to: ${targetURL} - ${validationResult.error}`)
    return res.status(403).json({ error: validationResult.error })
  }

  const parsedUrl = validationResult.parsedUrl

  try {
    // Use native fetch (Node 18+) or require node-fetch for older versions
    const fetch = globalThis.fetch || require('node-fetch')

    // Sanitize headers to prevent header injection
    const safeHeaders = sanitizeProxyHeaders(req.headers, parsedUrl.host)

    const response = await fetch(parsedUrl.href + (req.url !== '/' ? req.url : ''), {
      method: req.method,
      headers: safeHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      redirect: 'follow'
    })

    // Forward response headers (excluding sensitive ones)
    const headersToForward = ['content-type', 'content-length', 'cache-control']
    for (const header of headersToForward) {
      const value = response.headers.get(header)
      if (value) {
        res.set(header, value)
      }
    }

    res.status(response.status)

    // Stream the response body
    const arrayBuffer = await response.arrayBuffer()
    res.send(Buffer.from(arrayBuffer))
  } catch (error) {
    console.error('Proxy error:', error.message)
    res.status(502).json({ error: 'Failed to fetch from target URL' })
  }
})

// Catch-all for static files (no proxy behavior)
app.use((req, res) => {
  res.status(404).json({ error: '404 Not Found' })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// Start the server
const PORT = process.env.PORT || 8080
const server = app.listen(PORT, function () {
  console.log('Server listening on port ' + server.address().port)
  if (process.env.NODE_ENV !== 'production') {
    console.log('Running in development mode - CORS is relaxed for localhost')
  }
})
