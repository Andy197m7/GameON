import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * getToken should be Clerk's useAuth().getToken — it's called fresh on
 * every (re)connect attempt so the socket always hands the server a
 * live, unexpired token instead of a static clerkId string.
 */
export function getSocket(getToken: () => Promise<string | null>): Socket {
  if (!socket) {
    socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4000', {
      auth: async (cb) => {
        const token = await getToken();
        cb({ token });
      },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
  }
  return socket;
}

/**
 * Returns the already-connected socket, or null if AuthContext hasn't
 * established one yet. Use this in pages that only need to listen for
 * events (e.g. MatchDetail) and shouldn't independently manage auth.
 */
export function getExistingSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
