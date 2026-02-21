import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

export default function useAdminSocket() {
  const [stats, setStats] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io({ withCredentials: true });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join:admin");
    });

    socket.on("admin:dashboard:update", (data) => {
      setStats(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { stats };
}
