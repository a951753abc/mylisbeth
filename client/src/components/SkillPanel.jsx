import React, { useState, useEffect, useCallback } from "react";
import SkillSlotEditor from "./SkillSlotEditor.jsx";
import ProficiencyBar from "./ProficiencyBar.jsx";

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

const CATEGORY_LABELS = {
  weapon: "武器技能",
  combat: "戰鬥技能",
  extra: "額外技能",
  unique: "唯一技能",
};

export default function SkillPanel({ user }) {
  const [skillDefs, setSkillDefs] = useState([]);
  const [modDefs, setModDefs] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("equipped");

  const fetchData = useCallback(async () => {
    try {
      const [defsRes, statusRes] = await Promise.all([
        fetch("/api/skill/definitions", { credentials: "include" }),
        fetch("/api/skill/status", { credentials: "include" }),
      ]);
      const defs = await defsRes.json();
      const stat = await statusRes.json();
      setSkillDefs(defs.skills || []);
      setModDefs(defs.mods || []);
      setStatus(stat);
    } catch (err) {
      setError("載入技能資料失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLearn = async (skillId) => {
    try {
      const res = await fetch("/api/skill/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ skillId }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setError("");
      fetchData();
    } catch {
      setError("學習技能失敗");
    }
  };

  const handleEquip = async (skillId) => {
    try {
      const res = await fetch("/api/skill/equip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ skillId }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setError("");
      fetchData();
    } catch {
      setError("裝備技能失敗");
    }
  };

  const handleUnequip = async (skillId) => {
    try {
      const res = await fetch("/api/skill/unequip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ skillId }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setError("");
      fetchData();
    } catch {
      setError("卸除技能失敗");
    }
  };

  if (loading) return <div className="card"><h2>劍技系統</h2><p>載入中...</p></div>;

  const learnedSet = new Set(status?.learnedSkills || []);
  const extraSet = new Set(status?.extraSkills || []);
  const equippedIds = new Set((status?.equippedSkills || []).map((s) => s.skillId));
  const proficiency = status?.weaponProficiency || {};

  // Group skills by weapon type
  const weaponSkills = {};
  const combatSkills = [];
  const extraSkills = [];

  for (const skill of skillDefs) {
    if (skill.category === "weapon") {
      if (!weaponSkills[skill.weaponType]) weaponSkills[skill.weaponType] = [];
      weaponSkills[skill.weaponType].push(skill);
    } else if (skill.category === "combat") {
      combatSkills.push(skill);
    } else if (skill.category === "extra") {
      extraSkills.push(skill);
    }
  }

  return (
    <div className="card">
      <h2>劍技系統</h2>

      {error && <div style={{ color: "var(--danger)", marginBottom: "0.5rem" }}>{error}</div>}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        {["equipped", "proficiency", "all"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "0.3rem 0.8rem",
              background: activeTab === tab ? "var(--gold)" : "var(--bg-secondary)",
              color: activeTab === tab ? "#000" : "var(--text-primary)",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            {tab === "equipped" ? `裝備中 (${equippedIds.size}/${status?.slotCount || 0})`
              : tab === "proficiency" ? "熟練度"
              : "全部技能"}
          </button>
        ))}
      </div>

      {/* Equipped skills */}
      {activeTab === "equipped" && (
        <SkillSlotEditor
          equippedSkills={status?.equippedSkills || []}
          skillDefs={skillDefs}
          modDefs={modDefs}
          slotCount={status?.slotCount || 0}
          modSlots={status?.modSlots || 0}
          currentModCount={status?.currentModCount || 0}
          onUnequip={handleUnequip}
          onRefresh={fetchData}
        />
      )}

      {/* Proficiency */}
      {activeTab === "proficiency" && (
        <div>
          {Object.entries(WEAPON_TYPE_NAMES).map(([type, name]) => (
            <ProficiencyBar
              key={type}
              label={name}
              value={proficiency[type] || 0}
              max={1000}
            />
          ))}
        </div>
      )}

      {/* All skills */}
      {activeTab === "all" && (
        <div>
          {Object.entries(weaponSkills).map(([type, skills]) => (
            <div key={type} style={{ marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "0.95rem", color: "var(--gold)", marginBottom: "0.5rem" }}>
                {WEAPON_TYPE_NAMES[type] || type}
                <span style={{ color: "var(--text-secondary)", fontWeight: "normal", fontSize: "0.8rem", marginLeft: "0.5rem" }}>
                  熟練度: {proficiency[type] || 0}
                </span>
              </h3>
              {skills.sort((a, b) => a.tier - b.tier).map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  learned={learnedSet.has(skill.id)}
                  equipped={equippedIds.has(skill.id)}
                  proficiency={proficiency[type] || 0}
                  onLearn={handleLearn}
                  onEquip={handleEquip}
                  onUnequip={handleUnequip}
                />
              ))}
            </div>
          ))}

          {combatSkills.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "0.95rem", color: "var(--gold)", marginBottom: "0.5rem" }}>
                戰鬥技能
              </h3>
              {combatSkills.sort((a, b) => a.tier - b.tier).map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  learned={learnedSet.has(skill.id)}
                  equipped={equippedIds.has(skill.id)}
                  proficiency={status?.maxProficiency || 0}
                  onLearn={handleLearn}
                  onEquip={handleEquip}
                  onUnequip={handleUnequip}
                />
              ))}
            </div>
          )}

          {extraSkills.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "0.95rem", color: "var(--gold)", marginBottom: "0.5rem" }}>
                額外技能
              </h3>
              {extraSkills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  learned={extraSet.has(skill.id)}
                  equipped={equippedIds.has(skill.id)}
                  proficiency={0}
                  isExtra
                  onLearn={handleLearn}
                  onEquip={handleEquip}
                  onUnequip={handleUnequip}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SkillCard({ skill, learned, equipped, proficiency, isExtra, onLearn, onEquip, onUnequip }) {
  const canUnlock = !isExtra && proficiency >= skill.requiredProficiency;
  const tierStars = "★".repeat(skill.tier) + "☆".repeat(5 - skill.tier);

  const triggerLabel = skill.triggerType === "passive" ? "被動"
    : skill.triggerType === "conditional" ? "條件"
    : `${skill.triggerChance}%`;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0.4rem 0.6rem",
        marginBottom: "0.3rem",
        background: learned ? "rgba(255,215,0,0.05)" : "var(--bg-secondary)",
        borderRadius: "4px",
        borderLeft: `3px solid ${skill.color || "#666"}`,
        opacity: learned ? 1 : 0.6,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontWeight: "bold", fontSize: "0.9rem" }}>{skill.nameCn}</span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{skill.nameJp}</span>
          <span style={{ fontSize: "0.7rem", color: "var(--gold)" }}>{tierStars}</span>
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
          {triggerLabel} | 後搖 {skill.postMotionDelay}
          {skill.requiredProficiency > 0 && ` | 需要熟練度 ${skill.requiredProficiency}`}
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
          {skill.description}
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.3rem" }}>
        {!learned && canUnlock && (
          <button
            onClick={() => onLearn(skill.id)}
            style={{
              padding: "0.2rem 0.5rem",
              fontSize: "0.75rem",
              background: "var(--success)",
              color: "#fff",
              border: "none",
              borderRadius: "3px",
              cursor: "pointer",
            }}
          >
            學習
          </button>
        )}
        {learned && !equipped && (
          <button
            onClick={() => onEquip(skill.id)}
            style={{
              padding: "0.2rem 0.5rem",
              fontSize: "0.75rem",
              background: "var(--primary)",
              color: "#fff",
              border: "none",
              borderRadius: "3px",
              cursor: "pointer",
            }}
          >
            裝備
          </button>
        )}
        {equipped && (
          <button
            onClick={() => onUnequip(skill.id)}
            style={{
              padding: "0.2rem 0.5rem",
              fontSize: "0.75rem",
              background: "var(--danger)",
              color: "#fff",
              border: "none",
              borderRadius: "3px",
              cursor: "pointer",
            }}
          >
            卸除
          </button>
        )}
      </div>
    </div>
  );
}
