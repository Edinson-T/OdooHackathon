import { Auth } from "./app/Auth";
import { createRoot } from "react-dom/client";
import { useEffect, useRef, useState } from "react";
import { Menu, X, CheckCircle2, AlertCircle, LogOut, Repeat, Home, Map as MapIcon, ClipboardList, History, Settings2, ChevronDown, Plus } from "lucide-react";
import { Provider, useApp } from "./app/provider";
import { Dashboard } from "./features/dashboard/Dashboard";
import { Registry } from "./features/assets/Registry";
import { Admin, Details, Report } from "./features/assets/Forms";
import { Jobs, Inspect } from "./features/jobs/Jobs";
import { Empty, Wordmark } from "./components/ui";
import { SiteFooter } from "./app/SiteFooter";
import "@fontsource/source-sans-3/400.css";
import "@fontsource/source-sans-3/600.css";
import "@fontsource/source-sans-3/700.css";
import "@fontsource/lora/500.css";
import "@fontsource/lora/600.css";
import "@fontsource/lora/500-italic.css";
import "@fontsource/caveat/500.css";
import "./style.css";

function Shell({ logout, change }: { logout: () => void; change: () => void }) {
  const { s, identity, clear, message, error, busy } = useApp();
  const [path, P] = useState(location.hash.slice(1) || "/"),
    [mobile, M] = useState(false),
    [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const route = () => {
      P(location.hash.slice(1) || "/");
      M(false);
      setMenu(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", route);
    return () => window.removeEventListener("hashchange", route);
  }, []);
  // Close the account menu when clicking elsewhere.
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);
  // Success messages fade on their own; errors stay until dismissed.
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(clear, 6000);
    return () => window.clearTimeout(t);
  }, [message]); // clear() is stable in behaviour; re-running on every render would reset the timer
  const [, page, id] = path.split("/");
  const user = s?.users.find((u) => u.id === identity);
  const open = s?.jobs.filter((j) => j.status === "available").length || 0;
  const nav = [
    { url: "/", label: "Overview", icon: Home },
    { url: "/assets", label: "Assets", icon: MapIcon },
    { url: "/jobs", label: "Inspections", icon: ClipboardList, count: open },
    { url: "/activity", label: "My activity", icon: History },
    ...(user?.role === "admin" ? [{ url: "/admin", label: "Manage", icon: Settings2 }] : []),
  ];
  let content;
  if (!s) content = <Empty text={error ? "We couldn't load the demo data." : "Loading…"} />;
  else
    switch (page) {
      case "":
        content = <Dashboard />;
        break;
      case "assets":
        content = id ? <Details id={id} /> : <Registry standalone />;
        break;
      case "report":
        content = <Report key={id} assetId={id} />;
        break;
      case "jobs":
        content = <Jobs key="available" />;
        break;
      case "activity":
        content = <Jobs key={"mine" + identity} mine />;
        break;
      case "admin":
        content = <Admin key={id || "new"} editId={id} />;
        break;
      case "inspect": {
        const job = s.jobs.find((j) => j.id === id);
        content = job ? <Inspect key={id} job={job} /> : <Empty text="This job no longer exists." />;
        break;
      }
      default:
        content = <Empty text="There's nothing on this page." hint="Use the menu to find your way back." />;
    }
  const active = (url: string) => (url === "/" ? !page : path.startsWith(url));
  const initials = (user?.name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("");
  return (
    <div className="app">
      <header className="topnav">
        <div className="topnav-inner">
          <a href="#/" className="brand" aria-label="Greenward home">
            <Wordmark />
          </a>
          <nav aria-label="Main" className={mobile ? "open" : ""}>
            {nav.map((item) => (
              <a key={item.url} href={"#" + item.url} className={active(item.url) ? "on" : ""} aria-current={active(item.url) ? "page" : undefined}>
                <item.icon size={17} strokeWidth={2} />
                {item.label}
                {item.count ? <span className="count">{item.count}</span> : null}
              </a>
            ))}
          </nav>
          <div className="topnav-right">
            <a href="#/report" className="btn primary small reportbtn">
              <Plus size={16} /> Report a problem
            </a>
            <div className="account" ref={menuRef}>
              <button className="accountbtn" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-haspopup="menu">
                <span className="avatar">{initials}</span>
                <ChevronDown size={15} />
              </button>
              {menu && (
                <div className="accountmenu" role="menu">
                  <div className="who">
                    <b>{user?.name}</b>
                    <small>{user?.role === "admin" ? "Administrator" : "Community member"}</small>
                  </div>
                  <button role="menuitem" disabled={busy} onClick={change}>
                    <Repeat size={15} /> Switch account
                  </button>
                  <button role="menuitem" onClick={logout}>
                    <LogOut size={15} /> Log out
                  </button>
                  <p className="local">Your data is saved in this browser.</p>
                </div>
              )}
            </div>
            <button className="menubtn" aria-label={mobile ? "Close menu" : "Open menu"} onClick={() => M(!mobile)}>
              {mobile ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>
      {(message || error) && (
        <div role={error ? "alert" : "status"} className={"toast" + (error ? " bad" : "")}>
          {error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{error || message}</span>
          <button aria-label="Dismiss message" onClick={clear}>
            <X size={16} />
          </button>
        </div>
      )}
      <main key={page + (id ?? "")} className="page">
        {content}
      </main>
      <SiteFooter />
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <Auth>
    {(user, logout, change) => (
      <Provider key={user.id} user={user}>
        <Shell logout={logout} change={change} />
      </Provider>
    )}
  </Auth>,
);
