import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { Overlay } from "../components/Overlay";
import { useSession } from "../store/useSession";

function parseIntOrNull(v: string): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

export default function Admin() {
  const nav = useNavigate();
  const { user, token, refresh } = useSession();
  const [overlay, setOverlay] = useState<{ title: string; text: string } | null>(null);

  const [targetTgUserId, setTargetTgUserId] = useState("");

  const [coins, setCoins] = useState("100000");
  const [crystals, setCrystals] = useState("100");
  const [tonBalance, setTonBalance] = useState("1");

  const [weaponLevel, setWeaponLevel] = useState("5");
  const [rangeLevel, setRangeLevel] = useState("5");

  type AdminTask = {
    id: string;
    title: string;
    description: string;
    chatId: string;
    url: string;
    cap: number;
    completedCount: number;
    requireSubscriptionCheck: boolean;
    rewardType: "COINS" | "CRYSTALS";
    rewardValue: number;
    isActive: boolean;
    createdAt: string;
  };

  const [adminTasks, setAdminTasks] = useState<AdminTask[]>([]);
  const [taskTitle, setTaskTitle] = useState("Реклама");
  const [taskDescription, setTaskDescription] = useState("Подпишись и получи награду");
  const [taskChatId, setTaskChatId] = useState("@channel");
  const [taskUrl, setTaskUrl] = useState("https://t.me/channel");
  const [taskRewardType, setTaskRewardType] = useState<"COINS" | "CRYSTALS">("COINS");
  const [taskRewardValue, setTaskRewardValue] = useState("100000");
  const [taskCap, setTaskCap] = useState("10");
  const [taskRequireSub, setTaskRequireSub] = useState(true);

  async function loadAdminTasks() {
    if (!token) return;
    try {
      const res = await apiFetch<{ tasks: AdminTask[] }>("/admin/tasks", { token });
      setAdminTasks(res.tasks);
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    if (!token) return;
    void loadAdminTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const targetLabel = useMemo(() => {
    if (!targetTgUserId.trim()) return "себе";
    return `tgUserId=${targetTgUserId.trim()}`;
  }, [targetTgUserId]);

  if (!user || !token) return null;
  if (!user.isAdmin) {
    return (
      <div className="safe col">
        <div className="card" style={{ padding: 14 }}>
          <div className="h2">Админка</div>
          <div className="muted" style={{ marginTop: 6, fontWeight: 600 }}>
            Доступ запрещён.
          </div>
          <button className="btn btnPrimary" style={{ width: "100%", marginTop: 12 }} onClick={() => nav("/profile")}>
            Назад
          </button>
        </div>
      </div>
    );
  }

  async function grant(patch: any, okText: string) {
    try {
      await apiFetch("/admin/grant", {
        token,
        body: {
          ...(targetTgUserId.trim() ? { targetTgUserId: targetTgUserId.trim() } : {}),
          ...patch,
        },
      });
      await refresh();
      setOverlay({ title: "Готово", text: okText });
    } catch (e: any) {
      setOverlay({ title: "Ошибка", text: e?.code ?? "admin_failed" });
    }
  }

  async function doMockPurchase(purchase: "boost" | "upgrade_weapon_5" | "upgrade_range_5") {
    try {
      await apiFetch("/ton/purchase/mock", { token, body: { purchase } });
      await refresh();
      setOverlay({ title: "Успех", text: `Покупка (mock): ${purchase}` });
    } catch (e: any) {
      const code = e?.code;
      if (code === "mock_disabled") setOverlay({ title: "Отключено", text: "Mock TON отключён на сервере." });
      else if (code === "boost_cooldown") setOverlay({ title: "Кулдаун", text: "Буст ещё не доступен." });
      else if (code === "upgrade_blocked") setOverlay({ title: "Улучшение недоступно", text: e.payload?.reason ?? "blocked" });
      else if (code === "invalid_level") setOverlay({ title: "Неверный уровень", text: e?.message ?? "invalid" });
      else setOverlay({ title: "Ошибка", text: code ?? "mock_purchase_failed" });
    }
  }

  async function createTask() {
    if (!token) return;
    const cap = parseIntOrNull(taskCap);
    const rewardValue = parseIntOrNull(taskRewardValue);
    if (!cap || cap < 1) return setOverlay({ title: "Ошибка", text: "Лимит (cap) должен быть числом >= 1" });
    if (!rewardValue || rewardValue < 1) return setOverlay({ title: "Ошибка", text: "Награда должна быть числом >= 1" });
    if (!taskUrl.trim() || !taskChatId.trim()) return setOverlay({ title: "Ошибка", text: "Нужны chatId и ссылка" });

    try {
      await apiFetch("/admin/tasks/create", {
        token,
        body: {
          title: taskTitle.trim(),
          description: taskDescription.trim(),
          chatId: taskChatId.trim(),
          url: taskUrl.trim(),
          rewardType: taskRewardType,
          rewardValue,
          cap,
          requireSubscriptionCheck: taskRequireSub,
        },
      });
      await loadAdminTasks();
      setOverlay({ title: "Готово", text: "Задание создано" });
    } catch (e: any) {
      setOverlay({ title: "Ошибка", text: e?.code ?? "task_create_failed" });
    }
  }

  async function setTaskActive(taskId: string, isActive: boolean) {
    if (!token) return;
    try {
      await apiFetch("/admin/tasks/deactivate", { token, body: { taskId, isActive } });
      await loadAdminTasks();
    } catch (e: any) {
      setOverlay({ title: "Ошибка", text: e?.code ?? "task_toggle_failed" });
    }
  }

  return (
    <div className="safe col">
      <div className="card" style={{ padding: 14 }}>
        <div className="h2">Админка</div>
        <div className="muted" style={{ marginTop: 6, fontWeight: 600 }}>
          Быстрые действия для тестирования. Цель: {targetLabel}
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontWeight: 900 }}>Цель</div>
        <div className="muted" style={{ marginTop: 6, fontWeight: 600 }}>
          Оставь пустым — применится к тебе. Чтобы выдать другому игроку — вставь его <b>tgUserId</b>.
        </div>
        <input
          value={targetTgUserId}
          onChange={(e) => setTargetTgUserId(e.target.value)}
          placeholder="target tgUserId (не обязательно)"
          style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", marginTop: 10 }}
        />
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontWeight: 900 }}>Выдать ресурсы</div>

        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 120px", gap: 10 }}>
          <input
            value={coins}
            onChange={(e) => setCoins(e.target.value)}
            placeholder="coins (например 1000000)"
            style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }}
          />
          <button className="btn btnGreen" onClick={() => grant({ coins: coins }, `+${coins} coins (${targetLabel})`)}>
            +Coins
          </button>

          <input
            value={crystals}
            onChange={(e) => setCrystals(e.target.value)}
            placeholder="crystals (например 100)"
            style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }}
          />
          <button className="btn btnGreen" onClick={() => grant({ crystals: crystals }, `+${crystals} crystals (${targetLabel})`)}>
            +Crystals
          </button>

          <input
            value={tonBalance}
            onChange={(e) => setTonBalance(e.target.value)}
            placeholder="tonBalance (внутр. баланс)"
            style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }}
          />
          <button className="btn btnGreen" onClick={() => grant({ tonBalance: tonBalance }, `+${tonBalance} TON (internal) (${targetLabel})`)}>
            +TON
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button className="btn" style={{ background: "rgba(0,0,0,0.06)" }} onClick={() => grant({ coins: 100000 }, "+100 000 coins")}>+100k</button>
          <button className="btn" style={{ background: "rgba(0,0,0,0.06)" }} onClick={() => grant({ coins: 1000000 }, "+1 000 000 coins")}>+1M</button>
          <button className="btn" style={{ background: "rgba(0,0,0,0.06)" }} onClick={() => grant({ crystals: 100 }, "+100 crystals")}>+100💎</button>
          <button className="btn" style={{ background: "rgba(0,0,0,0.06)" }} onClick={() => grant({ crystals: 1000 }, "+1000 crystals")}>+1000💎</button>
          <button className="btn" style={{ background: "rgba(0,0,0,0.06)" }} onClick={() => grant({ tonBalance: 1 }, "+1 TON (internal)")}>+1🔷</button>
          <button className="btn" style={{ background: "rgba(0,0,0,0.06)" }} onClick={() => grant({ tonBalance: 5 }, "+5 TON (internal)")}>+5🔷</button>
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontWeight: 900 }}>Уровни</div>
        <div className="muted" style={{ marginTop: 6, fontWeight: 600 }}>
          Поставить уровень оружия/полигона сразу.
        </div>

        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input
            value={weaponLevel}
            onChange={(e) => setWeaponLevel(e.target.value)}
            placeholder="weapon level (1..10)"
            style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }}
          />
          <input
            value={rangeLevel}
            onChange={(e) => setRangeLevel(e.target.value)}
            placeholder="range level (1..10)"
            style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }}
          />
        </div>

        <button
          className="btn btnPrimary"
          style={{ width: "100%", marginTop: 12 }}
          onClick={() =>
            grant(
              {
                ...(parseIntOrNull(weaponLevel) !== null ? { weaponLevel: parseIntOrNull(weaponLevel) } : {}),
                ...(parseIntOrNull(rangeLevel) !== null ? { rangeLevel: parseIntOrNull(rangeLevel) } : {}),
              },
              `Уровни применены (${targetLabel})`
            )
          }
        >
          Применить уровни
        </button>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontWeight: 900 }}>Быстрые действия</div>
        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
          <button className="btn btnGreen" onClick={() => grant({ energy: 100 }, "Энергия = 100")}>Энергия 100</button>
          <button className="btn" style={{ background: "rgba(0,0,0,0.06)" }} onClick={() => grant({ resetBoost: true }, "Сброшен буст")}>Сброс буста</button>
          <button className="btn" style={{ background: "rgba(0,0,0,0.06)" }} onClick={() => grant({ resetWithdrawal: true }, "Сброшен вывод")}>Сброс вывода</button>
          <button className="btn" style={{ background: "rgba(0,0,0,0.06)" }} onClick={() => grant({ resetAntibot: true }, "Сброшен антибот")}>Сброс антибота</button>
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontWeight: 900 }}>Mock TON покупки (для тестов)</div>
        <div className="muted" style={{ marginTop: 6, fontWeight: 600 }}>
          Это симуляция оплаты. В боевом режиме будет TonConnect.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginTop: 10 }}>
          <button className="btn btnPrimary" onClick={() => doMockPurchase("boost")}>Оплатить буст (mock)</button>
          <button className="btn" style={{ background: "rgba(0,0,0,0.06)" }} onClick={() => doMockPurchase("upgrade_weapon_5")}>Оплатить upgrade weapon 4→5 (mock)</button>
          <button className="btn" style={{ background: "rgba(0,0,0,0.06)" }} onClick={() => doMockPurchase("upgrade_range_5")}>Оплатить upgrade range 4→5 (mock)</button>
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontWeight: 900 }}>Задания / реклама</div>
        <div className="muted" style={{ marginTop: 6, fontWeight: 600 }}>
          Создавай рекламные задания с лимитом выполнений. В режиме «проверка подписки» бот должен иметь доступ к каналу.
        </div>

        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
          <input
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="Заголовок"
            style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }}
          />
          <input
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            placeholder="Описание"
            style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }}
          />
          <input
            value={taskChatId}
            onChange={(e) => setTaskChatId(e.target.value)}
            placeholder="chatId (например @channel)"
            style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }}
          />
          <input
            value={taskUrl}
            onChange={(e) => setTaskUrl(e.target.value)}
            placeholder="Ссылка (https://t.me/...)"
            style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <select
              value={taskRewardType}
              onChange={(e) => setTaskRewardType(e.target.value as any)}
              style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }}
            >
              <option value="COINS">Награда: coins</option>
              <option value="CRYSTALS">Награда: crystals</option>
            </select>
            <input
              value={taskRewardValue}
              onChange={(e) => setTaskRewardValue(e.target.value)}
              placeholder="Сколько"
              style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "center" }}>
            <input
              value={taskCap}
              onChange={(e) => setTaskCap(e.target.value)}
              placeholder="Лимит выполнений (например 10)"
              style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }}
            />
            <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 800 }}>
              <input type="checkbox" checked={taskRequireSub} onChange={(e) => setTaskRequireSub(e.target.checked)} />
              Проверка подписки
            </label>
          </div>

          <button className="btn btnPrimary" onClick={createTask}>
            Создать задание
          </button>
          <button className="btn" style={{ background: "rgba(0,0,0,0.06)" }} onClick={loadAdminTasks}>
            Обновить список
          </button>
        </div>

        {adminTasks.length ? (
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            {adminTasks.map((t) => {
              const remaining = t.cap > 0 ? Math.max(0, t.cap - t.completedCount) : null;
              return (
                <div key={t.id} className="card" style={{ padding: 12, background: "rgba(0,0,0,0.03)" }}>
                  <div style={{ fontWeight: 900 }}>{t.title}</div>
                  <div className="muted" style={{ marginTop: 6, fontWeight: 600 }}>{t.description}</div>
                  <div className="muted" style={{ marginTop: 6, fontWeight: 700 }}>
                    {t.isActive ? "🟢 активна" : "🔴 выключена"} · cap={t.cap} · выполнено={t.completedCount}
                    {remaining !== null ? ` · осталось=${remaining}` : ""}
                    {t.requireSubscriptionCheck ? " · проверка подписки" : " · клик"}
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                    {t.isActive ? (
                      <button className="btn" style={{ background: "rgba(0,0,0,0.06)" }} onClick={() => setTaskActive(t.id, false)}>
                        Выключить
                      </button>
                    ) : (
                      <button className="btn btnGreen" onClick={() => setTaskActive(t.id, true)}>
                        Включить
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="muted" style={{ marginTop: 10, fontWeight: 600 }}>
            Заданий пока нет.
          </div>
        )}
      </div>

      <button className="btn" style={{ width: "100%", marginTop: 10, background: "rgba(0,0,0,0.06)" }} onClick={() => nav("/profile")}>
        Назад в профиль
      </button>

      {overlay ? <Overlay title={overlay.title} text={overlay.text} onClose={() => setOverlay(null)} /> : null}
    </div>
  );
}
