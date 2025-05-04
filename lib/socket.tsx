import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your actual WS endpoint (LAN IP or domain)
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL ?? 'ws://localhost:3000';

// Create a singleton Socket.IO client with autoConnect disabled
export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket'],
});

// Immediately-invoked async function to set auth and connect
(async () => {
  try {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      socket.auth = { token };
    }
    socket.connect();

    socket.on('connected', ({message}) => {
      console.log('Socket connected:', message);
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
    })
  } catch (err) {
    console.error('Failed to initialize socket:', err);
  }
})();
