import { useState } from "react";

const WEAPON_TYPE_NAMES = {
  one_handed_sword: "單手劍",
  two_handed_sword: "雙手劍",
  two_handed_axe: "雙手斧",
  mace: "單手棍",
  katana: "刀",
  curved_sword: "彎刀",
  rapier: "細劍",
  dagger: "短劍",
  spear: "槍",
  bow: "弓",
  shield: "大盾",
};

const qualityColors = { S: "#ff9800", A: "#e94560", B: "#4caf50", C: "#a0a0b0" };

export default function AdminNpcCard({ npc, weapons, userId, skillDefs, weaponTypes, onRefresh, setMsg }) {
  const [profForm, setProfForm] = useState({
    weaponProficiency: npc.weaponProficiency || 0,
    proficientType: npc.proficientType || "",
  });
  const [addSkillId, setAddSkillId] = useState("");

  const condColor = npc.condition >= 70 ? "#4caf50" : npc.condition >= 30 ? "#ff9800" : "#e94560";
  const equippedWeapon = npc.equippedWeaponIndex != null ? weapons[npc.equippedWeaponIndex] : null;
  const skillMap = {};
  (skillDefs || []).forEach((s) => { skillMap[s.id] = s; });

  const learnedSkills = npc.learnedSkills || [];
  const equippedSkills = npc.equippedSkills || [];
  const equippedIds = new Set(equippedSkills.map((es) => typeof es === "string" ? es : es.skillId));

  async function handleAction(action) {
    const labels = { fire: "解雇", heal: "治療", kill: "殺死" };
    if (!confirm(`確定要${labels[action]}此 NPC？`)) return;
    setMsg("");
    try {
      const res = await fetch(`/api/admin/players/${userId}/npcs/${npc.npcId}/${action}`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error); return; }
      setMsg(`NPC 已${labels[action]}`);
      onRefresh();
    } catch {
      setMsg("操作失敗");
    }
  }

  async function handleModify(field, value) {
    setMsg("");
    try {
      const res = await fetch(`/api/admin/players/${userId}/npcs/${npc.npcId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error); return; }
      onRefresh();
    } catch {
      setMsg("操作失敗");
    }
  }

  async function handleSaveProficiency() {
    setMsg("");
    try {
      const res = await fetch(`/api/admin/players/${userId}/npcs/${npc.npcId}/proficiency`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          weaponProficiency: parseInt(profForm.weaponProficiency) || 0,
          proficientType: profForm.proficientType || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error); return; }
      setMsg("熟練度已更新");
      onRefresh();
    } catch {
      setMsg("操作失敗");
    }
  }

  async function handleSkillAction(action, skillId, target) {
    setMsg("");
    try {
      const res = await fetch(`/api/admin/players/${userId}/npcs/${npc.npcId}/skills`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, skillId, target }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error); return; }
      onRefresh();
    } catch {
      setMsg("操作失敗");
    }
  }

  async function handleAddSkill() {
    if (!addSkillId) return;
    await handleSkillAction("add", addSkillId, "learned");
    setAddSkillId("");
  }

  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ color: qualityColors[npc.quality] || "#eee", fontWeight: "bold", fontSize: 14 }}>
            [{npc.quality}] {npc.name}
          </span>
          <span style={{ color: "#a0a0b0", fontSize: 11, marginLeft: 8 }}>
            Lv.{npc.level || 1} | EXP: {npc.exp || 0} | ID: {npc.npcId}
          </span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button style={styles.smallBtn} onClick={() => handleAction("heal")}>回滿體力</button>
          <button style={styles.smallBtn} onClick={() => handleAction("fire")}>解雇</button>
          <button style={styles.smallBtnDanger} onClick={() => handleAction("kill")}>殺死</button>
        </div>
      </div>

      {/* Basic info */}
      <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap", fontSize: 12 }}>
        <span>體力: <span style={{ color: condColor }}>{npc.condition ?? 100}/100</span></span>
        <span style={{ color: "#a0a0b0" }}>月薪: {npc.monthlyCost || npc.weeklyCost}</span>
        {equippedWeapon && (
          <span>裝備: <span style={{ color: equippedWeapon.rarityColor || "#eee" }}>
            {equippedWeapon.name || equippedWeapon.weaponName}
          </span></span>
        )}
        {npc.mission && (
          <span style={{ color: npc.mission.isTraining ? "#818cf8" : "#ff9800" }}>
            {npc.mission.isTraining ? "修練中" : "任務中"}: {npc.mission.name || npc.mission.type}
          </span>
        )}
      </div>

      {/* Stats */}
      {npc.baseStats && (
        <div style={styles.statRow}>
          {["atk", "def", "agi", "hp"].map((stat) => (
            <span key={stat} style={styles.statBadge}>
              <span style={{ color: "#a0a0b0", fontSize: 10 }}>{stat.toUpperCase()}</span>
              <span style={{ color: "#eee", fontSize: 12 }}>{npc.baseStats[stat]}</span>
            </span>
          ))}
        </div>
      )}

      {/* Quick modify */}
      <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center", fontSize: 11 }}>
        <span style={{ color: "#a0a0b0" }}>快速修改:</span>
        <button style={styles.smallBtn} onClick={() => handleModify("condition", 100)}>體力→100</button>
        <button style={styles.smallBtn} onClick={() => handleModify("condition", 50)}>體力→50</button>
        <button style={styles.smallBtn} onClick={() => handleModify("level", (npc.level || 1) + 1)}>等級+1</button>
        <button style={styles.smallBtn} onClick={() => handleModify("level", (npc.level || 1) + 5)}>等級+5</button>
      </div>

      {/* ──── 熟練度編輯 ──── */}
      <div style={styles.subsection}>
        <div style={{ fontSize: 12, color: "#a5b4fc", fontWeight: "bold", marginBottom: 6 }}>武器熟練度</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select
            style={{ ...styles.input, width: 120 }}
            value={profForm.proficientType}
            onChange={(e) => setProfForm({ ...profForm, proficientType: e.target.value })}
          >
            <option value="">— 無 —</option>
            {(weaponTypes || []).map((wt) => (
              <option key={wt} value={wt}>{WEAPON_TYPE_NAMES[wt] || wt}</option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            max="1000"
            style={{ ...styles.input, width: 70 }}
            value={profForm.weaponProficiency}
            onChange={(e) => setProfForm({ ...profForm, weaponProficiency: e.target.value })}
          />
          <span style={{ fontSize: 11, color: "#a0a0b0" }}>/ 1000</span>
          <button style={styles.smallBtn} onClick={handleSaveProficiency}>儲存</button>
        </div>
        {/* Progress bar */}
        <div style={{
          height: 4,
          background: "#0f3460",
          borderRadius: 2,
          marginTop: 4,
          overflow: "hidden",
        }}>
          <div style={{
            width: `${Math.min(100, ((npc.weaponProficiency || 0) / 1000) * 100)}%`,
            height: "100%",
            background: "#818cf8",
            borderRadius: 2,
          }} />
        </div>
      </div>

      {/* ──── 技能管理 ──── */}
      <div style={styles.subsection}>
        <div style={{ fontSize: 12, color: "#c084fc", fontWeight: "bold", marginBottom: 6 }}>
          劍技管理（已學 {learnedSkills.length}，裝備 {equippedSkills.length}）
        </div>

        {/* 已裝備技能 */}
        {equippedSkills.length > 0 && (
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: "#a0a0b0", marginBottom: 3 }}>已裝備：</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {equippedSkills.map((es, idx) => {
                const sid = typeof es === "string" ? es : es.skillId;
                const def = skillMap[sid];
                return (
                  <span key={`eq_${sid}_${idx}`} style={styles.skillBadge(def?.color || "#a855f7")}>
                    {def ? def.nameCn : sid}
                    {def && <span style={{ color: "#a0a0b0", marginLeft: 3 }}>T{def.tier}</span>}
                    <button
                      style={styles.skillRemoveBtn}
                      onClick={() => handleSkillAction("remove", sid, "equipped")}
                      title="卸除"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* 已學但未裝備 */}
        {learnedSkills.filter((s) => !equippedIds.has(s)).length > 0 && (
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: "#a0a0b0", marginBottom: 3 }}>已學（未裝備）：</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {learnedSkills.filter((s) => !equippedIds.has(s)).map((sid, idx) => {
                const def = skillMap[sid];
                return (
                  <span key={`le_${sid}_${idx}`} style={styles.skillBadgeInactive}>
                    {def ? def.nameCn : sid}
                    {def && <span style={{ color: "#888", marginLeft: 3 }}>T{def.tier}</span>}
                    <button
                      style={{ ...styles.skillRemoveBtn, color: "#4caf50", marginLeft: 4 }}
                      onClick={() => handleSkillAction("add", sid, "equipped")}
                      title="裝備"
                    >
                      +
                    </button>
                    <button
                      style={styles.skillRemoveBtn}
                      onClick={() => handleSkillAction("remove", sid, "learned")}
                      title="移除"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* 新增技能 */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
          <select
            style={{ ...styles.input, width: 200 }}
            value={addSkillId}
            onChange={(e) => setAddSkillId(e.target.value)}
          >
            <option value="">— 選擇技能 —</option>
            {(skillDefs || [])
              .filter((s) => !learnedSkills.includes(s.id))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  [{WEAPON_TYPE_NAMES[s.weaponType] || s.weaponType}] {s.nameCn} (T{s.tier})
                </option>
              ))}
          </select>
          <button style={styles.smallBtn} onClick={handleAddSkill}>新增技能</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: "#1a1a2e",
    borderRadius: 6,
    padding: "8px 12px",
    border: "1px solid #0f3460",
  },
  subsection: {
    marginTop: 8,
    padding: "6px 8px",
    background: "#16213e",
    borderRadius: 4,
    border: "1px solid rgba(15,52,96,0.5)",
  },
  statRow: {
    display: "flex",
    gap: 8,
    marginTop: 6,
  },
  statBadge: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "#16213e",
    borderRadius: 4,
    padding: "2px 8px",
    minWidth: 36,
  },
  smallBtn: {
    padding: "2px 8px",
    borderRadius: 4,
    border: "1px solid #0f3460",
    background: "#1a1a2e",
    color: "#ddd",
    fontSize: 11,
    cursor: "pointer",
    marginRight: 4,
  },
  smallBtnDanger: {
    padding: "2px 8px",
    borderRadius: 4,
    border: "1px solid #e94560",
    background: "transparent",
    color: "#e94560",
    fontSize: 11,
    cursor: "pointer",
  },
  input: {
    padding: "4px 8px",
    borderRadius: 4,
    border: "1px solid #0f3460",
    background: "#1a1a2e",
    color: "#eee",
    fontSize: 12,
  },
  skillBadge: (color) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 2,
    padding: "2px 6px",
    fontSize: 11,
    background: `${color}22`,
    border: `1px solid ${color}`,
    borderRadius: 3,
    color,
  }),
  skillBadgeInactive: {
    display: "inline-flex",
    alignItems: "center",
    gap: 2,
    padding: "2px 6px",
    fontSize: 11,
    background: "rgba(100,100,100,0.15)",
    border: "1px dashed #666",
    borderRadius: 3,
    color: "#888",
  },
  skillRemoveBtn: {
    background: "none",
    border: "none",
    color: "#e94560",
    cursor: "pointer",
    fontSize: 12,
    padding: "0 2px",
    marginLeft: 2,
  },
};
