const THREE = require('three')
const TWEEN = require('@tweenjs/tween.js')
const { WorldRenderer } = require('./worldrenderer')
const { Entities } = require('./entities')
const { Primitives } = require('./primitives')
const { getVersion } = require('./version')
const { Vec3 } = require('vec3')
const {
  PLAYER_HEIGHT,
  TWEEN_DURATION_MS,
  SNEAK_HEIGHT_OFFSET
} = require('./constants')

// Reusable objects for raycasting to avoid GC pressure
const _raycaster = new THREE.Raycaster()
const _mouse = new THREE.Vector2()

class Viewer {
  constructor (renderer) {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('lightblue')

    this.ambientLight = new THREE.AmbientLight(0xcccccc)
    this.scene.add(this.ambientLight)

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
    this.directionalLight.position.set(1, 1, 0.5).normalize()
    this.directionalLight.castShadow = true
    this.scene.add(this.directionalLight)

    const size = renderer.getSize(new THREE.Vector2())
    this.camera = new THREE.PerspectiveCamera(75, size.x / size.y, 0.1, 1000)

    this.world = new WorldRenderer(this.scene)
    this.entities = new Entities(this.scene)
    this.primitives = new Primitives(this.scene, this.camera)

    this.domElement = renderer.domElement
    this.playerHeight = PLAYER_HEIGHT
    this.isSneaking = false

    // Track active tweens to prevent memory leaks
    this.cameraTween = null

    // Performance settings
    this.enableFrustumCulling = true
  }

  resetAll () {
    // Stop any active camera tween
    if (this.cameraTween) {
      this.cameraTween.stop()
      this.cameraTween = null
    }

    this.world.resetWorld()
    this.entities.clear()
    this.primitives.clear()
  }

  /**
   * Fully dispose of all resources
   * Call this when the viewer is no longer needed
   */
  dispose () {
    // Stop camera tween
    if (this.cameraTween) {
      this.cameraTween.stop()
      this.cameraTween = null
    }

    // Dispose world renderer (includes workers)
    if (this.world) {
      this.world.dispose()
      this.world = null
    }

    // Clear entities
    if (this.entities) {
      this.entities.clear()
      this.entities = null
    }

    // Clear primitives
    if (this.primitives) {
      this.primitives.clear()
      this.primitives = null
    }

    // Dispose lights
    if (this.ambientLight) {
      this.scene.remove(this.ambientLight)
      this.ambientLight = null
    }

    if (this.directionalLight) {
      this.scene.remove(this.directionalLight)
      this.directionalLight = null
    }

    // Clear scene background
    if (this.scene.background) {
      this.scene.background = null
    }

    // Note: camera and scene are typically owned by the renderer
    // and should be disposed there if needed
  }

  setVersion (version) {
    version = getVersion(version)
    if (version === null) {
      const msg = `${version} is not supported`
      window.alert(msg)
      console.log(msg)
      return false
    }
    console.log('Using version: ' + version)
    this.version = version
    this.world.setVersion(version)
    this.entities.clear()
    this.primitives.clear()
    return true
  }

  addColumn (x, z, chunk) {
    this.world.addColumn(x, z, chunk)
  }

  removeColumn (x, z) {
    this.world.removeColumn(x, z)
  }

  setBlockStateId (pos, stateId) {
    this.world.setBlockStateId(pos, stateId)
  }

  updateEntity (e) {
    this.entities.update(e)
  }

  updatePrimitive (p) {
    this.primitives.update(p)
  }

  setFirstPersonCamera (pos, yaw, pitch) {
    if (pos) {
      let y = pos.y + this.playerHeight
      if (this.isSneaking) y -= SNEAK_HEIGHT_OFFSET

      // Stop previous camera tween to prevent memory leak
      if (this.cameraTween) {
        this.cameraTween.stop()
      }

      this.cameraTween = new TWEEN.Tween(this.camera.position)
        .to({ x: pos.x, y, z: pos.z }, TWEEN_DURATION_MS)
        .start()
    }
    this.camera.rotation.set(pitch, yaw, 0, 'ZYX')
  }

  listen (emitter) {
    emitter.on('entity', (e) => {
      this.updateEntity(e)
    })

    emitter.on('primitive', (p) => {
      this.updatePrimitive(p)
    })

    emitter.on('loadChunk', ({ x, z, chunk }) => {
      this.addColumn(x, z, chunk)
    })

    emitter.on('unloadChunk', ({ x, z }) => {
      this.removeColumn(x, z)
    })

    emitter.on('blockUpdate', ({ pos, stateId }) => {
      this.setBlockStateId(new Vec3(pos.x, pos.y, pos.z), stateId)
    })

    this.domElement.addEventListener('pointerdown', (evt) => {
      // Reuse raycaster and mouse vector to avoid GC pressure
      _mouse.x = (evt.clientX / this.domElement.clientWidth) * 2 - 1
      _mouse.y = -(evt.clientY / this.domElement.clientHeight) * 2 + 1
      _raycaster.setFromCamera(_mouse, this.camera)
      const ray = _raycaster.ray
      emitter.emit('mouseClick', { origin: ray.origin, direction: ray.direction, button: evt.button })
    })
  }

  /**
   * Update loop - call once per frame
   */
  update () {
    TWEEN.update()

    // Update frustum culling
    if (this.enableFrustumCulling && this.world) {
      this.world.updateFrustumCulling(this.camera)
    }

    // Clear pending dirty sections at end of frame
    if (this.world) {
      this.world.clearPendingDirtySections()
    }
  }

  /**
   * Enable or disable frustum culling
   * @param {boolean} enabled - Whether to enable frustum culling
   */
  setFrustumCulling (enabled) {
    this.enableFrustumCulling = enabled
    if (this.world) {
      this.world.setFrustumCulling(enabled)
    }
  }

  /**
   * Get performance statistics
   */
  getStats () {
    return {
      world: this.world ? this.world.getStats() : null,
      frustumCullingEnabled: this.enableFrustumCulling
    }
  }

  async waitForChunksToRender () {
    await this.world.waitForChunksToRender()
  }
}

module.exports = { Viewer }
