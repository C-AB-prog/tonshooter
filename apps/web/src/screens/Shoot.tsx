import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "../store/useSession";
import { apiFetch } from "../lib/api";
import { getTonPayMode, tonConnectPay } from "../lib/tonconnect";
import { Overlay } from "../components/Overlay";

type ShotStart = {
  sessionId: string;
  serverStartedAt: string;
  difficulty: number;
  zoneCenter: number;
  zoneWidth: number;
  speed: number;
  energyCost: number;
  zoneMoves?: boolean;
  zonePhase?: number;
};

type FireRes = {
  hit: boolean;
  pos: number;
  coinsAward: string;
  energy: number;
  difficulty: number;
  balances: { coins: string; crystals: string; tonBalance: string };
};

function pingPong01(x: number): number {
  const mod = x % 2;
  return mod <= 1 ? mod : 2 - mod;
}

function zoneCenterAtMs(elapsedMs: number, zoneWidth: number, speed: number, phase: number): number {
  const min = zoneWidth / 2;
  const max = 1 - zoneWidth / 2;
  const span = Math.max(0, max - min);
  const t = elapsedMs / 1000;
  const p = pingPong01(t * speed + phase);
  return min + p * span;
}

function fmtBigintString(n: string) {
  try {
    return BigInt(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  } catch {
    return n;
  }
}

export default function Shoot() {
  const { user, token, refresh } = useSession();
  const [overlay, setOverlay] = useState<{ title: string; text: string } | null>(null);

  const [session, setSession] = useState<ShotStart | null>(null);
  const [pos, setPos] = useState(0);
  const [zoneCenter, setZoneCenter] = useState(0.5);

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ hit: boolean; coins: string } | null>(null);
  const [misses, setMisses] = useState(0);

  const startedPerf = useRef<number | null>(null);
  const raf = useRef<number | null>(null);
  const running = useRef(false);

  const zone = useMemo(() => {
    if (!session) return { left: 0.46, width: 0.18 };
    return {
      left: zoneCenter - session.zoneWidth / 2,
      width: session.zoneWidth,
    };
  }, [session, zoneCenter]);

  useEffect(() => {
    if (!token) return;
    void startAttempt();
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!session) return;

    if (raf.current) cancelAnimationFrame(raf.current);
    startedPerf.current = performance.now();
    running.current = true;

    const tick = () => {
      if (!running.current || !session) return;

      const t = (performance.now() - (startedPerf.current ?? performance.now())) / 1000;
      const p = pingPong01(t * session.speed);
      setPos(p);

      if (session.zoneMoves) {
        const elapsedMs = performance.now() - (startedPerf.current ?? performance.now());
        const phase = session.zonePhase ?? 0;
        const c = zoneCenterAtMs(elapsedMs, session.zoneWidth, session.speed, phase);
        setZoneCenter(c);
      } else {
        setZoneCenter(session.zoneCenter);
      }

      raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
  }, [session]);

  if (!user || !token) return null;
  const tok = token;

  const pct = Math.max(0, Math.min(100, (user.energy / user.energyMax) * 100));

  async function startAttempt() {
    setBusy(true);
    setResult(null);
    setMisses(0);

    try {
      const s = await apiFetch<ShotStart>("/shot/start", { token, body: {} });
      setSession(s);
      setZoneCenter(s.zoneCenter);
      setBusy(false);
    } catch (e: any) {
      setBusy(false);
      setSession(null);

      if (e?.code === "no_energy") setOverlay({ title: "Нет энергии", text: "Можно купить буст." });
      else if (e?.code === "bot_suspected") setOverlay({ title: "Слишком быстро", text: "Попробуй позже." });
      else setOverlay({ title: "Ошибка", text: "Не удалось начать." });
    }
  }

  async function buyBoost() {
    try {
      setBusy(true);
      if (getTonPayMode() === "mock") {
        await apiFetch("/ton/purchase/mock", { token, body: { purchase: "boost" } });
      } else {
        await tonConnectPay("boost", tok);
      }
      await refresh();
      setBusy(false);
      setOverlay({ title: "Готово", text: "Энергия 100." });
    } catch (e: any) {
      setBusy(false);
      const code = e?.code;
      if (code === "boost_cooldown") setOverlay({ title: "Кулдаун", text: "Буст раз в 6 часов." });
      else if (code === "mock_disabled") setOverlay({ title: "Отключено", text: "Mock выключен." });
      else setOverlay({ title: "Ошибка", text: code ?? "boost_buy_failed" });
    }
  }

  async function fire() {
    if (!session || busy) return;

    running.current = false;
    if (raf.current) cancelAnimationFrame(raf.current);

    setBusy(true);

    try {
      const elapsed = Math.floor(performance.now() - (startedPerf.current ?? performance.now()));
      const r = await apiFetch<FireRes>("/shot/fire", {
        token,
        body: { sessionId: session.sessionId, clientElapsedMs: elapsed },
      });

      setResult({ hit: r.hit, coins: r.coinsAward });
      if (!r.hit) setMisses((m) => m + 1);

      await refresh();

      if (!r.hit) setOverlay({ title: "Промах", text: "Сложность сброшена." });

      setBusy(false);
    } catch (e: any) {
      setBusy(false);
      if (e?.code === "no_energy") setOverlay({ title: "Нет энергии", text: "Купить буст?" });
      else if (e?.code === "bot_suspected") setOverlay({ title: "Слишком быстро", text: "Замедлись." });
      else setOverlay({ title: "Ошибка", text: "Попробуй ещё раз." });
    }
  }

  async function adminFillEnergy() {
    try {
      setBusy(true);
      await apiFetch("/admin/energy/fill", { token, body: {} });
      await refresh();
      setBusy(false);
    } catch (e: any) {
      setBusy(false);
      setOverlay({ title: "Ошибка", text: e?.code ?? "admin_fill_failed" });
    }
  }

  return (
    <div className="safe col">
      <div className="card" style={{ padding: 14 }}>
        <div className="h2">Стрельба</div>

        {/* правило одной строкой */}
        <div className="muted" style={{ marginTop: 6, fontWeight: 800, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          Попади в зелёную зону — получишь Coins
        </div>

        {/* энергия + цена */}
        <div className="balanceRow" style={{ marginTop: 12 }}>
          <div className="balanceItem">Цена: {session ? session.energyCost : "—"}</div>
          <div className="balanceItem">Промахи: {misses}</div>
          <div className="balanceItem">⚡ {user.energy}/{user.energyMax}</div>
        </div>

        <div style={{ marginTop: 10 }}>
          <div className="energyBar">
            <div className="energyFill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* шкала по центру */}
      <div className="card" style={{ padding: 14 }}>
        <div
          style={{
            position: "relative",
            height: 28,
            borderRadius: 999,
            background: "rgba(15,23,42,0.06)",
            border: "1px solid rgba(15,23,42,0.10)",
            overflow: "hidden",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.35)",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: `${Math.max(0, zone.left) * 100}%`,
              width: `${Math.max(0, zone.width) * 100}%`,
              top: 0,
              bottom: 0,
              background: "linear-gradient(90deg, rgba(31,184,106,0.18), rgba(31,184,106,0.30))",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: `calc(${pos * 100}% - 9px)`,
              top: 5,
              width: 18,
              height: 18,
              borderRadius: 9,
              background: "linear-gradient(180deg, #ffffff, #dbe6ff)",
              border: "1px solid rgba(15,23,42,0.16)",
              boxShadow: "0 10px 22px rgba(15,23,42,0.14)",
            }}
          />
        </div>

        {result ? (
          <div className="notice" style={{ marginTop: 12 }}>
            {result.hit ? `+${fmtBigintString(result.coins)} Coins` : "Промах"}
          </div>
        ) : null}
      </div>

      {/* кнопки вниз */}
      <div className="fixedActionWrap">
        <div className="fixedActionInner">
          <button className="btn btnPrimary bigAction" disabled={busy || !session} onClick={fire}>
            ОГОНЬ
          </button>

          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <button className="btn btnSoft" disabled={busy} onClick={startAttempt}>
              Новая попытка
            </button>

            <button className="btn btnGreen" disabled={busy} onClick={buyBoost}>
              Буст • 🔷 1 TON
            </button>

            {user.isAdmin ? (
              <button className="btn btnSoft" disabled={busy} onClick={adminFillEnergy}>
                (ADMIN) Энергия 100
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {overlay ? (
        <Overlay
          title={overlay.title}
          text={overlay.text}
          onClose={() => setOverlay(null)}
          action={
            overlay.title === "Нет энергии"
              ? { label: "Купить буст", onClick: () => { setOverlay(null); void buyBoost(); } }
              : undefined
          }
        />
      ) : null}
    </div>
  );
}
