const NS = "http://www.w3.org/2000/svg";
const ANIMATED = "animate, animateTransform, animateMotion";
const ISOLATED = ".lm, .lift, .campfire, #a-walked, #a-climber";

// Give animated artwork its own paint surfaces. The original vector nodes stay
// live in the same depth order; camera travel never swaps artwork or timelines.
export function createMountainLayers(svg: SVGSVGElement, camera: HTMLElement) {
  const children = Array.from(svg.children);
  const original = { viewBox: svg.getAttribute("viewBox")!, width: svg.getAttribute("width")!, height: svg.getAttribute("height")! };
  const entries: { node: Element; ancestors: Element[]; isolated: boolean; parent: Node; next: ChildNode | null }[] = [];
  const layers: { svg: SVGSVGElement; host: HTMLDivElement }[] = [];

  function collect(node: Element, ancestors: Element[] = []) {
    if (node.tagName === "defs") return;
    const isolated = node.matches(ISOLATED) || Boolean(node.querySelector(".summit-flag"))
      || Array.from(node.children).some((child) => child.matches(ANIMATED));
    if (!isolated && node.querySelector(`${ANIMATED}, ${ISOLATED}`)) {
      Array.from(node.children).forEach((child) => collect(child, [...ancestors, node]));
    } else entries.push({ node, ancestors, isolated, parent: node.parentNode!, next: node.nextSibling });
  }
  children.forEach((node) => collect(node));
  svg.replaceChildren(...children.filter((node) => node.tagName === "defs"));
  let current: SVGSVGElement | undefined;
  let ancestors: Element[] = [], wrappers: Element[] = [];
  for (const entry of entries) {
    if (!current || entry.isolated) {
      const root = layers.length ? document.createElementNS(NS, "svg") : svg;
      if (root !== svg) {
        root.setAttribute("viewBox", original.viewBox);
        root.setAttribute("width", original.width);
        root.setAttribute("height", original.height);
        root.setAttribute("role", "group");
      }
      root.classList.add("climb-layer-svg");
      const host = document.createElement("div");
      host.className = "climb-paint-layer";
      camera.append(host);
      host.append(root);
      layers.push({ svg: root, host });
      current = root;
      ancestors = [];
      wrappers = [];
    }
    let parent: Element = current;
    entry.ancestors.forEach((ancestor, index) => {
      if (ancestors[index] !== ancestor) {
        ancestors.length = wrappers.length = index;
        const wrapper = ancestor.cloneNode(false) as Element;
        wrapper.removeAttribute("id");
        parent.append(wrapper);
        ancestors.push(ancestor);
        wrappers.push(wrapper);
      }
      parent = wrappers[index];
    });
    ancestors.length = wrappers.length = entry.ancestors.length;
    parent.append(entry.node);
    if (entry.isolated) current = undefined;
  }
  let measured = false;
  return {
    measure() {
      if (measured) return;
      const boxes = layers.map((layer) => layer.svg.getBBox());
      // List View can mount the enhancement while hidden. Wait for real bounds.
      if (boxes.some((box) => !box.width || !box.height)) return;
      boxes.forEach((box, index) => {
        // Include strokes, blur spread and small animated excursions. SVG
        // overflow stays visible, including the climber's full trail travel.
        const pad = 96, x = Math.floor(box.x - pad), y = Math.floor(box.y - pad);
        const width = Math.ceil(box.width + pad * 2), height = Math.ceil(box.height + pad * 2);
        const layer = layers[index];
        layer.svg.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
        layer.svg.setAttribute("width", String(width));
        layer.svg.setAttribute("height", String(height));
        Object.assign(layer.host.style, { left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px` });
      });
      measured = true;
    },
    dispose() {
      // Restore the same nodes for React cleanup, including cached hit targets.
      svg.replaceChildren(...children);
      for (const entry of [...entries].reverse()) entry.parent.insertBefore(entry.node, entry.next);
      for (const [name, value] of Object.entries(original)) svg.setAttribute(name, value);
      svg.classList.remove("climb-layer-svg");
      camera.append(svg);
      layers.forEach((layer) => layer.host.remove());
    },
  };
}
