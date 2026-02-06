import React from "react";
import "../styles/components.css";
import { ApiUser } from "../lib/api";

export function EnergyBar({ user }: { user: ApiUser }) {
  const pct = Math.max(0, Math.min(100, (user.energy / user.energyMax) * 100));

  return (
    <div className="card energyCard" style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: "-0.1px" }}>Энергия</div>
        <span className="pill" title="Текущее значение">
          ⚡ {user.energy}/{user.energyMax}
        </span>
      </div>

      <div className="energyBar" aria-label="Energy bar">
        <div className="energyFill" style={{ width: `${pct}%` }} />
      </div>

      <div className="energyText">
        {pct >= 100 ? "Полная энергия" : `Заполнено: ${Math.round(pct)}%`}
      </div>
    </div>
  );
}
