/**
 * Constants used throughout the viewer
 * Extracted from magic numbers to improve maintainability
 * @module viewer/lib/constants
 */

module.exports = {
  // Chunk and world dimensions
  CHUNK_SIZE: 16,
  SECTION_HEIGHT: 16,
  WORLD_HEIGHT: 256,
  WORLD_HEIGHT_MODERN: 384, // 1.18+ worlds

  // Camera settings
  CAMERA_FOV: 75,
  CAMERA_NEAR: 0.1,
  CAMERA_FAR: 1000,

  // Player dimensions
  PLAYER_HEIGHT: 1.6,
  SNEAK_HEIGHT_OFFSET: 0.3,

  // Lighting
  AMBIENT_LIGHT_COLOR: 0xcccccc,
  DIRECTIONAL_LIGHT_COLOR: 0xffffff,
  DIRECTIONAL_LIGHT_INTENSITY: 0.5,

  // Default colors
  DEFAULT_LINE_COLOR: 0xff0000,
  DEFAULT_PRIMITIVE_COLOR: 0xff00ff,
  SKYBOX_COLOR: 'lightblue',

  // Animation timing (milliseconds)
  TWEEN_DURATION_MS: 50,
  WORKER_PROCESS_INTERVAL_MS: 50,

  // Materials
  MATERIAL_ALPHA_TEST: 0.1,
  DEFAULT_LINE_WIDTH: 8,

  // Rendering
  MAX_RAYCAST_DISTANCE: 256,

  // Liquid rendering
  LIQUID_MIN_HEIGHT: 1 / 9,
  LIQUID_SOURCE_HEIGHT: 8 / 9,

  // Cache limits
  BLOCK_CACHE_MAX_SIZE: 10000,
  BLOCK_CACHE_TTL_MS: 30 * 60 * 1000, // 30 minutes

  // Worker settings
  DEFAULT_NUM_WORKERS: 4,

  // View settings
  DEFAULT_VIEW_DISTANCE: 6,
  DEFAULT_PORT: 3000,

  // Entity settings
  ENTITY_NAME_FONT: '50pt Arial',
  ENTITY_NAME_CANVAS_WIDTH: 500,
  ENTITY_NAME_CANVAS_HEIGHT: 100,
  ENTITY_NAME_OFFSET_Y: 0.6
}
