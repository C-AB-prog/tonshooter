import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../store/useSession";
import { apiFetch } from "../lib/api";
import { Overlay } from "../components/Overlay";
import "../styles/components.css";

function fmt(n: string) {
  return BigInt(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

const MAX_LEVEL = 10;

export default function Home() {
  const nav = useNavigate();
  const { user, token, refresh } = useSession();
  const [overlay, setOverlay] = useState<{ title: string; text: string } | null>(null);

  const prices = useMemo(() => {
    return {
      weapon: [0, 50000, 120000, 300000, 800000, 2000000, 5000000, 12000000, 25000000, 50000000],
    };
  }, []);

  if (!user || !token) return null;

  async function upgrade(which: "weapon" | "range") {
    try {
      await apiFetch("/upgrade", { token, body: { which } });
      await refresh();
    } catch (e: any) {
      if (e?.code === "upgrade_blocked")
        setOverlay({ title: "Улучшение недоступно", text: e.payload?.reason ?? "Причина неизвестна" });
      else if (e?.code === "not_enough_coins")
        setOverlay({ title: "Не хватает Coins", text: "Нужно больше Coins." });
      else if (e?.code === "not_enough_ton")
        setOverlay({ title: "Не хватает TON", text: "Для улучшения нужен TON." });
      else
        setOverlay({ title: "Ошибка", text: "Попробуй позже." });
    }
  }

  function renderUpgradeCard(
    title: string,
    level: number,
    onUpgrade: () => void
  ) {
    const isMax = level >= MAX_LEVEL;
    const nextLevel = level + 1;
    const usesTon = nextLevel === 5;

    const priceLabel = isMax
      ? "Максимальный уровень"
      : `Улучшить • ${usesTon ? "🔷 2 TON" : `🪙 ${fmt(String(prices.weapon[level] ?? 0))}`}`;

    return (
      <div className="card upgradeCard">
        <div className="cardHead">
          <div>
            <div className="cardTitle">{title}</div>
            <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
              Следующий уровень: {isMax ? "—" : nextLevel}
            </div>
          </div>
          <span className="pill">Ур. {level}</span>
        </div>

        <div className="imgStub">{title.toUpperCase()}</div>

        <button
          className={`btn ${isMax ? "btnSoft" : (usesTon ? "btnPrimary" : "btnGreen")}`}
          disabled={isMax}
          onClick={onUpgrade}
          style={{ width: "100%" }}
        >
          {priceLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="safe col">
      <div className="col" style={{ gap: 10 }}>
        <h1 className="h1">Главная</h1>
        <div className="muted" style={{ fontSize: 13 }}>
          Улучшай параметры и переходи в бой
        </div>
      </div>

      <div className="col" style={{ gap: 10 }}>
        <div className="h2">Улучшения</div>

        <div className="row" style={{ alignItems: "stretch" }}>
          {renderUpgradeCard("Оружие", user.weaponLevel, () => upgrade("weapon"))}
          {renderUpgradeCard("Полигон", user.rangeLevel, () => upgrade("range"))}
        </div>
      </div>

      <div className="card tasksCard">
        <div>
          <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: "-0.1px" }}>Задания</div>
          <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
            Выполняй задания — получай награды
          </div>
        </div>
        <button className="btn btnPrimary" onClick={() => nav("/tasks")}>
          Перейти
        </button>
      </div>

      <div className="col" style={{ gap: 10 }}>
        <button className="btn btnPrimary bigAction" onClick={() => nav("/shoot")}>
          ОГОНЬ
        </button>
        <div className="muted" style={{ textAlign: "center", fontSize: 12 }}>
          В бою тратится энергия. Улучшения увеличивают эффективность.
        </div>
      </div>

      {overlay && (
        <Overlay
          title={overlay.title}
          text={overlay.text}
          onClose={() => setOverlay(null)}
        />
      )}
    </div>
  );
}
