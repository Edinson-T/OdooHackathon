import { Auth } from "./app/Auth";
import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import {
  Sprout,
  LayoutDashboard,
  Map as MapIcon,
  ClipboardList,
  History,
  Settings2,

  CalendarDays,
  Menu,
  X,
  CheckCircle2,
  AlertCircle,
  Leaf,

} from "lucide-react";
import { Provider, useApp } from "./app/provider";
import { Dashboard } from "./features/dashboard/Dashboard";
import { Registry } from "./features/assets/Registry";
import { Admin, Details, Report } from "./features/assets/Forms";
import { Jobs, Inspect } from "./features/jobs/Jobs";
import { Empty } from "./components/ui";
import "./style.css";
function Shell({logout,change}:{logout:()=>void;change:()=>void}) {
  const { s, identity,  clear, message, error, busy } =
    useApp();
  const [path, P] = useState(location.hash.slice(1) || "/"),
    [mobile, M] = useState(false);
  useEffect(() => {
    const route = () => {
      P(location.hash.slice(1) || "/");
      M(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", route);
    return () => window.removeEventListener("hashchange", route);
  }, []);
  const [, page, id] = path.split("/");
  const user = s?.users.find((u) => u.id === identity);
  const nav = [
    { url: "/", label: "Overview", icon: LayoutDashboard },
    { url: "/assets", label: "Asset registry", icon: MapIcon },
    { url: "/jobs", label: "Inspection jobs", icon: ClipboardList },
    { url: "/activity", label: "My activity", icon: History },
    ...(user?.role === "admin"
      ? [{ url: "/admin", label: "Manage assets", icon: Settings2 }]
      : []),
  ];
  let content;
  if (!s)
    content = (
      <Empty
        text={
          error ? "Unable to load demo data." : "Loading community records…"
        }
      />
    );
  else
    switch (page) {
      case "":
        content = <Dashboard />;
        break;
      case "assets":
        content = id ? (
          <Details id={id} />
        ) : (
          <>
            <div className="eyebrow">COMMUNITY WORKSPACE</div>
            <h1>Asset registry</h1>
            <Registry />
          </>
        );
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
        content = job ? (
          <Inspect key={id} job={job} />
        ) : (
          <Empty text="Job not found." />
        );
        break;
      }
      default:
        content = <Empty text="Page not found." />;
    }
  return (
    <div className="shell">
      {mobile && (
        <button
          className="scrim"
          aria-label="Close navigation"
          onClick={() => M(false)}
        />
      )}
      <aside className={mobile ? "open" : ""}>
        <a href="#/" className="brand">
          <span className="brandmark">
            <Sprout size={27} />
          </span>
          Green Assets<span className="branddot">.</span>
        </a>
        <div className="navcap">WORKSPACE</div>
        <nav>
          {nav.map((item) => (
            <a
              key={item.url}
              className={
                (item.url === "/" ? !page : path.startsWith(item.url))
                  ? "active"
                  : ""
              }
              href={"#" + item.url}
            >
              <item.icon size={19} />
              {item.label}
              {item.url === "/jobs" && (
                <span className="count">
                  {s?.jobs.filter((j) => j.status === "available").length || 0}
                </span>
              )}
            </a>
          ))}
        </nav>
        <div className="sidebottom">
          <div className="local">
            <span className="signal" />
            Local workspace
          </div>

        </div>
      </aside>
      <div className="workspace">
        <header>
          <div className="headerleft">
            <button
              className="menubtn"
              aria-label="Open navigation"
              onClick={() => M(true)}
            >
              <Menu />
            </button>
            <Leaf size={16} />
            <span>Community workspace</span>
          </div>
          <div className="identity">
            <span>{user?.name}</span><button disabled={busy} onClick={change}>Switch account</button><button onClick={logout}>Log out</button>
          </div>
        </header>
        <main>
          <div className="date">
            <CalendarDays size={14} />
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
          {(message || error) && (
            <div
              role={error ? "alert" : "status"}
              className={"notice " + (error ? "danger" : "")}
            >
              {error ? <AlertCircle /> : <CheckCircle2 />}
              <span>{error || message}</span>
              <button aria-label="Dismiss message" onClick={clear}>
                <X size={16} />
              </button>
            </div>
          )}
          {content}
        </main>
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <Auth>{(user,logout,change) => <Provider key={user.id} user={user}><Shell logout={logout} change={change}/></Provider>}</Auth>,
);
