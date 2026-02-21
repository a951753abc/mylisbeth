import React, { useState } from "react";

export default function SkillSlotEditor({
  equippedSkills,
  skillDefs,
  modDefs,
  slotCount,
  modSlots,
  currentModCount,
  onUnequip,
  onRefresh,
}) {
  const [error, setError] = useState("");

  const skillMap = {};
  for (const s of skillDefs) {
    skillMap[s.id] = s;
  }

  const modMap = {};
  for (const m of modDefs) {
    modMap[m.id] = m;
  }

  const handleInstallMod = async (skillId, modId) => {
    try {
      const res = await fetch("/api/skill/mod/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ skillId, modId }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setError("");
      onRefresh();
    } catch {
      setError("安裝 Mod 失敗");
    }
  };

  const handleUninstallMod = async (skillId, modId) => {
    try {
      const res = await fetch("/api/skill/mod/uninstall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ skillId, modId }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setError("");
      onRefresh();
    } catch {
      setError("卸除 Mod 失敗");
    }
  };

  return (
    <div>
      <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
        技能槽位 {equippedSkills.length}/{slotCount} | Mod 配額 {currentModCount}/{modSlots}
      </div>

      {error && <div style={{ color: "var(--danger)", marginBottom: "0.5rem", fontSize: "0.85rem" }}>{error}</div>}

      {equippedSkills.length === 0 && (
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          尚未裝備任何技能。前往「全部技能」頁面學習並裝備劍技。
        </p>
      )}

      {equippedSkills.map((entry) => {
        const skill = skillMap[entry.skillId];
        if (!skill) return null;

        const installedMods = entry.mods || [];
        const availableMods = modDefs.filter((m) => !installedMods.includes(m.id));

        return (
          <div
            key={entry.skillId}
            style={{
              padding: "0.5rem",
              marginBottom: "0.5rem",
              background: "var(--bg-secondary)",
              borderRadius: "6px",
              borderLeft: `3px solid ${skill.color || "#666"}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontWeight: "bold" }}>{skill.nameCn}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginLeft: "0.5rem" }}>
                  {skill.nameJp}
                </span>
                <span style={{ fontSize: "0.7rem", color: "var(--gold)", marginLeft: "0.5rem" }}>
                  {"★".repeat(skill.tier)}
                </span>
              </div>
              <button
                onClick={() => onUnequip(entry.skillId)}
                style={{
                  padding: "0.15rem 0.4rem",
                  fontSize: "0.7rem",
                  background: "var(--danger)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "3px",
                  cursor: "pointer",
                }}
              >
                卸除
              </button>
            </div>

            {/* Installed Mods */}
            {installedMods.length > 0 && (
              <div style={{ marginTop: "0.3rem" }}>
                {installedMods.map((modId) => {
                  const mod = modMap[modId];
                  return (
                    <span
                      key={modId}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.2rem",
                        padding: "0.1rem 0.3rem",
                        marginRight: "0.3rem",
                        fontSize: "0.7rem",
                        background: "rgba(255,215,0,0.15)",
                        borderRadius: "3px",
                        color: "var(--gold)",
                      }}
                    >
                      {mod ? mod.nameCn : modId}
                      <button
                        onClick={() => handleUninstallMod(entry.skillId, modId)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--danger)",
                          cursor: "pointer",
                          fontSize: "0.7rem",
                          padding: 0,
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Add Mod */}
            {installedMods.length < 3 && currentModCount < modSlots && availableMods.length > 0 && (
              <div style={{ marginTop: "0.3rem" }}>
                <select
                  onChange={(e) => {
                    if (e.target.value) handleInstallMod(entry.skillId, e.target.value);
                    e.target.value = "";
                  }}
                  style={{ fontSize: "0.75rem", padding: "0.15rem" }}
                  defaultValue=""
                >
                  <option value="">+ 安裝 Mod</option>
                  {availableMods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nameCn} ({m.cost} Col) — {m.description}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
