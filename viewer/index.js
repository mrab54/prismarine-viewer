module.exports = {
  // Main classes
  Viewer: require('./lib/viewer').Viewer,
  WorldView: require('./lib/worldView').WorldView,
  MapControls: require('./lib/controls').MapControls,
  Entity: require('./lib/entity/Entity'),

  // Additional classes for advanced usage
  WorldRenderer: require('./lib/worldrenderer').WorldRenderer,
  Entities: require('./lib/entities').Entities,
  Primitives: require('./lib/primitives').Primitives,

  // Utilities
  getBufferFromStream: require('./lib/simpleUtils').getBufferFromStream,
  dispose: require('./lib/dispose'),
  constants: require('./lib/constants'),

  // Version support
  supportedVersions: require('./lib/version').supportedVersions,
  getVersion: require('./lib/version').getVersion
}
