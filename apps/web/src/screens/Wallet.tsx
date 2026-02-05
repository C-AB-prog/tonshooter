import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../store/useSession";
import { apiFetch } from "../lib/api";
import { getTonPayMode, getTonConnectUI, getConnectedAddress } from "../lib/tonconnect";
import { Overlay } from "../components/Overlay";

function fmtBig(s: string) {
  return BigInt(s).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export default function Wallet() {
  const nav = useNavigate();
  const { user, token, refresh } = useSession();
  const [overlay, setOverlay] = useState<{ title: string; text: string } | null>(null);

  // Exchange inputs
  const [coinsToCrystals, setCoinsToCrystals] = useState(1);
  const [crystalsToTon, setCrystalsToTon] = useState(1);

  // Withdraw inputs
  const [withdrawAmount, setWithdrawAmount] = useState(1);
  const [withdrawAddr, setWithdrawAddr] = useState("");

  if (!user || !token) return null;

  const coinsNeed = useMemo(() => BigInt(coinsToCrystals) * 100000n, [coinsToCrystals]);
  const crystalsNeed = useMemo(() => BigInt(crystalsToTon) * 100n, [crystalsToTon]);

  const boostCooldown = user.boostCooldownUntil ? new Date(user.boostCooldownUntil).getTime() : 0;
  const boostReady = boostCooldown <= Date.now();

  async function exchange(direction: "coins_to_crystals" | "crystals_to_ton", amount: number) {
    try {
      await apiFetch("/exchange", { token, body: { direction, amount } });
      await refresh();
    } catch (e: any) {
      if (e?.code === "not_enough_coins") setOverlay({ title: "Не хватает Coins", text: "Недостаточно монет для обмена." });
      else if (e?.code === "not_enough_crystals") setOverlay({ title: "Не хватает Crystals", text: "Недостаточно кристаллов для обмена." });
      else setOverlay({ title: "Ошибка", text: "Не удалось выполнить обмен." });
    }
  }

  async function buyBoost() {
    setOverlay({
      title: "Оплата TON (тест)",
      text: "Покупки за TON делаются через TonConnect. Сейчас стоит заглушка: можно симулировать успешную оплату и получить 100 энергии.",
    });
  }

  async function buyBoostMock() {
    try {
      await apiFetch("/ton/purchase/mock", { token, body: { purchase: "boost" } });
      await refresh();
      setOverlay({ title: "Готово", text: "Энергия восстановлена до 100." });
    } catch (e: any) {
      const code = e?.code;
      if (code === "boost_cooldown") setOverlay({ title: "Кулдаун", text: "Буст доступен раз в 6 часов." });
      else if (code === "mock_disabled") setOverlay({ title: "Отключено", text: "На сервере выключен mock-режим оплаты." });
      else setOverlay({ title: "Ошибка", text: code ?? "boost_buy_failed" });
    }
  }

  async function withdraw() {
    try {
      await apiFetch("/withdraw", { token, body: { amountTon: withdrawAmount, address: withdrawAddr } });
      await refresh();
      setOverlay({ title: "Заявка создана", text: "Вывод поставлен в очередь." });
    } catch (e: any) {
      const code = e?.code;
      if (code === "withdraw_locked_need_referral") {
        setOverlay({
          title: "Вывод закрыт",
          text: "Чтобы открыть вывод, нужно привести 1 друга, который выполнит условия (50 выстрелов и 20 попаданий за 24 часа).",
        });
      } else if (code === "min_withdraw_1_ton") setOverlay({ title: "Минимум 1 TON", text: "Минимальная сумма вывода — 1 TON." });
      else if (code === "max_withdraw_25_ton") setOverlay({ title: "Максимум 25 TON", text: "Максимальная сумма вывода — 25 TON." });
      else if (code === "withdraw_cooldown_24h") setOverlay({ title: "Ограничение 24 часа", text: "Вывод доступен не чаще 1 раза в 24 часа." });
      else if (code === "not_enough_ton") setOverlay({ title: "Не хватает TON", text: "Недостаточно TON на балансе приложения." });
      else setOverlay({ title: "Ошибка", text: "Не удалось создать заявку на вывод." });
    }
  }

  const locked = !user.canWithdrawTon;

  return (
    <div className="safe col">
      <div className="card" style={{ padding: 14 }}>
        <div className="h2">Кошелёк</div>
        <div className="muted" style={{ marginTop: 6, fontWeight: 600 }}>
          Обмен: 100 000 coins = 1 crystal; 100 crystals = 1 TON.
          TON на балансе здесь — это "внутри приложения" (для вывода). Покупки за TON (буст/5 уровень) — отдельная оплата (пока заглушка).
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span className="pill">🪙 {fmtBig(user.coins)} coins</span>
          <span className="pill">💎 {fmtBig(user.crystals)} crystals</span>
          <span className="pill">🔷 {user.tonBalance} TON</span>
          <span className="pill">⚡ {user.energy}/{user.energyMax}</span>
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontWeight: 900 }}>Буст энергии</div>
        <div className="muted" style={{ marginTop: 6, fontWeight: 600 }}>
          Полная энергия (100) за <b>1 TON</b>. Кулдаун: 6 часов.
        </div>

        {!boostReady ? (
          <div className="muted" style={{ marginTop: 8, fontWeight: 700 }}>
            Доступно после: {new Date(boostCooldown).toLocaleString()}
          </div>
        ) : null}

        <button className="btn btnPrimary" style={{ width: "100%", marginTop: 12 }} onClick={buyBoost} disabled={!boostReady}>
          Купить буст • 🔷 1 TON
        </button>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontWeight: 900 }}>Coins → Crystals</div>
        <div className="muted" style={{ marginTop: 6, fontWeight: 600 }}>
          Ты получишь: <b>{coinsToCrystals}</b> 💎 &nbsp;•&nbsp; нужно: <b>{fmtBig(coinsNeed.toString())}</b> 🪙
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <input
            value={coinsToCrystals}
            onChange={(e) => setCoinsToCrystals(clampInt(Number(e.target.value || 1), 1, 1_000_000))}
            style={{ flex: 1, padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }}
            type="number"
            min={1}
          />
          <button className="btn btnGreen" onClick={() => exchange("coins_to_crystals", coinsToCrystals)}>
            Обменять
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontWeight: 900 }}>Crystals → TON</div>
        <div className="muted" style={{ marginTop: 6, fontWeight: 600 }}>
          Ты получишь: <b>{crystalsToTon}</b> 🔷 &nbsp;•&nbsp; нужно: <b>{fmtBig(crystalsNeed.toString())}</b> 💎
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <input
            value={crystalsToTon}
            onChange={(e) => setCrystalsToTon(clampInt(Number(e.target.value || 1), 1, 1_000_000))}
            style={{ flex: 1, padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }}
            type="number"
            min={1}
          />
          <button className="btn btnGreen" onClick={() => exchange("crystals_to_ton", crystalsToTon)}>
            Обменять
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 900 }}>Вывод TON</div>
          <span className="pill" style={{ background: locked ? "rgba(255, 107, 107, 0.18)" : "rgba(54, 211, 153, 0.18)" }}>
            {locked ? "🔒 закрыт" : "✅ открыт"}
          </span>
        </div>

        <div className="muted" style={{ marginTop: 6, fontWeight: 600 }}>
          Минимум 1 TON, максимум 25 TON, 1 раз в 24 часа.
        </div>

        {locked ? (
          <div className="muted" style={{ marginTop: 8, fontWeight: 700 }}>
            Условие: приведи 1 друга, который выполнит 50 выстрелов и 20 попаданий за 24 часа. У тебя: <b>{user.activeReferralCount}</b>
            <div style={{ marginTop: 10 }}>
              <button className="btn" style={{ background: "rgba(0,0,0,0.06)", width: "100%" }} onClick={() => nav("/profile")}>
                Открыть реферальную ссылку
              </button>
            </div>
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10, marginTop: 10, opacity: locked ? 0.55 : 1 }}>
          <input
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(Math.max(1, Math.min(25, Number(e.target.value || 1))))}
            style={{ width: 120, padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }}
            type="number"
            min={1}
            max={25}
            step="0.1"
            disabled={locked}
          />
          <input
            value={withdrawAddr}
            onChange={(e) => setWithdrawAddr(e.target.value)}
            placeholder="TON-адрес"
            style={{ flex: 1, padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }}
            disabled={locked}
          />
        </div>

        <button className="btn btnPrimary" style={{ width: "100%", marginTop: 12 }} onClick={withdraw} disabled={locked}>
          Создать заявку
        </button>
      </div>

      {overlay ? (
        <Overlay
          title={overlay.title}
          text={overlay.text}
          onClose={() => setOverlay(null)}
          action={
            overlay.title === "Оплата TON (тест)"
              ? { label: "Симулировать успех", onClick: () => { setOverlay(null); void buyBoostMock(); } }
              : undefined
          }
          secondaryAction={
            overlay.title === "Оплата TON (тест)"
              ? { label: "Симулировать ошибку", onClick: () => { setOverlay({ title: "Оплата отменена", text: "Симуляция: платёж не прошёл." }); } }
              : undefined
          }
        />
      ) : null}
    </div>
  );
}
