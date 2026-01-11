/* eslint-env jest */
const { LRUCache } = require('../../viewer/lib/lruCache')

describe('LRUCache', () => {
  describe('basic operations', () => {
    it('should store and retrieve values', () => {
      const cache = new LRUCache(10)
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')
    })

    it('should return undefined for missing keys', () => {
      const cache = new LRUCache(10)
      expect(cache.get('nonexistent')).toBeUndefined()
    })

    it('should track size correctly', () => {
      const cache = new LRUCache(10)
      expect(cache.size).toBe(0)
      cache.set('key1', 'value1')
      expect(cache.size).toBe(1)
      cache.set('key2', 'value2')
      expect(cache.size).toBe(2)
    })

    it('should report has correctly', () => {
      const cache = new LRUCache(10)
      cache.set('key1', 'value1')
      expect(cache.has('key1')).toBe(true)
      expect(cache.has('key2')).toBe(false)
    })

    it('should delete entries', () => {
      const cache = new LRUCache(10)
      cache.set('key1', 'value1')
      expect(cache.has('key1')).toBe(true)
      cache.delete('key1')
      expect(cache.has('key1')).toBe(false)
      expect(cache.size).toBe(0)
    })

    it('should clear all entries', () => {
      const cache = new LRUCache(10)
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')
      expect(cache.size).toBe(3)
      cache.clear()
      expect(cache.size).toBe(0)
      expect(cache.has('key1')).toBe(false)
    })
  })

  describe('LRU eviction', () => {
    it('should evict oldest entry when full', () => {
      const cache = new LRUCache(3)
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')
      expect(cache.size).toBe(3)

      // Adding a 4th entry should evict key1
      cache.set('key4', 'value4')
      expect(cache.size).toBe(3)
      expect(cache.has('key1')).toBe(false)
      expect(cache.has('key2')).toBe(true)
      expect(cache.has('key3')).toBe(true)
      expect(cache.has('key4')).toBe(true)
    })

    it('should move accessed entries to end (most recent)', () => {
      const cache = new LRUCache(3)
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')

      // Access key1, making it most recently used
      cache.get('key1')

      // Adding a 4th entry should now evict key2 (oldest unused)
      cache.set('key4', 'value4')
      expect(cache.has('key1')).toBe(true)
      expect(cache.has('key2')).toBe(false)
      expect(cache.has('key3')).toBe(true)
      expect(cache.has('key4')).toBe(true)
    })

    it('should update position when setting existing key', () => {
      const cache = new LRUCache(3)
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')

      // Update key1, making it most recently used
      cache.set('key1', 'updated')

      // Adding a 4th entry should now evict key2 (oldest unused)
      cache.set('key4', 'value4')
      expect(cache.has('key1')).toBe(true)
      expect(cache.get('key1')).toBe('updated')
      expect(cache.has('key2')).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle cache size of 1', () => {
      const cache = new LRUCache(1)
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')

      cache.set('key2', 'value2')
      expect(cache.has('key1')).toBe(false)
      expect(cache.get('key2')).toBe('value2')
      expect(cache.size).toBe(1)
    })

    it('should handle various value types', () => {
      const cache = new LRUCache(10)
      cache.set('number', 42)
      cache.set('object', { foo: 'bar' })
      cache.set('array', [1, 2, 3])
      cache.set('null', null)

      expect(cache.get('number')).toBe(42)
      expect(cache.get('object')).toEqual({ foo: 'bar' })
      expect(cache.get('array')).toEqual([1, 2, 3])
      expect(cache.get('null')).toBeNull()
    })

    it('should handle numeric keys', () => {
      const cache = new LRUCache(10)
      cache.set(1, 'one')
      cache.set(2, 'two')
      expect(cache.get(1)).toBe('one')
      expect(cache.get(2)).toBe('two')
    })
  })
})
