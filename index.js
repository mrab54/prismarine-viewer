module.exports = {
  // Main entry points
  mineflayer: require('./lib/mineflayer'),
  standalone: require('./lib/standalone'),
  headless: require('./lib/headless'),

  // Viewer module
  viewer: require('./viewer'),
  supportedVersions: require('./viewer').supportedVersions,

  // Security utilities
  security: require('./lib/security/urlValidator'),
  schemas: require('./lib/schemas/socketMessages'),

  // Server utilities
  common: require('./lib/common')
}
