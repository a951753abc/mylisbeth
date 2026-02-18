import React, { useState, useEffect } from 'react';

export default function CooldownTimer({ cooldown, onExpire }) {
  const [remaining, setRemaining] = useState(cooldown);

  useEffect(() => {
    setRemaining(cooldown);
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

  return (
    <div className="cooldown-bar">
      CD 冷卻中... {remaining} 秒
    </div>
  );
}
