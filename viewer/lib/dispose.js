/**
 * Three.js resource disposal utilities
 * Properly disposes of geometry, materials, textures, and child objects
 * to prevent GPU memory leaks
 * @module viewer/lib/dispose
 */

/**
 * Dispose of a Three.js material and its textures
 * @param {THREE.Material} material - Material to dispose
 */
function disposeMaterial (material) {
  if (!material) return

  // Dispose all texture maps
  const textureProperties = [
    'map',
    'lightMap',
    'bumpMap',
    'normalMap',
    'specularMap',
    'envMap',
    'alphaMap',
    'aoMap',
    'displacementMap',
    'emissiveMap',
    'gradientMap',
    'metalnessMap',
    'roughnessMap'
  ]

  for (const prop of textureProperties) {
    if (material[prop]) {
      material[prop].dispose()
      material[prop] = null
    }
  }

  // Dispose the material itself
  material.dispose()
}

/**
 * Recursively dispose of a Three.js object and all its children
 * @param {THREE.Object3D} object - Object to dispose
 * @param {Object} options - Disposal options
 * @param {boolean} options.disposeTextures - Whether to dispose textures (default: true)
 * @param {boolean} options.recursive - Whether to dispose children recursively (default: true)
 */
function dispose3 (object, options = {}) {
  if (!object) return

  const { disposeTextures = true, recursive = true } = options

  // Recursively dispose children first
  if (recursive && object.children) {
    // Process children in reverse to avoid index shifting issues
    while (object.children.length > 0) {
      const child = object.children[0]
      object.remove(child)
      dispose3(child, options)
    }
  }

  // Dispose geometry
  if (object.geometry) {
    object.geometry.dispose()
    object.geometry = null
  }

  // Dispose material(s)
  if (object.material) {
    if (Array.isArray(object.material)) {
      for (const material of object.material) {
        if (disposeTextures) {
          disposeMaterial(material)
        } else {
          material.dispose()
        }
      }
    } else {
      if (disposeTextures) {
        disposeMaterial(object.material)
      } else {
        object.material.dispose()
      }
    }
    object.material = null
  }

  // Dispose any additional dispose method
  if (typeof object.dispose === 'function') {
    object.dispose()
  }

  // Clear references
  if (object.parent) {
    object.parent.remove(object)
  }
}

/**
 * Dispose of a texture
 * @param {THREE.Texture} texture - Texture to dispose
 */
function disposeTexture (texture) {
  if (texture) {
    texture.dispose()
  }
}

/**
 * Dispose of all objects in a scene without disposing the scene itself
 * @param {THREE.Scene} scene - Scene to clear
 */
function clearScene (scene) {
  if (!scene) return

  while (scene.children.length > 0) {
    const child = scene.children[0]
    scene.remove(child)
    dispose3(child)
  }
}

/**
 * Create a disposal tracker for debugging memory leaks
 * @returns {Object} Tracker with track/untrack/report methods
 */
function createDisposalTracker () {
  const tracked = new Map()
  let idCounter = 0

  return {
    track (object, label = 'unnamed') {
      const id = ++idCounter
      tracked.set(id, { object, label, timestamp: Date.now() })
      return id
    },

    untrack (id) {
      tracked.delete(id)
    },

    report () {
      const report = {
        totalTracked: tracked.size,
        objects: []
      }

      for (const [id, info] of tracked.entries()) {
        report.objects.push({
          id,
          label: info.label,
          age: Date.now() - info.timestamp,
          type: info.object?.constructor?.name || 'unknown'
        })
      }

      return report
    },

    clear () {
      tracked.clear()
    }
  }
}

module.exports = {
  dispose3,
  disposeMaterial,
  disposeTexture,
  clearScene,
  createDisposalTracker
}
