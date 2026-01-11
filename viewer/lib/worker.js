/* global postMessage self */

/**
 * Worker for generating mesh geometry from world data
 * Handles both browser Web Workers and Node.js worker_threads
 */

// Environment detection and setup - done at build time, not runtime
const isNode = typeof self === 'undefined' && typeof process !== 'undefined'

if (isNode) {
  // Node.js worker_threads environment
  const { parentPort } = require('worker_threads')
  const { performance } = require('perf_hooks')
  global.self = parentPort
  global.postMessage = (value, transferList) => { parentPort.postMessage(value, transferList) }
  global.performance = performance
}

const { Vec3 } = require('vec3')
const { World } = require('./world')
const { getSectionGeometry } = require('./models')
const { WORKER_PROCESS_INTERVAL_MS } = require('./constants')

let blocksStates = null
let world = null
let processingIntervalId = null

function sectionKey (x, y, z) {
  return `${x},${y},${z}`
}

const dirtySections = {}

function setSectionDirty (pos, value = true) {
  const x = Math.floor(pos.x / 16) * 16
  const y = Math.floor(pos.y / 16) * 16
  const z = Math.floor(pos.z / 16) * 16
  const chunk = world ? world.getColumn(x, z) : null
  const key = sectionKey(x, y, z)
  if (!value) {
    delete dirtySections[key]
    postMessage({ type: 'sectionFinished', key })
  } else if (chunk && chunk.sections[Math.floor(y / 16)]) {
    dirtySections[key] = value
  } else {
    postMessage({ type: 'sectionFinished', key })
  }
}

function clearAllDirtySections () {
  for (const key of Object.keys(dirtySections)) {
    delete dirtySections[key]
  }
}

function handleMessage (data) {
  try {
    if (data.type === 'version') {
      world = new World(data.version)
    } else if (data.type === 'blockStates') {
      blocksStates = data.json
    } else if (data.type === 'dirty') {
      const loc = new Vec3(data.x, data.y, data.z)
      setSectionDirty(loc, data.value)
    } else if (data.type === 'chunk') {
      if (world) {
        world.addColumn(data.x, data.z, data.chunk)
      }
    } else if (data.type === 'unloadChunk') {
      if (world) {
        world.removeColumn(data.x, data.z)
      }
    } else if (data.type === 'blockUpdate') {
      if (world) {
        const loc = new Vec3(data.pos.x, data.pos.y, data.pos.z).floored()
        world.setBlockStateId(loc, data.stateId)
      }
    } else if (data.type === 'reset') {
      world = null
      blocksStates = null
      clearAllDirtySections()
    }
  } catch (error) {
    console.error('Worker message handling error:', error)
    postMessage({ type: 'error', error: error.message })
  }
}

self.onmessage = ({ data }) => {
  handleMessage(data)
}

function processDirtySections () {
  if (world === null || blocksStates === null) return

  const sections = Object.keys(dirtySections)
  if (sections.length === 0) return

  for (const key of sections) {
    let [x, y, z] = key.split(',')
    x = parseInt(x, 10)
    y = parseInt(y, 10)
    z = parseInt(z, 10)

    const chunk = world.getColumn(x, z)
    if (chunk && chunk.sections[Math.floor(y / 16)]) {
      delete dirtySections[key]
      try {
        const geometry = getSectionGeometry(x, y, z, world, blocksStates)
        const transferable = [
          geometry.positions.buffer,
          geometry.normals.buffer,
          geometry.colors.buffer,
          geometry.uvs.buffer
        ]
        postMessage({ type: 'geometry', key, geometry }, transferable)
      } catch (error) {
        console.error('Geometry generation error:', error)
        postMessage({ type: 'error', key, error: error.message })
      }
    }
    postMessage({ type: 'sectionFinished', key })
  }
}

// Start the processing interval
processingIntervalId = setInterval(processDirtySections, WORKER_PROCESS_INTERVAL_MS)

// Cleanup on worker termination (for Node.js workers)
if (isNode && global.self && global.self.on) {
  global.self.on('close', () => {
    if (processingIntervalId) {
      clearInterval(processingIntervalId)
      processingIntervalId = null
    }
  })
}
