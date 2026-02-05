import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../store/useSession";
import { apiFetch } from "../lib/api";
import { Overlay } from "../components/Overlay";
import "../styles/components.css";

function fmt(n: string) {
  return BigInt(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export default function Home() {
  const nav = useNavigate();
  const { user, token, refresh } = useSession();
  const [overlay, setOverlay] = useState<{ title: string; text: string } | null>(null);

  const prices = useMemo(() => {
    // from TZ example table (frontend mirrors backend)
    return { weapon: [0, 50000, 120000, 300000, 800000, 2000000, 5000000, 12000000, 25000000, 50000000] };
  }, []);

  if (!user || !token) return null;

  async function upgrade(which: "weapon" | "range") {
    try {
      await apiFetch("/upgrade", { token, body: { which } });
      await refresh();
    } catch (e: any) {
      if (e?.code === "upgrade_blocked") setOverlay({ title: "Улучшение недоступно", text: e.payload?.reason ?? "Причина неизвестна" });
      else if (e?.code === "not_enough_coins") setOverlay({ title: "Не хватает Coins", text: "Нужно больше Coins для улучшения." });
      else if (e?.code === "not_enough_ton") setOverlay({ title: "Не хватает TON", text: "Для 5 уровня нужно 2 TON." });
      else if (e?.code === "bot_suspected") setOverlay({ title: "Подозрение на бота", text: "Действия слишком быстрые. Попробуй играть честно." });
      else setOverlay({ title: "Ошибка сервера", text: "Попробуй ещё раз позже." });
    }
  }

  const wNext = user.weaponLevel + 1;
  const rNext = user.rangeLevel + 1;
  const wUsesTon = wNext === 5;
  const rUsesTon = rNext === 5;

  return (
    <div className="safe col">
      <div className="row">
        <div className="card upgradeCard">
          <div className="cardHead">
            <div className="cardTitle">Оружие</div>
            <span className="pill">Ур. {user.weaponLevel}</span>
          </div>
          <div className="imgStub">WEAPON</div>
          <button className="btn btnGreen" onClick={() => upgrade("weapon")}>
            Улучшить • {wUsesTon ? "🔷 2 TON" : `🪙 ${fmt(String(prices.weapon[user.weaponLevel] ?? 0))}`}
          </button>
        </div>

        <div className="card upgradeCard">
          <div className="cardHead">
            <div className="cardTitle">Полигон</div>
            <span className="pill">Ур. {user.rangeLevel}</span>
          </div>
          <div className="imgStub">RANGE</div>
          <button className="btn btnGreen" onClick={() => upgrade("range")}>
            Улучшить • {rUsesTon ? "🔷 2 TON" : `🪙 ${fmt(String(prices.weapon[user.rangeLevel] ?? 0))}`}
          </button>
        </div>
      </div>

      <div className="card tasksCard">
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Задания</div>
          <div className="muted" style={{ marginTop: 4, fontWeight: 600, fontSize: 13 }}>
            Выполняйте задания — получайте награды!
          </div>
        </div>
        <button className="btn btnPrimary" onClick={() => nav("/tasks")}>Перейти</button>
      </div>

      <button className="btn btnPrimary bigAction" onClick={() => nav("/shoot")}>
        СТРЕЛЬБА
      </button>

      {overlay ? (
        <Overlay
          title={overlay.title}
          text={overlay.text}
          onClose={() => setOverlay(null)}
        />
      ) : null}
    </div>
  );
}
