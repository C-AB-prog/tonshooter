import React, { useState } from "react";
import { useSession } from "../store/useSession";
import { apiFetch } from "../lib/api";
import { getTonPayMode, tonConnectPay } from "../lib/tonconnect";
import { Overlay } from "../components/Overlay";

function fmt(n: string) {
  return BigInt(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

const PRICE: Record<number, number> = {
  1: 50000,
  2: 120000,
  3: 300000,
  4: 800000,
  5: 2000000,
  6: 5000000,
  7: 12000000,
  8: 25000000,
  9: 50000000,
};

export default function Upgrades() {
  const { user, token, refresh } = useSession();
  const [overlay, setOverlay] = useState<{ title: string; text: string } | null>(null);
  const [pendingTon, setPendingTon] = useState<null | { which: "weapon" | "range" }>(null);

  if (!user || !token) return null;
  const tok = token;
  const u = user;

  async function upgrade(which: "weapon" | "range") {
    try {
      const next = which === "weapon" ? u.weaponLevel + 1 : u.rangeLevel + 1;

      if (next === 5) {
        setPendingTon({ which });
        setOverlay({ title: "Оплата TON", text: "Уровень 5 — 2 TON (пока симуляция)." });
        return;
      }

      await apiFetch("/upgrade", { token, body: { which } });
      await refresh();
    } catch (e: any) {
      if (e?.code === "upgrade_blocked") setOverlay({ title: "Недоступно", text: e.payload?.reason ?? "blocked" });
      else if (e?.code === "not_enough_coins") setOverlay({ title: "Не хватает Coins", text: "Нужно больше Coins." });
      else if (e?.code === "not_enough_ton") setOverlay({ title: "Не хватает TON", text: "Нужно 2 TON." });
      else setOverlay({ title: "Ошибка", text: "Попробуй позже." });
    }
  }

  async function confirmTonPurchase() {
    if (!pendingTon) return;
    try {
      const purchase = pendingTon.which === "weapon" ? "upgrade_weapon_5" : "upgrade_range_5";
      if (getTonPayMode() === "mock") {
        await apiFetch("/ton/purchase/mock", { token, body: { purchase } });
      } else {
        await tonConnectPay(purchase as any, tok);
      }
      await refresh();
      setOverlay({ title: "Готово", text: "Улучшение куплено." });
    } catch (e: any) {
      const code = e?.code;
      if (code === "mock_disabled") setOverlay({ title: "Отключено", text: "Mock выключен." });
      else setOverlay({ title: "Ошибка", text: code ?? "ton_purchase_failed" });
    } finally {
      setPendingTon(null);
    }
  }

  const wNext = user.weaponLevel + 1;
  const rNext = user.rangeLevel + 1;
  const wPrice = PRICE[user.weaponLevel] ?? 0;
  const rPrice = PRICE[user.rangeLevel] ?? 0;

  const wUsesTon = wNext === 5;
  const rUsesTon = rNext === 5;

  const wDisabled = user.weaponLevel >= 10;
  const rDisabled = user.rangeLevel >= 10;

  return (
    <div className="safe col">
      <h1 className="h1">Улучшения</h1>

      <div className="row" style={{ alignItems: "stretch" }}>
        <div className="card upgradeCard" style={{ flex: 1 }}>
          <div className="cardHead">
            <div className="cardTitle">Оружие</div>
            <span className="pill">Ур. {user.weaponLevel}</span>
          </div>
          <div className="imgStub">WEAPON</div>
          <button
            className={`btn ${wDisabled ? "btnSoft" : (wUsesTon ? "btnPrimary" : "btnGreen")}`}
            disabled={wDisabled}
            onClick={() => upgrade("weapon")}
            style={{ width: "100%" }}
          >
            {wDisabled ? "Макс" : `Улучшить • ${wUsesTon ? "🔷 2 TON" : `🪙 ${fmt(String(wPrice))}`}`}
          </button>
        </div>

        <div className="card upgradeCard" style={{ flex: 1 }}>
          <div className="cardHead">
            <div className="cardTitle">Полигон</div>
            <span className="pill">Ур. {user.rangeLevel}</span>
          </div>
          <div className="imgStub">RANGE</div>
          <button
            className={`btn ${rDisabled ? "btnSoft" : (rUsesTon ? "btnPrimary" : "btnGreen")}`}
            disabled={rDisabled}
            onClick={() => upgrade("range")}
            style={{ width: "100%" }}
          >
            {rDisabled ? "Макс" : `Улучшить • ${rUsesTon ? "🔷 2 TON" : `🪙 ${fmt(String(rPrice))}`}`}
          </button>
        </div>
      </div>

      {overlay ? (
        <Overlay
          title={overlay.title}
          text={overlay.text}
          onClose={() => {
            setOverlay(null);
            setPendingTon(null);
          }}
          action={
            overlay.title === "Оплата TON"
              ? { label: "Симулировать успех", onClick: () => { setOverlay(null); void confirmTonPurchase(); } }
              : undefined
          }
          secondaryAction={
            overlay.title === "Оплата TON"
              ? { label: "Симулировать ошибку", onClick: () => { setOverlay({ title: "Отменено", text: "Платёж не прошёл." }); setPendingTon(null); } }
              : undefined
          }
        />
      ) : null}
    </div>
  );
}
