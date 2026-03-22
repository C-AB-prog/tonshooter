import React, { useEffect } from "react";
import "../styles/components.css";

type OverlayAction = { label: string; onClick: () => void };

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
  action?: OverlayAction;
  secondaryAction?: OverlayAction;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="overlayCard">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: "-0.1px" }}>{title}</div>
            <div className="muted" style={{ marginTop: 8, fontWeight: 700, whiteSpace: "pre-wrap" }}>
              {text}
            </div>
          </div>

          <button className="btn btnSoft" onClick={onClose} style={{ width: 44, minWidth: 44, padding: 0, borderRadius: 14 }} aria-label="Закрыть">
            ✕
          </button>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          {action ? (
            <button className="btn btnPrimary" onClick={action.onClick} style={{ width: "100%" }}>
              {action.label}
            </button>
          ) : null}

          {secondaryAction ? (
            <button className="btn btnSoft" onClick={secondaryAction.onClick} style={{ width: "100%" }}>
              {secondaryAction.label}
            </button>
          ) : null}

          <button className="btn btnSoft" onClick={onClose} style={{ width: "100%" }}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
