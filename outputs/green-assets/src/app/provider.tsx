import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { Snapshot, User } from "../domain/types";
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
      clear: () => void;
    })
  | null
>(null);
export function useApp() {
  return useContext(Context)!;
}
export function Provider({ children,user }: { children: ReactNode; user:User }) {
  const [v, set] = useReducer(
    (s: State, p: Partial<State>) => ({ ...s, ...p }),
    { s: null, identity: user.id, busy: false, message: "", error: "" },
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
    } catch {
      set({error:"Unable to update this workspace. Check browser storage permissions and retry."});
      return false;
    } finally {
      lock.current = false;
      set({ busy: false });
    }
  };
  useEffect(() => {
    void run(() => repo.registerUser(user), undefined, true);
    const update = () => void run(() => repo.createDueJobs(localDate()));
    const timer = window.setInterval(update,60000);
    const sync = async (event:StorageEvent) => {
      if (event.key !== "green-assets:demo:v1") return;
      const result = await repo.getSnapshot();
      if (result.ok) set({s:result.data});
    };
    window.addEventListener("storage",sync);
    return () => {clearInterval(timer); window.removeEventListener("storage",sync);};
  }, []);
  return (
    <Context.Provider
      value={{
        ...v,
        run,
        clear: () => set({ error: "", message: "" }),
      }}
    >
      {children}
    </Context.Provider>
  );
}
