import { useEffect, useCallback, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { getSocket } from '../lib/socket';

export interface SocketNotification {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  ts: number;
  read: boolean;
}

export function useSocket() {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<SocketNotification[]>([]);
  const [eloUpdate, setEloUpdate] = useState<{ newElo: number; delta: number } | null>(null);

  const addNotification = useCallback((type: string, payload: Record<string, unknown>) => {
    setNotifications((prev) => [
      { id: `${Date.now()}-${Math.random()}`, type, payload, ts: Date.now(), read: false },
      ...prev.slice(0, 49), // keep last 50
    ]);
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const socket = getSocket(user.id);

    socket.on('match_request',  (p) => addNotification('match_request',  p));
    socket.on('match_accepted', (p) => addNotification('match_accepted', p));
    socket.on('match_declined', (p) => addNotification('match_declined', p));
    socket.on('message_received', (p) => addNotification('message_received', p));
    socket.on('elo_updated', (p) => {
      setEloUpdate(p);
      addNotification('elo_updated', p);
    });

    return () => {
      socket.off('match_request');
      socket.off('match_accepted');
      socket.off('match_declined');
      socket.off('message_received');
      socket.off('elo_updated');
    };
  }, [user?.id, addNotification]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, markAllRead, eloUpdate };
}
