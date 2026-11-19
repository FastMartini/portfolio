export const contactEmail = "diegommart2004@gmail.com";

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
} as const;
