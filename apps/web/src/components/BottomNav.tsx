import React from "react";
import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/", label: "Главная", icon: "🏠" },
  { to: "/shoot", label: "Стрельба", icon: "🎯" },
  { to: "/upgrades", label: "Улучшения", icon: "⬆️" },
  { to: "/tasks", label: "Задания", icon: "✅" },
  { to: "/profile", label: "Профиль", icon: "👤" },
];

export function BottomNav() {
  return (
    <nav className="bottomNav" aria-label="Навигация">
      <div className="bottomNavInner" role="navigation">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === "/"}
            aria-label={t.label}
            className={({ isActive }) => `navItem ${isActive ? "navItemActive" : ""}`}
          >
            <div className="navIcon" aria-hidden>
              {t.icon}
            </div>
            <div>{t.label}</div>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
