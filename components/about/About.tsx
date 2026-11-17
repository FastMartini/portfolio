import { aboutPitches, aboutTitle, builderCards, teacherCards } from "../../content/about";
import { JourneyRidge } from "../journey-ridge";
import { PhotoRing } from "./PhotoRing";

export function About() {
  return <section className="about" id="about" aria-labelledby="about-title">
    <JourneyRidge about />
    <div className="trailhead-contours about-contours" data-fit="width-bottom" data-fade="none" aria-hidden="true" />
    <div className="section-kicker"><span>01</span><span>About</span></div>
    <div className="about-top"><h2 id="about-title">{aboutTitle}</h2></div>
    <ol className="about-pitches">{aboutPitches.map(pitch => <li className={`about-pitch about-pitch--${pitch.id}`} key={pitch.id}>
      <span className="about-pin" aria-hidden="true" />
      <div className="about-pitch-copy"><h3>{pitch.title}</h3>{pitch.stat && <p className="about-stat">{pitch.stat}</p>}<p className="about-body">{pitch.body}</p></div>
      {pitch.id === "builder" && <PhotoRing cards={builderCards} label="Hackathon projects" kind="project" />}
      {pitch.id === "teacher" && <PhotoRing cards={teacherCards} label="Teaching moments" kind="photo" />}
    </li>)}</ol>
    <p className="section-coordinate">Base camp · Beginning the ascent</p>
  </section>;
}
