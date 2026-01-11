/* global Worker */
const THREE = require('three')
const Vec3 = require('vec3').Vec3
const { loadTexture, loadJSON } = globalThis.isElectron ? require('./utils.electron.js') : require('./utils')
const { EventEmitter } = require('events')
const { dispose3, disposeTexture } = require('./dispose')
const {
  MATERIAL_ALPHA_TEST,
  DEFAULT_NUM_WORKERS,
  WORLD_HEIGHT,
  SECTION_HEIGHT
} = require('./constants')

function mod (x, n) {
  return ((x % n) + n) % n
}

// Reusable objects for frustum culling to avoid GC pressure
const _frustum = new THREE.Frustum()
const _projScreenMatrix = new THREE.Matrix4()

class WorldRenderer {
  constructor (scene, numWorkers = DEFAULT_NUM_WORKERS) {
    this.sectionMeshs = {}
    this.active = false
    this.version = undefined
    this.scene = scene
    this.loadedChunks = {}
    this.sectionsOutstanding = new Set()
    this.renderUpdateEmitter = new EventEmitter()
    this.blockStatesData = undefined
    this.texturesDataUrl = undefined
    this.currentTexture = null

    // Track pending dirty sections to avoid duplicate messages
    this.pendingDirtySections = new Set()

    // Frustum culling support
    this.frustumCullingEnabled = true
    this.visibleMeshCount = 0
    this.totalMeshCount = 0

    this.material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      transparent: true,
      alphaTest: MATERIAL_ALPHA_TEST
    })

    this.workers = []
    this.workersActive = true

    for (let i = 0; i < numWorkers; i++) {
      this._createWorker()
    }
  }

  _createWorker () {
    // Node environment needs an absolute path, but browser needs the url of the file
    let src = __dirname
    if (typeof window !== 'undefined') src = 'worker.js'
    else src += '/worker.js'

    const worker = new Worker(src)

    worker.onmessage = ({ data }) => {
      if (!this.workersActive) return

      if (data.type === 'geometry') {
        this._handleGeometry(data)
      } else if (data.type === 'sectionFinished') {
        this.sectionsOutstanding.delete(data.key)
        this.renderUpdateEmitter.emit('update')
      } else if (data.type === 'error') {
        console.error('Worker error:', data.error)
      }
    }

    worker.onerror = (error) => {
      console.error('Worker error:', error)
    }

    if (worker.on) {
      worker.on('message', (data) => { worker.onmessage({ data }) })
      worker.on('error', (error) => { worker.onerror(error) })
    }

    this.workers.push(worker)
  }

  _handleGeometry (data) {
    let mesh = this.sectionMeshs[data.key]
    if (mesh) {
      this.scene.remove(mesh)
      // Don't dispose textures as they're shared
      dispose3(mesh, { disposeTextures: false })
      delete this.sectionMeshs[data.key]
    }

    const chunkCoords = data.key.split(',')
    if (!this.loadedChunks[chunkCoords[0] + ',' + chunkCoords[2]]) return

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(data.geometry.positions, 3))
    geometry.setAttribute('normal', new THREE.BufferAttribute(data.geometry.normals, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(data.geometry.colors, 3))
    geometry.setAttribute('uv', new THREE.BufferAttribute(data.geometry.uvs, 2))
    geometry.setIndex(data.geometry.indices)

    mesh = new THREE.Mesh(geometry, this.material)
    mesh.position.set(data.geometry.sx, data.geometry.sy, data.geometry.sz)
    this.sectionMeshs[data.key] = mesh
    this.scene.add(mesh)
  }

  resetWorld () {
    this.active = false

    // Properly dispose all section meshes
    for (const [key, mesh] of Object.entries(this.sectionMeshs)) {
      this.scene.remove(mesh)
      dispose3(mesh, { disposeTextures: false })
      delete this.sectionMeshs[key]
    }

    this.sectionMeshs = {}
    this.loadedChunks = {}
    this.sectionsOutstanding.clear()

    // Reset workers
    for (const worker of this.workers) {
      worker.postMessage({ type: 'reset' })
    }
  }

  /**
   * Fully dispose of all resources including workers
   * Call this when the renderer is no longer needed
   */
  dispose () {
    this.active = false
    this.workersActive = false

    // Dispose all meshes
    for (const mesh of Object.values(this.sectionMeshs)) {
      this.scene.remove(mesh)
      dispose3(mesh, { disposeTextures: false })
    }
    this.sectionMeshs = {}

    // Dispose material and texture
    if (this.currentTexture) {
      disposeTexture(this.currentTexture)
      this.currentTexture = null
    }

    if (this.material) {
      this.material.dispose()
      this.material = null
    }

    // Terminate workers
    for (const worker of this.workers) {
      if (worker.terminate) {
        worker.terminate()
      }
    }
    this.workers = []

    this.loadedChunks = {}
    this.sectionsOutstanding.clear()
    this.renderUpdateEmitter.removeAllListeners()
  }

  setVersion (version) {
    this.version = version
    this.resetWorld()
    this.active = true

    for (const worker of this.workers) {
      worker.postMessage({ type: 'version', version })
    }

    this.updateTexturesData()
  }

  updateTexturesData () {
    loadTexture(this.texturesDataUrl || `textures/${this.version}.png`, texture => {
      // Dispose old texture if exists
      if (this.currentTexture) {
        disposeTexture(this.currentTexture)
      }

      texture.magFilter = THREE.NearestFilter
      texture.minFilter = THREE.NearestFilter
      texture.flipY = false
      this.material.map = texture
      this.currentTexture = texture
    })

    const loadBlockStates = () => {
      return new Promise(resolve => {
        if (this.blockStatesData) return resolve(this.blockStatesData)
        return loadJSON(`blocksStates/${this.version}.json`, resolve)
      })
    }

    loadBlockStates().then((blockStates) => {
      for (const worker of this.workers) {
        worker.postMessage({ type: 'blockStates', json: blockStates })
      }
    })
  }

  addColumn (x, z, chunk) {
    this.loadedChunks[`${x},${z}`] = true

    for (const worker of this.workers) {
      worker.postMessage({ type: 'chunk', x, z, chunk })
    }

    // Mark sections as dirty with neighbor awareness
    for (let y = 0; y < WORLD_HEIGHT; y += SECTION_HEIGHT) {
      const loc = new Vec3(x, y, z)
      this.setSectionDirty(loc)
      this.setSectionDirty(loc.offset(-16, 0, 0))
      this.setSectionDirty(loc.offset(16, 0, 0))
      this.setSectionDirty(loc.offset(0, 0, -16))
      this.setSectionDirty(loc.offset(0, 0, 16))
    }
  }

  removeColumn (x, z) {
    delete this.loadedChunks[`${x},${z}`]

    for (const worker of this.workers) {
      worker.postMessage({ type: 'unloadChunk', x, z })
    }

    for (let y = 0; y < WORLD_HEIGHT; y += SECTION_HEIGHT) {
      this.setSectionDirty(new Vec3(x, y, z), false)
      const key = `${x},${y},${z}`
      const mesh = this.sectionMeshs[key]
      if (mesh) {
        this.scene.remove(mesh)
        dispose3(mesh, { disposeTextures: false })
      }
      delete this.sectionMeshs[key]
    }
  }

  setBlockStateId (pos, stateId) {
    for (const worker of this.workers) {
      worker.postMessage({ type: 'blockUpdate', pos, stateId })
    }

    this.setSectionDirty(pos)

    // Mark neighbor sections dirty if block is on boundary
    if ((pos.x & 15) === 0) this.setSectionDirty(pos.offset(-16, 0, 0))
    if ((pos.x & 15) === 15) this.setSectionDirty(pos.offset(16, 0, 0))
    if ((pos.y & 15) === 0) this.setSectionDirty(pos.offset(0, -16, 0))
    if ((pos.y & 15) === 15) this.setSectionDirty(pos.offset(0, 16, 0))
    if ((pos.z & 15) === 0) this.setSectionDirty(pos.offset(0, 0, -16))
    if ((pos.z & 15) === 15) this.setSectionDirty(pos.offset(0, 0, 16))
  }

  setSectionDirty (pos, value = true) {
    if (!this.active || this.workers.length === 0) return

    const key = `${Math.floor(pos.x / 16) * 16},${Math.floor(pos.y / 16) * 16},${Math.floor(pos.z / 16) * 16}`

    // Deduplicate: Skip if this section is already pending for this frame
    if (value && this.pendingDirtySections.has(key)) {
      return
    }

    // Dispatch sections to workers based on position
    // This guarantees uniformity across workers and that a given section
    // is always dispatched to the same worker
    const hash = mod(
      Math.floor(pos.x / 16) + Math.floor(pos.y / 16) + Math.floor(pos.z / 16),
      this.workers.length
    )

    this.workers[hash].postMessage({
      type: 'dirty',
      x: pos.x,
      y: pos.y,
      z: pos.z,
      value
    })

    if (value) {
      this.sectionsOutstanding.add(key)
      this.pendingDirtySections.add(key)
    } else {
      this.sectionsOutstanding.delete(key)
      this.pendingDirtySections.delete(key)
    }
  }

  /**
   * Clear pending dirty sections - call once per frame after processing
   */
  clearPendingDirtySections () {
    this.pendingDirtySections.clear()
  }

  // Listen for chunk rendering updates emitted if a worker finished a render and resolve if the number
  // of sections not rendered are 0
  waitForChunksToRender () {
    return new Promise((resolve, reject) => {
      if (this.sectionsOutstanding.size === 0) {
        resolve()
        return
      }

      const updateHandler = () => {
        if (this.sectionsOutstanding.size === 0) {
          this.renderUpdateEmitter.removeListener('update', updateHandler)
          resolve()
        }
      }

      this.renderUpdateEmitter.on('update', updateHandler)
    })
  }

  /**
   * Update frustum culling for all section meshes
   * Call this once per frame with the camera to enable frustum culling
   * @param {THREE.Camera} camera - Camera to use for frustum culling
   */
  updateFrustumCulling (camera) {
    if (!this.frustumCullingEnabled || !camera) return

    // Update the frustum from camera
    _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    _frustum.setFromProjectionMatrix(_projScreenMatrix)

    this.visibleMeshCount = 0
    this.totalMeshCount = 0

    for (const mesh of Object.values(this.sectionMeshs)) {
      this.totalMeshCount++

      // Check if mesh bounding sphere intersects frustum
      if (!mesh.geometry.boundingSphere) {
        mesh.geometry.computeBoundingSphere()
      }

      // Create a sphere at the mesh's world position
      const sphere = mesh.geometry.boundingSphere.clone()
      sphere.applyMatrix4(mesh.matrixWorld)

      const isVisible = _frustum.intersectsSphere(sphere)
      mesh.visible = isVisible

      if (isVisible) {
        this.visibleMeshCount++
      }
    }
  }

  /**
   * Enable or disable frustum culling
   * @param {boolean} enabled - Whether to enable frustum culling
   */
  setFrustumCulling (enabled) {
    this.frustumCullingEnabled = enabled
    if (!enabled) {
      // Make all meshes visible when disabled
      for (const mesh of Object.values(this.sectionMeshs)) {
        mesh.visible = true
      }
    }
  }

  /**
   * Get statistics for debugging
   */
  getStats () {
    return {
      sectionMeshCount: Object.keys(this.sectionMeshs).length,
      loadedChunkCount: Object.keys(this.loadedChunks).length,
      sectionsOutstanding: this.sectionsOutstanding.size,
      pendingDirtySections: this.pendingDirtySections.size,
      workerCount: this.workers.length,
      active: this.active,
      frustumCulling: {
        enabled: this.frustumCullingEnabled,
        visibleMeshes: this.visibleMeshCount,
        totalMeshes: this.totalMeshCount,
        culledMeshes: this.totalMeshCount - this.visibleMeshCount
      }
    }
  }
}

module.exports = { WorldRenderer }
