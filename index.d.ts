import { Bot } from 'mineflayer'
import { EventEmitter } from 'events'
import * as THREE from 'three'

// Vec3 type for position
interface Vec3 {
  x: number
  y: number
  z: number
  floored(): Vec3
  offset(dx: number, dy: number, dz: number): Vec3
}

// Mineflayer viewer settings
interface MineflayerViewerSettings {
  viewDistance?: number
  firstPerson?: boolean
  port?: number
  prefix?: string
}

// Mineflayer viewer return type
interface MineflayerViewerResult {
  server: any
  io: any
  close: () => void
}

// Export mineflayer viewer function
export function mineflayer(bot: Bot, settings: MineflayerViewerSettings): MineflayerViewerResult

// Standalone viewer settings
interface StandaloneViewerSettings {
  version: SupportedVersion
  world: (x: number, y: number, z: number) => 0 | 1
  center?: Vec3
  viewDistance?: number
  port?: number
  prefix?: string
}

export function standalone(options: StandaloneViewerSettings): void

// Headless viewer settings
interface HeadlessViewerSettings {
  viewDistance?: number
  output?: string
  frames?: number
  width?: number
  height?: number
  logFFMPEG?: boolean
  jpegOption?: any
}

export function headless(bot: Bot, settings: HeadlessViewerSettings): void

// World Renderer class
interface WorldRendererStats {
  sectionMeshCount: number
  loadedChunkCount: number
  sectionsOutstanding: number
  pendingDirtySections: number
  workerCount: number
  active: boolean
  frustumCulling: {
    enabled: boolean
    visibleMeshes: number
    totalMeshes: number
    culledMeshes: number
  }
}

declare class WorldRenderer {
  constructor(scene: THREE.Scene, numWorkers?: number)
  sectionMeshs: Record<string, THREE.Mesh>
  active: boolean
  version: string | undefined
  scene: THREE.Scene
  loadedChunks: Record<string, boolean>
  frustumCullingEnabled: boolean

  resetWorld(): void
  dispose(): void
  setVersion(version: string): void
  addColumn(x: number, z: number, chunk: any): void
  removeColumn(x: number, z: number): void
  setBlockStateId(pos: Vec3, stateId: number): void
  setSectionDirty(pos: Vec3, value?: boolean): void
  clearPendingDirtySections(): void
  updateFrustumCulling(camera: THREE.Camera): void
  setFrustumCulling(enabled: boolean): void
  waitForChunksToRender(): Promise<void>
  getStats(): WorldRendererStats
}

// Entities class
declare class Entities {
  constructor(scene: THREE.Scene)
  entities: Record<string | number, THREE.Object3D>

  clear(): void
  update(entity: EntityData): void
}

interface EntityData {
  id: number
  name?: string
  pos?: { x: number; y: number; z: number }
  width?: number
  height?: number
  yaw?: number
  delete?: boolean
  username?: string
}

// Primitives class
declare class Primitives {
  constructor(scene: THREE.Scene, camera: THREE.Camera)
  primitives: Record<string, THREE.Object3D>

  clear(): void
  update(primitive: PrimitiveData): void
}

interface PrimitiveData {
  type: 'line' | 'boxgrid' | 'points'
  id: string
  points?: Array<{ x: number; y: number; z: number }>
  start?: { x: number; y: number; z: number }
  end?: { x: number; y: number; z: number }
  color?: number | string
  size?: number
}

// Viewer class
interface ViewerStats {
  world: WorldRendererStats | null
  frustumCullingEnabled: boolean
}

declare class Viewer {
  constructor(renderer: THREE.WebGLRenderer)
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  world: WorldRenderer
  entities: Entities
  primitives: Primitives
  domElement: HTMLCanvasElement
  playerHeight: number
  isSneaking: boolean
  version: string | undefined
  enableFrustumCulling: boolean

  resetAll(): void
  dispose(): void
  setVersion(version: string): boolean
  addColumn(x: number, z: number, chunk: any): void
  removeColumn(x: number, z: number): void
  setBlockStateId(pos: Vec3, stateId: number): void
  updateEntity(entity: EntityData): void
  updatePrimitive(primitive: PrimitiveData): void
  setFirstPersonCamera(pos: Vec3 | null, yaw: number, pitch: number): void
  listen(emitter: EventEmitter): void
  update(): void
  setFrustumCulling(enabled: boolean): void
  getStats(): ViewerStats
  waitForChunksToRender(): Promise<void>
}

// WorldView class
declare class WorldView extends EventEmitter {
  constructor(world: any, viewDistance: number, position: Vec3, emitter?: EventEmitter)
  viewDistance: number

  init(position: Vec3): Promise<void>
  updatePosition(position: Vec3): void
  listenToBot(bot: Bot): void
  removeListenersFromBot(bot: Bot): void
}

// MapControls class
declare class MapControls {
  constructor(camera: THREE.Camera, domElement: HTMLElement)
  enabled: boolean
  target: THREE.Vector3
  minDistance: number
  maxDistance: number
  enableDamping: boolean
  dampingFactor: number
  enableZoom: boolean
  zoomSpeed: number
  enableRotate: boolean
  rotateSpeed: number
  enablePan: boolean
  panSpeed: number
  keyPanDistance: number
  keyPanSpeed: number
  verticalTranslationSpeed: number

  update(force?: boolean): boolean
  reset(): void
  saveState(): void
  setRotationOrigin(position: THREE.Vector3): void
  unsetRotationOrigin(): void
  registerHandlers(): void
  unregisterHandlers(): void
}

// Entity class
declare class Entity {
  constructor(version: string, name: string, scene: THREE.Scene)
  mesh: THREE.Object3D
}

// Viewer exports
export const viewer: {
  Viewer: typeof Viewer
  WorldView: typeof WorldView
  MapControls: typeof MapControls
  Entity: typeof Entity
  WorldRenderer: typeof WorldRenderer
  Entities: typeof Entities
  Primitives: typeof Primitives
  getBufferFromStream: (stream: NodeJS.ReadableStream) => Promise<Buffer>
}

// Supported versions
export const supportedVersions: SupportedVersion[]
export type SupportedVersion =
  | '1.8.8'
  | '1.9.4'
  | '1.10.2'
  | '1.11.2'
  | '1.12.2'
  | '1.13.2'
  | '1.14.4'
  | '1.15.2'
  | '1.16.1'
  | '1.16.4'
  | '1.17.1'
  | '1.18.1'
  | '1.18.2'
  | '1.19'
  | '1.19.2'
  | '1.19.3'
  | '1.19.4'
  | '1.20'
  | '1.20.1'
  | '1.20.2'
  | '1.20.3'
  | '1.20.4'

// Security utilities
export namespace security {
  interface ValidateUrlOptions {
    allowedProtocols?: string[]
    allowedDomains?: string[] | null
    blockedDomains?: string[]
  }

  interface ValidateUrlResult {
    valid: boolean
    url?: string
    error?: string
  }

  function validateUrl(targetUrl: string, options?: ValidateUrlOptions): ValidateUrlResult
  function isPrivateIP(hostname: string): boolean
  function sanitizeHeaders(headers: Record<string, string> | null | undefined): Record<string, string>
}

// Schema validation
export namespace schemas {
  interface ValidationResult {
    valid: boolean
    errors?: string[]
  }

  function validateMessage(messageType: string, data: any): ValidationResult
}

// Disposal utilities
export namespace dispose {
  function dispose3(object: THREE.Object3D, options?: { disposeTextures?: boolean; recursive?: boolean }): void
  function disposeMaterial(material: THREE.Material): void
  function disposeTexture(texture: THREE.Texture): void
  function clearScene(scene: THREE.Scene): void
}

// Constants
export namespace constants {
  const CHUNK_SIZE: number
  const SECTION_HEIGHT: number
  const WORLD_HEIGHT: number
  const WORLD_HEIGHT_MODERN: number
  const PLAYER_HEIGHT: number
  const SNEAK_HEIGHT_OFFSET: number
  const TWEEN_DURATION_MS: number
  const MATERIAL_ALPHA_TEST: number
  const DEFAULT_NUM_WORKERS: number
  const DEFAULT_VIEW_DISTANCE: number
  const DEFAULT_PORT: number
  const BLOCK_CACHE_MAX_SIZE: number
}
