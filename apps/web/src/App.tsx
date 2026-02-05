import React, { useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { useSession } from "./store/useSession";
import { TopCard } from "./components/TopCard";
import { EnergyBar } from "./components/EnergyBar";
import { BottomNav } from "./components/BottomNav";
import Home from "./screens/Home";
import Shoot from "./screens/Shoot";
import Upgrades from "./screens/Upgrades";
import Tasks from "./screens/Tasks";
import Profile from "./screens/Profile";
import Wallet from "./screens/Wallet";
import Admin from "./screens/Admin";
import "./styles/components.css";

export default function App() {
  const { token, user, login, refresh, error } = useSession();
  const [booting, setBooting] = useState(true);
  const loc = useLocation();

  useEffect(() => {
    void (async () => {
      try {
        if (!token) await login();
        else await refresh();
      } catch {
        // handled by store error
      } finally {
        setBooting(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (booting) {
    return <div className="safe"><div className="card" style={{ padding: 14, fontWeight: 800 }}>Загрузка…</div></div>;
  }

  if (!token) {
    return (
      <div className="safe col">
        <div className="card" style={{ padding: 14 }}>
          <div className="h2">Вход</div>
          <div className="muted" style={{ marginTop: 6, fontWeight: 600 }}>
            Не удалось авторизоваться: {error ?? "unknown"}
          </div>
          <button className="btn btnPrimary" style={{ width: "100%", marginTop: 12 }} onClick={() => login()}>
            Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="safe col" style={{ paddingBottom: 12 }}>
        {user ? (
          <>
            <TopCard user={user} />
            <EnergyBar user={user} />
            {user.isBotBlocked ? (
              <div className="notice">
                Подозрение на бота. Некоторые действия могут быть заблокированы.
              </div>
            ) : null}
          </>
        ) : (
          <div className="card" style={{ padding: 14, fontWeight: 800 }}>Загрузка профиля…</div>
        )}
      </div>

      {/* Screen content */}
      <Routes location={loc}>
        <Route path="/" element={<Home />} />
        <Route path="/shoot" element={<Shoot />} />
        <Route path="/upgrades" element={<Upgrades />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>

      <BottomNav />
    </div>
  );
}
