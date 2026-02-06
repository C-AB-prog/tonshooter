import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  mode?: "fixed" | "random";
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
  const nav = useNavigate();
  const { user, token, refresh } = useSession();

  const [overlay, setOverlay] = useState<{ title: string; text: string } | null>(null);

  const [session, setSession] = useState<ShotStart | null>(null);
  const [pos, setPos] = useState(0);
  const [zoneCenter, setZoneCenter] = useState(0.5);

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ hit: boolean; coins: string } | null>(null);

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

  async function startAttempt() {
    setBusy(true);
    setResult(null);

    try {
      const s = await apiFetch<ShotStart>("/shot/start", { token, body: {} });

      setSession(s);
      setZoneCenter(s.zoneCenter);
      setBusy(false);
    } catch (e: any) {
      setBusy(false);
      setSession(null);

      if (e?.code === "no_energy") {
        setOverlay({
          title: "Нет энергии",
          text: "Энергия закончилась. Можно подождать реген или купить буст (1 TON), чтобы восстановить энергию до 100.",
        });
      } else if (e?.code === "bot_suspected") {
        setOverlay({
          title: "Подозрение на бота",
          text: "Слишком быстрые действия. Замедлись и попробуй ещё раз.",
        });
      } else if (e?.code === "timeout" || e?.code === "network_error") {
        setOverlay({
          title: "Нет связи с сервером",
          text: "Проверь, что API запущен и Vite proxy настроен на /api → 4000.",
        });
      } else {
        setOverlay({ title: "Ошибка", text: "Не удалось начать попытку." });
      }
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
      setOverlay({ title: "Успех", text: "Энергия восстановлена до 100." });
    } catch (e: any) {
      setBusy(false);
      const code = e?.code;
      if (code === "boost_cooldown") setOverlay({ title: "Кулдаун", text: "Буст доступен раз в 6 часов." });
      else if (code === "mock_disabled") setOverlay({ title: "Отключено", text: "На сервере выключен mock-режим оплаты." });
      else setOverlay({ title: "Ошибка", text: code ?? "boost_buy_failed" });
    }
  }

  async function fire() {
    if (!session) return;
    if (busy) return;

    // стопаем бегунок СРАЗУ, чтобы он оставался “в том месте где нажал”
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

      await refresh();

      if (!r.hit) {
        const hitsBeforeMiss = session.difficulty;
        setOverlay({
          title: "Промах",
          text: `Вы попали ${hitsBeforeMiss} ${hitsBeforeMiss === 1 ? "раз" : hitsBeforeMiss >= 2 && hitsBeforeMiss <= 4 ? "раза" : "раз"} подряд.`,
        });
      }

      setBusy(false);
    } catch (e: any) {
      setBusy(false);

      if (e?.code === "no_energy") {
        setOverlay({
          title: "Нет энергии",
          text: "Энергия закончилась. Можно подождать реген или купить буст (1 TON), чтобы восстановить энергию до 100.",
        });
      } else if (e?.code === "bot_suspected") {
        setOverlay({ title: "Подозрение на бота", text: "Слишком быстрые действия. Замедлись." });
      } else if (e?.code === "timeout" || e?.code === "network_error") {
        setOverlay({ title: "Нет связи", text: "Сервер не отвечает. Проверь /api proxy и API." });
      } else {
        setOverlay({ title: "Ошибка сервера", text: "Попробуй ещё раз." });
      }
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

  const costText = session ? `${session.energyCost} энергии` : "—";
  const boostCooldown = user.boostCooldownUntil ? new Date(user.boostCooldownUntil).getTime() : 0;
  const boostReady = boostCooldown <= Date.now();

  return (
    <div className="safe col">
      {/* Header */}
      <div className="card" style={{ padding: 14 }}>
        <div className="h2">Стрельба</div>
        <div className="muted" style={{ marginTop: 6, fontWeight: 700, fontSize: 13 }}>
          Нажми «Огонь», когда бегунок в зелёной зоне.
        </div>

        <div className="balanceRow" style={{ marginTop: 12 }}>
          <div className="balanceItem">Цена: {costText}</div>
          <div className="balanceItem">
            Энергия: <span style={{ fontWeight: 900 }}>{user.energy}</span>/{user.energyMax}
          </div>
        </div>
      </div>

      {/* Game card */}
      <div className="card" style={{ padding: 14 }}>
        {/* Aim bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <span className="pill">Скорость: {session ? session.speed : "—"}</span>
          <span className="pill">Сложность: {session ? session.difficulty : "—"}</span>
        </div>

        <div style={{ marginTop: 14 }}>
          <div
            style={{
              position: "relative",
              height: 26,
              borderRadius: 999,
              background: "rgba(15,23,42,0.06)", // серая зона промаха (в стиле темы)
              border: "1px solid rgba(15,23,42,0.10)",
              overflow: "hidden",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.35)",
            }}
          >
            {/* green hit zone */}
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

            {/* runner */}
            <div
              style={{
                position: "absolute",
                left: `calc(${pos * 100}% - 9px)`,
                top: 3,
                width: 18,
                height: 18,
                borderRadius: 9,
                background: "linear-gradient(180deg, #ffffff, #dbe6ff)",
                border: "1px solid rgba(15,23,42,0.16)",
                boxShadow: "0 10px 22px rgba(15,23,42,0.14)",
              }}
            />
          </div>

          {/* Result notice */}
          {result ? (
            <div className="notice" style={{ marginTop: 12 }}>
              {result.hit ? `Попадание! +${fmtBigintString(result.coins)} Coins` : "Промах. Сложность сброшена."}
            </div>
          ) : (
            <div className="muted" style={{ marginTop: 10, fontWeight: 700, fontSize: 12, textAlign: "center" }}>
              Подсказка: лучше стрелять ближе к центру зелёной зоны.
            </div>
          )}

          {/* Primary actions */}
          <button
            className="btn btnPrimary bigAction"
            disabled={busy || !session}
            onClick={fire}
            style={{ marginTop: 14 }}
          >
            ОГОНЬ
          </button>

          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <button className="btn btnSoft" disabled={busy} onClick={startAttempt}>
              Новая попытка
            </button>

            <button className="btn btnSoft" disabled={busy} onClick={() => nav("/wallet")}>
              Кошелёк / Буст
            </button>

            <button
              className="btn btnPrimary"
              disabled={busy || !boostReady}
              onClick={() =>
                setOverlay({
                  title: "Оплата TON (тест)",
                  text: "Покупки за TON делаются через TonConnect. Пока стоит заглушка: можно симулировать успешную оплату и получить 100 энергии.",
                })
              }
              style={{ width: "100%" }}
            >
              Купить буст • 🔷 1 TON
            </button>

            {!boostReady ? (
              <div className="muted" style={{ fontSize: 12, fontWeight: 700, textAlign: "center" }}>
                Буст на кулдауне. Попробуй позже.
              </div>
            ) : null}

            {user.isAdmin ? (
              <button
                className="btn btnGreen"
                disabled={busy}
                onClick={adminFillEnergy}
                style={{ width: "100%" }}
              >
                (ADMIN) Пополнить энергию до 100
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
            overlay.title === "Оплата TON (тест)"
              ? {
                  label: "Симулировать успех",
                  onClick: () => {
                    setOverlay(null);
                    void buyBoost();
                  },
                }
              : overlay.title === "Нет энергии"
                ? {
                    label: "Купить буст",
                    onClick: () => {
                      setOverlay(null);
                      void buyBoost();
                    },
                  }
                : undefined
          }
          secondaryAction={
            overlay.title === "Оплата TON (тест)"
              ? {
                  label: "Симулировать ошибку",
                  onClick: () => {
                    setOverlay(null);
                    setOverlay({ title: "Оплата отменена", text: "Симуляция: платеж не прошёл." });
                  },
                }
              : undefined
          }
        />
      ) : null}
    </div>
  );
}
