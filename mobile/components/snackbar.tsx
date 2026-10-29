import { createContext, useCallback, useContext, useRef, type PropsWithChildren } from "react";
import { useToast } from "heroui-native/toast";
const Context = createContext<(message: string) => void>(() => undefined);
const TOAST_ID = "app-notice";

/** A single, replacement-style notice prevents repeated renders from stacking toasts. */
export function SnackbarProvider({ children }: PropsWithChildren) {
  const { toast } = useToast();
  const lastNotice = useRef({ text: "", at: 0 });
  const value = useCallback((text: string) => {
    const label = text.trim();
    if (!label) return;
    const now = Date.now();
    if (lastNotice.current.text === label && now - lastNotice.current.at < 5_000) return;
    lastNotice.current = { text: label, at: now };
    toast.hide(TOAST_ID);
    toast.show({ id: TOAST_ID, label, duration: 3_500 });
  }, [toast]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useNotice = () => useContext(Context);
