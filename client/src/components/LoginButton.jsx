import React from 'react';

export default function LoginButton() {
  return (
    <button className="btn-discord" onClick={() => window.location.href = '/api/auth/discord'}>
      使用 Discord 登入
    </button>
  );
}
