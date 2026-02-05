import React from "react";
import "../styles/components.css";

export function Overlay({
  title,
  text,
  onClose,
  action,
  secondaryAction,
}: {
  title: string;
  text: string;
  onClose: () => void;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
}) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="overlayCard" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>{title}</div>
        <div style={{ marginTop: 10, color: "#55647a", fontWeight: 600 }}>{text}</div>
        <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn" onClick={onClose}>Закрыть</button>
          {secondaryAction ? (
            <button className="btn" style={{ background: "rgba(0,0,0,0.06)" }} onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </button>
          ) : null}
          {action ? (
            <button className="btn btnPrimary" onClick={action.onClick}>
              {action.label}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
