type WaypointTier = "case-study" | "compact";

type WaypointLink = {
  label: string;
  href: string;
  kind: "repository" | "report" | "project" | "evidence";
};

type WaypointMedia = {
  kind: "image" | "diagram" | "report-figure";
  src: string;
  alt: string;
  sourceHref?: string;
};

type Waypoint = {
  name: string;
  slug: string;
  order: number;
  period: string;
  tier: WaypointTier;
  summary: string;
  purpose: string;
  role: string;
  team: string;
  owned: string;
  evidence: {
    label: string;
    detail: string;
  };
  technologies: readonly string[];
  award?: string;
  outcomes: readonly string[];
  caseStudyHref?: string;
  links: readonly WaypointLink[];
  privacy?: {
    label: string;
    publicNote: string;
    withheld: readonly string[];
  };
  media: readonly WaypointMedia[];
  metadata: {
    title: string;
    description: string;
  };
};

export const momentumXWaypoint = {
  name: "MomentumX",
  slug: "momentumx",
  order: 1,
  period: "ShellHacks 2026",
  tier: "case-study",
  summary:
    "A demonstration of tokenized U.S. equity trading on Solana devnet, connecting market signals to an inspectable trade flow.",
  purpose:
    "Help people explore a constrained trading workflow through replayed U.S. market data and devnet transactions—not a production brokerage.",
  role: "Scanner and React interface owner",
  team: "Four-person ShellHacks team",
  owned: "I built the momentum scanner and React frontend within the wider team product.",
  evidence: {
    label: "Verified recognition",
    detail: "Winner — MLH Best Use of Solana",
  },
  technologies: [
    "React",
    "Vite",
    "TypeScript",
    "FastAPI",
    "Python",
    "SQLite",
    "Solana devnet",
    "Phantom",
    "Alpaca replay data",
  ],
  award: "Winner — MLH Best Use of Solana",
  outcomes: ["Working devnet trading demonstration", "Verified hackathon recognition"],
  caseStudyHref: "/work/momentumx/",
  links: [
    {
      label: "View repository",
      href: "https://github.com/FastMartini/Shellhacks-2026",
      kind: "repository",
    },
  ],
  media: [],
  metadata: {
    title: "MomentumX — Tokenized U.S. Equity Trading Demo",
    description:
      "A ShellHacks 2026 team project pairing a momentum scanner and React interface with Solana devnet trading.",
  },
} as const satisfies Waypoint;

export const veritasWaypoint = {
  name: "Veritas",
  slug: "veritas",
  order: 2,
  period: "Capstone",
  tier: "case-study",
  summary:
    "A Chrome extension that estimates the political leaning of news articles from source, language, and framing signals.",
  purpose:
    "Give readers structured context about how political reporting is presented without judging whether an article is true or false.",
  role: "Team lead and developer",
  team: "Four-person capstone team",
  owned:
    "I led the architecture and built the backend-to-extension analysis flow with the project team.",
  evidence: {
    label: "Honest product boundary",
    detail:
      "Veritas estimates political leaning; it is not a fake-news detector or truth-verification system.",
  },
  technologies: [
    "Chrome Extension",
    "JavaScript",
    "HTML",
    "CSS",
    "FastAPI",
    "Python",
    "spaCy",
    "Pydantic",
    "Gemini-assisted analysis",
  ],
  outcomes: ["Integrated extension and backend analysis flow"],
  caseStudyHref: "/work/veritas/",
  links: [
    {
      label: "View repository",
      href: "https://github.com/FastMartini/Veritas",
      kind: "repository",
    },
  ],
  media: [],
  metadata: {
    title: "Veritas — Political-Leaning Analysis Extension",
    description:
      "A capstone Chrome extension for examining source, language, and framing signals in political news.",
  },
} as const satisfies Waypoint;

export const waypoints = [
  momentumXWaypoint,
  veritasWaypoint,
  {
    name: "Membership Inference Attack Study",
    slug: "membership-inference-attack",
    order: 3,
    period: "Privacy research",
    tier: "case-study",
    summary:
      "A classical machine-learning privacy study asking whether model behavior can reveal which text samples appeared in training.",
    purpose:
      "Test membership leakage in an IMDB sentiment classifier built with TF-IDF and logistic regression.",
    role: "Team lead · Testing and evaluation",
    team: "Collaborative research study",
    owned:
      "I led the testing and evaluation work across the target classifier and learned membership attack.",
    evidence: {
      label: "Controlled experiment",
      detail:
        "Across 500 member and 500 non-member IMDB reviews, the learned attack recorded 0.765 ROC-AUC; this is a scoped experiment, not a general privacy guarantee.",
    },
    technologies: ["Python", "scikit-learn", "TF-IDF", "Logistic regression"],
    outcomes: ["Documented experiment with reproducible public code and report"],
    links: [
      {
        label: "View repository",
        href: "https://github.com/FastMartini/llm-data-leakage-study",
        kind: "repository",
      },
      {
        label: "Read report",
        href: "https://github.com/FastMartini/llm-data-leakage-study/blob/main/Group%231_Membership_Inference_Attack_Report.pdf",
        kind: "report",
      },
    ],
    media: [],
    metadata: {
      title: "Membership Inference Attack Study — Classical ML Privacy Research",
      description:
        "A controlled membership-inference experiment using TF-IDF and logistic regression on IMDB reviews.",
    },
  },
  {
    name: "High-Momentum Scanner",
    slug: "high-momentum-scanner",
    order: 4,
    period: "Independent system",
    tier: "compact",
    summary:
      "A U.S. stock scanner that runs from 7:00 AM to 10:00 AM Eastern and looks for strong demand against limited supply.",
    purpose:
      "Surface candidates using relative volume, price movement, float, and recent news catalysts during the active morning window.",
    role: "Sole designer and developer",
    team: "Solo project",
    owned: "I designed, built, and operate the complete scanner.",
    evidence: {
      label: "Scanner-observed signal",
      detail:
        "On September 9, 2026, scanner-observed relative volume for SUNE—SUNation Energy, the public company in a pending reverse merger with private Suniva—rose from 5.19× to 13.93× around the opening bell. It followed Suniva’s $835 million debt-and-equity raise for a second U.S. solar-cell facility and 5.5 GW total capacity—a likely catalyst, not proven causation.",
    },
    technologies: [],
    outcomes: ["Surfaced a documented morning-market signal"],
    links: [
      {
        label: "Financing announcement",
        href: "https://www.sec.gov/Archives/edgar/data/22701/000121390026098099/ea030487601ex99-1.htm",
        kind: "evidence",
      },
      {
        label: "Merger context",
        href: "https://www.sec.gov/Archives/edgar/data/22701/000121390026066014/ea029387601ex99-1.htm",
        kind: "evidence",
      },
    ],
    privacy: {
      label: "Private implementation",
      publicNote: "Private implementation details are intentionally withheld.",
      withheld: [
        "technology stack",
        "data providers",
        "calculation methodology",
        "source",
      ],
    },
    media: [],
    metadata: {
      title: "High-Momentum Scanner — Private Market-Scanning System",
      description:
        "A private, independently built U.S. stock scanner focused on early-morning demand and supply signals.",
    },
  },
  {
    name: "MedVoyage",
    slug: "medvoyage",
    order: 5,
    period: "ShellHacks 2023",
    tier: "compact",
    summary:
      "A September 2023 hackathon decision-tree prototype that guided users through symptom questions toward a preliminary output.",
    purpose:
      "Explore decision-tree interaction design during a weekend hackathon; it is not a clinically validated medical system.",
    role: "Frontend designer and developer",
    team: "Four-person ShellHacks team",
    owned:
      "I designed and built the visual frontend, including the layout, typography, and interaction direction.",
    evidence: {
      label: "Verified recognition",
      detail: "Third Place Overall at ShellHacks 2023",
    },
    technologies: ["HTML", "CSS", "JavaScript"],
    award: "Third Place Overall at ShellHacks 2023",
    outcomes: ["Working hackathon prototype", "Verified third-place finish"],
    links: [
      {
        label: "View project",
        href: "https://devpost.com/software/medvoyage",
        kind: "project",
      },
      {
        label: "View repository",
        href: "https://github.com/FastMartini/MedVoyage",
        kind: "repository",
      },
    ],
    media: [],
    metadata: {
      title: "MedVoyage — ShellHacks 2023 Prototype",
      description:
        "A four-person decision-tree prototype recognized with Third Place Overall at ShellHacks 2023.",
    },
  },
  {
    name: "HaRi",
    slug: "hari",
    order: 6,
    period: "Weekend MVP",
    tier: "compact",
    summary:
      "An autonomous HR onboarding MVP that coordinates employee tasks, employer visibility, and agent-assisted workflows.",
    purpose:
      "Explore how orchestrated agents could reduce repetitive onboarding work while keeping progress visible to people.",
    role: "Full-stack integration and product direction",
    team: "Four-person hackathon team",
    owned:
      "I led the full-stack integration, agent orchestration, dashboards, and UI/UX direction.",
    evidence: {
      label: "Weekend build",
      detail:
        "The team delivered a working MVP with employee and employer dashboards, onboarding tools, and an integrated agent console; no award or measured business outcome is claimed.",
    },
    technologies: ["React", "FastAPI", "Google Cloud ADK", "Gemini"],
    outcomes: ["Integrated weekend MVP across the interface, backend, and agents"],
    links: [
      {
        label: "View project",
        href: "https://devpost.com/software/hari",
        kind: "project",
      },
      {
        label: "View repository",
        href: "https://github.com/FastMartini/HaRi",
        kind: "repository",
      },
    ],
    media: [],
    metadata: {
      title: "HaRi — Autonomous HR Onboarding MVP",
      description:
        "A weekend team MVP joining agent orchestration, dashboards, and full-stack onboarding workflows.",
    },
  },
] as const satisfies readonly Waypoint[];
