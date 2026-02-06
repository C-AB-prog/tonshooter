import React, { useEffect, useState } from "react";
import { useSession } from "../store/useSession";
import { apiFetch } from "../lib/api";
import { Overlay } from "../components/Overlay";

type Task = {
  id: string;
  title: string;
  description: string;
  chatId: string;
  url: string;
  cap: number;
  completedCount: number;
  requireSubscriptionCheck: boolean;
  opened: boolean;
  rewardType: "COINS" | "CRYSTALS";
  rewardValue: number;
  claimed: boolean;
};

function fmtCoins(n: number) {
  return BigInt(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export default function Tasks() {
  const { token, refresh } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [overlay, setOverlay] = useState<{ title: string; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function load() {
    if (!token) return;
    const res = await apiFetch<{ tasks: Task[] }>("/tasks", { token });
    setTasks(res.tasks);
  }

  async function claim(taskId: string) {
    if (!token) return;
    try {
      setBusyId(taskId);
      await apiFetch("/tasks/claim", { token, body: { taskId } });
      await refresh();
      await load();
      setBusyId(null);
    } catch (e: any) {
      setBusyId(null);
      if (e?.code === "not_subscribed")
        setOverlay({ title: "Не подписан", text: "Сначала подпишись на канал, затем нажми «Получить»." });
      else if (e?.code === "need_open_first")
        setOverlay({ title: "Сначала перейди", text: "Нужно нажать «Перейти» и только потом можно получить награду." });
      else if (e?.code === "already_claimed")
        setOverlay({ title: "Уже получено", text: "Награда за это задание уже получена." });
      else if (e?.code === "task_limit_reached")
        setOverlay({ title: "Лимит выполнен", text: "Лимит по этой рекламе уже набран. Попробуй другое задание." });
      else if (e?.code === "bot_suspected")
        setOverlay({ title: "Подозрение на бота", text: "Слишком быстрые действия. Попробуй позже." });
      else setOverlay({ title: "Ошибка сервера", text: "Не удалось получить награду." });
    }
  }

  async function openTask(t: Task) {
    if (!token) return;
    try {
      setBusyId(t.id);
      await apiFetch("/tasks/open", { token, body: { taskId: t.id } });
      // Optimistic UI update
      setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, opened: true } : x)));
      setBusyId(null);

      // Open link
      const url = t.url || `https://t.me/${t.chatId.replace("@", "")}`;
      // Telegram Mini App friendly open
      const tg = (window as any)?.Telegram?.WebApp;
      if (tg?.openTelegramLink && url.startsWith("https://t.me/")) tg.openTelegramLink(url);
      else window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setBusyId(null);
      setOverlay({ title: "Ошибка", text: "Не удалось открыть задание." });
    }
  }

  return (
    <div className="safe col">
      {/* Header */}
      <div className="card" style={{ padding: 14 }}>
        <div className="h2">Задания</div>
        <div className="muted" style={{ marginTop: 6, fontWeight: 700, fontSize: 13 }}>
          Подписывайся на каналы партнёров и получай награды.
        </div>
      </div>

      {/* Empty state (only UI, no logic change) */}
      {tasks.length === 0 ? (
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Пока нет заданий</div>
          <div className="muted" style={{ marginTop: 6, fontWeight: 700 }}>
            Загляни позже — задания обновляются.
          </div>
        </div>
      ) : null}

      {/* Tasks */}
      {tasks.map((t) => {
        const busy = busyId === t.id;

        return (
          <div key={t.id} className="card" style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: "-0.1px" }}>{t.title}</div>
                <div className="muted" style={{ marginTop: 6, fontWeight: 700 }}>
                  {t.description}
                </div>
              </div>

              <span className="pill" title="Награда за задание">
                {t.rewardType === "COINS" ? `🪙 ${fmtCoins(t.rewardValue)}` : `💎 ${t.rewardValue}`}
              </span>
            </div>

            {/* Hint */}
            {!t.opened && !t.claimed ? (
              <div className="notice" style={{ marginTop: 12 }}>
                Сначала нажми «Перейти», затем вернись и нажми «Получить».
              </div>
            ) : null}

            {/* Subscription info */}
            <div className="muted" style={{ marginTop: 10, fontWeight: 700, fontSize: 13 }}>
              {t.requireSubscriptionCheck ? "🔒 В этом задании проверяется подписка." : "✅ Это задание засчитывается по клику."}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, gap: 10 }}>
              <div className="pill" title="Прогресс по лимиту (инфо)">
                {t.completedCount}/{t.cap}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btnSoft" disabled={busy} onClick={() => openTask(t)}>
                  Перейти
                </button>

                {t.claimed ? (
                  <button className="btn btnGreen" disabled>
                    Получено
                  </button>
                ) : (
                  <button className="btn btnGreen" disabled={!t.opened || busy} onClick={() => claim(t.id)}>
                    Получить
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {overlay ? <Overlay title={overlay.title} text={overlay.text} onClose={() => setOverlay(null)} /> : null}
    </div>
  );
}
