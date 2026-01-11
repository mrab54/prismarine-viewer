const THREE = require('three')
const TWEEN = require('@tweenjs/tween.js')

const Entity = require('./entity/Entity')
const { dispose3 } = require('./dispose')
const { TWEEN_DURATION_MS } = require('./constants')

const { createCanvas } = require('canvas')

function getEntityMesh (entity, scene) {
  if (entity.name) {
    try {
      const e = new Entity('1.16.4', entity.name, scene)

      if (entity.username !== undefined) {
        const canvas = createCanvas(500, 100)

        const ctx = canvas.getContext('2d')
        ctx.font = '50pt Arial'
        ctx.fillStyle = '#000000'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'

        const txt = entity.username
        ctx.fillText(txt, 100, 0)

        const tex = new THREE.Texture(canvas)
        tex.needsUpdate = true
        const spriteMat = new THREE.SpriteMaterial({ map: tex })
        const sprite = new THREE.Sprite(spriteMat)
        sprite.position.y += entity.height + 0.6

        e.mesh.add(sprite)
      }
      return e.mesh
    } catch (err) {
      console.log(err)
    }
  }

  const geometry = new THREE.BoxGeometry(entity.width, entity.height, entity.width)
  geometry.translate(0, entity.height / 2, 0)
  const material = new THREE.MeshBasicMaterial({ color: 0xff00ff })
  const cube = new THREE.Mesh(geometry, material)
  return cube
}

class Entities {
  constructor (scene) {
    this.scene = scene
    this.entities = {}
    // Track tweens per entity to prevent memory leaks
    this.entityTweens = {}
  }

  /**
   * Stop and clean up tweens for an entity
   * @param {string|number} entityId - Entity ID
   */
  _stopEntityTweens (entityId) {
    const tweens = this.entityTweens[entityId]
    if (tweens) {
      if (tweens.position) {
        tweens.position.stop()
      }
      if (tweens.rotation) {
        tweens.rotation.stop()
      }
      delete this.entityTweens[entityId]
    }
  }

  clear () {
    // Stop all entity tweens
    for (const entityId of Object.keys(this.entityTweens)) {
      this._stopEntityTweens(entityId)
    }
    this.entityTweens = {}

    // Dispose all meshes
    for (const mesh of Object.values(this.entities)) {
      this.scene.remove(mesh)
      dispose3(mesh)
    }
    this.entities = {}
  }

  update (entity) {
    if (!this.entities[entity.id]) {
      const mesh = getEntityMesh(entity, this.scene)
      if (!mesh) return
      this.entities[entity.id] = mesh
      this.entityTweens[entity.id] = {}
      this.scene.add(mesh)
    }

    const e = this.entities[entity.id]
    const tweens = this.entityTweens[entity.id]

    if (entity.delete) {
      // Stop tweens before removing entity
      this._stopEntityTweens(entity.id)
      this.scene.remove(e)
      dispose3(e)
      delete this.entities[entity.id]
      return
    }

    if (entity.pos) {
      // Stop previous position tween before starting new one
      if (tweens.position) {
        tweens.position.stop()
      }
      tweens.position = new TWEEN.Tween(e.position)
        .to({ x: entity.pos.x, y: entity.pos.y, z: entity.pos.z }, TWEEN_DURATION_MS)
        .start()
    }

    if (entity.yaw) {
      // Stop previous rotation tween before starting new one
      if (tweens.rotation) {
        tweens.rotation.stop()
      }
      const da = (entity.yaw - e.rotation.y) % (Math.PI * 2)
      const dy = 2 * da % (Math.PI * 2) - da
      tweens.rotation = new TWEEN.Tween(e.rotation)
        .to({ y: e.rotation.y + dy }, TWEEN_DURATION_MS)
        .start()
    }
  }
}

module.exports = { Entities }
