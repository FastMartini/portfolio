import { BRAND, brandGreeting } from "./brand";

type Add = (target: Element | null, frames: Keyframe[], timing: KeyframeAnimationOptions) => Animation | null;

function letters(copy: HTMLElement) {
  for (const word of copy.querySelectorAll<HTMLElement>(".splash-word")) {
    const text = word.firstChild!, box = word.getBoundingClientRect();
    const positions = [...(text.textContent ?? "")].map((character, i) => {
      const range = document.createRange(); range.setStart(text, i); range.setEnd(text, i + 1);
      return { character, left: range.getBoundingClientRect().left - box.left };
    });
    const size = document.createElement("span"); size.textContent = text.textContent; size.style.visibility = "hidden";
    word.replaceChildren(size);
    for (const { character, left } of positions) {
      const span = document.createElement("span"); span.className = "hero-reveal-letter";
      span.textContent = character;
      Object.assign(span.style, { position: "absolute", left: `${left}px`, top: "0", display: "inline-block" });
      word.append(span);
    }
  }
}

export function revealGreeting(paper: HTMLElement, page: HTMLElement, add: Add, start: number) {
  add(paper, [{ opacity: 0 }, { opacity: 1 }], { delay: start, duration: 1, fill: "both" });
  letters(paper);
  page.replaceChildren(...[...paper.childNodes].map(node => node.cloneNode(true)));
  brandGreeting(paper, start, add, true);
  brandGreeting(page, start, add, false);
  const end = start + BRAND.settle;
  // Restore the entire shaped heading before the paper handoff, including
  // kerning across React text-node boundaries (such as the y and comma).
  for (const copy of [paper, page]) {
    const lines = [...copy.children];
    const complete = copy.ownerDocument.createElement("span");
    Object.assign(complete.style, { position: "absolute", inset: "0" });
    complete.append(...[...document.getElementById("trailhead-title")!.childNodes].map(node => node.cloneNode(true)));
    copy.append(complete);
    add(complete, [{ opacity: 0 }, { opacity: 1 }], { delay: end, duration: 1, fill: "both" });
    lines.forEach(line => add(line,
      [{ opacity: 1 }, { opacity: 0 }], { delay: end, duration: 1, fill: "forwards" }));
  }
  document.querySelectorAll("#trailhead .trailhead-lead, #trailhead .trailhead-actions").forEach(target => add(target,
    [{ opacity: 0, translate: "0 5px" }, { opacity: 1, translate: "0 0" }],
    { delay: end, duration: 320, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" }));
}
