// utils/socket.ts

import { io, Socket } from 'socket.io-client'

const SOCKET_URL = 'wss://yolosmarthomeapi.ticklab.site'

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket'],
})

// Call this (with a valid accessToken) once you want to open the socket
export const initializeSocket = async (token: string) => {
  // Attach the JWT to the auth payload
  ;(socket as any).auth = { token }
  socket.connect()

  socket.on('connected', ({ message }) => {
    console.log('Socket connected:', message)
  })

  socket.on('disconnect', () => {
    console.log('Socket disconnected (server or network)')
  })
}

// Call this on logout (or whenever you want to close)
export const disconnectSocket = () => {
  socket.disconnect()
  console.log('Socket disconnected manually')
}

// If you ever need to grab the raw socket reference:
export const getSocket = () => socket
