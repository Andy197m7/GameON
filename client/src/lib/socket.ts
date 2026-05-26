import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(clerkId: string): Socket {
  if (!socket) {
    socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4000', {
      auth: { clerkId },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
