import { createContext, useCallback, useContext, useState } from "react";
import "./Toast.css";

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const show = useCallback((text, type = "ok") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, text, type }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 2600);
  }, []);

  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className="toasts">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>{t.text}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}