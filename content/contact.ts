export const contactEmail = "diegommart2004@gmail.com";
export const contactFormEndpoint = "https://api.web3forms.com/submit";

export const contactLinks = [
  { label: "LinkedIn", detail: "/in/diegomartinez30", href: "https://www.linkedin.com/in/diegomartinez30" },
  { label: "GitHub", detail: "@FastMartini", href: "https://github.com/FastMartini" },
  {
    label: "Devpost", detail: "@FastMartini",
    href: "https://devpost.com/FastMartini?ref_content=user-portfolio&ref_feature=portfolio&ref_medium=global-nav",
  },
] as const;

export const summitRegister = {
  title: "Sign the summit register",
  note: "Sends straight from this page. No email app needed.",
  noteWithoutService: "Opens your email app.",
  submit: "Sign & send",
  sending: "Sending…",
  sender: "Portfolio · Summit register",
  placeholders: {
    name: "Your name",
    email: "you@company.com",
    subject: "A role, a project, or just hello",
    message: "Tell me what you’re building…",
  },
  errors: {
    emailRequired: "Add an email so I can write back.",
    emailInvalid: "That address looks incomplete.",
    messageRequired: "Write a line or two first.",
  },
  prepared: {
    stamp: "Note prepared",
    heading: "Your note is ready to send.",
    headingWithName: (name: string) => `Your note is ready, ${name}.`,
    note: "Finish sending it in your email app. If it didn’t open, use the link below. Your draft is saved here.",
    reopen: "Open email app",
    edit: "Back to my note",
  },
  sent: {
    stamp: "Signed",
    heading: "Your note is in my inbox.",
    headingWithName: (name: string) => `Thanks, ${name}. It’s in my inbox.`,
    reply: (email: string) => `I’ll reply to ${email}.`,
    another: "Write another note",
    native: "Thanks — your note was sent. I’ll reply to the address you left.",
  },
  failure: {
    heading: "That one didn’t reach me.",
    note: "Your note is still here. Try again, or send it from your own email instead.",
    retry: "Try again",
    fallback: "Open in my email app",
  },
} as const;
