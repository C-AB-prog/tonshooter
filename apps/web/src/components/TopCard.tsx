import React from "react";
import "../styles/components.css";
import { ApiUser } from "../lib/api";

function fmtInt(s: string) {
  const n = BigInt(s);
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function TopCard({ user }: { user: ApiUser }) {
  const initials = (user.firstName?.[0] ?? "И") + (user.lastName?.[0] ?? "");
  const name = user.username ? `@${user.username}` : [user.firstName, user.lastName].filter(Boolean).join(" ") || "Игрок";

  return (
    <div className="card topCard">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="avatar">{initials.toUpperCase()}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{name}</div>
          <div className="balanceRow" style={{ marginTop: 8 }}>
            <div className="balanceItem">🪙 {fmtInt(user.coins)}</div>
            <div className="balanceItem">💎 {fmtInt(user.crystals)}</div>
            <div className="balanceItem">🔷 {user.tonBalance} TON</div>
          </div>
        </div>
      </div>

      <div style={{ opacity: 0.5, fontSize: 20 }}>⚙️</div>
    </div>
  );
}
