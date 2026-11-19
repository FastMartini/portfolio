"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";
import { contactEmail, contactFormEndpoint, summitRegister } from "../../content/contact";
import { publicUrl } from "../../content/site";
import "./summit.css";

const draftKey = "summit-register-draft";
const fieldNames = ["name", "email", "subject", "message"] as const;
const subscribe = () => () => {};
const entryDate = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const serverDate = () => "";
const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_KEY?.trim() ?? "";

type Draft = ReturnType<typeof readDraft>;
type Confirmation = { kind: "prepared" | "sent"; draft: Draft };

function readDraft(form: HTMLFormElement) {
  const data = new FormData(form);
  return {
    name: String(data.get("name") ?? ""), email: String(data.get("email") ?? ""),
    subject: String(data.get("subject") ?? ""), message: String(data.get("message") ?? ""),
  };
}

function subjectFor(draft: Draft) {
  return draft.subject.trim() || (draft.name.trim() ? `Hello from ${draft.name.trim()}` : "Hello from your portfolio");
}

function mailto(draft: Draft) {
  const subject = subjectFor(draft);
  const body = `${draft.message}\n\n— ${draft.name.trim()}\n${draft.email.trim()}`;
  return `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function validate(form: HTMLFormElement) {
  const email = form.elements.namedItem("email");
  const draft = readDraft(form);
  return {
    email: !draft.email.trim() ? summitRegister.errors.emailRequired
      : email instanceof HTMLInputElement && email.validity.typeMismatch ? summitRegister.errors.emailInvalid : "",
    message: draft.message.trim() ? "" : summitRegister.errors.messageRequired,
  };
}

// Both delivery paths remain usable in the static export. The public service
// key is supplied at build time; keyless builds keep their native mail form.
export function SummitRegister() {
  const formRef = useRef<HTMLFormElement>(null);
  const confirmationRef = useRef<HTMLDivElement>(null);
  const returningToDraft = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const attempted = useRef(false);
  const [errors, setErrors] = useState({ email: "", message: "" });
  const [copyLabel, setCopyLabel] = useState("Copy address");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [sendState, setSendState] = useState<"idle" | "sending" | "failed">("idle");
  const [fallbackUrl, setFallbackUrl] = useState(`mailto:${contactEmail}`);
  const sending = sendState === "sending";
  const date = useSyncExternalStore(subscribe, entryDate, serverDate);

  useEffect(() => {
    if (confirmation) confirmationRef.current?.focus();
    else if (returningToDraft.current) {
      returningToDraft.current = false;
      const name = formRef.current?.elements.namedItem("name");
      if (name instanceof HTMLElement) name.focus();
    }
  }, [confirmation]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    // Native validation remains active in server HTML and when scripts fail.
    form.noValidate = true;
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(draftKey) ?? "null");
      if (saved && typeof saved === "object") {
        for (const key of fieldNames) {
          const field = form.elements.namedItem(key);
          const value: unknown = Reflect.get(saved, key);
          if ((field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) && typeof value === "string") field.value = value;
        }
      }
    } catch { /* Draft storage is optional, including in private browsing. */ }
    return () => { clearTimeout(copyTimer.current); requestRef.current?.abort(); };
  }, []);

  function saveDraft(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    try { localStorage.setItem(draftKey, JSON.stringify(readDraft(form))); } catch { /* Keep editing without storage. */ }
    if (attempted.current) setErrors(validate(form));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (requestRef.current || new FormData(form).get("botcheck")) return;
    attempted.current = true;
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.message) {
      const first = form.elements.namedItem(nextErrors.email ? "email" : "message");
      if (first instanceof HTMLElement) first.focus();
      return;
    }
    // A mailto handoff cannot confirm delivery. Show the register's visual with
    // preparation copy and keep the original draft available for editing.
    const draft = readDraft(form);
    const destination = mailto(draft);
    setFallbackUrl(destination);
    if (!accessKey) {
      form.action = destination;
      setConfirmation({ kind: "prepared", draft });
      window.location.assign(destination);
      return;
    }

    const payload = new FormData(form);
    // Redirects belong to native POSTs; AJAX needs the service's JSON response.
    payload.delete("redirect");
    payload.set("subject", subjectFor(draft));
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 20_000);
    setSendState("sending");
    try {
      const response = await fetch(contactFormEndpoint, { method: "POST", headers: { Accept: "application/json" }, body: payload, signal: controller.signal });
      const result: unknown = await response.json();
      if (!response.ok || !result || typeof result !== "object" || Reflect.get(result, "success") !== true) throw new Error("Submission failed");
      try { localStorage.removeItem(draftKey); } catch { /* Delivery does not depend on local storage. */ }
      form.reset();
      attempted.current = false;
      setErrors({ email: "", message: "" });
      setConfirmation({ kind: "sent", draft });
      setSendState("idle");
    } catch {
      if (form.isConnected) setSendState("failed");
    } finally {
      clearTimeout(timeout);
      requestRef.current = null;
    }
  }

  async function copyAddress() {
    clearTimeout(copyTimer.current);
    try {
      await navigator.clipboard.writeText(contactEmail);
      setCopyLabel("Copied");
      copyTimer.current = setTimeout(() => setCopyLabel("Copy address"), 1800);
    } catch { setCopyLabel(contactEmail); }
  }

  return (
    <form ref={formRef} onInput={saveDraft} onSubmit={submit}
      className="summit-register" id="summit-register" tabIndex={-1} data-theme-root=""
      action={accessKey ? contactFormEndpoint : `mailto:${contactEmail}`} method="post" encType={accessKey ? undefined : "text/plain"} aria-labelledby="register-title">
      <span className="summit-register-contours" aria-hidden="true" />
      {accessKey && <>
        <input type="hidden" name="access_key" value={accessKey} />
        <input type="hidden" name="from_name" value={summitRegister.sender} />
        <input type="hidden" name="redirect" value={publicUrl("/#summit-sent")} />
      </>}
      <div className="summit-register-top">
        <h3 id="register-title">{summitRegister.title}</h3>
        {date && <p className="summit-register-date">Entry · {date}</p>}
      </div>
      <div hidden={confirmation !== null}>
        <div className="summit-field summit-field-to">
          <span className="summit-field-label">To</span>
          <div className="summit-to-row">
            <span className="summit-to-address">Diego Martinez <span>· {contactEmail}</span></span>
            {date && <button className="summit-chip" type="button" onClick={copyAddress}><span aria-live="polite">{copyLabel}</span></button>}
          </div>
        </div>
        <div className="summit-field">
          <label htmlFor="register-name">From</label>
          <input id="register-name" name="name" autoComplete="name" readOnly={sending} placeholder={summitRegister.placeholders.name} />
        </div>
        <div className="summit-field">
          <label htmlFor="register-email">Reply to</label>
          <input id="register-email" name="email" type="email" required autoComplete="email" inputMode="email" readOnly={sending} placeholder={summitRegister.placeholders.email}
            aria-invalid={errors.email ? true : undefined} aria-describedby={errors.email ? "register-email-error" : undefined} />
          {errors.email && <p className="summit-field-error" id="register-email-error" aria-live="polite">{errors.email}</p>}
        </div>
        <div className="summit-field">
          <label htmlFor="register-subject">Subject <span className="summit-optional">(optional)</span></label>
          <input id="register-subject" name="subject" readOnly={sending} placeholder={summitRegister.placeholders.subject} />
        </div>
        <div className="summit-message">
          <label className="summit-visually-hidden" htmlFor="register-message">Message</label>
          <textarea id="register-message" name="message" required readOnly={sending} placeholder={summitRegister.placeholders.message}
            aria-invalid={errors.message ? true : undefined} aria-describedby={errors.message ? "register-message-error" : undefined} />
          {errors.message && <p className="summit-field-error" id="register-message-error" aria-live="polite">{errors.message}</p>}
        </div>
        <input className="summit-visually-hidden" type="checkbox" name="botcheck" tabIndex={-1} aria-hidden="true" />
        {sendState === "failed" && <div className="summit-register-alert" role="alert">
          <p><strong>{summitRegister.failure.heading}</strong> {summitRegister.failure.note}</p>
          <div className="summit-confirmation-actions">
            <a className="summit-chip" href={fallbackUrl}>{summitRegister.failure.fallback}</a>
            <button className="summit-chip" type="button" onClick={copyAddress}><span aria-live="polite">{copyLabel}</span></button>
          </div>
        </div>}
        <div className="summit-register-foot">
          {!accessKey && <p className="summit-register-note">{summitRegister.noteWithoutService}</p>}
          <button className="summit-send" type="submit" disabled={sending} aria-busy={sending}>
            {sending ? summitRegister.sending : sendState === "failed" ? summitRegister.failure.retry : summitRegister.submit}
            <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 16 16 4M5 4h11v11" /></svg>
          </button>
        </div>
      </div>
      {confirmation && (
        <div ref={confirmationRef} className="summit-register-confirmation" role="status" tabIndex={-1} aria-labelledby="register-confirmation-title">
          <div className="summit-register-stamp" aria-hidden="true">
            <svg viewBox="0 0 56 44" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
              <path d="m3 39 19-26 12 16 6-9 13 19H3ZM14 24l8 2 6-4M22 13V2m0 0h14l-3 4 3 4H22" />
            </svg>
            <b>{confirmation.kind === "sent" ? summitRegister.sent.stamp : summitRegister.prepared.stamp}</b>
            <small>{date}</small>
          </div>
          <h3 id="register-confirmation-title">
            {confirmation.draft.name.trim()
              ? summitRegister[confirmation.kind].headingWithName(confirmation.draft.name.trim().split(/\s+/)[0])
              : summitRegister[confirmation.kind].heading}
          </h3>
          <p>{confirmation.kind === "sent" ? summitRegister.sent.reply(confirmation.draft.email.trim()) : summitRegister.prepared.note}</p>
          <div className="summit-confirmation-actions">
            {confirmation.kind === "prepared" && <a className="summit-chip" href={mailto(confirmation.draft)}>{summitRegister.prepared.reopen}</a>}
            <button className="summit-chip" type="button" onClick={() => { returningToDraft.current = true; setConfirmation(null); }}>{confirmation.kind === "sent" ? summitRegister.sent.another : summitRegister.prepared.edit}</button>
          </div>
        </div>
      )}
    </form>
  );
}
