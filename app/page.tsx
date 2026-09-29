const contactLinks = [
  {
    label: "Email Diego",
    detail: "diegommart2004@gmail.com",
    href: "mailto:diegommart2004@gmail.com",
  },
  {
    label: "LinkedIn",
    detail: "/in/diegomartinez30",
    href: "https://www.linkedin.com/in/diegomartinez30",
  },
  {
    label: "GitHub",
    detail: "@FastMartini",
    href: "https://github.com/FastMartini",
  },
];

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M4 10h11M11 5l5 5-5 5" />
    </svg>
  );
}

function MountainStudy() {
  return (
    <svg
      aria-hidden="true"
      className="mountain-study"
      viewBox="0 0 720 660"
      preserveAspectRatio="xMidYMax meet"
    >
      <circle className="mountain-sun" cx="532" cy="138" r="72" />
      <path
        className="contour contour-one"
        d="M90 520c80-54 127-112 187-198 36-51 63-79 86-82 32-5 47 34 75 79 31 50 68 70 132 110 39 25 69 55 91 91"
      />
      <path
        className="contour contour-two"
        d="M34 561c98-57 166-117 230-212 48-71 70-103 103-108 43-7 64 41 97 91 35 53 90 86 174 142 27 18 47 39 61 63"
      />
      <path
        className="mountain-back"
        d="M0 523 118 410l72 47 161-250 88 137 73-67 208 246v137H0Z"
      />
      <path
        className="mountain-front"
        d="M0 576 156 446l77 63 91-112 79 73 91-164 226 270v84H0Z"
      />
      <path className="mountain-ridge" d="m324 397 45 42 34 31 91-164 48 58" />
      <path className="mountain-trail" d="M182 584c52-23 85-38 96-68 10-26-23-38-3-65 16-21 53-4 66-35 8-19-5-30-17-42" />
      <circle className="trail-marker" cx="182" cy="584" r="7" />
      <circle className="trail-marker trail-marker-top" cx="324" cy="374" r="7" />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="site-header">
        <a className="wordmark" href="#trailhead" aria-label="Diego Martinez, home">
          <span className="wordmark-mark" aria-hidden="true">
            DM
          </span>
          <span>Diego Martinez</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#about">About</a>
          <a href="#beyond-work">Beyond Work</a>
          <a href="#summit">Contact</a>
        </nav>
      </header>

      <main id="main-content">
        <section className="trailhead" id="trailhead" aria-labelledby="trailhead-title">
          <div className="trailhead-copy">
            <p className="eyebrow">
              <span aria-hidden="true" /> Software engineer · Miami, Florida
            </p>
            <h1 id="trailhead-title">
              Software engineer building intelligent, data-driven products.
            </h1>
            <p className="trailhead-intro">
              From research and systems to polished user experiences, I follow ideas
              all the way from first question to thoughtful product.
            </p>
            <div className="trailhead-actions">
              <a className="button button-primary" href="#summit">
                Contact me <ArrowIcon />
              </a>
              <span className="resume-note">Résumé — coming soon</span>
            </div>
          </div>

          <div className="mountain-frame">
            <div className="elevation-note" aria-hidden="true">
              <span>25.7617° N</span>
              <span>80.1918° W</span>
            </div>
            <MountainStudy />
            <p className="mountain-caption">
              <span>Trailhead</span>
              A portfolio about the work behind the climb.
            </p>
          </div>

          <a className="scroll-cue" href="#about">
            <span>Begin the journey</span>
            <span aria-hidden="true">↓</span>
          </a>
        </section>

        <section className="about" id="about" aria-labelledby="about-title">
          <div className="section-kicker">
            <span>01</span>
            <span>About</span>
          </div>
          <div className="about-copy">
            <h2 id="about-title">Engineering with intent.</h2>
            <div className="about-details">
              <p>
                I’m Diego, a software engineer who likes turning ambitious ideas
                into useful, understandable products. I work across research,
                systems, and interfaces—wherever the problem needs me.
              </p>
              <p>
                I care about thoughtful systems, clear experiences, and the small
                decisions that make software feel considered from end to end.
              </p>
            </div>
          </div>
          <p className="section-coordinate">Base camp · Miami</p>
        </section>

        <section
          className="personal-interlude"
          id="beyond-work"
          aria-labelledby="beyond-work-title"
        >
          <div className="section-kicker section-kicker-dark">
            <span>02</span>
            <span>Beyond Work</span>
          </div>
          <div className="interlude-grid">
            <div className="interlude-visual" aria-hidden="true">
              <span className="string string-one" />
              <span className="string string-two" />
              <span className="string string-three" />
              <span className="string string-four" />
              <span className="string string-five" />
              <span className="string string-six" />
              <span className="fret fret-one" />
              <span className="fret fret-two" />
              <span className="fret fret-three" />
              <span className="fret fret-four" />
              <span className="interlude-stamp">Six strings · endless phrasing</span>
            </div>
            <div className="interlude-copy">
              <p className="handwritten">A personal interlude</p>
              <h2 id="beyond-work-title">Beyond the build.</h2>
              <p>
                Outside software, I spend time playing blues and electric guitar.
                It’s a different way to practice listening, timing, and leaving
                room for what comes next.
              </p>
            </div>
          </div>
        </section>

        <section className="summit" id="summit" aria-labelledby="summit-title">
          <div className="section-kicker section-kicker-light">
            <span>03</span>
            <span>Contact</span>
          </div>
          <div className="summit-heading">
            <p className="handwritten">The next ascent</p>
            <h2 id="summit-title">Let&apos;s build what comes next.</h2>
            <p>
              If you’re assembling a team, shaping an ambitious product, or want
              to compare notes, I’d be glad to hear from you.
            </p>
          </div>
          <div className="contact-list" aria-label="Contact Diego">
            {contactLinks.map((link, index) => (
              <a href={link.href} key={link.label}>
                <span className="contact-number">0{index + 1}</span>
                <span className="contact-label">{link.label}</span>
                <span className="contact-detail">{link.detail}</span>
                <ArrowIcon />
              </a>
            ))}
          </div>
        </section>
      </main>

      <footer>
        <p>© {new Date().getFullYear()} Diego Martinez</p>
        <a href="#trailhead">Back to the trailhead ↑</a>
      </footer>
    </>
  );
}
