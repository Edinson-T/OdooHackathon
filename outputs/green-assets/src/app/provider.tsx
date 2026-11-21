import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { Snapshot } from "../domain/types";
import type { Result } from "../services/repository";
import { repository as repo } from "../services/localRepository";
import { localDate } from "../lib/clock";
type State = {
  s: Snapshot | null;
  identity: string;
  busy: boolean;
  message: string;
  error: string;
};
type Run = <T>(
  fn: () => Promise<Result<T>>,
  success?: (data: T) => string,
  schedule?: boolean,
) => Promise<boolean>;
const Context = createContext<
  | (State & {
      run: Run;
      switchUser: (id: string) => void;
      reset: () => void;
      clear: () => void;
    })
  | null
>(null);
export function useApp() {
  return useContext(Context)!;
}
export function Provider({ children }: { children: ReactNode }) {
  const [v, set] = useReducer(
    (s: State, p: Partial<State>) => ({ ...s, ...p }),
    { s: null, identity: "user-a", busy: false, message: "", error: "" },
  );
  const lock = useRef(false);
  const run: Run = async (fn, success, schedule = false) => {
    if (lock.current) return false;
    lock.current = true;
    set({ busy: true, error: "", message: "" });
    try {
      const r = await fn();
      if (!r.ok) {
        set({ error: r.error.message });
        return false;
      }
      if (schedule) {
        const d = await repo.createDueJobs(localDate());
        if (!d.ok) set({ error: d.error.message });
      }
      const loaded = await repo.getSnapshot();
      if (!loaded.ok) {
        set({ error: loaded.error.message });
        return false;
      }
      set({ s: loaded.data, message: success?.(r.data) || "" });
      return true;
    } finally {
      lock.current = false;
      set({ busy: false });
    }
  };
  useEffect(() => {
    void run(() => repo.createDueJobs(localDate()));
  }, []);
  async function reset() {
    if (
      confirm(
        "Reset this demo? Your changes will be replaced with the original example records.",
      )
    ) {
      if (await run(repo.resetDemo, () => "Demo restored.", true)) {
        set({ identity: "user-a" });
        location.hash = "/";
      }
    }
  }
  return (
    <Context.Provider
      value={{
        ...v,
        run,
        switchUser: (id) => set({ identity: id, error: "", message: "" }),
        reset,
        clear: () => set({ error: "", message: "" }),
      }}
    >
      {children}
    </Context.Provider>
  );
}
