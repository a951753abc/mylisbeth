import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export function useSocket() {
  const socketRef = useRef(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const socket = io({
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on('battle:result', (data) => {
      setEvents(prev => [...prev.slice(-49), { type: 'battle', data, time: Date.now() }]);
    });

    socket.on('player:update', (data) => {
      setEvents(prev => [...prev.slice(-49), { type: 'update', data, time: Date.now() }]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const clearEvents = () => setEvents([]);

  return { socket: socketRef.current, events, clearEvents };
}
