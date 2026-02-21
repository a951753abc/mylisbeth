import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { JOIN_ADMIN, ADMIN_DASHBOARD_UPDATE } from "../../constants/socketEvents.js";

export default function useAdminSocket() {
  const [stats, setStats] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io({ withCredentials: true });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit(JOIN_ADMIN);
    });

    socket.on(ADMIN_DASHBOARD_UPDATE, (data) => {
      setStats(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { stats };
}
