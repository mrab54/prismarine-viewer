/* eslint-env jest */
const { validateUrl, isPrivateIP, sanitizeProxyHeaders } = require('../../lib/security/urlValidator')

describe('urlValidator', () => {
  describe('validateUrl', () => {
    it('should accept valid HTTPS URLs', () => {
      const result = validateUrl('https://example.com/path')
      expect(result.valid).toBe(true)
      expect(result.parsedUrl.href).toBe('https://example.com/path')
    })

    it('should accept valid HTTP URLs', () => {
      const result = validateUrl('http://example.com/path')
      expect(result.valid).toBe(true)
    })

    it('should reject invalid URLs', () => {
      const result = validateUrl('not-a-url')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid URL format')
    })

    it('should reject file:// protocol', () => {
      const result = validateUrl('file:///etc/passwd')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Protocol')
    })

    it('should reject FTP protocol by default', () => {
      const result = validateUrl('ftp://example.com/file')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Protocol')
    })

    it('should reject localhost', () => {
      const result = validateUrl('http://localhost/admin')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('internal')
    })

    it('should reject 127.0.0.1', () => {
      const result = validateUrl('http://127.0.0.1/admin')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('internal')
    })

    it('should reject private IP ranges (10.x.x.x)', () => {
      const result = validateUrl('http://10.0.0.1/admin')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('internal')
    })

    it('should reject private IP ranges (192.168.x.x)', () => {
      const result = validateUrl('http://192.168.1.1/admin')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('internal')
    })

    it('should reject private IP ranges (172.16-31.x.x)', () => {
      const result = validateUrl('http://172.16.0.1/admin')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('internal')
    })

    it('should reject 0.0.0.0', () => {
      const result = validateUrl('http://0.0.0.0/admin')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('internal')
    })

    it('should reject blocked domains', () => {
      const result = validateUrl('http://evil.com/path', {
        blockedDomains: ['evil.com']
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('blocked')
    })

    it('should only allow specific domains when specified', () => {
      const result = validateUrl('http://other.com/path', {
        allowedDomains: ['example.com']
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not in the allowed list')
    })

    it('should allow specific domains when specified', () => {
      const result = validateUrl('http://example.com/path', {
        allowedDomains: ['example.com']
      })
      expect(result.valid).toBe(true)
    })
  })

  describe('isPrivateIP', () => {
    it('should detect localhost', () => {
      expect(isPrivateIP('localhost')).toBe(true)
    })

    it('should detect 127.0.0.1', () => {
      expect(isPrivateIP('127.0.0.1')).toBe(true)
    })

    it('should detect 10.x.x.x range', () => {
      expect(isPrivateIP('10.0.0.1')).toBe(true)
      expect(isPrivateIP('10.255.255.255')).toBe(true)
    })

    it('should detect 192.168.x.x range', () => {
      expect(isPrivateIP('192.168.0.1')).toBe(true)
      expect(isPrivateIP('192.168.255.255')).toBe(true)
    })

    it('should detect 172.16-31.x.x range', () => {
      expect(isPrivateIP('172.16.0.1')).toBe(true)
      expect(isPrivateIP('172.31.255.255')).toBe(true)
      expect(isPrivateIP('172.15.0.1')).toBe(false)
      expect(isPrivateIP('172.32.0.1')).toBe(false)
    })

    it('should not flag public IPs', () => {
      expect(isPrivateIP('8.8.8.8')).toBe(false)
      expect(isPrivateIP('1.1.1.1')).toBe(false)
      expect(isPrivateIP('203.0.113.1')).toBe(false)
    })
  })

  describe('sanitizeProxyHeaders', () => {
    it('should remove dangerous headers', () => {
      const headers = {
        'content-type': 'application/json',
        authorization: 'Bearer token',
        cookie: 'session=abc',
        'x-forwarded-for': '1.2.3.4',
        'x-real-ip': '5.6.7.8'
      }

      const sanitized = sanitizeProxyHeaders(headers, 'example.com')

      expect(sanitized['content-type']).toBe('application/json')
      expect(sanitized.authorization).toBeUndefined()
      expect(sanitized.cookie).toBeUndefined()
      expect(sanitized['x-forwarded-for']).toBeUndefined()
      expect(sanitized['x-real-ip']).toBeUndefined()
      expect(sanitized.host).toBe('example.com')
    })

    it('should handle empty headers', () => {
      const result = sanitizeProxyHeaders({}, 'example.com')
      expect(result.host).toBe('example.com')
    })
  })
})
