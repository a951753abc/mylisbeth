import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import * as E from "../constants/socketEvents.js";

const addEvent = (prev, type, data) => [
  ...prev.slice(-49),
  { type, data, time: Date.now() },
];

export function useSocket(userId) {
  const socketRef = useRef(null);
  const userIdRef = useRef(userId);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    const socket = io({
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on(E.BATTLE_RESULT, (data) => {
      // 跳過自己發起的戰鬥（自己已從 HTTP 取得完整結果）
      if (data.userId && data.userId === userIdRef.current) return;
      setEvents((prev) => addEvent(prev, "battle", data));
    });

    socket.on(E.PVP_ATTACKED, (data) => {
      setEvents((prev) => addEvent(prev, "pvp:attacked", data));
    });

    socket.on(E.BOSS_DAMAGE, (data) => {
      setEvents((prev) => addEvent(prev, "boss:damage", data));
    });

    socket.on(E.BOSS_DEFEATED, (data) => {
      setEvents((prev) => addEvent(prev, "boss:defeated", data));
    });

    socket.on(E.BOSS_PHASE, (data) => {
      setEvents((prev) => addEvent(prev, "boss:phase", data));
    });

    socket.on(E.FLOOR_UNLOCKED, (data) => {
      setEvents((prev) => addEvent(prev, "floor:unlocked", data));
    });

    socket.on(E.NPC_DEATH, (data) => {
      setEvents((prev) => addEvent(prev, "npc:death", data));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socketRef.current || !userId) return;
    socketRef.current.emit(E.JOIN_USER, userId);
    return () => {
      socketRef.current?.emit(E.LEAVE_USER, userId);
    };
  }, [userId]);

  const clearEvents = () => setEvents([]);

  return { socket: socketRef.current, events, clearEvents };
}
