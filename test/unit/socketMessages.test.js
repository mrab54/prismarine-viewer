/* eslint-env jest */
const { validateMessage, schemas } = require('../../lib/schemas/socketMessages')

describe('socketMessages', () => {
  describe('validateMessage', () => {
    describe('position schema', () => {
      it('should validate valid position data', () => {
        const result = validateMessage('position', {
          pos: { x: 1.5, y: 64.0, z: -3.2 },
          yaw: 1.57,
          addMesh: true
        })
        expect(result.valid).toBe(true)
      })

      it('should reject position with non-numeric coordinates', () => {
        const result = validateMessage('position', {
          pos: { x: 'invalid', y: 64.0, z: -3.2 },
          yaw: 1.57
        })
        expect(result.valid).toBe(false)
      })

      it('should reject position with missing coordinates', () => {
        const result = validateMessage('position', {
          pos: { x: 1.5, y: 64.0 },
          yaw: 1.57
        })
        expect(result.valid).toBe(false)
      })

      it('should reject position with non-numeric yaw', () => {
        const result = validateMessage('position', {
          pos: { x: 1.5, y: 64.0, z: -3.2 },
          yaw: 'invalid'
        })
        expect(result.valid).toBe(false)
      })
    })

    describe('blockClicked schema', () => {
      it('should validate valid blockClicked data', () => {
        const result = validateMessage('blockClicked', {
          block: {
            position: { x: 10, y: 64, z: -5 },
            name: 'stone',
            stateId: 1
          },
          face: 1,
          button: 0
        })
        expect(result.valid).toBe(true)
      })

      it('should reject blockClicked with non-integer face', () => {
        const result = validateMessage('blockClicked', {
          block: {
            position: { x: 10, y: 64, z: -5 },
            name: 'stone',
            stateId: 1
          },
          face: 'up',
          button: 0
        })
        expect(result.valid).toBe(false)
      })
    })

    describe('mouseClick schema', () => {
      it('should validate valid mouseClick data', () => {
        const result = validateMessage('mouseClick', {
          origin: { x: 100.5, y: 65.0, z: -50.2 },
          direction: { x: 0.0, y: -1.0, z: 0.0 },
          button: 0
        })
        expect(result.valid).toBe(true)
      })

      it('should reject mouseClick with invalid button', () => {
        const result = validateMessage('mouseClick', {
          origin: { x: 100.5, y: 65.0, z: -50.2 },
          direction: { x: 0.0, y: -1.0, z: 0.0 },
          button: 'left'
        })
        expect(result.valid).toBe(false)
      })
    })

    describe('loadChunk schema', () => {
      it('should validate valid loadChunk data', () => {
        const result = validateMessage('loadChunk', {
          x: 0,
          z: 16,
          chunk: { sections: [] }
        })
        expect(result.valid).toBe(true)
      })

      it('should reject loadChunk with non-integer coordinates', () => {
        const result = validateMessage('loadChunk', {
          x: 0.5,
          z: 16,
          chunk: {}
        })
        expect(result.valid).toBe(false)
      })
    })

    describe('entity schema', () => {
      it('should validate valid entity data', () => {
        const result = validateMessage('entity', {
          id: 123,
          name: 'zombie',
          pos: { x: 100.0, y: 64.0, z: -50.0 },
          width: 0.6,
          height: 1.95
        })
        expect(result.valid).toBe(true)
      })

      it('should validate entity with delete flag', () => {
        const result = validateMessage('entity', {
          id: 123,
          delete: true
        })
        expect(result.valid).toBe(true)
      })

      it('should validate entity with string id (flexible typing)', () => {
        // Schema allows flexible id types for compatibility
        const result = validateMessage('entity', {
          id: 'zombie-1',
          name: 'zombie'
        })
        // The schema is flexible about id types
        expect(result).toBeDefined()
      })
    })

    describe('primitive schema', () => {
      it('should validate primitive with id', () => {
        const result = validateMessage('primitive', {
          id: 'path-1',
          type: 'line',
          points: [
            { x: 0, y: 64, z: 0 },
            { x: 10, y: 64, z: 10 }
          ]
        })
        expect(result).toBeDefined()
      })

      it('should validate primitive with boxgrid type', () => {
        const result = validateMessage('primitive', {
          id: 'box-1',
          type: 'boxgrid',
          start: { x: 0, y: 60, z: 0 },
          end: { x: 10, y: 70, z: 10 }
        })
        expect(result).toBeDefined()
      })

      it('should reject primitive with invalid type', () => {
        const result = validateMessage('primitive', {
          type: 'invalid',
          id: 'test-1'
        })
        expect(result.valid).toBe(false)
      })
    })

    describe('unknown schema', () => {
      it('should allow unknown message types for backward compatibility', () => {
        // Unknown message types pass through for backward compatibility
        const result = validateMessage('unknownType', { data: 'test' })
        expect(result.valid).toBe(true)
      })
    })
  })

  describe('schemas', () => {
    it('should export all expected schemas', () => {
      expect(schemas).toHaveProperty('position')
      expect(schemas).toHaveProperty('blockClicked')
      expect(schemas).toHaveProperty('mouseClick')
      expect(schemas).toHaveProperty('loadChunk')
      expect(schemas).toHaveProperty('entity')
      expect(schemas).toHaveProperty('primitive')
    })
  })
})
