/**
 * URL Validation utilities to prevent SSRF attacks
 * @module lib/security/urlValidator
 */

// Private IP ranges that should be blocked
const PRIVATE_IP_RANGES = [
  /^127\./, // Loopback
  /^10\./, // Class A private
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Class B private
  /^192\.168\./, // Class C private
  /^169\.254\./, // Link-local
  /^::1$/, // IPv6 loopback
  /^fc00:/, // IPv6 private
  /^fe80:/, // IPv6 link-local
  /^0\./, // Current network
  /^224\./, // Multicast
  /^240\./, // Reserved
  /^255\./ // Broadcast
]

// Blocked hostnames
const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  '0.0.0.0',
  '[::]',
  '[::1]'
]

/**
 * Check if an IP address is private/internal
 * @param {string} ip - IP address to check
 * @returns {boolean} True if IP is private
 */
function isPrivateIP (ip) {
  if (!ip) return true

  // Check against blocked hostnames
  if (BLOCKED_HOSTNAMES.includes(ip.toLowerCase())) {
    return true
  }

  // Check against private IP ranges
  for (const range of PRIVATE_IP_RANGES) {
    if (range.test(ip)) {
      return true
    }
  }

  return false
}

/**
 * Validate and sanitize a URL for safe proxying
 * @param {string} targetUrl - URL to validate
 * @param {Object} options - Validation options
 * @param {string[]} options.allowedProtocols - Allowed protocols (default: ['http:', 'https:'])
 * @param {string[]} options.allowedDomains - If set, only these domains are allowed
 * @param {string[]} options.blockedDomains - Domains to block
 * @returns {{valid: boolean, error?: string, parsedUrl?: URL}} Validation result
 */
function validateUrl (targetUrl, options = {}) {
  const {
    allowedProtocols = ['http:', 'https:'],
    allowedDomains = null,
    blockedDomains = []
  } = options

  if (!targetUrl || typeof targetUrl !== 'string') {
    return { valid: false, error: 'URL is required and must be a string' }
  }

  let parsedUrl
  try {
    parsedUrl = new URL(targetUrl)
  } catch (e) {
    return { valid: false, error: 'Invalid URL format' }
  }

  // Check protocol
  if (!allowedProtocols.includes(parsedUrl.protocol)) {
    return {
      valid: false,
      error: `Protocol ${parsedUrl.protocol} is not allowed. Allowed: ${allowedProtocols.join(', ')}`
    }
  }

  // Check for private IPs
  const hostname = parsedUrl.hostname
  if (isPrivateIP(hostname)) {
    return { valid: false, error: 'Access to internal network addresses is not allowed' }
  }

  // Check blocked domains
  const lowerHostname = hostname.toLowerCase()
  for (const blocked of blockedDomains) {
    if (lowerHostname === blocked.toLowerCase() || lowerHostname.endsWith('.' + blocked.toLowerCase())) {
      return { valid: false, error: `Domain ${hostname} is blocked` }
    }
  }

  // Check allowed domains (whitelist mode)
  if (allowedDomains && allowedDomains.length > 0) {
    const isAllowed = allowedDomains.some(allowed => {
      const lowerAllowed = allowed.toLowerCase()
      return lowerHostname === lowerAllowed || lowerHostname.endsWith('.' + lowerAllowed)
    })
    if (!isAllowed) {
      return { valid: false, error: `Domain ${hostname} is not in the allowed list` }
    }
  }

  // Additional checks for suspicious patterns
  if (parsedUrl.username || parsedUrl.password) {
    return { valid: false, error: 'URLs with embedded credentials are not allowed' }
  }

  return { valid: true, parsedUrl }
}

/**
 * Extract safe headers for proxying (remove sensitive headers)
 * @param {Object} headers - Original headers
 * @param {string} targetHost - Target host for the Host header
 * @returns {Object} Sanitized headers
 */
function sanitizeProxyHeaders (headers, targetHost) {
  const sanitized = { ...headers }

  // Remove sensitive headers
  const sensitiveHeaders = [
    'host',
    'cookie',
    'authorization',
    'proxy-authorization',
    'x-forwarded-for',
    'x-real-ip',
    'x-forwarded-host',
    'x-forwarded-proto'
  ]

  for (const header of sensitiveHeaders) {
    delete sanitized[header]
    delete sanitized[header.toLowerCase()]
  }

  // Set the correct host header
  if (targetHost) {
    sanitized.host = targetHost
  }

  return sanitized
}

module.exports = {
  validateUrl,
  isPrivateIP,
  sanitizeProxyHeaders,
  PRIVATE_IP_RANGES,
  BLOCKED_HOSTNAMES
}
