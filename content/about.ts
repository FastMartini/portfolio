export type AboutPitch = { id: "design" | "builder" | "teacher"; title: string; stat?: string; body: string };
export const aboutTitle = "Engineering with intent.";
export const aboutPitches: readonly AboutPitch[] = [
  { id: "design", title: "The Design Idea", body: "I wanted my portfolio to feel like me, so I drew inspiration from all the time I spend rock climbing and the music I love: blues, rock, and folk. At the heart of it is what I love most and dedicate my life and career to: being a software engineer. Building this site gave me a chance to bring all three together." },
  { id: "builder", title: "The Builder", stat: "2 hackathon wins", body: "Out of 4 entered. I’ve built a plethora of sophisticated projects alongside other engineers, using Scrum methodologies and often working under strict deadlines. Those circumstances honed my skills as a software engineer along the journey." },
  { id: "teacher", title: "The Teacher", stat: "300+ students", body: "Through CodePath, I help teach data structures in Python and prepare low-income college students for technical interviews. In person, I’ve taught Python to 30+ students in public schools." },
];
export const baseCampStats = [
  { value: "2", label: "hackathon wins, out of 4 entered" },
  { value: "300+", label: "students through CodePath" },
  { value: "30+", label: "students in public schools" },
] as const;
export type RingCard = {
  title: string; caption: string; dark?: boolean;
  image?: { file: string; width: number; height: number; alt: string };
  link?: { href: string; label: string }; video?: string;
};
export const builderCards: readonly RingCard[] = [
  { title: "MomentumX", caption: "MomentumX · ShellHacks 2026 · Winner", image: { file: "builder/momentumx.png", width: 269, height: 304, alt: "Devpost project card for MomentumX, a ShellHacks 2026 winner: “Catch the move before the market slows down.”" }, link: { href: "https://devpost.com/software/momentumx-er2kg9", label: "View MomentumX on Devpost" } },
  { title: "MedVoyage", caption: "MedVoyage · ShellHacks 2023 · Winner", image: { file: "builder/medvoyage.png", width: 271, height: 305, alt: "Devpost project card for MedVoyage, a ShellHacks 2023 winner: “Your Health, Our Expertise: Precision Diagnoses, Peace of Mind!”" }, link: { href: "https://devpost.com/software/medvoyage", label: "View MedVoyage on Devpost" } },
  { title: "Veritas", caption: "Veritas · project demo", dark: true, video: "_CG-xtdMhHI", link: { href: "https://youtu.be/0gY9chPPP5k", label: "How Veritas works, in depth" } },
  { title: "HaRi", caption: "HaRi · ShellHacks 2025", image: { file: "builder/hari.png", width: 269, height: 304, alt: "Devpost project card for HaRi, an AI-powered HR onboarding assistant built at ShellHacks 2025." }, link: { href: "https://devpost.com/software/hari", label: "View HaRi on Devpost" } },
  { title: "Grassroots", caption: "Grassroots · ShellHacks 2024", image: { file: "builder/grassroots.png", width: 269, height: 306, alt: "Devpost project card for Grassroots, built at ShellHacks 2024: “Grow your community, one root at a time.”" }, link: { href: "https://devpost.com/software/grassroots-fsly3w", label: "View Grassroots on Devpost" } },
];
export const teacherCards: readonly RingCard[] = [
  { title: "Leadership", caption: "Certificate of Leadership · CodePath Tech Fellow, Summer 2026", image: { file: "teacher/certificate.jpg", width: 2090, height: 1615, alt: "CodePath Certificate of Leadership awarded to Diego Martinez as a CodePath Tech Fellow, Summer 2026, for supporting students across multiple course pathways." } },
  { title: "The cohort", caption: "CodePath Tech Fellows, Summer 2026", image: { file: "teacher/cohort.jpg", width: 2098, height: 1212, alt: "A Zoom grid of the Summer 2026 CodePath Tech Fellow cohort, including Diego Martinez, smiling and waving." } },
  { title: "Feedback", caption: "Session feedback from students", image: { file: "teacher/feedback.png", width: 859, height: 483, alt: "CodePath session feedback slide. Student comments include “Our TF was amazing” and “Insight into a new cycle finding algo provided by TF Diego.”" } },
  { title: "A thank-you", caption: "A thank-you from a TIP102 student", image: { file: "teacher/student-note.png", width: 468, height: 327, alt: "A LinkedIn message from a CodePath TIP102 student thanking Diego for teaching the class and helping with their code." } },
  { title: "Shoutouts", caption: "Student shoutouts after a session", dark: true, image: { file: "teacher/shoutouts.png", width: 622, height: 504, alt: "Three students in a session chat each posting “Shoutout @TF - Diego Martinez.”" } },
];
