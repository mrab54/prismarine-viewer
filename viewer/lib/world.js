const Chunks = require('prismarine-chunk')
const mcData = require('minecraft-data')
const { BLOCK_CACHE_MAX_SIZE } = require('./constants')
const { LRUCache } = require('./lruCache')

function columnKey (x, z) {
  return `${x},${z}`
}

function posInChunk (pos) {
  pos = pos.floored()
  pos.x &= 15
  pos.z &= 15
  return pos
}

function isCube (shapes) {
  if (!shapes || shapes.length !== 1) return false
  const shape = shapes[0]
  return shape[0] === 0 && shape[1] === 0 && shape[2] === 0 && shape[3] === 1 && shape[4] === 1 && shape[5] === 1
}

class World {
  constructor (version) {
    this.Chunk = Chunks(version)
    this.columns = {}
    this.blockCache = new LRUCache(BLOCK_CACHE_MAX_SIZE)
    this.biomeCache = mcData(version).biomes
    this.version = version
  }

  addColumn (x, z, json) {
    const chunk = this.Chunk.fromJson(json)
    this.columns[columnKey(x, z)] = chunk
    return chunk
  }

  removeColumn (x, z) {
    const key = columnKey(x, z)
    const column = this.columns[key]
    if (column) {
      // Clean up column reference
      delete this.columns[key]
    }
  }

  getColumn (x, z) {
    return this.columns[columnKey(x, z)]
  }

  setBlockStateId (pos, stateId) {
    const key = columnKey(Math.floor(pos.x / 16) * 16, Math.floor(pos.z / 16) * 16)

    const column = this.columns[key]
    // null column means chunk not loaded
    if (!column) return false

    column.setBlockStateId(posInChunk(pos.floored()), stateId)

    return true
  }

  getBlock (pos) {
    const key = columnKey(Math.floor(pos.x / 16) * 16, Math.floor(pos.z / 16) * 16)

    const column = this.columns[key]
    // null column means chunk not loaded
    if (!column) return null

    const loc = pos.floored()
    const locInChunk = posInChunk(loc)
    const stateId = column.getBlockStateId(locInChunk)

    let block = this.blockCache.get(stateId)
    if (!block) {
      const b = column.getBlock(locInChunk)
      b.isCube = isCube(b.shapes)
      this.blockCache.set(stateId, b)
      block = b
    }

    // Clone position to avoid mutation issues
    block.position = loc
    block.biome = this.biomeCache[column.getBiome(locInChunk)]
    if (block.biome === undefined) {
      block.biome = this.biomeCache[1]
    }
    return block
  }

  /**
   * Clear all world data (for cleanup)
   */
  clear () {
    this.columns = {}
    this.blockCache.clear()
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats () {
    return {
      blockCacheSize: this.blockCache.size,
      blockCacheMaxSize: BLOCK_CACHE_MAX_SIZE,
      columnCount: Object.keys(this.columns).length
    }
  }
}

module.exports = { World, LRUCache }
