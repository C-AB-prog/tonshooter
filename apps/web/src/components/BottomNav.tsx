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
    <div className="bottomNav">
      <div className="bottomNavInner">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) => `navItem ${isActive ? "navItemActive" : ""}`}
          >
            <div className="navIcon">{t.icon}</div>
            <div>{t.label}</div>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
