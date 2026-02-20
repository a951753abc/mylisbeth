import React, { useState, useEffect, useRef } from 'react';

export default function CooldownTimer({ cooldown, onExpire }) {
  const [remaining, setRemaining] = useState(cooldown);
  const totalRef = useRef(cooldown);

  useEffect(() => {
    setRemaining(cooldown);
    totalRef.current = cooldown;
  }, [cooldown]);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [remaining, onExpire]);

  if (remaining <= 0) return null;

  const total = totalRef.current;
  const progress = total > 0 ? (remaining / total) * 100 : 0;

  return (
    <div className="cooldown-container">
      <div className="cooldown-text">
        冷卻中 <span className="cooldown-seconds">{remaining}s</span>
      </div>
      <div className="cooldown-track">
        <div
          className="cooldown-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
