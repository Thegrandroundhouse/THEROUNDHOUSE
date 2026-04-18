"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

type ConfirmOptions = {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
};

type AlertOptions = { title?: string };

type DialogState =
  | { type: "confirm"; message: string; options: ConfirmOptions; resolve: (v: boolean) => void }
  | { type: "alert"; message: string; options: AlertOptions; resolve: () => void }
  | null;

const Ctx = createContext<{
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
  alert: (message: string, options?: AlertOptions) => Promise<void>;
} | null>(null);

export function useAdminDialog() {
  const x = useContext(Ctx);
  if (!x) throw new Error("useAdminDialog must be used inside AdminDialogProvider");
  return x;
}

export function AdminDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState>(null);

  const confirm = useCallback((message: string, options: ConfirmOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      setState({ type: "confirm", message, options, resolve });
    });
  }, []);

  const alert = useCallback((message: string, options: AlertOptions = {}) => {
    return new Promise<void>((resolve) => {
      setState({ type: "alert", message, options, resolve });
    });
  }, []);

  const close = () => setState(null);

  const onConfirmYes = () => {
    if (state?.type === "confirm") {
      state.resolve(true);
      close();
    }
  };
  const onConfirmNo = () => {
    if (state?.type === "confirm") {
      state.resolve(false);
      close();
    }
  };
  const onAlertOk = () => {
    if (state?.type === "alert") {
      state.resolve();
      close();
    }
  };

  return (
    <Ctx.Provider value={{ confirm, alert }}>
      {children}
      {state ? (
        <div
          className="admin-dialog-backdrop"
          role="presentation"
          onClick={() => (state.type === "alert" ? onAlertOk() : onConfirmNo())}
        >
          <div
            className="admin-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="admin-dialog-title" className="admin-dialog-title">
              {state.type === "confirm"
                ? state.options.title ?? "Confirm"
                : state.options.title ?? "Notice"}
            </h2>
            <p className="admin-dialog-body">{state.message}</p>
            <div className="admin-dialog-actions">
              {state.type === "confirm" ? (
                <>
                  <button type="button" className="admin-btn admin-btn-ghost" onClick={onConfirmNo}>
                    {state.options.cancelLabel ?? "Cancel"}
                  </button>
                  <button
                    type="button"
                    className={state.options.variant === "danger" ? "admin-btn admin-btn-danger" : "admin-btn admin-btn-primary"}
                    onClick={onConfirmYes}
                  >
                    {state.options.confirmLabel ?? "OK"}
                  </button>
                </>
              ) : (
                <button type="button" className="admin-btn admin-btn-primary" onClick={onAlertOk}>
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </Ctx.Provider>
  );
}
