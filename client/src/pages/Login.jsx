import React from 'react';

export default function Login() {
  const handleLogin = () => {
    window.location.href = '/api/auth/discord';
  };

  return (
    <div className="login-page">
      <h1>My Lisbeth</h1>
      <div className="login-narrative">
        <p>
          艾恩葛朗特第一層。你在主街的角落租下了一間小小的鍛造鋪。
        </p>
        <p>
          身為鍛造師，你沒有前線攻略組的實力——但你有一雙能將礦石化為利刃的手。
          採集素材、鍛造武器、僱用冒險者替你出征，一步步攻略這座浮游城。
        </p>
        <p className="login-narrative-warn">
          然而，每週的帳單不會等人。店鋪租金、樓層稅、冒險者的週薪……
          一旦繳不出款項，負債就會開始累積。連續拖欠三週，你將宣告破產——
          失去一切，從頭來過。
        </p>
        <p className="login-narrative-cta">
          拿起鍛造錘，在這座死亡遊戲中活下去吧。
        </p>
      </div>
      <button className="btn-discord" onClick={handleLogin}>
        使用 Discord 登入
      </button>
    </div>
  );
}
