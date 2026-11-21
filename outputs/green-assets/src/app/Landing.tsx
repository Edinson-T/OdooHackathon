import { useEffect, useRef, useState } from "react";
import { ArrowRight, MapPinned, ScanSearch, MessageSquareText, Wrench, Leaf, CalendarCheck, CloudRain, Users, X } from "lucide-react";
import type { User } from "../domain/types";
import { Logo, SiteFooter } from "./SiteFooter";

const roles = {
  member: { id: "user-a", name: "Maya Chen", role: "community" } as User,
  admin: { id: "admin-1", name: "Alex Moss", role: "admin" } as User,
};


/** The public landing page. Sign-in happens in a small dialog; the app itself is unchanged. */
export function Landing({ google, error, onDemo }: { google: (() => void) | null; error: string; onDemo: (u: User) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [dest, setDest] = useState("/");
  const open = (where = "/") => {
    setDest(where);
    dialog.current?.showModal();
  };
  const enter = (u: User) => {
    location.hash = dest;
    onDemo(u);
  };
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  useEffect(() => {
    if (error) dialog.current?.showModal();
  }, [error]);

  return (
    <div className="lp">
      <header className="lp-nav">
        <button className="lp-plain" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Greenward, back to top">
          <Logo />
        </button>
        <nav aria-label="Sections">
          <button className="lp-plain on" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Home</button>
          <button className="lp-plain" onClick={() => scrollTo("purpose")}>Our purpose</button>
          <button className="lp-plain" onClick={() => scrollTo("how")}>How it works</button>
          <button className="lp-plain" onClick={() => scrollTo("care")}>Explore</button>
        </nav>
        <div className="lp-navactions">
          <button className="lp-btn ghost" onClick={() => open()}>Sign in</button>
          <button className="lp-btn" onClick={() => open()}>Get started</button>
        </div>
      </header>

      <main>
        {/* 1. Hero */}
        <section className="lp-hero">
          <div className="lp-hero-text">
            <h1>
              A healthier city <span className="lp-underline">grows together.</span>
            </h1>
            <p className="lp-lead">Connecting communities, caring for urban nature, and keeping green spaces healthy.</p>
            <div className="lp-actions">
              <button className="lp-btn" onClick={() => scrollTo("care")}>
                Explore <ArrowRight size={17} />
              </button>
              <button className="lp-btn ghost" onClick={() => scrollTo("purpose")}>Discover our mission</button>
            </div>
          </div>
          <figure className="lp-hero-art">
            <span className="lp-hero-wash" aria-hidden="true" />
            <img
              src="./greenward-cover.jpg"
              alt="Neighbours planting a community garden beside a pond, with green rooftops, solar panels and wind turbines in the background"
              width={1774}
              height={887}
            />
          </figure>
        </section>

        {/* 2. Our purpose */}
        <section className="lp-purpose" id="purpose">
          <div className="lp-purpose-art" aria-hidden="true">
            <svg viewBox="0 0 220 170" fill="none">
              <ellipse cx="118" cy="118" rx="96" ry="40" fill="#DDD0EA" />
              <path d="M58 150C84 112 120 74 176 44" stroke="#527B55" strokeWidth="3" strokeLinecap="round" />
              <path d="M96 106c-20-4-34-18-38-40 22 4 34 18 38 40Z" fill="#A8C5A0" />
              <path d="M120 82c-4-22 4-40 24-50 4 22-4 40-24 50Z" fill="#527B55" />
              <path d="M110 96c18-12 40-12 56 0-18 12-40 12-56 0Z" fill="#A8C5A0" />
              <path d="M146 62c16-12 34-14 48-6-14 12-32 14-48 6Z" fill="#527B55" opacity=".8" />
              <path d="M80 126c-18 0-32-8-40-24 18 0 32 8 40 24Z" fill="#527B55" opacity=".7" />
            </svg>
          </div>
          <div className="lp-purpose-text">
            <p className="lp-label">Our purpose</p>
            <h2>
              Nature makes cities better.
              <br />
              Let's take care of it.
            </h2>
            <p>
              Green spaces make our cities more liveable, but they also need regular attention. Greenward helps neighbours notice problems early, decide which places to visit
              first, and keep a shared record of what was done.
            </p>
          </div>
        </section>

        {/* 3. How Greenward works */}
        <section className="lp-how" id="how">
          <div className="lp-how-head">
            <h2>Small actions make a greener difference.</h2>
            <p>A simple way to connect what people notice with what gets looked after.</p>
          </div>
          <ol className="lp-steps">
            {[
              { icon: MapPinned, title: "Discover", text: "Find the farms, ponds and solar gardens around you on one shared map.", tone: "green" },
              { icon: ScanSearch, title: "Understand", text: "See each place's condition, its inspection history and today's rain, flood and disease readings.", tone: "fig" },
              { icon: MessageSquareText, title: "Report", text: "Tell us when something looks wrong. Your note goes straight onto the inspection list.", tone: "green" },
              { icon: Wrench, title: "Take action", text: "Pick up an inspection, walk through a short checklist and record what you found.", tone: "fig" },
            ].map((s) => (
              <li key={s.title}>
                <span className={"lp-stepicon " + s.tone}>
                  <s.icon size={26} strokeWidth={1.6} />
                </span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* 4. Smarter environmental care */}
        <section className="lp-care" id="care" aria-label="Explore">
          <div className="lp-map" aria-hidden="true">
            <svg viewBox="0 0 420 260" className="lp-mapbase">
              <rect width="420" height="260" fill="#F4F0F7" />
              <path d="M-10 190c70-30 120-10 170-40s90-90 270-70v190H-10Z" fill="#EAE4F0" />
              <path d="M250 260c10-40 60-60 110-56s70 30 70 56Z" fill="#CFE0E8" />
              <path d="M0 120c80 10 140-30 220-20s130 40 200 30" stroke="#fff" strokeWidth="9" fill="none" />
              <path d="M150 0c-10 70 20 140 0 260" stroke="#fff" strokeWidth="7" fill="none" />
              <path d="M300 0c10 50-20 90-10 150" stroke="#fff" strokeWidth="5" fill="none" />
              {[
                [40, 60], [80, 40], [60, 200], [210, 60], [240, 190], [350, 50], [380, 120], [110, 160], [320, 170],
              ].map(([x, y], i) => (
                <g key={i}>
                  <circle cx={x} cy={y} r="13" fill="#A8C5A0" />
                  <circle cx={x - 6} cy={y + 4} r="9" fill="#8DB585" />
                </g>
              ))}
            </svg>
            <span className="lp-pin healthy" style={{ left: "22%", top: "30%" }} />
            <span className="lp-pin needs" style={{ left: "58%", top: "22%" }} />
            <span className="lp-pin critical" style={{ left: "44%", top: "56%" }} />
            <span className="lp-pin healthy" style={{ left: "78%", top: "64%" }} />
            <span className="lp-note">visit this one first</span>
            <div className="lp-mapcard">
              <b>
                <Leaf size={15} /> Ridge Solar Station
              </b>
              <span className="lp-status critical">Critical</span>
              <small>Inspection overdue · 1 resident report · heavy rain nearby</small>
            </div>
          </div>
          <div className="lp-care-text">
            <p className="lp-label">Preventive care</p>
            <h2>Spot problems before they grow.</h2>
            <p>Greenward brings together four things the community already knows, so visits go where they matter most.</p>
            <ul className="lp-signals">
              <li><Leaf size={18} /> Asset condition</li>
              <li><CalendarCheck size={18} /> Inspection history</li>
              <li><CloudRain size={18} /> Weather readings</li>
              <li><Users size={18} /> Community reports</li>
            </ul>
            <div className="lp-legend">
              <span><i className="healthy" /> Healthy</span>
              <span><i className="needs" /> Needs inspection</span>
              <span><i className="critical" /> Critical</span>
            </div>
          </div>
        </section>

        {/* 5. Community participation */}
        <section className="lp-community">
          <figure className="lp-community-art">
            <img src="./greenward-community.jpg" alt="Four neighbours with backpacks looking out over a pond and flowering garden" width={2172} height={724} loading="lazy" />
          </figure>
          <div className="lp-community-text">
            <h2>Better green spaces start with all of us.</h2>
            <p>
              Greenward brings residents together to care for shared green spaces. Report what you notice, claim a visit that fits your week, and see the difference your
              neighbours are making.
            </p>
            <button className="lp-btn ghost" onClick={() => open("/jobs")}>
              Become part of the community <ArrowRight size={17} />
            </button>
          </div>
        </section>

        {/* 6. Final call to action */}
        <section className="lp-cta">
          <h2>Let's grow healthier cities together.</h2>
          <p>Discover what's around you, report what you notice and help care for the green spaces we share.</p>
          <div className="lp-cta-row">
            <button className="lp-btn" onClick={() => open()}>
              Get started <ArrowRight size={17} />
            </button>
            <span>
              Already part of Greenward?{" "}
              <button className="lp-link" onClick={() => open()}>
                Sign in.
              </button>
            </span>
          </div>
        </section>
      </main>

      <SiteFooter />

      <dialog ref={dialog} className="lp-dialog" aria-labelledby="signin-title">
        <button className="lp-close" onClick={() => dialog.current?.close()} aria-label="Close">
          <X size={18} />
        </button>
        <h2 id="signin-title">Welcome to Greenward</h2>
        {google ? (
          <>
            <p>Sign in with your Google account. New accounts start as community members.</p>
            <button className="lp-btn wide" onClick={google}>Continue with Google</button>
          </>
        ) : (
          <>
            <p>This is a demo, so there's no password. Choose how you'd like to take part. Everything stays in this browser.</p>
            <button className="lp-role" onClick={() => enter(roles.member)}>
              <b>Community member</b>
              <span>Report problems, claim inspections and record what you find.</span>
              <small>Continue as Maya Chen</small>
            </button>
            <button className="lp-role" onClick={() => enter(roles.admin)}>
              <b>Community administrator</b>
              <span>Everything above, plus managing assets and sensor readings.</span>
              <small>Continue as Alex Moss</small>
            </button>
          </>
        )}
        {error && <p role="alert" className="lp-error">{error}</p>}
      </dialog>
    </div>
  );
}
