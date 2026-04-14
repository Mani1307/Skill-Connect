import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const socket = io(SOCKET_URL, {
  autoConnect: false,
  timeout: 20000,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Add connection event listeners for debugging
socket.on('connect', () => {
  console.log('✅ Socket connected successfully');
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket connection error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Socket disconnected:', reason);
});

export default socket;
