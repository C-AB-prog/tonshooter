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

  const inputStyle: React.CSSProperties = {
    minHeight: 44,
    padding: "0 12px",
    borderRadius: 14,
    border: "1px solid rgba(15,23,42,0.12)",
    background: "rgba(255,255,255,0.92)",
    fontWeight: 800,
    outline: "none",
  };

  const withdrawBadgeStyle: React.CSSProperties = user.canWithdrawTon
    ? {
        background: "rgba(31, 184, 106, 0.12)",
        borderColor: "rgba(31, 184, 106, 0.22)",
        color: "rgba(10, 110, 60, 0.95)",
      }
    : {
        background: "rgba(255, 77, 79, 0.12)",
        borderColor: "rgba(255, 77, 79, 0.22)",
        color: "rgba(180, 25, 30, 0.95)",
      };

  return (
    <div className="safe col">
      {/* Header */}
      <div className="card topCard">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="avatar">P</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: "-0.1px" }}>Профиль</div>
            <div className="muted" style={{ marginTop: 3, fontWeight: 700, fontSize: 12 }}>
              Рефералы дают награду монетами. Вывод TON открывается после 1 активного реферала.
            </div>
          </div>
        </div>

        <span className="pill" style={withdrawBadgeStyle}>
          {user.canWithdrawTon ? "✅ вывод открыт" : "🔒 вывод закрыт"}
        </span>
      </div>

      {/* Referral */}
      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: "-0.1px" }}>Реферальная система</div>
            <div className="muted" style={{ marginTop: 6, fontWeight: 700, fontSize: 13 }}>
              Приглашённых: <b>{ref?.referralCount ?? "—"}</b>
            </div>
          </div>

          <span className="pill">
            Активных: <b>{user.activeReferralCount}</b>
          </span>
        </div>

        <div className="notice" style={{ marginTop: 12 }}>
          Условия активности: у приглашённого за 24 часа — <b>50 выстрелов</b> и <b>20 попаданий</b>.
        </div>

        <div className="muted" style={{ marginTop: 10, fontWeight: 700, fontSize: 13 }}>
          Ваша ссылка:
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "stretch" }}>
          <input value={referralLink} readOnly style={{ ...inputStyle, flex: 1 }} />
          <button className="btn btnGreen" onClick={copy} disabled={!referralLink}>
            Копировать
          </button>
        </div>

        <div className="muted" style={{ marginTop: 10, fontWeight: 700, fontSize: 12 }}>
          Поделись ссылкой с другом — после выполнения условий вывод TON станет доступен.
        </div>
      </div>

      {/* Wallet shortcut */}
      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: "-0.1px" }}>Кошелёк</div>
            <div className="muted" style={{ marginTop: 6, fontWeight: 700, fontSize: 13 }}>
              Обмен Coins/Crystals/TON и вывод.
            </div>
          </div>
          <span className="pill">🔷</span>
        </div>
        <button className="btn btnPrimary" style={{ width: "100%", marginTop: 12 }} onClick={() => nav("/wallet")}>
          Открыть
        </button>
      </div>

      {/* Admin shortcut */}
      {user.isAdmin ? (
        <div className="card" style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: "-0.1px" }}>Админка</div>
              <div className="muted" style={{ marginTop: 6, fontWeight: 700, fontSize: 13 }}>
                Выдача ресурсов, уровни, сброс лимитов.
              </div>
            </div>
            <span className="pill">🛠</span>
          </div>
          <button className="btn btnGreen" style={{ width: "100%", marginTop: 12 }} onClick={() => nav("/admin")}>
            Открыть
          </button>
        </div>
      ) : null}

      {/* Account */}
      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: "-0.1px" }}>Аккаунт</div>
        <div className="muted" style={{ marginTop: 6, fontWeight: 700, fontSize: 13 }}>
          Если тестируешь локально — можно выйти и войти снова.
        </div>
        <button
          className="btn btnSoft"
          style={{ width: "100%", marginTop: 12 }}
          onClick={logout}
        >
          Выйти
        </button>
      </div>

      {overlay ? <Overlay title={overlay.title} text={overlay.text} onClose={() => setOverlay(null)} /> : null}
    </div>
  );
}
