const EventEmitter = require('events')
const { WorldView } = require('../viewer')
const { validateMessage } = require('./schemas/socketMessages')
const { createShutdownHandler } = require('./common')

// Maximum concurrent connections
const MAX_CONNECTIONS = 50

module.exports = (bot, { viewDistance = 6, firstPerson = false, port = 3000, prefix = '' }) => {
  const express = require('express')

  const app = express()
  const http = require('http').createServer(app)

  const io = require('socket.io')(http, {
    path: prefix + '/socket.io',
    // Connection limits
    maxHttpBufferSize: 1e6, // 1MB max message size
    pingTimeout: 60000,
    pingInterval: 25000
  })

  const { setupRoutes } = require('./common')
  setupRoutes(app, prefix)

  const sockets = []
  const primitives = {}

  bot.viewer = new EventEmitter()

  bot.viewer.erase = (id) => {
    delete primitives[id]
    for (const socket of sockets) {
      socket.emit('primitive', { id })
    }
  }

  bot.viewer.drawBoxGrid = (id, start, end, color = 'aqua') => {
    primitives[id] = { type: 'boxgrid', id, start, end, color }
    for (const socket of sockets) {
      socket.emit('primitive', primitives[id])
    }
  }

  bot.viewer.drawLine = (id, points, color = 0xff0000) => {
    primitives[id] = { type: 'line', id, points, color }
    for (const socket of sockets) {
      socket.emit('primitive', primitives[id])
    }
  }

  bot.viewer.drawPoints = (id, points, color = 0xff0000, size = 5) => {
    primitives[id] = { type: 'points', id, points, color, size }
    for (const socket of sockets) {
      socket.emit('primitive', primitives[id])
    }
  }

  // Connection limit middleware
  io.use((socket, next) => {
    if (sockets.length >= MAX_CONNECTIONS) {
      return next(new Error('Maximum connections reached'))
    }
    next()
  })

  io.on('connection', (socket) => {
    // Validate version before sending
    const version = bot.version
    if (typeof version !== 'string' || !/^\d+\.\d+(\.\d+)?$/.test(version)) {
      socket.disconnect()
      return
    }

    socket.emit('version', version)
    sockets.push(socket)

    const worldView = new WorldView(bot.world, viewDistance, bot.entity.position, socket)
    worldView.init(bot.entity.position)

    worldView.on('blockClicked', (block, face, button) => {
      // Validate blockClicked data before emitting
      const validation = validateMessage('blockClicked', { block, face, button })
      if (validation.valid) {
        bot.viewer.emit('blockClicked', block, face, button)
      }
    })

    for (const id in primitives) {
      socket.emit('primitive', primitives[id])
    }

    function botPosition () {
      const packet = {
        pos: {
          x: bot.entity.position.x,
          y: bot.entity.position.y,
          z: bot.entity.position.z
        },
        yaw: bot.entity.yaw,
        addMesh: true
      }
      if (firstPerson) {
        packet.pitch = bot.entity.pitch
      }
      socket.emit('position', packet)
      worldView.updatePosition(bot.entity.position)
    }

    bot.on('move', botPosition)
    worldView.listenToBot(bot)

    // Handle incoming mouse clicks with validation
    socket.on('mouseClick', (data) => {
      const validation = validateMessage('mouseClick', data)
      if (!validation.valid) {
        console.warn('Invalid mouseClick message:', validation.errors)
        return
      }
      worldView.emit('mouseClick', data)
    })

    socket.on('disconnect', () => {
      bot.removeListener('move', botPosition)
      worldView.removeListenersFromBot(bot)
      const index = sockets.indexOf(socket)
      if (index !== -1) {
        sockets.splice(index, 1)
      }
    })

    socket.on('error', (error) => {
      console.error('Socket error:', error)
    })
  })

  http.listen(port, () => {
    console.log(`Prismarine viewer web server running on *:${port}`)
  })

  // Graceful shutdown
  const shutdown = createShutdownHandler(http, {
    onShutdown: async () => {
      // Disconnect all sockets
      for (const socket of sockets) {
        socket.disconnect(true)
      }
      sockets.length = 0
    }
  })

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  bot.viewer.close = () => {
    http.close()
    for (const socket of sockets) {
      socket.disconnect()
    }
    sockets.length = 0
  }

  // Return viewer instance for consistency with other modes
  return {
    server: http,
    io,
    close: bot.viewer.close
  }
}
