import React from "react";
import "../styles/components.css";
import { ApiUser } from "../lib/api";

function fmtInt(s: string) {
  const n = BigInt(s);
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function TopCard({ user }: { user: ApiUser }) {
  const initials = (user.firstName?.[0] ?? "И") + (user.lastName?.[0] ?? "");
  const name =
    user.username
      ? `@${user.username}`
      : [user.firstName, user.lastName].filter(Boolean).join(" ") || "Игрок";

  return (
    <div className="card topCard" style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <div className="avatar" aria-hidden>
          {initials.toUpperCase()}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
            <div
              style={{
                fontWeight: 900,
                fontSize: 18,
                letterSpacing: "-0.1px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={name}
            >
              {name}
            </div>

            <span className="pill" title="Уровни">
              ⚙️ W {user.weaponLevel} · R {user.rangeLevel}
            </span>
          </div>

          <div className="balanceRow">
            <div className="balanceItem" title="Coins">
              🪙 {fmtInt(user.coins)}
            </div>
            <div className="balanceItem" title="Crystals">
              💎 {fmtInt(user.crystals)}
            </div>
            <div className="balanceItem" title="TON (внутри приложения)">
              🔷 {user.tonBalance} TON
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
