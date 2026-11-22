import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

/** Footer details, shared by the landing page and the app. */
export const site = {
  contactEmail: "ramatlas@greenward.be",
  year: 2026,
};

export function Logo() {
  return (
    <span className="lp-logo">
      <svg width="34" height="34" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <path d="M8 33C10 20 19 9 34 6c-1 15-10 26-23 27" fill="#527B55" />
        <path d="M8 33c6-8 12-13 20-19" stroke="#F3F7EF" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M6 35c1-2 2-3 3-4" stroke="#244B38" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <b>Greenward</b>
    </span>
  );
}

/** Logo and the essentials only: contact, privacy, legal notice, copyright. */
export function SiteFooter() {
  const infoDialog = useRef<HTMLDialogElement>(null);
  const [info, setInfo] = useState<"privacy" | "legal" | null>(null);
  useEffect(() => {
    if (info) infoDialog.current?.showModal();
  }, [info]);
  return (
    <>
      <footer className="lp-footer">
        <Logo />
        <nav className="lp-footer-nav" aria-label="Legal and contact">
          <a href={"mailto:" + site.contactEmail}>Contact</a>
          <button className="lp-plain" onClick={() => setInfo("privacy")}>Privacy</button>
          <button className="lp-plain" onClick={() => setInfo("legal")}>Legal notice</button>
          <span>© {site.year} Greenward</span>
        </nav>
      </footer>

      <dialog ref={infoDialog} className="lp-dialog lp-info" aria-labelledby="info-title" onClose={() => setInfo(null)}>
        <button className="lp-close" onClick={() => infoDialog.current?.close()} aria-label="Close">
          <X size={18} />
        </button>
        {info === "privacy" ? (
          <>
            <h2 id="info-title">Privacy</h2>
            <p>In this demo, everything you enter (assets, reports, inspections) is saved only in your own browser's local storage. It is not sent to a server, and you can delete it at any time by clearing this site's data.</p>
            <p>Greenward does not use advertising or tracking cookies. If Google sign-in is turned on, Google and Supabase handle your sign-in under their own privacy policies.</p>
            <p>
              Questions about your data? Write to <a href={"mailto:" + site.contactEmail}>{site.contactEmail}</a>.
            </p>
          </>
        ) : (
          <>
            <h2 id="info-title">Legal notice</h2>
            <p className="lp-todo">To be completed by the team before publishing.</p>
            <dl className="lp-legal">
              <dt>Publisher</dt>
              <dd>[Organisation name, legal form, address]</dd>
              <dt>Publication director</dt>
              <dd>[Full name]</dd>
              <dt>Contact</dt>
              <dd>{site.contactEmail}</dd>
              <dt>Hosting</dt>
              <dd>[Host name, address and phone number]</dd>
            </dl>
          </>
        )}
      </dialog>
    </>
  );
}
