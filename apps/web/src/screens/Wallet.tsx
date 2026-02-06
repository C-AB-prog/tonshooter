import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../store/useSession";
import { apiFetch } from "../lib/api";
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

  const [coinsToCrystals, setCoinsToCrystals] = useState(1);
  const [crystalsToTon, setCrystalsToTon] = useState(1);

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
      if (e?.code === "not_enough_coins") setOverlay({ title: "Не хватает Coins", text: "Недостаточно Coins." });
      else if (e?.code === "not_enough_crystals") setOverlay({ title: "Не хватает Crystals", text: "Недостаточно Crystals." });
      else setOverlay({ title: "Ошибка", text: "Обмен не выполнен." });
    }
  }

  async function buyBoostMock() {
    try {
      await apiFetch("/ton/purchase/mock", { token, body: { purchase: "boost" } });
      await refresh();
      setOverlay({ title: "Готово", text: "Энергия 100." });
    } catch (e: any) {
      const code = e?.code;
      if (code === "boost_cooldown") setOverlay({ title: "Кулдаун", text: "Буст раз в 6 часов." });
      else if (code === "mock_disabled") setOverlay({ title: "Отключено", text: "Mock выключен." });
      else setOverlay({ title: "Ошибка", text: code ?? "boost_buy_failed" });
    }
  }

  async function withdraw() {
    try {
      await apiFetch("/withdraw", { token, body: { amountTon: withdrawAmount, address: withdrawAddr } });
      await refresh();
      setOverlay({ title: "Заявка создана", text: "Вывод в очереди." });
    } catch (e: any) {
      const code = e?.code;
      if (code === "withdraw_locked_need_referral") setOverlay({ title: "Закрыто", text: "Нужен 1 активный реферал." });
      else if (code === "min_withdraw_1_ton") setOverlay({ title: "Минимум", text: "Минимум 1 TON." });
      else if (code === "max_withdraw_25_ton") setOverlay({ title: "Максимум", text: "Максимум 25 TON." });
      else if (code === "withdraw_cooldown_24h") setOverlay({ title: "Ограничение", text: "Раз в 24 часа." });
      else if (code === "not_enough_ton") setOverlay({ title: "Не хватает TON", text: "Недостаточно TON." });
      else setOverlay({ title: "Ошибка", text: "Не удалось создать заявку." });
    }
  }

  const locked = !user.canWithdrawTon;

  const inputStyle: React.CSSProperties = {
    minHeight: 44,
    padding: "0 12px",
    borderRadius: 14,
    border: "1px solid rgba(15,23,42,0.12)",
    background: "rgba(255,255,255,0.92)",
    fontWeight: 800,
    outline: "none",
  };

  return (
    <div className="safe col">
      <h1 className="h1">Кошелёк</h1>

      <div className="card" style={{ padding: 14 }}>
        <div className="balanceRow">
          <div className="balanceItem">🪙 {fmtBig(user.coins)}</div>
          <div className="balanceItem">💎 {fmtBig(user.crystals)}</div>
          <div className="balanceItem">🔷 {user.tonBalance}</div>
          <div className="balanceItem">⚡ {user.energy}/{user.energyMax}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Буст</div>
          <span className="pill">{boostReady ? "✅" : "⏳"}</span>
        </div>
        <button className="btn btnPrimary" style={{ width: "100%", marginTop: 12 }} disabled={!boostReady} onClick={() => setOverlay({ title: "Оплата TON", text: "Пока симуляция." })}>
          Купить • 🔷 1 TON
        </button>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Coins → Crystals</div>
        <div className="muted" style={{ marginTop: 6, fontWeight: 800, fontSize: 12 }}>Нужно: {fmtBig(coinsNeed.toString())}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <input
            value={coinsToCrystals}
            onChange={(e) => setCoinsToCrystals(clampInt(Number(e.target.value || 1), 1, 1_000_000))}
            style={{ ...inputStyle, flex: 1 }}
            type="number"
            min={1}
          />
          <button className="btn btnGreen" onClick={() => exchange("coins_to_crystals", coinsToCrystals)}>
            Обмен
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Crystals → TON</div>
        <div className="muted" style={{ marginTop: 6, fontWeight: 800, fontSize: 12 }}>Нужно: {fmtBig(crystalsNeed.toString())}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <input
            value={crystalsToTon}
            onChange={(e) => setCrystalsToTon(clampInt(Number(e.target.value || 1), 1, 1_000_000))}
            style={{ ...inputStyle, flex: 1 }}
            type="number"
            min={1}
          />
          <button className="btn btnGreen" onClick={() => exchange("crystals_to_ton", crystalsToTon)}>
            Обмен
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Вывод TON</div>
          <span className="pill">{locked ? "🔒" : "✅"}</span>
        </div>

        {locked ? (
          <button className="btn btnSoft" style={{ width: "100%", marginTop: 12 }} onClick={() => nav("/profile")}>
            Рефералка
          </button>
        ) : (
          <>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <input
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(Math.max(1, Math.min(25, Number(e.target.value || 1))))}
                style={{ ...inputStyle, width: 120 }}
                type="number"
                min={1}
                max={25}
                step="0.1"
              />
              <input
                value={withdrawAddr}
                onChange={(e) => setWithdrawAddr(e.target.value)}
                placeholder="TON-адрес"
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
            <button className="btn btnPrimary" style={{ width: "100%", marginTop: 12 }} onClick={withdraw}>
              Создать заявку
            </button>
          </>
        )}
      </div>

      {overlay ? (
        <Overlay
          title={overlay.title}
          text={overlay.text}
          onClose={() => setOverlay(null)}
          action={overlay.title === "Оплата TON" ? { label: "Симулировать успех", onClick: () => { setOverlay(null); void buyBoostMock(); } } : undefined}
          secondaryAction={overlay.title === "Оплата TON" ? { label: "Симулировать ошибку", onClick: () => setOverlay({ title: "Отменено", text: "Платёж не прошёл." }) } : undefined}
        />
      ) : null}
    </div>
  );
}
