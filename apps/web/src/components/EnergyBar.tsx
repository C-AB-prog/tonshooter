import React from "react";
import "../styles/components.css";
import { ApiUser } from "../lib/api";

export function EnergyBar({ user }: { user: ApiUser }) {
  const pct = Math.max(0, Math.min(100, (user.energy / user.energyMax) * 100));

  return (
    <div className="card energyCard">
      <div className="energyBar">
        <div className="energyFill" style={{ width: `${pct}%` }} />
      </div>
      <div className="energyText">Энергия {user.energy} / {user.energyMax}</div>
    </div>
  );
}
