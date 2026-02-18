import React from 'react';

export default function Login() {
  const handleLogin = () => {
    window.location.href = '/api/auth/discord';
  };

  return (
    <div className="login-page">
      <h1>My Lisbeth</h1>
      <p>SAO 鍛造師莉茲貝特 - Web 版</p>
      <button className="btn-discord" onClick={handleLogin}>
        使用 Discord 登入
      </button>
    </div>
  );
}
