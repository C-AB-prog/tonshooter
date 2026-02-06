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

      // Level 5 is a TON purchase (real payment). For now we show a mock payment modal.
      if (next === 5) {
        setPendingTon({ which });
        setOverlay({
          title: "Оплата TON (тест)",
          text: "Улучшение 5 уровня покупается за 2 TON через TonConnect. Сейчас стоит заглушка: можно симулировать успешный платёж.",
        });
        return;
      }

      await apiFetch("/upgrade", { token, body: { which } });
      await refresh();
    } catch (e: any) {
      if (e?.code === "upgrade_blocked")
        setOverlay({ title: "Улучшение недоступно", text: e.payload?.reason ?? "Причина неизвестна" });
      else if (e?.code === "not_enough_coins")
        setOverlay({ title: "Не хватает Coins", text: "Нужно больше Coins для улучшения." });
      else if (e?.code === "not_enough_ton")
        setOverlay({ title: "Не хватает TON", text: "Для 5 уровня нужно 2 TON." });
      else setOverlay({ title: "Ошибка сервера", text: "Попробуй ещё раз позже." });
    }
  }

  const wNext = user.weaponLevel + 1;
  const rNext = user.rangeLevel + 1;
  const wPrice = PRICE[user.weaponLevel] ?? 0;
  const rPrice = PRICE[user.rangeLevel] ?? 0;

  const wUsesTon = wNext === 5;
  const rUsesTon = rNext === 5;

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
      setOverlay({
        title: "Готово",
        text: getTonPayMode() === "mock" ? "Улучшение куплено (mock)." : "Улучшение куплено за TON.",
      });
    } catch (e: any) {
      const code = e?.code;
      if (code === "upgrade_blocked") setOverlay({ title: "Улучшение недоступно", text: e.payload?.reason ?? "blocked" });
      else if (code === "mock_disabled") setOverlay({ title: "Отключено", text: "На сервере выключен mock-режим оплаты." });
      else if (code === "invalid_level") setOverlay({ title: "Неверный уровень", text: e?.message ?? "invalid" });
      else setOverlay({ title: "Ошибка", text: code ?? "ton_purchase_failed" });
    } finally {
      setPendingTon(null);
    }
  }

  const wDisabled = user.weaponLevel >= 10;
  const rDisabled = user.rangeLevel >= 10;

  return (
    <div className="safe col">
      {/* Header */}
      <div className="card" style={{ padding: 14 }}>
        <div className="h2">Улучшения</div>
        <div className="muted" style={{ marginTop: 6, fontWeight: 700, fontSize: 13 }}>
          Держи баланс: |WeaponLevel - RangeLevel| ≤ 3
        </div>

        <div className="notice" style={{ marginTop: 12 }}>
          Подсказка: 5 уровень покупается за TON. Остальные — за Coins.
        </div>
      </div>

      {/* Cards */}
      <div className="row" style={{ alignItems: "stretch" }}>
        {/* Weapon */}
        <div className="card upgradeCard" style={{ flex: 1 }}>
          <div className="cardHead">
            <div>
              <div className="cardTitle">Оружие</div>
              <div className="muted" style={{ marginTop: 4, fontSize: 13, fontWeight: 700 }}>
                Следующий: {wDisabled ? "—" : wNext}
              </div>
            </div>
            <span className="pill">Ур. {user.weaponLevel}</span>
          </div>

          <div className="imgStub">WEAPON</div>

          <button
            className={`btn ${wDisabled ? "btnSoft" : (wUsesTon ? "btnPrimary" : "btnGreen")}`}
            disabled={wDisabled}
            onClick={() => upgrade("weapon")}
            style={{ width: "100%" }}
          >
            {wDisabled ? (
              "Макс. уровень"
            ) : (
              <>
                Улучшить • {wUsesTon ? "🔷 2 TON" : `🪙 ${fmt(String(wPrice))}`}
              </>
            )}
          </button>
        </div>

        {/* Range */}
        <div className="card upgradeCard" style={{ flex: 1 }}>
          <div className="cardHead">
            <div>
              <div className="cardTitle">Полигон</div>
              <div className="muted" style={{ marginTop: 4, fontSize: 13, fontWeight: 700 }}>
                Следующий: {rDisabled ? "—" : rNext}
              </div>
            </div>
            <span className="pill">Ур. {user.rangeLevel}</span>
          </div>

          <div className="imgStub">RANGE</div>

          <button
            className={`btn ${rDisabled ? "btnSoft" : (rUsesTon ? "btnPrimary" : "btnGreen")}`}
            disabled={rDisabled}
            onClick={() => upgrade("range")}
            style={{ width: "100%" }}
          >
            {rDisabled ? (
              "Макс. уровень"
            ) : (
              <>
                Улучшить • {rUsesTon ? "🔷 2 TON" : `🪙 ${fmt(String(rPrice))}`}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Overlay */}
      {overlay ? (
        <Overlay
          title={overlay.title}
          text={overlay.text}
          onClose={() => {
            setOverlay(null);
            setPendingTon(null);
          }}
          action={
            overlay.title === "Оплата TON (тест)"
              ? {
                  label: "Симулировать успех",
                  onClick: () => {
                    setOverlay(null);
                    void confirmTonPurchase();
                  },
                }
              : undefined
          }
          secondaryAction={
            overlay.title === "Оплата TON (тест)"
              ? {
                  label: "Симулировать ошибку",
                  onClick: () => {
                    setOverlay({ title: "Оплата отменена", text: "Симуляция: платёж не прошёл." });
                    setPendingTon(null);
                  },
                }
              : undefined
          }
        />
      ) : null}
    </div>
  );
}
