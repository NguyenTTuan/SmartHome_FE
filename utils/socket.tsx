import { io, Socket } from 'socket.io-client'

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket'],
})

let isSocketConnected = false
let hasInvalidNamespaceError = false

// Call this (with a valid accessToken) once you want to open the socket
export const initializeSocket = async (token: string) => {
  // Reset error flags
  hasInvalidNamespaceError = false

  // Attach the JWT to the auth payload
  ;(socket as any).auth = { token }
  socket.connect()

  socket.on('connect', () => {
    console.log('✅ Socket connected with ID:', socket.id)
    isSocketConnected = true
    hasInvalidNamespaceError = false
  })

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected')
    isSocketConnected = false
  })

  socket.on('connect_error', (err) => {
    console.log('❗ Socket connection error:', err.message)
    isSocketConnected = false

    // Check for Invalid namespace error
    if (err.message && err.message.includes('Invalid namespace')) {
      console.log(
        '🚨 Invalid namespace error detected - will use polling fallback'
      )
      hasInvalidNamespaceError = true
    }
  })

  // Debug all events
  socket.onAny((event, ...args) => {
    console.log(`📨 Received event: ${event}`, args)
  })

  socket.on('notification', (data) => {
    console.log('🔔 New notification received:', data)
    // Event will be handled in the components that listen to it
  })

  socket.on('newNotification', (data) => {
    console.log('🔔 New notification received via newNotification:', data)
    // Event will be handled in the components that listen to it
  })
}

// Call this on logout (or whenever you want to close)
export const disconnectSocket = () => {
  socket.disconnect()
  isSocketConnected = false
  hasInvalidNamespaceError = false
  console.log('Socket disconnected manually')
}

// Helper functions to check socket status
export const getSocketStatus = () => ({
  isConnected: isSocketConnected,
  hasInvalidNamespaceError,
})

// If you ever need to grab the raw socket reference:
export const getSocket = () => socket
