"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";
import { contactEmail, summitRegister } from "../../content/contact";
import "./summit.css";

const draftKey = "summit-register-draft";
const fieldNames = ["name", "email", "subject", "message"] as const;
const subscribe = () => () => {};
const entryDate = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const serverDate = () => "";

function readDraft(form: HTMLFormElement) {
  const data = new FormData(form);
  return {
    name: String(data.get("name") ?? ""), email: String(data.get("email") ?? ""),
    subject: String(data.get("subject") ?? ""), message: String(data.get("message") ?? ""),
  };
}

function mailto(draft: ReturnType<typeof readDraft>) {
  const subject = draft.subject.trim() || (draft.name.trim() ? `Hello from ${draft.name.trim()}` : "Hello from your portfolio");
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

// Keep the native mail form available in the static export. Hosted delivery is
// a separate stage, pending the service decision in the contact handoff.
export function SummitRegister() {
  const formRef = useRef<HTMLFormElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const attempted = useRef(false);
  const [errors, setErrors] = useState({ email: "", message: "" });
  const [copyLabel, setCopyLabel] = useState("Copy address");
  const date = useSyncExternalStore(subscribe, entryDate, serverDate);

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
    return () => clearTimeout(copyTimer.current);
  }, []);

  function saveDraft(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    try { localStorage.setItem(draftKey, JSON.stringify(readDraft(form))); } catch { /* Keep editing without storage. */ }
    if (attempted.current) setErrors(validate(form));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (new FormData(form).get("botcheck")) return;
    attempted.current = true;
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.message) {
      const first = form.elements.namedItem(nextErrors.email ? "email" : "message");
      if (first instanceof HTMLElement) first.focus();
      return;
    }
    // Opening a mail app is not proof of delivery: retain the draft and form.
    const destination = mailto(readDraft(form));
    form.action = destination;
    window.location.assign(destination);
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
      action={`mailto:${contactEmail}`} method="post" encType="text/plain" aria-labelledby="register-title">
      <span className="summit-register-contours" aria-hidden="true" />
      <div className="summit-register-top">
        <h3 id="register-title">{summitRegister.title}</h3>
        {date && <p className="summit-register-date">Entry · {date}</p>}
      </div>
      <div className="summit-field summit-field-to">
        <span className="summit-field-label">To</span>
        <div className="summit-to-row">
          <span className="summit-to-address">Diego Martinez <span>· {contactEmail}</span></span>
          {date && <button className="summit-chip" type="button" onClick={copyAddress}><span aria-live="polite">{copyLabel}</span></button>}
        </div>
      </div>
      <div className="summit-field">
        <label htmlFor="register-name">From</label>
        <input id="register-name" name="name" autoComplete="name" placeholder={summitRegister.placeholders.name} />
      </div>
      <div className="summit-field">
        <label htmlFor="register-email">Reply to</label>
        <input id="register-email" name="email" type="email" required autoComplete="email" inputMode="email" placeholder={summitRegister.placeholders.email}
          aria-invalid={errors.email ? true : undefined} aria-describedby={errors.email ? "register-email-error" : undefined} />
        {errors.email && <p className="summit-field-error" id="register-email-error" aria-live="polite">{errors.email}</p>}
      </div>
      <div className="summit-field">
        <label htmlFor="register-subject">Subject <span className="summit-optional">(optional)</span></label>
        <input id="register-subject" name="subject" placeholder={summitRegister.placeholders.subject} />
      </div>
      <div className="summit-message">
        <label className="summit-visually-hidden" htmlFor="register-message">Message</label>
        <textarea id="register-message" name="message" required placeholder={summitRegister.placeholders.message}
          aria-invalid={errors.message ? true : undefined} aria-describedby={errors.message ? "register-message-error" : undefined} />
        {errors.message && <p className="summit-field-error" id="register-message-error" aria-live="polite">{errors.message}</p>}
      </div>
      <input className="summit-visually-hidden" type="checkbox" name="botcheck" tabIndex={-1} aria-hidden="true" />
      <div className="summit-register-foot">
        <p className="summit-register-note">{summitRegister.noteWithoutService}</p>
        <button className="summit-send" type="submit">
          {summitRegister.submit}
          <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 16 16 4M5 4h11v11" /></svg>
        </button>
      </div>
    </form>
  );
}
