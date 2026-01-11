# Implementation Plan: prismarine-viewer Remediation
## Based on Comprehensive Code Review dated January 11, 2026

---

## Table of Contents

1. [Phase 0: Preparation & Infrastructure](#phase-0-preparation--infrastructure)
2. [Phase 1: Security Hardening (P0)](#phase-1-security-hardening-p0)
3. [Phase 2: Memory Safety (P0/P1)](#phase-2-memory-safety-p0p1)
4. [Phase 3: Performance Foundation (P1)](#phase-3-performance-foundation-p1)
5. [Phase 4: Testing Infrastructure (P1)](#phase-4-testing-infrastructure-p1)
6. [Phase 5: Documentation & Types (P2)](#phase-5-documentation--types-p2)
7. [Phase 6: Architectural Improvements (P1/P2)](#phase-6-architectural-improvements-p1p2)
8. [Phase 7: Code Quality & Modernization (P2/P3)](#phase-7-code-quality--modernization-p2p3)
9. [Phase 8: Long-term Improvements (P3)](#phase-8-long-term-improvements-p3)

---

## Phase 0: Preparation & Infrastructure

**Duration:** 1 week
**Goal:** Set up the foundation for systematic improvements

### 0.1 Development Environment Setup

- [ ] **0.1.1** Create a new branch `refactor/comprehensive-improvements`
- [ ] **0.1.2** Set up pre-commit hooks for linting
- [ ] **0.1.3** Configure CI to run existing tests on PRs
- [ ] **0.1.4** Create issue templates for tracking work

### 0.2 Baseline Measurements

- [ ] **0.2.1** Run `npm audit` and document current vulnerability count
- [ ] **0.2.2** Measure current memory usage at view distance 4, 8, 12
- [ ] **0.2.3** Measure current FPS at view distance 4, 8, 12
- [ ] **0.2.4** Document current test coverage percentage
- [ ] **0.2.5** Create performance benchmark script for regression testing

### 0.3 Dependency Audit

- [ ] **0.3.1** Run `npm outdated` and document all outdated packages
- [ ] **0.3.2** Check each dependency for known CVEs using `npm audit`
- [ ] **0.3.3** Identify dependencies that can be safely updated
- [ ] **0.3.4** Create dependency update plan with breaking change notes

---

## Phase 1: Security Hardening (P0)

**Duration:** 2 weeks
**Goal:** Eliminate all critical and high security vulnerabilities

### 1.1 SSRF/Open Proxy Vulnerability

**Issue:** `examples/web_client/server.js:45-70` allows requests to internal network
**Priority:** P0 Critical
**Effort:** 4-8 hours

#### Research Tasks
- [ ] **1.1.1** Read current proxy implementation to understand functionality
  - File: `examples/web_client/server.js`
  - Understand what endpoints it proxies and why
- [ ] **1.1.2** Research SSRF mitigation best practices
  - URL validation techniques
  - Allowlist vs blocklist approaches
  - Private IP detection methods

#### Design Tasks
- [ ] **1.1.3** Document the legitimate use cases for the proxy
- [ ] **1.1.4** Design URL validation strategy
  - Define allowed protocols (http, https only)
  - Define allowed domains (if applicable)
  - Define blocked IP ranges (private networks, localhost)
- [ ] **1.1.5** Decide: Keep proxy with restrictions OR remove entirely

#### Implementation Tasks
- [ ] **1.1.6** Create URL validation utility function
  ```javascript
  // lib/security/urlValidator.js
  function isAllowedUrl(url) { /* ... */ }
  ```
- [ ] **1.1.7** Add private IP range detection
- [ ] **1.1.8** Integrate validation into proxy endpoint
- [ ] **1.1.9** Add error responses for blocked requests

#### Verification Tasks
- [ ] **1.1.10** Write test cases for SSRF attempts
  - Test localhost blocking
  - Test private IP blocking (10.x, 172.16.x, 192.168.x)
  - Test allowed external URLs
- [ ] **1.1.11** Manual penetration testing of proxy endpoint

---

### 1.2 Wildcard CORS Configuration

**Issue:** `examples/web_client/server.js:10-24` uses `*` for CORS
**Priority:** P0 Critical
**Effort:** 2-4 hours

#### Research Tasks
- [ ] **1.2.1** Identify all endpoints that need CORS
- [ ] **1.2.2** Determine expected client origins
- [ ] **1.2.3** Research CORS best practices for WebSocket applications

#### Design Tasks
- [ ] **1.2.4** Define CORS configuration strategy
  - Development: localhost origins
  - Production: configurable allowed origins
- [ ] **1.2.5** Document CORS configuration in README

#### Implementation Tasks
- [ ] **1.2.6** Install `cors` package if not present
- [ ] **1.2.7** Create CORS configuration module
  ```javascript
  // lib/security/corsConfig.js
  const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
  }
  ```
- [ ] **1.2.8** Apply CORS configuration to Express app
- [ ] **1.2.9** Apply CORS configuration to Socket.io

#### Verification Tasks
- [ ] **1.2.10** Test that allowed origins can connect
- [ ] **1.2.11** Test that disallowed origins are blocked
- [ ] **1.2.12** Test WebSocket connections with CORS

---

### 1.3 Unsafe Dynamic Code Execution

**Issue:** `viewer/lib/worker.js:6-7` uses dynamic require pattern
**Priority:** P0 High
**Effort:** 4-8 hours

#### Research Tasks
- [ ] **1.3.1** Understand why dynamic require is used
  - Read `viewer/lib/worker.js` lines 1-20
  - Identify what differs between Node.js and browser
- [ ] **1.3.2** Research webpack worker handling
- [ ] **1.3.3** Research alternative patterns for isomorphic workers

#### Design Tasks
- [ ] **1.3.4** Design build-time environment detection strategy
  - Option A: Separate worker files (worker.node.js, worker.browser.js)
  - Option B: Webpack DefinePlugin for environment
  - Option C: Build-time code replacement
- [ ] **1.3.5** Choose approach and document rationale

#### Implementation Tasks
- [ ] **1.3.6** Create separate worker entry points if needed
- [ ] **1.3.7** Update webpack configuration for worker handling
- [ ] **1.3.8** Remove dynamic code execution from worker.js
- [ ] **1.3.9** Update worldrenderer.js Worker instantiation
- [ ] **1.3.10** Test in both Node.js and browser environments

#### Verification Tasks
- [ ] **1.3.11** Verify worker functions in Node.js (headless mode)
- [ ] **1.3.12** Verify worker functions in browser
- [ ] **1.3.13** Run static analysis to confirm no dynamic code execution

---

### 1.4 Socket Input Validation

**Issue:** `lib/mineflayer.js:48-79` has no message validation
**Priority:** P0 High
**Effort:** 8-16 hours

#### Research Tasks
- [ ] **1.4.1** Catalog all socket message types
  - Incoming: List all `socket.on()` handlers
  - Outgoing: List all `socket.emit()` calls
- [ ] **1.4.2** Document expected schema for each message type
- [ ] **1.4.3** Research validation libraries (Joi, Yup, Zod)
- [ ] **1.4.4** Evaluate performance impact of validation

#### Design Tasks
- [ ] **1.4.5** Define message schemas
  ```javascript
  // Example schema structure
  const schemas = {
    position: { x: 'number', y: 'number', z: 'number', yaw: 'number', pitch: 'number' },
    blockClicked: { block: 'object', face: 'number', button: 'number' }
  }
  ```
- [ ] **1.4.6** Design validation middleware pattern
- [ ] **1.4.7** Design error handling for invalid messages

#### Implementation Tasks
- [ ] **1.4.8** Install chosen validation library
- [ ] **1.4.9** Create message schema definitions
  - File: `lib/schemas/socketMessages.js`
- [ ] **1.4.10** Create validation middleware
  ```javascript
  function validateMessage(schema) {
    return (data, callback) => {
      const result = validate(data, schema)
      if (!result.valid) return callback(new Error('Invalid message'))
      callback(null, data)
    }
  }
  ```
- [ ] **1.4.11** Apply validation to all incoming messages in mineflayer.js
- [ ] **1.4.12** Apply validation to lib/standalone.js
- [ ] **1.4.13** Apply validation to viewer client-side handlers

#### Verification Tasks
- [ ] **1.4.14** Unit tests for each message schema
- [ ] **1.4.15** Integration test with malformed messages
- [ ] **1.4.16** Test that valid messages still work correctly

---

### 1.5 Security Headers & Middleware

**Issue:** `lib/common.js` lacks security headers
**Priority:** P1 High
**Effort:** 4-8 hours

#### Research Tasks
- [ ] **1.5.1** Review helmet.js documentation
- [ ] **1.5.2** Identify appropriate CSP policy for Three.js application
- [ ] **1.5.3** Research rate limiting strategies for WebSocket

#### Design Tasks
- [ ] **1.5.4** Define security header configuration
- [ ] **1.5.5** Define rate limiting rules
  - Requests per minute per IP
  - WebSocket message rate limiting

#### Implementation Tasks
- [ ] **1.5.6** Install `helmet` and `express-rate-limit`
- [ ] **1.5.7** Configure helmet in lib/common.js
  ```javascript
  const helmet = require('helmet')
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-eval'"], // Required for Three.js
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "ws:", "wss:"]
      }
    }
  }))
  ```
- [ ] **1.5.8** Add rate limiting middleware
- [ ] **1.5.9** Add connection limits to Socket.io

#### Verification Tasks
- [ ] **1.5.10** Verify security headers in browser dev tools
- [ ] **1.5.11** Test rate limiting triggers correctly
- [ ] **1.5.12** Verify application still functions with CSP

---

### 1.6 Dependency CVE Remediation

**Issue:** Known CVEs in dependency chain
**Priority:** P1 High
**Effort:** 4-8 hours

#### Research Tasks
- [ ] **1.6.1** Run `npm audit --json > audit-report.json`
- [ ] **1.6.2** Identify direct vs transitive vulnerabilities
- [ ] **1.6.3** Check if vulnerable packages have patches available

#### Implementation Tasks
- [ ] **1.6.4** Update packages with available patches
  ```bash
  npm audit fix
  ```
- [ ] **1.6.5** For packages without patches, evaluate alternatives
- [ ] **1.6.6** Add `overrides` in package.json for transitive deps if needed
- [ ] **1.6.7** Document any accepted risks in SECURITY.md

#### Verification Tasks
- [ ] **1.6.8** Run `npm audit` and confirm reduced vulnerability count
- [ ] **1.6.9** Run full test suite after updates
- [ ] **1.6.10** Test all three modes (mineflayer, standalone, headless)

---

## Phase 2: Memory Safety (P0/P1)

**Duration:** 2 weeks
**Goal:** Eliminate memory leaks and prevent crashes

### 2.1 Block Cache LRU Implementation

**Issue:** `viewer/lib/world.js:25, 66-70` - unbounded cache
**Priority:** P0 High
**Effort:** 4-8 hours

#### Research Tasks
- [ ] **2.1.1** Analyze block cache usage patterns
  - How many unique block states exist?
  - What's the access pattern (frequent re-access vs one-time)?
- [ ] **2.1.2** Research LRU cache implementations
  - `lru-cache` npm package
  - Custom implementation considerations
- [ ] **2.1.3** Determine optimal cache size
  - Memory per entry
  - Target maximum memory usage

#### Design Tasks
- [ ] **2.1.4** Design cache eviction strategy
  - LRU with max entries (e.g., 10,000)
  - Or LRU with max memory (e.g., 50MB)
- [ ] **2.1.5** Design cache key strategy
  - Current: stateId
  - Consider: version + stateId for multi-version support

#### Implementation Tasks
- [ ] **2.1.6** Install `lru-cache` package
- [ ] **2.1.7** Replace blockCache object with LRU cache
  ```javascript
  const LRU = require('lru-cache')
  this.blockCache = new LRU({
    max: 10000,
    ttl: 1000 * 60 * 30 // 30 minutes
  })
  ```
- [ ] **2.1.8** Update all blockCache access patterns
- [ ] **2.1.9** Add cache statistics logging (optional)

#### Verification Tasks
- [ ] **2.1.10** Memory test: Load world, verify cache stays bounded
- [ ] **2.1.11** Performance test: Verify no regression from cache misses
- [ ] **2.1.12** Long-running test: 1 hour session, monitor memory

---

### 2.2 Three.js Resource Disposal

**Issue:** `viewer/lib/dispose.js:1-6` - incomplete disposal
**Priority:** P0 High
**Effort:** 4-8 hours

#### Research Tasks
- [ ] **2.2.1** Review Three.js disposal best practices
  - https://threejs.org/docs/#manual/en/introduction/How-to-dispose-of-objects
- [ ] **2.2.2** Catalog all Three.js objects created in codebase
  - Geometries, Materials, Textures, Meshes
- [ ] **2.2.3** Identify shared vs unique resources

#### Design Tasks
- [ ] **2.2.4** Design comprehensive disposal function
  - Handle geometry
  - Handle material (including maps)
  - Handle textures
  - Recursive child disposal
- [ ] **2.2.5** Design texture cache disposal strategy

#### Implementation Tasks
- [ ] **2.2.6** Rewrite dispose3 function
  ```javascript
  function dispose3(object) {
    if (!object) return

    // Dispose geometry
    if (object.geometry) {
      object.geometry.dispose()
    }

    // Dispose material(s)
    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach(disposeMaterial)
      } else {
        disposeMaterial(object.material)
      }
    }

    // Recursively dispose children
    if (object.children) {
      while (object.children.length > 0) {
        dispose3(object.children[0])
        object.remove(object.children[0])
      }
    }
  }

  function disposeMaterial(material) {
    // Dispose all texture maps
    const mapTypes = ['map', 'lightMap', 'bumpMap', 'normalMap',
                      'specularMap', 'envMap', 'alphaMap', 'aoMap']
    mapTypes.forEach(type => {
      if (material[type]) material[type].dispose()
    })
    material.dispose()
  }
  ```
- [ ] **2.2.7** Update worldrenderer.js resetWorld() to use new dispose3
- [ ] **2.2.8** Update entities.js clear() to use new dispose3
- [ ] **2.2.9** Update primitives.js clear() to use new dispose3
- [ ] **2.2.10** Add texture cache cleanup on version change

#### Verification Tasks
- [ ] **2.2.11** Monitor WebGL memory using Chrome DevTools
- [ ] **2.2.12** Test world reset multiple times, verify no GPU memory growth
- [ ] **2.2.13** Test entity spawn/despawn cycles

---

### 2.3 Worker Memory Management

**Issue:** Workers accumulate memory without cleanup
**Priority:** P1 High
**Effort:** 4-8 hours

#### Research Tasks
- [ ] **2.3.1** Analyze worker memory usage over time
- [ ] **2.3.2** Identify what data workers retain
  - World chunks
  - dirtySections
  - blockStates

#### Design Tasks
- [ ] **2.3.3** Design worker cleanup protocol
  - Message to clear old chunks
  - Chunk eviction based on distance
- [ ] **2.3.4** Design worker lifecycle management
  - When to terminate workers
  - When to create new workers

#### Implementation Tasks
- [ ] **2.3.5** Add chunk removal message handling in worker.js
  ```javascript
  } else if (data.type === 'removeChunk') {
    world.removeColumn(data.x, data.z)
  }
  ```
- [ ] **2.3.6** Clear dirtySections on reset in worker.js
- [ ] **2.3.7** Add worker termination in worldrenderer cleanup
- [ ] **2.3.8** Clear setInterval on worker reset
  ```javascript
  let intervalId = null
  // On start
  intervalId = setInterval(processSections, 50)
  // On reset
  if (intervalId) clearInterval(intervalId)
  ```
- [ ] **2.3.9** Send removeChunk when chunks unload from view

#### Verification Tasks
- [ ] **2.3.10** Memory profile workers during chunk load/unload cycles
- [ ] **2.3.11** Test world reset clears worker memory
- [ ] **2.3.12** Long-running test with moving camera

---

### 2.4 TWEEN Memory Leak Fix

**Issue:** `viewer/lib/viewer.js:80, 118` - tweens accumulate
**Priority:** P1 High
**Effort:** 2-4 hours

#### Research Tasks
- [ ] **2.4.1** Review TWEEN.js documentation on tween lifecycle
- [ ] **2.4.2** Identify all tween creation points in codebase

#### Design Tasks
- [ ] **2.4.3** Design tween management strategy
  - Store tween references
  - Stop previous tween before creating new one

#### Implementation Tasks
- [ ] **2.4.4** Add tween tracking to Viewer class
  ```javascript
  this.activeTweens = {
    camera: null,
    playerHeight: null
  }
  ```
- [ ] **2.4.5** Update setFirstPersonCamera to stop previous tween
  ```javascript
  if (this.activeTweens.camera) {
    this.activeTweens.camera.stop()
  }
  this.activeTweens.camera = new TWEEN.Tween(...)
  ```
- [ ] **2.4.6** Apply same pattern to entities.js tweens
- [ ] **2.4.7** Apply same pattern to lib/index.js tweens

#### Verification Tasks
- [ ] **2.4.8** Verify tween count stays bounded
- [ ] **2.4.9** Test rapid position updates don't accumulate tweens

---

## Phase 3: Performance Foundation (P1)

**Duration:** 4 weeks
**Goal:** 2x performance improvement

### 3.1 Frustum Culling Implementation

**Issue:** All meshes rendered regardless of visibility
**Priority:** P1 High
**Effort:** 16-24 hours

#### Research Tasks
- [ ] **3.1.1** Review Three.js frustum culling documentation
- [ ] **3.1.2** Understand current mesh organization (sectionMeshs)
- [ ] **3.1.3** Research chunk-level vs mesh-level culling
- [ ] **3.1.4** Study existing implementations in similar projects

#### Design Tasks
- [ ] **3.1.5** Design culling integration point
  - Option A: Per-mesh frustum.intersectsBox()
  - Option B: Per-chunk bounding box check
  - Option C: Hybrid approach
- [ ] **3.1.6** Design bounding box calculation for sections
- [ ] **3.1.7** Document expected performance improvement

#### Implementation Tasks
- [ ] **3.1.8** Create FrustumCuller utility class
  ```javascript
  class FrustumCuller {
    constructor(camera) {
      this.frustum = new THREE.Frustum()
      this.projScreenMatrix = new THREE.Matrix4()
    }

    update(camera) {
      this.projScreenMatrix.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse
      )
      this.frustum.setFromProjectionMatrix(this.projScreenMatrix)
    }

    isVisible(boundingBox) {
      return this.frustum.intersectsBox(boundingBox)
    }
  }
  ```
- [ ] **3.1.9** Add bounding box to section meshes
- [ ] **3.1.10** Integrate culling into render loop
- [ ] **3.1.11** Add mesh.visible toggle based on culling result
- [ ] **3.1.12** Optimize: only recalculate frustum when camera moves

#### Verification Tasks
- [ ] **3.1.13** FPS benchmark before and after
- [ ] **3.1.14** Visual verification: no popping artifacts
- [ ] **3.1.15** Test with various view distances

---

### 3.2 Dirty Section Deduplication

**Issue:** 80 dirty events per chunk load
**Priority:** P1 High
**Effort:** 4-8 hours

#### Research Tasks
- [ ] **3.2.1** Trace dirty section marking code path
- [ ] **3.2.2** Count actual duplicate markings
- [ ] **3.2.3** Understand why neighbors are marked dirty

#### Design Tasks
- [ ] **3.2.4** Design batched dirty marking
  - Collect dirty sections
  - Deduplicate before sending to workers
- [ ] **3.2.5** Design debouncing strategy

#### Implementation Tasks
- [ ] **3.2.6** Create dirty section batch collector
  ```javascript
  this.pendingDirty = new Set()
  this.dirtyFlushScheduled = false

  setSectionDirty(pos) {
    const key = `${pos.x},${pos.y},${pos.z}`
    this.pendingDirty.add(key)
    this.scheduleDirtyFlush()
  }

  scheduleDirtyFlush() {
    if (this.dirtyFlushScheduled) return
    this.dirtyFlushScheduled = true
    queueMicrotask(() => this.flushDirtySections())
  }
  ```
- [ ] **3.2.7** Implement flushDirtySections
- [ ] **3.2.8** Update addColumn to use batched marking
- [ ] **3.2.9** Update setBlockStateId to use batched marking

#### Verification Tasks
- [ ] **3.2.10** Log dirty event count before/after
- [ ] **3.2.11** Verify chunks still render correctly
- [ ] **3.2.12** Performance benchmark chunk loading

---

### 3.3 renderElement Optimization

**Issue:** Per-vertex object creation in `viewer/lib/models.js:231-363`
**Priority:** P1 High
**Effort:** 8-16 hours

#### Research Tasks
- [ ] **3.3.1** Profile renderElement to identify specific bottlenecks
- [ ] **3.3.2** Analyze allocation patterns using Chrome DevTools
- [ ] **3.3.3** Review array methods that cause allocations

#### Design Tasks
- [ ] **3.3.4** Design pre-allocated working buffers
- [ ] **3.3.5** Plan vertex position calculation optimization
- [ ] **3.3.6** Design matrix operation optimization

#### Implementation Tasks
- [ ] **3.3.7** Pre-allocate reusable vectors/arrays
  ```javascript
  // Module-level reusable objects
  const tempVec = [0, 0, 0]
  const tempMatrix = [[0,0,0], [0,0,0], [0,0,0]]
  const tempVertex = [0, 0, 0]
  ```
- [ ] **3.3.8** Replace `array.map()` with in-place operations
- [ ] **3.3.9** Cache glass check result
  ```javascript
  // Instead of: block.name.indexOf('glass') >= 0
  // Use: block.isGlass (computed once when block created)
  ```
- [ ] **3.3.10** Optimize matrix multiplication to avoid allocations
- [ ] **3.3.11** Optimize ambient occlusion calculation

#### Verification Tasks
- [ ] **3.3.12** Profile before/after comparison
- [ ] **3.3.13** Verify visual output unchanged
- [ ] **3.3.14** Benchmark section generation time

---

### 3.4 Mesh Pooling

**Issue:** New geometry created for every section update
**Priority:** P1 High
**Effort:** 8-16 hours

#### Research Tasks
- [ ] **3.4.1** Research Three.js BufferGeometry pooling patterns
- [ ] **3.4.2** Analyze typical geometry sizes for sections
- [ ] **3.4.3** Determine optimal pool size

#### Design Tasks
- [ ] **3.4.4** Design geometry pool interface
  ```javascript
  class GeometryPool {
    acquire(attributeSizes) { /* return geometry */ }
    release(geometry) { /* return to pool */ }
  }
  ```
- [ ] **3.4.5** Design attribute buffer reuse strategy

#### Implementation Tasks
- [ ] **3.4.6** Create GeometryPool class
- [ ] **3.4.7** Integrate pool into worldrenderer.js
- [ ] **3.4.8** Modify worker message handling to use pool
- [ ] **3.4.9** Handle pool exhaustion gracefully
- [ ] **3.4.10** Add pool statistics monitoring

#### Verification Tasks
- [ ] **3.4.11** Memory usage before/after comparison
- [ ] **3.4.12** Verify no visual artifacts
- [ ] **3.4.13** Stress test with rapid chunk loading

---

### 3.5 Worker Chunk Routing Optimization

**Issue:** Chunks sent to all workers instead of assigned worker
**Priority:** P2 Medium
**Effort:** 4-8 hours

#### Research Tasks
- [ ] **3.5.1** Analyze current chunk-to-worker assignment
- [ ] **3.5.2** Measure message overhead

#### Design Tasks
- [ ] **3.5.3** Design targeted chunk distribution
- [ ] **3.5.4** Handle edge cases (chunk boundary sections)

#### Implementation Tasks
- [ ] **3.5.5** Modify addColumn to send chunk only to relevant workers
- [ ] **3.5.6** Update hash function if needed for better distribution
- [ ] **3.5.7** Handle removeColumn similarly

#### Verification Tasks
- [ ] **3.5.8** Verify all sections still render
- [ ] **3.5.9** Measure message count reduction

---

## Phase 4: Testing Infrastructure (P1)

**Duration:** 4 weeks
**Goal:** 40% code coverage with meaningful tests

### 4.1 Test Infrastructure Setup

**Effort:** 8-16 hours

#### Research Tasks
- [ ] **4.1.1** Review current Jest configuration
- [ ] **4.1.2** Research Jest projects for unit vs E2E separation
- [ ] **4.1.3** Research Three.js mocking strategies
- [ ] **4.1.4** Research WebGL mocking (headless-gl, jsdom)

#### Design Tasks
- [ ] **4.1.5** Design test directory structure
  ```
  test/
    unit/
      viewer/
      lib/
    integration/
    e2e/
    security/
    performance/
    __mocks__/
    fixtures/
  ```
- [ ] **4.1.6** Design mock strategy for Three.js
- [ ] **4.1.7** Design test utilities

#### Implementation Tasks
- [ ] **4.1.8** Create test directory structure
- [ ] **4.1.9** Configure Jest multi-project setup
  ```javascript
  // jest.config.js
  module.exports = {
    projects: [
      '<rootDir>/test/unit/jest.config.js',
      '<rootDir>/test/e2e/jest.config.js'
    ]
  }
  ```
- [ ] **4.1.10** Create Three.js mock module
- [ ] **4.1.11** Create Socket.io mock module
- [ ] **4.1.12** Create test utility helpers
- [ ] **4.1.13** Remove irrelevant Google test
- [ ] **4.1.14** Fix recursive test script in package.json

---

### 4.2 Unit Tests - Core Components

**Effort:** 40-80 hours (ongoing)

#### Implementation Tasks
- [ ] **4.2.1** Unit tests for `viewer/lib/world.js`
  - getBlock()
  - addColumn()
  - removeColumn()
  - blockCache behavior
- [ ] **4.2.2** Unit tests for `viewer/lib/dispose.js`
  - dispose3() with various object types
  - Material disposal
  - Recursive disposal
- [ ] **4.2.3** Unit tests for `viewer/lib/worldView.js`
  - Chunk loading logic
  - Event emission
- [ ] **4.2.4** Unit tests for `viewer/lib/models.js`
  - renderElement (with mocked world)
  - getSectionGeometry
- [ ] **4.2.5** Unit tests for `viewer/lib/entities.js`
  - Entity update
  - Entity clear
- [ ] **4.2.6** Unit tests for `viewer/lib/primitives.js`
  - getMesh for each primitive type
- [ ] **4.2.7** Unit tests for `lib/schemas/` (validation)

---

### 4.3 Security Regression Tests

**Effort:** 16-24 hours

#### Implementation Tasks
- [ ] **4.3.1** SSRF prevention tests
  - Test blocked localhost
  - Test blocked private IPs
  - Test allowed external URLs
- [ ] **4.3.2** CORS tests
  - Test allowed origins succeed
  - Test disallowed origins blocked
- [ ] **4.3.3** Input validation tests
  - Test malformed socket messages rejected
  - Test oversized payloads rejected
  - Test valid messages accepted
- [ ] **4.3.4** Rate limiting tests
  - Test rate limit triggers
  - Test rate limit resets

---

### 4.4 Performance Tests

**Effort:** 16-24 hours

#### Implementation Tasks
- [ ] **4.4.1** Memory leak detection tests
  - Test block cache bounded
  - Test geometry disposal
  - Test worker cleanup
- [ ] **4.4.2** Performance benchmark tests
  - Section generation time
  - Frame time at various view distances
- [ ] **4.4.3** Load tests
  - Rapid chunk loading/unloading
  - Many concurrent connections

---

## Phase 5: Documentation & Types (P2)

**Duration:** 2 weeks
**Goal:** Accurate, complete documentation

### 5.1 TypeScript Definitions

**Effort:** 8-16 hours

#### Implementation Tasks
- [ ] **5.1.1** Fix typo: `Entitiy` -> `Entity`
- [ ] **5.1.2** Update version type to include 1.19-1.21.4
- [ ] **5.1.3** Replace `any` types with proper interfaces
  ```typescript
  export interface ViewerOptions {
    viewDistance?: number
    firstPerson?: boolean
    port?: number
    prefix?: string
  }

  export interface Viewer {
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    setVersion(version: string): boolean
    setFirstPersonCamera(pos: Vec3, yaw: number, pitch: number): void
    // ...
  }
  ```
- [ ] **5.1.4** Add bot.viewer interface
- [ ] **5.1.5** Add event type definitions
- [ ] **5.1.6** Validate types against implementation

---

### 5.2 README Updates

**Effort:** 4-8 hours

#### Implementation Tasks
- [ ] **5.2.1** Add `prefix` option to mineflayer documentation
- [ ] **5.2.2** Fix viewDistance default (6 -> 4 for standalone)
- [ ] **5.2.3** Document `drawBoxGrid` and `drawPoints` functions
- [ ] **5.2.4** Add Prerequisites section
  - Node.js version requirement
  - ffmpeg for headless mode
  - node-canvas-webgl for headless mode
- [ ] **5.2.5** Add Troubleshooting section
- [ ] **5.2.6** Update version support list

---

### 5.3 API Documentation

**Effort:** 8-16 hours

#### Implementation Tasks
- [ ] **5.3.1** Update viewer/README.md with all methods
- [ ] **5.3.2** Document MapControls options
- [ ] **5.3.3** Add JSDoc to public API methods
  ```javascript
  /**
   * Sets the camera to first-person mode at the specified position
   * @param {Vec3} pos - World position for the camera
   * @param {number} yaw - Rotation around Y axis (radians)
   * @param {number} pitch - Rotation around X axis (radians)
   */
  setFirstPersonCamera(pos, yaw, pitch) {
  ```
- [ ] **5.3.4** Document events (blockClicked, entity, loadChunk, etc.)

---

### 5.4 Project Documentation

**Effort:** 4-8 hours

#### Implementation Tasks
- [ ] **5.4.1** Create CONTRIBUTING.md
  - Development setup
  - Code style guidelines
  - PR process
  - Testing requirements
- [ ] **5.4.2** Create SECURITY.md
  - Vulnerability reporting process
  - Security considerations
  - Known limitations
- [ ] **5.4.3** Add header comments to example files
- [ ] **5.4.4** List dependencies in example READMEs

---

## Phase 6: Architectural Improvements (P1/P2)

**Duration:** 6 weeks
**Goal:** Improved maintainability and modern patterns

### 6.1 Controls.js Decomposition

**Issue:** 923-line God class
**Priority:** P1 High
**Effort:** 24-40 hours

#### Research Tasks
- [ ] **6.1.1** Map all responsibilities in controls.js
  - Camera movement
  - Mouse handling
  - Keyboard handling
  - Touch handling
  - Zoom/dolly
  - State management
- [ ] **6.1.2** Identify shared state between concerns
- [ ] **6.1.3** Study Three.js OrbitControls architecture

#### Design Tasks
- [ ] **6.1.4** Design module decomposition
  ```
  viewer/lib/controls/
    index.js          # Main MapControls class (facade)
    CameraController.js
    MouseHandler.js
    KeyboardHandler.js
    TouchHandler.js
    ControlState.js
  ```
- [ ] **6.1.5** Define interfaces between modules
- [ ] **6.1.6** Plan backward compatibility

#### Implementation Tasks
- [ ] **6.1.7** Extract CameraController
- [ ] **6.1.8** Extract MouseHandler
- [ ] **6.1.9** Extract KeyboardHandler
- [ ] **6.1.10** Extract TouchHandler
- [ ] **6.1.11** Create ControlState for shared state
- [ ] **6.1.12** Create facade MapControls
- [ ] **6.1.13** Update exports for backward compatibility
- [ ] **6.1.14** Remove `/* eslint-disable */` and fix lint issues

#### Verification Tasks
- [ ] **6.1.15** All control modes work (orbit, pan, zoom)
- [ ] **6.1.16** Touch controls work
- [ ] **6.1.17** First-person mode works

---

### 6.2 renderElement Decomposition

**Issue:** 133-line function with high complexity
**Priority:** P1 High
**Effort:** 8-16 hours

#### Design Tasks
- [ ] **6.2.1** Identify logical sub-functions
  - Vertex position calculation
  - UV coordinate calculation
  - Ambient occlusion calculation
  - Color/tint calculation
  - Index generation

#### Implementation Tasks
- [ ] **6.2.2** Extract calculateVertexPositions()
- [ ] **6.2.3** Extract calculateUVs()
- [ ] **6.2.4** Extract calculateAmbientOcclusion()
- [ ] **6.2.5** Extract calculateTint()
- [ ] **6.2.6** Extract buildFaceIndices()
- [ ] **6.2.7** Refactor renderElement to compose these functions
- [ ] **6.2.8** Create configuration object for parameters

#### Verification Tasks
- [ ] **6.2.9** Visual comparison before/after
- [ ] **6.2.10** Performance comparison

---

### 6.3 Consistent API Patterns

**Issue:** Three modes return different things
**Priority:** P2 Medium
**Effort:** 8-16 hours

#### Design Tasks
- [ ] **6.3.1** Design unified return interface
  ```javascript
  interface ViewerInstance {
    viewer: Viewer
    server?: http.Server
    close(): Promise<void>
  }
  ```

#### Implementation Tasks
- [ ] **6.3.2** Update mineflayer to return consistent object
- [ ] **6.3.3** Add close() method to standalone
- [ ] **6.3.4** Normalize headless return value
- [ ] **6.3.5** Update TypeScript definitions
- [ ] **6.3.6** Document migration in CHANGELOG

---

### 6.4 Three.js Upgrade Path

**Issue:** Three.js 0.128.0 is 4+ years old
**Priority:** P1 High
**Effort:** 40-80 hours (phased)

#### Research Tasks
- [ ] **6.4.1** Review Three.js changelog from 0.128 to latest
- [ ] **6.4.2** Identify breaking changes affecting this codebase
- [ ] **6.4.3** Identify deprecated APIs being used
- [ ] **6.4.4** Test with Three.js 0.150 (intermediate version)

#### Design Tasks
- [ ] **6.4.5** Create migration plan with checkpoints
  - 0.128 -> 0.140 (test)
  - 0.140 -> 0.150 (test)
  - 0.150 -> 0.160 (test)
  - 0.160 -> latest (test)
- [ ] **6.4.6** Document API changes needed

#### Implementation Tasks
- [ ] **6.4.7** Fix `skinning: true` deprecation in Entity.js
- [ ] **6.4.8** Update BoxBufferGeometry -> BoxGeometry
- [ ] **6.4.9** Update any other deprecated APIs
- [ ] **6.4.10** Update three.meshline if needed
- [ ] **6.4.11** Test each checkpoint version
- [ ] **6.4.12** Update package.json to target version

#### Verification Tasks
- [ ] **6.4.13** Full visual regression test
- [ ] **6.4.14** Performance comparison
- [ ] **6.4.15** All examples work correctly

---

## Phase 7: Code Quality & Modernization (P2/P3)

**Duration:** 4 weeks
**Goal:** Modern JavaScript patterns, reduced duplication

### 7.1 Code Duplication Removal

**Effort:** 8-16 hours

#### Implementation Tasks
- [ ] **7.1.1** Extract shared elemFaces to `viewer/lib/geometry/faceDefinitions.js`
- [ ] **7.1.2** Extract tween rotation utility
  ```javascript
  // viewer/lib/utils/tweenUtils.js
  function smoothRotateTo(object, targetYaw, duration = 50) {
    const da = (targetYaw - object.rotation.y) % (Math.PI * 2)
    const dy = 2 * da % (Math.PI * 2) - da
    return new TWEEN.Tween(object.rotation)
      .to({ y: object.rotation.y + dy }, duration)
      .start()
  }
  ```
- [ ] **7.1.3** Extract texture configuration utility
- [ ] **7.1.4** Extract chunk coordinate utilities
  ```javascript
  // viewer/lib/utils/chunkUtils.js
  function toChunkCoord(worldCoord) {
    return Math.floor(worldCoord / 16) * 16
  }
  function getChunkKey(x, z) {
    return `${x},${z}`
  }
  ```

---

### 7.2 Magic Numbers Extraction

**Effort:** 4-8 hours

#### Implementation Tasks
- [ ] **7.2.1** Create constants file
  ```javascript
  // viewer/lib/constants.js
  module.exports = {
    CHUNK_SIZE: 16,
    WORLD_HEIGHT: 256,
    SECTION_HEIGHT: 16,

    // Rendering
    CAMERA_FOV: 75,
    CAMERA_NEAR: 0.1,
    CAMERA_FAR: 1000,
    PLAYER_HEIGHT: 1.6,
    SNEAK_OFFSET: 0.3,

    // Colors
    AMBIENT_LIGHT_COLOR: 0xcccccc,
    DIRECTIONAL_LIGHT_COLOR: 0xffffff,
    DEFAULT_LINE_COLOR: 0xff0000,

    // Timing
    TWEEN_DURATION_MS: 50,
    WORKER_INTERVAL_MS: 50,

    // Materials
    MATERIAL_ALPHA_TEST: 0.1
  }
  ```
- [ ] **7.2.2** Replace magic numbers throughout codebase
- [ ] **7.2.3** Document constants

---

### 7.3 Error Handling Improvements

**Effort:** 4-8 hours

#### Implementation Tasks
- [ ] **7.3.1** Replace silent catch blocks with proper error handling
- [ ] **7.3.2** Add error event handlers where missing
- [ ] **7.3.3** Implement graceful shutdown handlers
  ```javascript
  process.on('SIGTERM', gracefulShutdown)
  process.on('SIGINT', gracefulShutdown)
  process.on('unhandledRejection', handleUnhandledRejection)
  ```
- [ ] **7.3.4** Add error logging infrastructure

---

### 7.4 Modern JavaScript Updates

**Effort:** 8-16 hours

#### Implementation Tasks
- [ ] **7.4.1** Convert `var` to `const`/`let` in controls.js
- [ ] **7.4.2** Convert callbacks to async/await in utils.js
- [ ] **7.4.3** Replace sync file I/O with async in atlas.js
- [ ] **7.4.4** Use destructuring in function parameters
- [ ] **7.4.5** Use arrow functions where appropriate
- [ ] **7.4.6** Re-enable ESLint and fix remaining issues

---

## Phase 8: Long-term Improvements (P3)

**Duration:** Ongoing
**Goal:** Best practices and future-proofing

### 8.1 Build & Package Improvements

- [ ] **8.1.1** Add ESM support (dual package)
- [ ] **8.1.2** Configure webpack bundle optimization
- [ ] **8.1.3** Add source maps for production debugging
- [ ] **8.1.4** Add engine specification to package.json
- [ ] **8.1.5** Configure GitHub Actions for CI

### 8.2 LOD System Implementation

- [ ] **8.2.1** Research LOD strategies for voxel worlds
- [ ] **8.2.2** Design LOD levels and transition distances
- [ ] **8.2.3** Implement simplified geometry for distant chunks
- [ ] **8.2.4** Implement smooth LOD transitions

### 8.3 Additional Optimizations

- [ ] **8.3.1** Replace string-based keys with numeric keys
- [ ] **8.3.2** Implement adaptive worker interval
- [ ] **8.3.3** Add binary chunk serialization option
- [ ] **8.3.4** Implement occlusion culling

### 8.4 Code Quality Backlog

- [ ] **8.4.1** Complete touch support TODOs
- [ ] **8.4.2** Evaluate spiralloop package extraction
- [ ] **8.4.3** Rename abbreviated functions for clarity

---

## Progress Tracking

### Phase Completion Checklist

| Phase | Status | Completion % | Notes |
|-------|--------|--------------|-------|
| Phase 0: Preparation | Not Started | 0% | |
| Phase 1: Security | Not Started | 0% | |
| Phase 2: Memory Safety | Not Started | 0% | |
| Phase 3: Performance | Not Started | 0% | |
| Phase 4: Testing | Not Started | 0% | |
| Phase 5: Documentation | Not Started | 0% | |
| Phase 6: Architecture | Not Started | 0% | |
| Phase 7: Code Quality | Not Started | 0% | |
| Phase 8: Long-term | Not Started | 0% | |

### Key Metrics

| Metric | Baseline | Current | Target |
|--------|----------|---------|--------|
| Security vulnerabilities | TBD | - | 0 critical, 0 high |
| Memory (1hr session, VD=8) | TBD | - | No growth |
| FPS (VD=8) | TBD | - | 60+ FPS |
| Test coverage | ~5% | - | 60% |
| Documentation accuracy | ~60% | - | 100% |

---

## Dependencies Between Tasks

```
Phase 0 (Prep)
    └── Phase 1 (Security) ─────────────────┐
    └── Phase 2 (Memory) ───────────────────┤
                                            ├── Phase 4 (Testing)
    └── Phase 3 (Performance) ──────────────┤
                                            │
    └── Phase 5 (Documentation) ────────────┘

Phase 6 (Architecture) depends on:
    - Phase 1 complete (security foundation)
    - Phase 2 complete (memory safety)
    - Phase 4 in progress (tests for refactoring safety)

Phase 7 (Code Quality) depends on:
    - Phase 4 in progress (tests before refactoring)
    - Phase 6 complete (architecture stable)

Phase 8 (Long-term) depends on:
    - All other phases substantially complete
```

---

## Estimated Total Effort

| Phase | Effort Range |
|-------|-------------|
| Phase 0: Preparation | 8-16 hours |
| Phase 1: Security | 32-56 hours |
| Phase 2: Memory Safety | 16-32 hours |
| Phase 3: Performance | 48-80 hours |
| Phase 4: Testing | 80-144 hours |
| Phase 5: Documentation | 24-48 hours |
| Phase 6: Architecture | 80-152 hours |
| Phase 7: Code Quality | 24-48 hours |
| Phase 8: Long-term | 40-80 hours |
| **Total** | **352-656 hours** |

Estimated calendar time: **5-8 months** with 1 developer at 20 hours/week
