import React from "react";

export default function InventoryPanel({ user }) {
  return (
    <div>
      {/* Items */}
      <div className="card">
        <h2>素材庫</h2>
        {!user.items || user.items.length === 0 ? (
          <p style={{ color: "var(--text-secondary)" }}>無素材</p>
        ) : (
          user.items.map((item, i) => (
            <div key={i} className="item-row">
              <span>
                <span
                  style={{
                    color: "var(--text-secondary)",
                    marginRight: "0.5rem",
                  }}
                >
                  #{item.index}
                </span>
                <span className="stars">[{item.levelText}]</span> {item.name}
              </span>
              <span>x{item.num}</span>
            </div>
          ))
        )}
      </div>

      {/* Weapons */}
      <div className="card">
        <h2>武器庫</h2>
        {!user.weapons || user.weapons.length === 0 ? (
          <p style={{ color: "var(--text-secondary)" }}>無武器</p>
        ) : (
          user.weapons.map((weapon, i) => (
            <div
              key={i}
              className="weapon-card"
              style={
                weapon.rarityColor
                  ? {
                      borderColor: weapon.rarityColor,
                      boxShadow: `0 0 8px ${weapon.rarityColor}44`,
                    }
                  : undefined
              }
            >
              {/* Rarity color bar at top */}
              {weapon.rarityColor && (
                <div
                  className="weapon-rarity-bar"
                  style={{ background: weapon.rarityColor }}
                />
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <span>
                  <span
                    style={{
                      color: "var(--text-secondary)",
                      marginRight: "0.5rem",
                    }}
                  >
                    #{weapon.index}
                  </span>
                  <span className="weapon-name">{weapon.weaponName}</span>
                  <span
                    style={{
                      color: "var(--text-secondary)",
                      marginLeft: "0.5rem",
                    }}
                  >
                    [{weapon.name}]
                  </span>
                </span>
                {weapon.rarityLabel && (
                  <span
                    className="rarity-badge"
                    style={{
                      color: weapon.rarityColor,
                      borderColor: weapon.rarityColor,
                    }}
                  >
                    {weapon.rarityLabel}
                    {weapon.totalScore != null && (
                      <span className="rarity-score">{weapon.totalScore}</span>
                    )}
                  </span>
                )}
              </div>
              <div className="stat-grid">
                <div className="stat-item">
                  <div className="label">ATK</div>
                  <div className="value">{weapon.atk}</div>
                </div>
                <div className="stat-item">
                  <div className="label">DEF</div>
                  <div className="value">{weapon.def}</div>
                </div>
                <div className="stat-item">
                  <div className="label">AGI</div>
                  <div className="value">{weapon.agi}</div>
                </div>
                <div className="stat-item">
                  <div className="label">CRI</div>
                  <div className="value">{weapon.cri}</div>
                </div>
                <div className="stat-item">
                  <div className="label">HP</div>
                  <div className="value">{weapon.hp}</div>
                </div>
                <div className="stat-item">
                  <div className="label">耐久</div>
                  <div className="value">{weapon.durability}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Win records */}
      {user.wins && Object.keys(user.wins).length > 0 && (
        <div className="card">
          <h2>戰績</h2>
          {Object.entries(user.wins).map(([cat, count]) => (
            <div key={cat} className="item-row">
              <span>擊敗 {cat.replace("Win", "")}</span>
              <span>{count}</span>
            </div>
          ))}
          <div className="item-row">
            <span>死亡次數</span>
            <span>{user.lost}</span>
          </div>
        </div>
      )}
    </div>
  );
}
