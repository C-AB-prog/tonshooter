import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../store/useSession";
import { apiFetch } from "../lib/api";
import { Overlay } from "../components/Overlay";

export default function Profile() {
  const nav = useNavigate();
  const { user, token, logout } = useSession();
  const [ref, setRef] = useState<{ payload: string; referralCount: number } | null>(null);
  const [overlay, setOverlay] = useState<{ title: string; text: string } | null>(null);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      const r = await apiFetch<{ payload: string; referralCount: number }>("/profile/referral", { token });
      setRef(r);
    })();
  }, [token]);

  if (!user || !token) return null;

  const botUsername = import.meta.env.VITE_BOT_USERNAME as string;
  const referralLink = ref ? `https://t.me/${botUsername}?startapp=${ref.payload}` : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(referralLink);
      setOverlay({ title: "Скопировано", text: "Реферальная ссылка в буфере обмена." });
    } catch {
      setOverlay({ title: "Не удалось", text: referralLink });
    }
  }

  return (
    <div className="safe col">
      <div className="card" style={{ padding: 14 }}>
        <div className="h2">Профиль</div>
        <div className="muted" style={{ marginTop: 6, fontWeight: 600 }}>
          Рефералы дают награду монетами. Вывод TON открывается после 1 активного реферала.
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontWeight: 900 }}>Реферальная система</div>
        <div className="muted" style={{ marginTop: 6, fontWeight: 600 }}>
          Приглашённых: {ref?.referralCount ?? "—"}
        </div>

        <div className="muted" style={{ marginTop: 6, fontWeight: 700 }}>
          Активных (с наградой): <b>{user.activeReferralCount}</b> • Вывод TON: <b>{user.canWithdrawTon ? "открыт" : "закрыт"}</b>
        </div>

        <div className="muted" style={{ marginTop: 6, fontWeight: 600 }}>
          Условия активности: 50 выстрелов и 20 попаданий за 24 часа у приглашённого.
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
          <input
            value={referralLink}
            readOnly
            style={{ flex: 1, padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }}
          />
          <button className="btn btnGreen" onClick={copy}>Копировать</button>
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontWeight: 900 }}>Кошелёк</div>
        <div className="muted" style={{ marginTop: 6, fontWeight: 600 }}>
          Обмен Coins/Crystals/TON и вывод.
        </div>
        <button className="btn btnPrimary" style={{ width: "100%", marginTop: 10 }} onClick={() => nav("/wallet")}>
          Открыть
        </button>
      </div>

      {user.isAdmin ? (
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontWeight: 900 }}>Админка</div>
          <div className="muted" style={{ marginTop: 6, fontWeight: 600 }}>
            Быстро выдавать ресурсы, ставить уровни и сбрасывать лимиты для тестов.
          </div>
          <button className="btn btnGreen" style={{ width: "100%", marginTop: 10 }} onClick={() => nav("/admin")}>
            Открыть
          </button>
        </div>
      ) : null}

      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontWeight: 900 }}>Аккаунт</div>
        <div className="muted" style={{ marginTop: 6, fontWeight: 600 }}>
          Если тестируешь локально — можно выйти и войти снова.
        </div>
        <button className="btn" style={{ width: "100%", marginTop: 10, background: "rgba(0,0,0,0.06)" }} onClick={logout}>
          Выйти
        </button>
      </div>

      {overlay ? <Overlay title={overlay.title} text={overlay.text} onClose={() => setOverlay(null)} /> : null}
    </div>
  );
}
