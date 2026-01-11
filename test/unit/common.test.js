/* eslint-env jest */

// The middleware functions are self-contained and don't require external dependencies
// External deps (compression, express) are lazy-loaded only when setupRoutes is called
const { rateLimit, securityHeaders, errorHandler } = require('../../lib/common')

describe('common middleware', () => {
  describe('rateLimit', () => {
    let mockReq
    let mockRes
    let nextFn

    beforeAll(() => {
      // Use fake timers to prevent setInterval from keeping Jest running
      jest.useFakeTimers()
    })

    afterAll(() => {
      jest.useRealTimers()
    })

    beforeEach(() => {
      mockReq = {
        ip: '192.168.1.100',
        connection: { remoteAddress: '192.168.1.100' }
      }
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      nextFn = jest.fn()
    })

    it('should allow requests under the limit', () => {
      const limiter = rateLimit({ windowMs: 60000, maxRequests: 5 })

      limiter(mockReq, mockRes, nextFn)

      expect(nextFn).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })

    it('should block requests over the limit', () => {
      const limiter = rateLimit({ windowMs: 60000, maxRequests: 2 })

      // First two requests should pass
      limiter(mockReq, mockRes, nextFn)
      limiter(mockReq, mockRes, nextFn)

      // Third request should be blocked
      limiter(mockReq, mockRes, nextFn)

      expect(mockRes.status).toHaveBeenCalledWith(429)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too many requests'
        })
      )
    })

    it('should track different IPs separately', () => {
      const limiter = rateLimit({ windowMs: 60000, maxRequests: 1 })

      // First IP - first request
      mockReq.ip = '192.168.1.100'
      limiter(mockReq, mockRes, nextFn)
      expect(nextFn).toHaveBeenCalledTimes(1)

      // Second IP - first request (should pass)
      mockReq.ip = '192.168.1.101'
      limiter(mockReq, mockRes, nextFn)
      expect(nextFn).toHaveBeenCalledTimes(2)

      // First IP - second request (should block)
      mockReq.ip = '192.168.1.100'
      limiter(mockReq, mockRes, nextFn)
      expect(mockRes.status).toHaveBeenCalledWith(429)
    })

    it('should use default options when none provided', () => {
      const limiter = rateLimit()

      // Should not throw and should allow initial requests
      limiter(mockReq, mockRes, nextFn)
      expect(nextFn).toHaveBeenCalled()
    })
  })

  describe('securityHeaders', () => {
    let mockReq
    let mockRes
    let nextFn

    beforeEach(() => {
      mockReq = {}
      mockRes = {
        setHeader: jest.fn()
      }
      nextFn = jest.fn()
    })

    it('should set X-Frame-Options header', () => {
      const middleware = securityHeaders()
      middleware(mockReq, mockRes, nextFn)

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'SAMEORIGIN')
    })

    it('should set X-Content-Type-Options header', () => {
      const middleware = securityHeaders()
      middleware(mockReq, mockRes, nextFn)

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff')
    })

    it('should set X-XSS-Protection header', () => {
      const middleware = securityHeaders()
      middleware(mockReq, mockRes, nextFn)

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block')
    })

    it('should set Referrer-Policy header', () => {
      const middleware = securityHeaders()
      middleware(mockReq, mockRes, nextFn)

      expect(mockRes.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin')
    })

    it('should set Content-Security-Policy header', () => {
      const middleware = securityHeaders()
      middleware(mockReq, mockRes, nextFn)

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining("default-src 'self'")
      )
    })

    it('should call next function', () => {
      const middleware = securityHeaders()
      middleware(mockReq, mockRes, nextFn)

      expect(nextFn).toHaveBeenCalled()
    })
  })

  describe('errorHandler', () => {
    let mockReq
    let mockRes
    let nextFn
    let originalEnv

    beforeEach(() => {
      originalEnv = process.env.NODE_ENV
      mockReq = {}
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      nextFn = jest.fn()
      // Mock console.error to avoid test output noise
      jest.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      process.env.NODE_ENV = originalEnv
      console.error.mockRestore()
    })

    it('should return 500 status code', () => {
      const middleware = errorHandler()
      const error = new Error('Test error')

      middleware(error, mockReq, mockRes, nextFn)

      expect(mockRes.status).toHaveBeenCalledWith(500)
    })

    it('should hide error details in production', () => {
      process.env.NODE_ENV = 'production'
      const middleware = errorHandler()
      const error = new Error('Sensitive error details')

      middleware(error, mockReq, mockRes, nextFn)

      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error'
      })
    })

    it('should show error details in development', () => {
      process.env.NODE_ENV = 'development'
      const middleware = errorHandler()
      const error = new Error('Debug error message')

      middleware(error, mockReq, mockRes, nextFn)

      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Debug error message'
      })
    })
  })
})
