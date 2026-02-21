import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

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

    socket.on("battle:result", (data) => {
      // 跳過自己發起的戰鬥（自己已從 HTTP 取得完整結果）
      if (data.userId && data.userId === userIdRef.current) return;
      setEvents((prev) => [
        ...prev.slice(-49),
        { type: "battle", data, time: Date.now() },
      ]);
    });

    socket.on("player:update", (data) => {
      setEvents((prev) => [
        ...prev.slice(-49),
        { type: "update", data, time: Date.now() },
      ]);
    });

    socket.on("pvp:attacked", (data) => {
      setEvents((prev) => [
        ...prev.slice(-49),
        { type: "pvp:attacked", data, time: Date.now() },
      ]);
    });

    socket.on("boss:damage", (data) => {
      setEvents((prev) => [
        ...prev.slice(-49),
        { type: "boss:damage", data, time: Date.now() },
      ]);
    });

    socket.on("boss:defeated", (data) => {
      setEvents((prev) => [
        ...prev.slice(-49),
        { type: "boss:defeated", data, time: Date.now() },
      ]);
    });

    socket.on("boss:phase", (data) => {
      setEvents((prev) => [
        ...prev.slice(-49),
        { type: "boss:phase", data, time: Date.now() },
      ]);
    });

    socket.on("floor:unlocked", (data) => {
      setEvents((prev) => [
        ...prev.slice(-49),
        { type: "floor:unlocked", data, time: Date.now() },
      ]);
    });

    socket.on("npc:death", (data) => {
      setEvents((prev) => [
        ...prev.slice(-49),
        { type: "npc:death", data, time: Date.now() },
      ]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socketRef.current || !userId) return;
    socketRef.current.emit("join:user", userId);
    return () => {
      socketRef.current?.emit("leave:user", userId);
    };
  }, [userId]);

  const clearEvents = () => setEvents([]);

  return { socket: socketRef.current, events, clearEvents };
}
