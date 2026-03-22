import React from "react";
import "../styles/components.css";
import { ApiUser } from "../lib/api";

function fmtInt(s: string) {
  const n = BigInt(s);
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function TopCard({ user }: { user: ApiUser }) {
  const initials = (user.firstName?.[0] ?? "И") + (user.lastName?.[0] ?? "");

  return (
    <div className="card topCard" style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
        <div className="avatar" aria-hidden>{initials.toUpperCase()}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: "-0.1px" }}>
              {user.username ? `@${user.username}` : "Игрок"}
            </div>
            <span className="pill">W {user.weaponLevel} · R {user.rangeLevel}</span>
          </div>

          <div className="balanceRow">
            <div className="balanceItem">🪙 {fmtInt(user.coins)}</div>
            <div className="balanceItem">💎 {fmtInt(user.crystals)}</div>
            <div className="balanceItem">🔷 {user.tonBalance}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
