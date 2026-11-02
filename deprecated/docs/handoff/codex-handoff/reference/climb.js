(function () {
  "use strict";
  var html = document.documentElement;
  var reduceQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------------- Stops along the trail ---------------- */
  var STOPS = [
    { kind: "section", name: "Trailhead", elev: "Starting ground" },
    { kind: "section", name: "Base camp", elev: "About" },
    { kind: "wp", n: 1, slug: "momentumx", name: "MomentumX", elev: "First ridge", caseId: "case-momentumx" },
    { kind: "wp", n: 2, slug: "veritas", name: "Veritas", elev: "Pine line", caseId: "case-veritas" },
    { kind: "wp", n: 3, slug: "membership-inference-attack", name: "Membership Inference Attack Study", elev: "Open slope", caseId: "case-membership-inference-attack" },
    { kind: "wp", n: 4, slug: "high-momentum-scanner", name: "High-Momentum Scanner", elev: "Ridgeline" },
    { kind: "wp", n: 5, slug: "medvoyage", name: "MedVoyage", elev: "Upper ridge" },
    { kind: "wp", n: 6, slug: "hari", name: "HaRi", elev: "High pass" },
    { kind: "section", name: "A quiet overlook", elev: "Beyond Work" },
    { kind: "section", name: "Summit", elev: "Contact" }
  ];
  var STOP_T = [0, 0.07, 0.17, 0.28, 0.39, 0.5, 0.61, 0.71, 0.81, 1];
  var N = STOPS.length;
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function mixC(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  function css(c) { return "rgb(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + ")"; }
  function keyed(frames, t) {
    for (var i = 0; i < frames.length - 1; i++) {
      if (t <= frames[i + 1][0]) {
        var k = smooth(frames[i][0], frames[i + 1][0], t);
        return frames[i].slice(1).map(function (c, j) { return mixC(c, frames[i + 1][j + 1], k); });
      }
    }
    return frames[frames.length - 1].slice(1);
  }

  /* Weather by altitude: morning trail -> mist -> overcast -> snow -> through clouds -> clear blue summit */
  var SKY = [
    [0.00, hex("#e7dcc0"), hex("#f6efdc"), hex("#f2dcb5")],
    [0.30, hex("#cbd5cb"), hex("#e6e8dc"), hex("#e9e2cf")],
    [0.52, hex("#a9b3b6"), hex("#d3d8d5"), hex("#cfd3d4")],
    [0.70, hex("#8f9aa1"), hex("#c3cacd"), hex("#c4c9cd")],
    [0.84, hex("#ccd5db"), hex("#e7ebec"), hex("#e3e6e8")],
    [0.90, hex("#e6edf1"), hex("#f4f7f8"), hex("#f5f2ea")],
    [0.95, hex("#3f8ad4"), hex("#bfe0f5"), hex("#fff6dc")],
    [1.00, hex("#2b78cc"), hex("#a8d5f4"), hex("#fff8e4")]
  ];
  function weather(t) {
    var k = keyed(SKY, t);
    return {
      top: k[0], bottom: k[1], light: k[2],
      snow: smooth(0.5, 0.6, t) * (1 - smooth(0.82, 0.88, t)),
      haze: smooth(0.83, 0.875, t) * (1 - smooth(0.885, 0.93, t)) * 0.85,
      sun: smooth(0.9, 0.98, t)
    };
  }

  /* ---------------- DOM ---------------- */
  var climb = document.getElementById("climb");
  var stage = document.getElementById("stage");
  var sky = document.getElementById("sky");
  var markersEl = document.getElementById("markers");
  var cards = Array.prototype.slice.call(document.querySelectorAll(".card"));
  var sign = document.getElementById("trail-sign");
  var signPlace = document.getElementById("sign-place");
  var signName = document.getElementById("sign-name");
  var signOpen = document.getElementById("sign-open");
  var railEl = document.getElementById("rail");
  var panel = document.getElementById("panel");
  var panelBody = document.getElementById("panel-body");
  var panelKicker = document.getElementById("panel-kicker");
  var panelBack = document.getElementById("panel-back");
  var panelClose = document.getElementById("panel-close");
  var viewToggle = document.getElementById("view-toggle");
  var snowCanvas = document.getElementById("snow");
  var sketchHost = document.getElementById("sketch-a");

  var markers = STOPS.map(function (s, i) {
    if (s.kind !== "wp") return null;
    var b = document.createElement("button");
    b.type = "button"; b.className = "marker";
    b.setAttribute("aria-label", "Open Waypoint " + pad(s.n) + ": " + s.name);
    b.innerHTML = '<span class="marker-pin" aria-hidden="true">' + pad(s.n) + '</span><span class="marker-label" aria-hidden="true">' + s.name + "<small>" + s.elev + "</small></span>";
    b.addEventListener("click", function () { openPanel(i, false, b); });
    markersEl.appendChild(b);
    return b;
  });
  var railButtons = STOPS.map(function (s, i) {
    var li = document.createElement("li");
    var b = document.createElement("button");
    b.type = "button";
    if (s.kind === "wp") b.setAttribute("data-wp", "");
    b.setAttribute("aria-label", "Go to " + (s.kind === "wp" ? "Waypoint " + pad(s.n) + ": " + s.name : s.name));
    b.title = s.kind === "wp" ? s.name : s.name;
    b.innerHTML = "<span></span>";
    b.addEventListener("click", function () { goto(i); });
    li.appendChild(b); railEl.insertBefore(li, railEl.firstChild);
    return b;
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-goto]"), function (b) {
    b.addEventListener("click", function () { goto(+b.getAttribute("data-goto")); });
  });

  /* ---------------- Scroll -> trail position ---------------- */
  var targetT = 0, shownT = 0, u = 0;
  function scrollRange() { return Math.max(1, climb.offsetHeight - window.innerHeight); }
  function readScroll() {
    var s = clamp((window.scrollY - climb.offsetTop) / scrollRange(), 0, 1);
    u = s * (N - 1);
    var i = Math.min(N - 2, Math.floor(u)), f = u - i;
    var local = smooth(0.18, 0.82, f); // dwell at each stop
    targetT = lerp(STOP_T[i], STOP_T[i + 1], local);
  }
  function goto(i) {
    if (html.classList.contains("list-mode")) setListMode(false);
    var y = climb.offsetTop + (i / (N - 1)) * scrollRange();
    window.scrollTo({ top: y, behavior: reduceQ.matches ? "auto" : "smooth" });
  }

  /* ---------------- Sketch A: illustrated side view ---------------- */
  function SketchA(host) {
    var W = 2000, Hh = 3200, X = 2.0;
    var L = [[-480, 3200], [-480, 3060], [-380, 2990], [-300, 2920], [-200, 2800], [-120, 2700], [-50, 2580], [0, 2450], [50, 2350], [95, 2390], [130, 2080], [185, 2120], [215, 1700], [262, 1720], [280, 1260], [325, 1290], [330, 860], [372, 885], [400, 560], [428, 578], [455, 360], [480, 372], [515, 210], [545, 150]].map(function (p) { return [p[0] * X, p[1]]; });
    var R = [[545, 150], [578, 212], [605, 200], [635, 360], [662, 350], [690, 560], [718, 548], [760, 860], [795, 842], [820, 1260], [858, 1240], [885, 1700], [925, 1680], [955, 2100], [985, 2080], [1000, 2350], [1050, 2470], [1120, 2590], [1200, 2700], [1300, 2810], [1400, 2930], [1480, 3000], [1580, 3060], [1580, 3200]].map(function (p) { return [p[0] * X, p[1]]; });
    function crossings(pts, y) {
      var xs = [];
      for (var i = 0; i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1];
        if ((y - a[1]) * (y - b[1]) <= 0 && a[1] !== b[1]) xs.push(a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]));
      }
      return xs;
    }
    function leftX(y) { var xs = crossings(L, y); return xs.length ? Math.max.apply(null, xs) : 0; }
    function rightX(y) { var xs = crossings(R, y); return xs.length ? Math.min.apply(null, xs) : W; }
    // The trail and landmarks keep their original layout: the wider flanks are scenery only
    function trailL(y) { return Math.max(0, leftX(y)); }
    function trailR(y) { return Math.min(W, rightX(y)); }
    var rnd = (function () { var s = 7; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
    function jag(y0, amp, step) {
      var pts = [];
      for (var x = -1010; x <= W + 1210; x += step) pts.push([x, y0 + (rnd() - 0.5) * amp + Math.sin(x * 0.02) * amp * 0.4]);
      return pts;
    }
    function poly(pts) { return pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "); }
    var silhouette = poly(L.concat(R.slice(1)));
    // Snow cap: jagged lower edge
    var snowEdge = jag(1320, 150, 38);
    var snowPoly = [[-10, 0]].concat(snowEdge.slice()).concat([[1010, 0]]);
    snowPoly = snowEdge.concat([[W + 1210, -10], [-1010, -10]]);
    var forestEdge = jag(2200, 120, 34);
    var forestPoly = forestEdge.concat([[W + 1210, 3210], [-1010, 3210]]);
    var meadowPoly = jag(3020, 40, 40).concat([[W + 1210, 3210], [-1010, 3210]]);
    // Foothills: meadow and forest that run past the mountain's base to the screen edges
    function hills(y0, amp, seed, x0, x1) {
      var sd = seed, r3 = function () { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
      var pts = [[x0, 3260]];
      for (var x = x0; x <= x1; x += 90 + r3() * 120) pts.push([x, y0 - r3() * amp - Math.sin(x * 0.002) * amp * 0.5]);
      pts.push([x1, 3260]);
      return pts;
    }
    var hillsBack = hills(2620, 260, 5, -3200, 4600), hillsFront = hills(2950, 120, 9, -3200, 4600);
    // Ground line of a jagged band or hill: interpolate its top edge at x
    function topAt(pts, x) {
      for (var k = 0; k < pts.length - 1; k++) {
        var a4 = pts[k], b4 = pts[k + 1];
        if (a4[0] !== b4[0] && x >= Math.min(a4[0], b4[0]) && x <= Math.max(a4[0], b4[0]) && a4[1] < 3255 && b4[1] < 3255)
          return a4[1] + (b4[1] - a4[1]) * (x - a4[0]) / (b4[0] - a4[0]);
      }
      return Infinity;
    }
    function pine(x, y, sz) {
      return '<path d="M' + x.toFixed(0) + " " + (y - sz * 2.1).toFixed(0) + "l" + (-sz * 0.65).toFixed(1) + " " + (sz * 2.1).toFixed(1) + "h" + (sz * 1.3).toFixed(1) + 'Z" fill="' + (rnd() > 0.5 ? "#203a2e" : "#2c4b39") + '"/>';
    }
    var hillTrees = "";
    for (var hy = 2520, hrow = 0; hy < 3190; hy += 30, hrow++) {
      for (var hx = -3100 + (hrow % 2) * 35; hx < 4500; hx += 70) {
        if (rnd() < 0.3) continue;
        var px2 = hx + (rnd() - 0.5) * 22, py2 = hy + (rnd() - 0.5) * 8;
        if (px2 > leftX(py2) - 20 && px2 < rightX(py2) + 20 && py2 < 3100) continue;  // the mountain is here
        if (py2 < topAt(hillsBack, px2) + 16) continue;                                 // nothing to stand on
        hillTrees += pine(px2, py2, 12 + rnd() * 11);
      }
    }
    var shadePoly = [[545 * X, 150]].concat(R.slice(1)).concat([[620, 3200], [585, 1600], [565, 700], [555, 330]].map(function (p) { return [p[0] * X, p[1]]; }));
    // Trail switchbacks
    var legs = 13, tp = [];
    for (var k = 0; k <= legs; k++) {
      var y = 3130 - k * (3130 - 330) / legs;
      var l = trailL(y), r = trailR(y), m = 0.2 * (r - l) + 18;
      tp.push([k % 2 === 0 ? l + m + (k === 0 ? 40 : 0) : r - m, y]);
    }
    tp.push([545 * X, 168]);
    tp[0] = [W * 0.3, 3150];
    var d = "M" + tp[0][0] + " " + tp[0][1];
    for (var i = 0; i < tp.length - 1; i++) {
      var p0 = tp[Math.max(0, i - 1)], p1 = tp[i], p2 = tp[i + 1], p3 = tp[Math.min(tp.length - 1, i + 2)];
      var c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      var c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += " C" + c1[0].toFixed(1) + " " + c1[1].toFixed(1) + " " + c2[0].toFixed(1) + " " + c2[1].toFixed(1) + " " + p2[0].toFixed(1) + " " + p2[1].toFixed(1);
    }
    // Sample the trail before drawing so landmarks can be placed into the scene's depth order
    var NS = "http://www.w3.org/2000/svg";
    var tmpSvg = document.createElementNS(NS, "svg"), tmpPath = document.createElementNS(NS, "path");
    tmpSvg.setAttribute("style", "position:absolute;width:0;height:0;visibility:hidden");
    tmpPath.setAttribute("d", d); tmpSvg.appendChild(tmpPath); host.appendChild(tmpSvg);
    var len = tmpPath.getTotalLength(), samples = [];
    for (var q = 0; q <= 600; q++) { var pt = tmpPath.getPointAtLength(len * q / 600); samples.push([pt.x, pt.y]); }
    host.removeChild(tmpSvg);
    function at(t) { var f = clamp(t, 0, 1) * 600, i0 = Math.floor(f), i1 = Math.min(600, i0 + 1), k2 = f - i0; return [lerp(samples[i0][0], samples[i1][0], k2), lerp(samples[i0][1], samples[i1][1], k2)]; }

    /* ---------- Waypoint landmarks: flat fills in the world palette, lit from the left like the mountain ---------- */
    var WALL = "#d6ccb5", WALL_S = "#b3a891", ROOF = "#93573b", ROOF_S = "#74432e", ROOF_L = "#a8694b", WOOD = "#6a5240", WOOD_D = "#4b3a2c",
        WIN = "#2a2f2b", WARM = "#f0c46f", STEEL = "#545b56", SNOW = "#f1f0ea", SNOW_S = "#d6dadd", PINE = "#2c4b39",
        STW = "#b8a88e", STW_S = "#94846d", STW_H = "#d0c2a7", MORTAR = "#cfc3ab";
    function line(d2, c, w, extra) { return '<path d="' + d2 + '" fill="none" stroke="' + c + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"' + (extra || "") + "/>"; }
    function shape(d2, c, extra) { return '<path d="' + d2 + '" fill="' + c + '"' + (extra || "") + "/>"; }
    function rect(x, y, w, h, c, extra) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + c + '"' + (extra || "") + "/>"; }
    function shadow(w) { return '<ellipse cx="' + (w * 0.45).toFixed(0) + '" cy="1" rx="' + w + '" ry="' + (w * 0.14).toFixed(0) + '" fill="#1f2621" opacity="0.24" filter="url(#lm-blur)"/>'; }
    var lightSeed = 0;
    function pulseOpacity(lo, hi, dur) {
      lightSeed += 0.77;
      return '<animate attributeName="opacity" values="' + lo + ";" + hi + ";" + ((lo + hi) / 2).toFixed(2) + ";" + hi + ";" + lo + '" dur="' + dur + 's" begin="-' + (lightSeed % dur).toFixed(2) + 's" repeatCount="indefinite"/>';
    }
    // A lit window: warm pane that slowly brightens and dims, soft glow, wooden frame, mullions and sill
    function warmWin(x, y, w, h, shutters) {
      var cx = x + w / 2, cy = y + h / 2, out = "";
      out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (Math.max(w, h) * 0.85).toFixed(1) + '" fill="' + WARM + '" opacity="0.12" filter="url(#lm-glow)">' + pulseOpacity(0.04, 0.22, 3.8) + "</circle>";
      if (shutters) out += rect(x - 6, y - 1, 5, h + 2, WOOD) + rect(x + w + 1, y - 1, 5, h + 2, WOOD);
      out += rect(x - 1.5, y - 1.5, w + 3, h + 3, WOOD_D);
      out += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + WARM + '">' + pulseOpacity(0.62, 1, 3.8) + "</rect>";
      out += line("M" + cx + " " + y + " V" + (y + h) + " M" + x + " " + cy + " H" + (x + w), WOOD_D, 1);
      out += rect(x - 3, y + h + 1, w + 6, 2.5, WOOD_D);
      return out;
    }
    // Rising, drifting smoke made of soft puffs that grow and fade
    function smoke(x, y, scale) {
      var out = '<g filter="url(#lm-smoke)">', n = 6, dur = 7.5, s = scale || 1;
      for (var k = 0; k < n; k++) {
        var b = "-" + (k * dur / n).toFixed(2) + "s";
        out += '<circle cx="' + x + '" cy="' + y + '" r="3" fill="#e6e6e1" opacity="0">' +
          '<animate attributeName="cy" values="' + y + ";" + (y - 46 * s) + ";" + (y - 96 * s) + '" dur="' + dur + 's" begin="' + b + '" repeatCount="indefinite"/>' +
          '<animate attributeName="cx" values="' + x + ";" + (x + 9 * s) + ";" + (x + 30 * s) + '" dur="' + dur + 's" begin="' + b + '" repeatCount="indefinite"/>' +
          '<animate attributeName="r" values="' + (3 * s) + ";" + (9 * s) + ";" + (17 * s) + '" dur="' + dur + 's" begin="' + b + '" repeatCount="indefinite"/>' +
          '<animate attributeName="opacity" values="0;0.62;0.32;0" keyTimes="0;0.15;0.6;1" dur="' + dur + 's" begin="' + b + '" repeatCount="indefinite"/>' +
          "</circle>";
      }
      return out + "</g>";
    }
    // Bullwheel with turning spokes
    function bullwheel(cx, cy, r, dir) {
      return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + STEEL + '" stroke-width="3.2"/>' +
        '<g>' + line("M" + cx + " " + (cy - r) + " V" + (cy + r) + " M" + (cx - r) + " " + cy + " H" + (cx + r) +
          " M" + (cx - r * 0.7) + " " + (cy - r * 0.7) + " L" + (cx + r * 0.7) + " " + (cy + r * 0.7) +
          " M" + (cx + r * 0.7) + " " + (cy - r * 0.7) + " L" + (cx - r * 0.7) + " " + (cy + r * 0.7), STEEL, 1) +
        '<animateTransform attributeName="transform" type="rotate" from="0 ' + cx + " " + cy + '" to="' + (360 * (dir || 1)) + " " + cx + " " + cy + '" dur="7s" repeatCount="indefinite"/></g>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="3" fill="' + ROOF + '"/>';
    }
    // Two-tone pitched roof with an overhang, shingle courses and a ridge cap
    function roof(x0, x1, yBase, yPeak, thick) {
      var mx = (x0 + x1) / 2, out = "";
      out += shape("M" + x0 + " " + yBase + " L" + mx + " " + yPeak + " L" + mx + " " + (yBase + thick) + " L" + x0 + " " + (yBase + thick) + " Z", ROOF);
      out += shape("M" + mx + " " + yPeak + " L" + x1 + " " + yBase + " L" + x1 + " " + (yBase + thick) + " L" + mx + " " + (yBase + thick) + " Z", ROOF_S);
      // shingle courses: horizontal runs from each eave to the ridge
      for (var c2 = 1; c2 <= 3; c2++) {
        var h2 = c2 / 4, yy2 = yBase - (yBase - yPeak) * h2, xl = x0 + (mx - x0) * h2, xr = x1 - (x1 - mx) * h2;
        out += line("M" + (xl + 1) + " " + yy2 + " L" + (mx - 0.5) + " " + yy2, ROOF_L, 1, ' opacity="0.55"');
        out += line("M" + (mx + 0.5) + " " + yy2 + " L" + (xr - 1) + " " + yy2, "#5f3624", 1, ' opacity="0.55"');
      }
      out += line("M" + (mx - 5) + " " + (yPeak + 3) + " L" + mx + " " + (yPeak - 1) + " L" + (mx + 5) + " " + (yPeak + 3), WOOD_D, 2.2);
      return out;
    }
    // Irregular coursed masonry in warm stone
    function masonry(x, y, w, h, seed) {
      var sd = seed, r = function () { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
      var out = rect(x, y, w, h, MORTAR), rowH = 8;
      for (var yy = y; yy < y + h - 0.5; yy += rowH) {
        var xx = x + ((yy - y) / rowH % 2 ? -4 : 0), hh = Math.min(rowH - 1.5, y + h - yy - 1);
        while (xx < x + w) {
          var bw = 9 + r() * 10, x0 = Math.max(x, xx), x1 = Math.min(x + w, xx + bw - 1.5);
          if (x1 - x0 > 2) {
            var tone = r(); var col = tone < 0.33 ? STW_S : tone < 0.8 ? STW : STW_H;
            out += '<rect x="' + x0.toFixed(1) + '" y="' + (yy + 0.75).toFixed(1) + '" width="' + (x1 - x0).toFixed(1) + '" height="' + hh.toFixed(1) + '" rx="1.5" fill="' + col + '"/>';
          }
          xx += bw;
        }
      }
      return out;
    }

    // 01: fire lookout watchtower
    function watchtower() {
      var g = shadow(55);
      g += rect(-38, -4, 10, 5, STW_S) + rect(28, -4, 10, 5, STW_S);
      g += line("M-34 0 L-19 -118 M34 0 L19 -118", WOOD_D, 5) + line("M-22 0 L-12 -118 M22 0 L12 -118", WOOD, 3);
      g += line("M-31 -20 L28 -56 M31 -20 L-28 -56 M-28 -56 L24 -92 M28 -56 L-24 -92 M-24 -92 L20 -116 M24 -92 L-20 -116", WOOD, 1.6);
      g += line("M-31 -20 H31 M-28 -56 H28 M-24 -92 H24", WOOD_D, 2.2);
      g += line("M4 0 L2 -118 M12 0 L10 -118", WOOD_D, 1.4);
      for (var r2 = 1; r2 < 12; r2++) g += line("M" + (4 - r2 * 0.17).toFixed(1) + " " + (-r2 * 10) + " H" + (12 - r2 * 0.17).toFixed(1), WOOD_D, 1);
      g += rect(-36, -126, 72, 8, WOOD_D);
      g += rect(-27, -160, 54, 34, WALL) + rect(4, -160, 23, 34, WALL_S);
      g += line("M-27 -152 H27 M-27 -144 H27 M-27 -136 H27", WALL_S, 0.8, ' opacity="0.8"');
      g += rect(-23, -154, 46, 14, WOOD_D);
      g += rect(-21, -152, 13, 10, WIN) + '<rect x="-6.5" y="-152" width="13" height="10" fill="' + WARM + '">' + pulseOpacity(0.55, 1, 4.2) + "</rect>" + rect(8, -152, 13, 10, WIN);
      g += line("M-36 -126 V-136 M-24 -126 V-136 M-12 -126 V-136 M0 -126 V-136 M12 -126 V-136 M24 -126 V-136 M36 -126 V-136 M-37 -136 H37", WOOD_D, 1.4);
      g += roof(-38, 38, -158, -186, 4);
      g += line("M0 -186 V-200", WOOD_D, 1.6) + '<path fill="' + ROOF + '" d="M0 -200 Q6 -200 13 -196.5 Q6 -194 0 -193 Z"><animate attributeName="d" dur="1.8s" repeatCount="indefinite" values="M0 -200 Q6 -200 13 -196.5 Q6 -194 0 -193 Z;M0 -200 Q6 -198 13 -198 Q6 -195 0 -193 Z;M0 -200 Q6 -201 12 -195.5 Q6 -193 0 -193 Z;M0 -200 Q6 -200 13 -196.5 Q6 -194 0 -193 Z"/></path>';
      return { svg: g, top: -202, w: 50 };
    }

    // 02: chairlift base station with a covered bullwheel terminal
    function liftBase() {
      var g = shadow(88);
      g += masonry(-52, -9, 88, 9, 3);
      g += rect(-50, -54, 84, 45, WOOD) + rect(10, -54, 24, 45, WOOD_D, ' opacity="0.55"');
      for (var bx = -45; bx < 34; bx += 6) g += line("M" + bx + " -54 V-9", WOOD_D, 0.8, ' opacity="0.45"');
      g += rect(-50, -54, 84, 5, "#1f2621", ' opacity="0.22"');
      g += roof(-60, 44, -52, -86, 5);
      g += rect(-23, -36, 20, 27, WOOD_D) + rect(-21, -34, 16, 25, WIN) + '<circle cx="-8" cy="-21" r="1.2" fill="' + WARM + '"/>';
      g += rect(-25, -46, 24, 8, WALL) + '<text x="-13" y="-39.5" font-family="Manrope, sans-serif" font-size="6.5" font-weight="800" text-anchor="middle" fill="' + WIN + '">LIFT</text>';
      g += warmWin(-44, -40, 13, 11, false);
      g += warmWin(16, -40, 11, 11, false);
      // terminal
      g += rect(36, -6, 44, 6, WOOD_D);
      g += line("M40 -6 V-66 M76 -6 V-70", STEEL, 3);
      g += shape("M34 -64 L84 -71 L84 -66 L34 -59 Z", ROOF_S) + line("M34 -64 L84 -71", ROOF, 1.5);
      g += bullwheel(58, -42, 14, 1);
      return { svg: g, top: -92, w: 75, cable: [58, -56] };
    }

    // 03: A-frame ski lodge with the lift's top terminal built onto its side and skis on a rack
    function skiLodge() {
      var g = shadow(95);
      // lift terminal lean-to attached to the lodge
      g += rect(-140, -6, 92, 6, WOOD_D);
      g += line("M-132 -6 V-56 M-86 -6 V-62", STEEL, 3);
      g += shape("M-24 -64 L-142 -52 L-142 -46 L-24 -58 Z", ROOF_S) + line("M-24 -64 L-142 -52", ROOF, 1.5);
      g += shape("M-142 -52 L-24 -64 L-24 -62 L-142 -50 Z", SNOW, ' opacity="0.9"');
      g += bullwheel(-106, -34, 13, -1);
      // lodge: chimney first so it rises out of the roof slope
      g += masonry(14, -100, 11, 62, 11) + rect(12, -104, 15, 4, STW_S) + rect(12, -106, 15, 2, SNOW);
      g += roof(-58, 58, 4, -116, 0);
      g += shape("M-36 0 L0 -78 L36 0 Z", WALL) + shape("M0 -78 L36 0 L0 0 Z", WALL_S);
      for (var vx = -30; vx <= 30; vx += 6) {
        var top = -78 + Math.abs(vx) * (78 / 36);
        g += line("M" + vx + " " + top.toFixed(1) + " V0", WALL_S, 0.8, ' opacity="0.7"');
      }
      g += shape("M-58 4 L-30 -54 L-27 -52 L-54 4 Z", SNOW, ' opacity="0.9"');
      g += '<path d="M-15 -42 L0 -70 L15 -42 Z" fill="' + WOOD_D + '"/>';
      g += '<path d="M-12 -43.5 L0 -66 L12 -43.5 Z" fill="' + WARM + '">' + pulseOpacity(0.6, 1, 4.6) + "</path>";
      g += line("M0 -66 V-43.5 M-7 -52 H7", WOOD_D, 1);
      g += rect(-28, -34, 56, 3, WOOD_D);
      for (var bal = -26; bal <= 26; bal += 4) g += line("M" + bal + " -34 V-41", WOOD_D, 0.9);
      g += line("M-28 -41 H28", WOOD_D, 1.6);
      g += rect(-8, -23, 16, 23, WOOD_D) + rect(-6, -21, 12, 21, ROOF) + '<circle cx="3" cy="-10" r="1" fill="' + WARM + '"/>';
      g += warmWin(-24, -22, 9, 10, false) + warmWin(15, -22, 9, 10, false);
      g += smoke(19.5, -110, 1);
      return { svg: g, top: -130, w: 92, cable: [-106, -47] };
    }

    // 04: stone radio and weather station; dish and beacon send out signal pulses
    function radioStation() {
      var g = shadow(70);
      g += masonry(-50, -40, 64, 40, 21);
      g += rect(-8, -40, 22, 40, "#1f2621", ' opacity="0.14"');
      g += rect(-56, -46, 76, 6, WOOD_D) + rect(-56, -46, 76, 1.5, WOOD);
      g += rect(-31, -27, 17, 27, WOOD_D) + rect(-29, -25, 13, 25, ROOF) + '<circle cx="-19" cy="-12" r="1" fill="' + WARM + '"/>';
      g += warmWin(-46, -32, 9, 9, false);
      g += rect(4, -54, 4, 8, STEEL) + rect(3, -56, 6, 2, STEEL);
      // dish on the roof, pointing up and left
      g += line("M-22 -46 L-17 -60", STEEL, 2.4);
      g += shape("M-40 -82 Q-10 -94 -5 -62 Q-28 -60 -40 -82 Z", WALL) + shape("M-20 -70 Q-10 -94 -5 -62 Q-14 -62 -20 -70 Z", WALL_S);
      g += line("M-21 -72 L-31 -84", STEEL, 1.2) + '<circle cx="-32" cy="-85" r="2" fill="' + STEEL + '"/>';
      // signal pulses leaving the dish
      for (var k = 0; k < 3; k++) {
        var b = "-" + (k * 0.9).toFixed(1) + "s";
        g += '<g transform="translate(-34 -88) rotate(-135)"><g opacity="0">' +
          line("M9 -10 A13 13 0 0 1 9 10", ROOF, 2.2) +
          '<animateTransform attributeName="transform" type="scale" values="0.5;2.4" dur="2.7s" begin="' + b + '" repeatCount="indefinite"/>' +
          '<animate attributeName="opacity" values="0;0.95;0" keyTimes="0;0.2;1" dur="2.7s" begin="' + b + '" repeatCount="indefinite"/></g></g>';
      }
      // lattice mast with a beacon
      g += line("M22 0 L33 -176 L44 0", STEEL, 3);
      for (var m = 0; m < 8; m++) {
        var y1 = -m * 22, y2 = -(m + 1) * 22, w1 = 11 - m * 1.3, w2 = 11 - (m + 1) * 1.3;
        g += line("M" + (33 - w1).toFixed(1) + " " + y1 + " L" + (33 + w2).toFixed(1) + " " + y2 + " M" + (33 - w2).toFixed(1) + " " + y2 + " H" + (33 + w2).toFixed(1), STEEL, 1);
      }
      for (var rr = 0; rr < 2; rr++) {
        var b2 = "-" + (rr * 1.4).toFixed(1) + "s";
        g += '<circle cx="33" cy="-180" r="4" fill="none" stroke="' + ROOF + '" stroke-width="1.6" opacity="0">' +
          '<animate attributeName="r" values="4;26" dur="2.8s" begin="' + b2 + '" repeatCount="indefinite"/>' +
          '<animate attributeName="opacity" values="0;0.8;0" keyTimes="0;0.15;1" dur="2.8s" begin="' + b2 + '" repeatCount="indefinite"/></circle>';
      }
      g += '<circle cx="33" cy="-180" r="7" fill="' + WARM + '" opacity="0.3">' + pulseOpacity(0.1, 0.45, 1.6) + "</circle>";
      g += '<circle cx="33" cy="-180" r="3.5" fill="' + ROOF + '">' + pulseOpacity(0.6, 1, 1.6) + "</circle>";
      return { svg: g, top: -206, w: 62 };
    }

    // 05: stone mountain refuge under a snowy roof, warm windows and a lantern
    // 05: a multi-pitch route up a steep cliff band painted into the mountain itself
    var ROPE = "#d38b3c";
    // A climber seen from behind, facing the wall. Feet at (0,0). Jointed limbs, harness with gear, helmet.
    function climber(x, y, jacket, helmet, pose, dur, delay, tilt) {
      var b = "-" + delay + "s", PANTS = "#3a3f46", PANTS_S = "#2c3036", SKIN = "#d9b08c", SHOE = "#1f2621";
      var P = {
        lead:   { lL: [[-2.2, -14], [-8, -18], [-9, -12]], lR: [[2.2, -14], [5, -7], [4.5, 0]], aL: [[-5, -26], [-9, -33], [-9.5, -41]], aR: [[5, -26], [10, -29], [11.5, -35]], pack: true },
        follow: { lL: [[-2.2, -14], [-6, -8], [-6, -1]], lR: [[2.2, -14], [7, -12], [7.5, -6]], aL: [[-5, -26], [-8, -33], [-7, -40]], aR: [[5, -26], [9, -33], [9.5, -40]], pack: false },
        hang:   { lL: [[-2.2, -14], [-9, -12], [-11, -5]], lR: [[2.2, -14], [-5, -10], [-7, -2]], aL: [[-5, -26], [-6, -32], [-4, -38]], aR: [[5, -26], [8.5, -20], [9, -15]], pack: false }
      }[pose];
      function limb(j, col, w) { return line("M" + j[0][0] + " " + j[0][1] + " L" + j[1][0] + " " + j[1][1] + " L" + j[2][0] + " " + j[2][1], col, w); }
      var out = '<g transform="translate(' + x + " " + y + ") rotate(" + (tilt || 0) + ') scale(1.12)"><g>';
      out += '<animateTransform attributeName="transform" type="translate" values="0 0;' + (pose === "lead" ? "0.6 -2.4" : "0.4 -1.2") + ';0 0" dur="' + dur + 's" begin="' + b + '" repeatCount="indefinite"/>';
      // legs: pants with a darker far leg, shoes at the feet
      out += limb(P.lR, PANTS_S, 3.6) + limb(P.lL, PANTS, 3.6);
      [P.lL[2], P.lR[2]].forEach(function (f) { out += '<ellipse cx="' + (f[0] + 0.6) + '" cy="' + (f[1] + 0.4) + '" rx="2.6" ry="1.5" fill="' + SHOE + '"/>'; });
      // harness: waist belt, leg loops, gear on the loops, chalk bag behind
      out += '<rect x="-3.6" y="-14.5" width="7.2" height="3" rx="1.4" fill="' + "#c2b8a4" + '"/>';
      out += '<rect x="-5.2" y="-17.2" width="10.4" height="2.8" rx="1" fill="#2a2f2b"/>';
      out += line("M-4.2 -14.5 Q-3.8 -12 -2.4 -12 M4.2 -14.5 Q3.8 -12 2.4 -12", "#2a2f2b", 1.2);
      ["#e0b04a", "#5d7891", "#b5653b"].forEach(function (c, k) { out += line("M" + (-5 + k * 0.4) + " " + (-15.5 + k * 0.2) + " l" + (-0.8 + k * 0.4) + " 3.6", c, 1.2); });
      out += line("M5 -15.6 l0.6 3.8 M5.8 -15.4 l1 3.2", "#a9b0ae", 1);
      out += '<rect x="-1.8" y="-18" width="3.6" height="3.6" rx="1" fill="#d6ccb5"/>';
      // torso: tapered jacket, shaded on its right side; a small pack for the leader
      var torso = "M-5.4 -27.8 Q-6.4 -22 -4.8 -16.8 L4.8 -16.8 Q6.4 -22 5.4 -27.8 Q0 -30 -5.4 -27.8 Z";
      out += '<path d="' + torso + '" fill="' + jacket + '"/>';
      out += '<path d="M0.6 -29.4 Q5 -29 5.4 -27.8 Q6.4 -22 4.8 -16.8 L1 -16.8 Q2.2 -22 0.6 -29.4 Z" fill="#1f2621" opacity="0.2"/>';
      out += line("M-4.6 -21.5 H4.6", "#1f2621", 0.7, ' opacity="0.25"');
      if (P.pack) out += '<rect x="-3.6" y="-27" width="7.2" height="7.5" rx="2" fill="' + WOOD_D + '"/><rect x="-3.6" y="-27" width="7.2" height="2.2" rx="1" fill="#6a5240"/>';
      // arms: sleeve to the elbow, forearm, hand; they reach and settle out of phase
      function arm(j, flip, phaseOffset) {
        var reach = pose === "hang" ? (flip ? "0;9;0" : "0;-8;0") : (flip ? "0;14;0" : "0;-22;0");
        return "<g>" + line("M" + j[0][0] + " " + j[0][1] + " L" + j[1][0] + " " + j[1][1], jacket, 3.2) +
          line("M" + j[1][0] + " " + j[1][1] + " L" + j[2][0] + " " + j[2][1], jacket, 2.6) +
          '<circle cx="' + j[2][0] + '" cy="' + j[2][1] + '" r="1.6" fill="' + SKIN + '"/>' +
          '<animateTransform attributeName="transform" type="rotate" values="' + reach.split(";").map(function (a) { return a + " " + j[0][0] + " " + j[0][1]; }).join(";") +
          '" dur="' + dur + 's" begin="-' + (delay + phaseOffset) + 's" repeatCount="indefinite"/></g>';
      }
      out += arm(P.aR, true, dur / 2) + arm(P.aL, false, 0);
      // neck, back of the head, helmet with brim, strap and a vent highlight
      out += rect(-1.3, -31, 2.6, 2.4, SKIN);
      out += '<ellipse cx="0" cy="-33.4" rx="3.9" ry="4.1" fill="#5a3d28"/>';
      out += '<path d="M-4.9 -33.6 A4.9 5 0 0 1 4.9 -33.6 L5.4 -32.4 Q0 -31.4 -5.4 -32.4 Z" fill="' + helmet + '"/>';
      out += '<path d="M-3.4 -36.2 A3.6 3.4 0 0 1 1 -38" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.35" stroke-linecap="round"/>';
      out += line("M-4.2 -32.4 Q-3.6 -30 -1.4 -29.6 M4.2 -32.4 Q3.6 -30 1.4 -29.6", "#2a2f2b", 0.7);
      return out + "</g></g>";
    }
    function quickdraw(x, y) {
      return '<circle cx="' + x + '" cy="' + y + '" r="1.3" fill="' + STEEL + '"/>' + line("M" + x + " " + y + " l0.8 4.5", "#a9b0ae", 1.2) + '<circle cx="' + (x + 0.8) + '" cy="' + (y + 5.5) + '" r="1.3" fill="none" stroke="#a9b0ae" stroke-width="0.9"/>';
    }
    function climbingWall() {
      var sd = 91, r = function () { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
      var g = "";
      // soft fade so the cliff band melts into the mountain instead of reading as a separate rock
      g += '<defs><radialGradient id="cliff-fade-g" cx="0.5" cy="0.5" r="0.5"><stop offset="0.55" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>' +
        '<mask id="cliff-fade" maskUnits="userSpaceOnUse" x="-140" y="-340" width="280" height="380"><ellipse cx="0" cy="-140" rx="105" ry="170" fill="url(#cliff-fade-g)"/></mask></defs>';
      var tex = "";
      tex += '<ellipse cx="0" cy="-140" rx="100" ry="168" fill="#6c665a" opacity="0.55"/>';
      // faceted rock: a jittered tessellation of angular blocks, each lit on its upper-left and shaded on its lower-right
      var cw = 24, ch2 = 20, colsN = 10, rowsN = 18, gx0 = -120, gy0 = -330, grid = [];
      for (var gy = 0; gy <= rowsN; gy++) {
        grid.push([]);
        for (var gx = 0; gx <= colsN; gx++) {
          grid[gy].push([gx0 + gx * cw + (gy % 2 ? cw / 2 : 0) + (r() - 0.5) * cw * 0.55, gy0 + gy * ch2 + (r() - 0.5) * ch2 * 0.6]);
        }
      }
      var tones = ["#8f877a", "#857d70", "#9a9284", "#7a7266"];
      for (var ry = 0; ry < rowsN; ry++) {
        for (var rx2 = 0; rx2 < colsN; rx2++) {
          var A1 = grid[ry][rx2], B1 = grid[ry][rx2 + 1], C1 = grid[ry + 1][rx2 + 1], D1 = grid[ry + 1][rx2];
          var base = tones[Math.floor(r() * tones.length)];
          var pt = function (q) { return q[0].toFixed(1) + " " + q[1].toFixed(1); };
          tex += '<path d="M' + pt(A1) + " L" + pt(B1) + " L" + pt(C1) + " L" + pt(D1) + ' Z" fill="' + base + '"/>';
          // shaded half of the block (toward the lower right)
          tex += '<path d="M' + pt(B1) + " L" + pt(C1) + " L" + pt(D1) + ' Z" fill="#3f3a32" opacity="' + (0.14 + r() * 0.16).toFixed(2) + '"/>';
          // lit upper edge
          if (r() > 0.45) tex += line("M" + pt(A1) + " L" + pt(B1), "#bdb4a4", 1.1, ' opacity="0.55"');
          // dark joint along some block edges
          if (r() > 0.5) tex += line("M" + pt(B1) + " L" + pt(C1), "#3a352d", 1.2, ' opacity="0.6"');
          if (r() > 0.7) tex += line("M" + pt(D1) + " L" + pt(C1), "#3a352d", 1, ' opacity="0.5"');
        }
      }
      // a few long jagged cracks running in different directions
      for (var ck = 0; ck < 6; ck++) {
        var cx3 = -70 + r() * 140, cy3 = -300 + r() * 220, ang = (r() - 0.5) * 2.2 + (r() > 0.5 ? Math.PI / 2 : 0), dd = "M" + cx3.toFixed(1) + " " + cy3.toFixed(1);
        for (var seg = 0; seg < 6; seg++) {
          ang += (r() - 0.5) * 0.9;
          cx3 += Math.cos(ang) * (10 + r() * 10); cy3 += Math.abs(Math.sin(ang)) * (10 + r() * 10);
          dd += " L" + cx3.toFixed(1) + " " + cy3.toFixed(1);
        }
        tex += line(dd, "#2e2a24", 1.6, ' opacity="0.65"') + line(dd.replace(/(-?\d+\.\d) (-?\d+\.\d)/g, function (m0, a3, b3) { return (parseFloat(a3) - 1.2).toFixed(1) + " " + (parseFloat(b3) - 1).toFixed(1); }), "#c2b9a8", 0.8, ' opacity="0.45"');
      }
      // overhanging roofs: rock wedges that jut from the wall, lit lip on top, deep shadow beneath
      [[-4, 50, -268], [-74, -30, -200], [8, 62, -116]].forEach(function (o) {
        var x0 = o[0], x1 = o[1], y0 = o[2], mx = (x0 + x1) / 2;
        // the roof is part of a band of rock: a fracture runs out from both sides with a stain beneath
        tex += line("M" + (x0 - 70) + " " + (y0 + 8) + " Q" + (x0 - 30) + " " + (y0 + 2) + " " + x0 + " " + (y0 + 1) + " M" + x1 + " " + (y0 - 1) + " Q" + (x1 + 30) + " " + (y0 + 2) + " " + (x1 + 70) + " " + (y0 - 4), "#3a352d", 2.2, ' opacity="0.7"');
        tex += line("M" + (x0 - 70) + " " + (y0 + 6) + " Q" + (x0 - 30) + " " + y0 + " " + x0 + " " + (y0 - 1) + " M" + x1 + " " + (y0 - 3) + " Q" + (x1 + 30) + " " + y0 + " " + (x1 + 70) + " " + (y0 - 6), "#b3aa99", 1.2, ' opacity="0.6"');
        tex += shape("M" + (x0 + 8) + " " + (y0 + 12) + " L" + (x1 - 8) + " " + (y0 + 8) + " L" + (x1 - 14) + " " + (y0 + 60) + " L" + (x0 + 14) + " " + (y0 + 64) + " Z", "#4f4a41", ' opacity="0.22"');
        tex += shape("M" + x0 + " " + y0 + " Q" + mx + " " + (y0 - 6) + " " + x1 + " " + (y0 - 2) + " Q" + (x1 - 6) + " " + (y0 + 10) + " " + (mx + 4) + " " + (y0 + 22) + " Q" + (x0 + 10) + " " + (y0 + 14) + " " + x0 + " " + y0 + " Z", "#2a2620", ' opacity="0.6"');
        tex += shape("M" + x0 + " " + y0 + " Q" + mx + " " + (y0 - 6) + " " + x1 + " " + (y0 - 2) + " Q" + mx + " " + (y0 - 1) + " " + (x0 + 6) + " " + (y0 + 3) + " Z", "#a59c8c");
        tex += shape("M" + (x0 + 6) + " " + (y0 - 1.5) + " Q" + mx + " " + (y0 - 7) + " " + (x1 - 6) + " " + (y0 - 3.5) + " Q" + mx + " " + (y0 - 4) + " " + (x0 + 6) + " " + (y0 + 0.5) + " Z", SNOW, ' opacity="0.85"');
      });
      // snow caught in cracks
      for (var s2 = 0; s2 < 9; s2++) {
        var sx = -70 + r() * 140, sy = -290 + r() * 280;
        tex += line("M" + sx.toFixed(0) + " " + sy.toFixed(0) + " l" + ((r() - 0.5) * 4).toFixed(1) + " " + (10 + r() * 14).toFixed(0), SNOW, 1.6, ' opacity="0.75"');
      }
      g += '<g mask="url(#cliff-fade)" opacity="0.6">' + tex + "</g>";
      // anchor bolts at the hanging belay
      g += '<circle cx="-16" cy="-176" r="1.6" fill="' + STEEL + '"/><circle cx="-8" cy="-177" r="1.6" fill="' + STEEL + '"/>' + line("M-16 -176 L-12 -170 L-8 -177", "#a9b0ae", 1);
      [[-6, -192], [0, -206], [4, -220], [8, -234], [14, -248]].forEach(function (q) { g += quickdraw(q[0], q[1]); });
      [[-20, -150], [-26, -124], [-30, -98]].forEach(function (q) { g += quickdraw(q[0], q[1]); });
      // ropes: belay up to the leader, belay down to the follower, and a loose tail swinging over the drop
      g += '<path d="M-12 -168 L-6 -186 L0 -200 L4 -214 L8 -228 Q12 -240 14 -242" fill="none" stroke="' + ROPE + '" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>';
      g += '<path d="M-13 -166 Q-18 -156 -20 -146 L-26 -120 L-30 -94 Q-32 -84 -33 -78" fill="none" stroke="' + ROPE + '" stroke-width="1.4" stroke-linecap="round"/>';
      g += '<path fill="none" stroke="' + ROPE + '" stroke-width="1.3" stroke-linecap="round" d="M-11 -166 Q4 -120 -2 -70 Q-6 -40 4 -10">' +
        '<animate attributeName="d" dur="4.5s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" values="M-11 -166 Q4 -120 -2 -70 Q-6 -40 4 -10;M-11 -166 Q10 -118 6 -68 Q2 -36 14 -8;M-11 -166 Q4 -120 -2 -70 Q-6 -40 4 -10"/></path>';
      // climbers: leader pulling the roof, belayer hanging from the bolts, follower far below
      g += climber(14, -228, ROOF, "#e0b04a", "lead", 5, 0, 8);
      g += climber(-12, -150, PINE, "#d6ccb5", "hang", 7, 1.5, 18);
      g += climber(-33, -56, "#5d7891", "#b5653b", "follow", 6, 3, -4);
      // the leader knocks loose small pebbles now and then
      for (var pb = 0; pb < 3; pb++) {
        var px = 10 + pb * 3, bgn = "-" + (pb * 1.3).toFixed(1) + "s";
        g += '<circle cx="' + px + '" cy="-238" r="' + (1.4 - pb * 0.3).toFixed(1) + '" fill="#4f4a41" opacity="0">' +
          '<animate attributeName="cy" values="-262;-262;-60" keyTimes="0;0.55;1" dur="4.2s" begin="' + bgn + '" repeatCount="indefinite" calcMode="spline" keySplines="0 0 1 1;0.5 0 1 1"/>' +
          '<animate attributeName="cx" values="' + px + ";" + px + ";" + (px + 14) + '" keyTimes="0;0.55;1" dur="4.2s" begin="' + bgn + '" repeatCount="indefinite"/>' +
          '<animate attributeName="opacity" values="0;0;1;0" keyTimes="0;0.55;0.6;1" dur="4.2s" begin="' + bgn + '" repeatCount="indefinite"/></circle>';
      }
      return { svg: g, top: -276, w: 60 };
    }
    var cairnId = 0;
    function blobPath(cx, cy, rx, ry, seed) {
      var sd = seed, r = function () { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
      var pts = [], n = 9;
      for (var k = 0; k < n; k++) {
        var a2 = (k / n) * Math.PI * 2 + (r() - 0.5) * 0.12, f = 0.95 + r() * 0.08;
        if (Math.sin(a2) > 0.5) f *= 0.9; // flatter underside so stones sit on each other
        pts.push([cx + Math.cos(a2) * rx * f, cy + Math.sin(a2) * ry * f]);
      }
      var mid = function (p, q) { return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; };
      var m0 = mid(pts[n - 1], pts[0]), d2 = "M" + m0[0].toFixed(1) + " " + m0[1].toFixed(1);
      for (var j = 0; j < n; j++) { var m1 = mid(pts[j], pts[(j + 1) % n]); d2 += " Q" + pts[j][0].toFixed(1) + " " + pts[j][1].toFixed(1) + " " + m1[0].toFixed(1) + " " + m1[1].toFixed(1); }
      return d2 + " Z";
    }
    function cairnStone(cx, cy, rx, ry, snowy, tone, seed) {
      var id = "cairn-" + (++cairnId), d2 = blobPath(cx, cy, rx, ry, seed);
      var out = '<clipPath id="' + id + '"><path d="' + d2 + '"/></clipPath>';
      out += '<path d="' + d2 + '" fill="' + tone + '"/>';
      // shaded lower-right side, like the rest of the illustration
      out += '<g clip-path="url(#' + id + ')"><path d="M' + (cx + rx * 0.05) + " " + (cy - ry * 2) + " L" + (cx + rx * 2) + " " + (cy - ry * 2) + " L" + (cx + rx * 2) + " " + (cy + ry * 2) + " L" + (cx - rx * 1.4) + " " + (cy + ry * 2) + " L" + (cx - rx * 0.2) + " " + (cy + ry * 0.35) + ' Z" fill="#8a785f" opacity="0.85"/></g>';
      if (snowy) out += '<path d="M' + (cx - rx * 0.75) + " " + (cy - ry * 0.35) + " Q" + (cx - rx * 0.3) + " " + (cy - ry * 1.25) + " " + (cx + rx * 0.2) + " " + (cy - ry * 1.05) + " Q" + (cx + rx * 0.7) + " " + (cy - ry * 0.95) + " " + (cx + rx * 0.8) + " " + (cy - ry * 0.4) + " Q" + cx + " " + (cy - ry * 0.6) + " " + (cx - rx * 0.75) + " " + (cy - ry * 0.35) + ' Z" fill="' + SNOW + '"/>';
      return out;
    }
    function highPass() {
      var g = shadow(78);
      g += '<ellipse cx="-56" cy="0" rx="30" ry="4" fill="#1f2621" opacity="0.25" filter="url(#lm-blur)"/>';
      // second-iteration pebbles: plain stacked stones, each with a shaded right side
      [[-56, -8, 24, 10], [-58, -25, 20, 9], [-55, -40, 16, 8], [-57, -53, 12, 7], [-56, -63, 8, 5]].forEach(function (st, k) {
        g += '<ellipse cx="' + st[0] + '" cy="' + st[1] + '" rx="' + st[2] + '" ry="' + st[3] + '" fill="' + (k % 2 ? "#857e70" : "#a39b8b") + '"/>';
        g += '<ellipse cx="' + (st[0] + st[2] * 0.4) + '" cy="' + st[1] + '" rx="' + (st[2] * 0.6) + '" ry="' + st[3] + '" fill="#857e70" opacity="0.5"/>';
      });
      g += line("M60 0 V-114", WOOD_D, 5) + rect(56, -117, 8, 4, WOOD);
      // Summit: points left
      g += shape("M60 -82 H10 L0 -72 L10 -62 H60 Z", WALL) + shape("M60 -72 H0 L10 -62 H60 Z", WALL_S, ' opacity="0.55"');
      g += '<text x="31" y="-68.5" font-family="Manrope, sans-serif" font-size="10.5" font-weight="800" text-anchor="middle" fill="' + WIN + '">Summit</text>';
      // Trailhead: points right, back down the trail
      g += shape("M60 -56 H114 L124 -46 L114 -36 H60 Z", WALL_S) + shape("M60 -46 H124 L114 -36 H60 Z", "#9d927c", ' opacity="0.45"');
      g += '<text x="90" y="-42.5" font-family="Manrope, sans-serif" font-size="10" font-weight="800" text-anchor="middle" fill="' + WIN + '">Trailhead</text>';
      var ax = -56, ay = -67, bx = 60, by = -113, mx = (ax + bx) / 2, my = Math.max(ay, by) - 18, cols = [ROOF, PINE, WALL, ROOF, PINE, WALL, ROOF];
      g += line("M" + ax + " " + ay + " Q" + mx + " " + my + " " + bx + " " + by, WOOD_D, 1);
      for (var k = 1; k <= 7; k++) {
        var tt = k / 8, px = (1 - tt) * (1 - tt) * ax + 2 * (1 - tt) * tt * mx + tt * tt * bx, py = (1 - tt) * (1 - tt) * ay + 2 * (1 - tt) * tt * my + tt * tt * by;
        g += shape("M" + (px - 4).toFixed(1) + " " + py.toFixed(1) + " L" + (px + 4).toFixed(1) + " " + py.toFixed(1) + " L" + px.toFixed(1) + " " + (py + 11).toFixed(1) + " Z", cols[k - 1]);
      }
      return { svg: g, top: -120, w: 80 };
    }

    var LANDMARKS = { 2: watchtower, 3: liftBase, 4: skiLodge, 5: radioStation, 6: climbingWall, 7: highPass };
    var LS = 1.05, anchors = {}, built = {}, lmEls = {}, depthItems = [];
    var lmPos = {};
    Object.keys(LANDMARKS).forEach(function (key) {
      var i = +key, p = at(STOP_T[i]), side = i % 2 ? 1 : -1;
      lmPos[i] = [clamp(p[0] + side * 110, trailL(p[1]) + 150, trailR(p[1]) - 150), p[1] - 22];
    });
    var flips = { 3: lmPos[4][0] < lmPos[3][0] ? -1 : 1, 4: lmPos[3][0] > lmPos[4][0] ? -1 : 1 };
    Object.keys(LANDMARKS).forEach(function (key) {
      var i = +key, lx = lmPos[i][0], ly = lmPos[i][1], lm = LANDMARKS[i](), fl = flips[i] || 1;
      if (fl === -1) lm.svg = lm.svg.replace(/<text x="([-\d.]+)"/g, function (m0, tx0) { return '<text transform="scale(-1 1)" x="' + (-parseFloat(tx0)) + '"'; });
      built[i] = { x: lx, y: ly, lm: lm, fl: fl };
      anchors[i] = [lx, ly + lm.top * LS - 4];
      depthItems.push({ y: ly, html: '<g class="lm" data-stop="' + i + '" transform="translate(' + lx.toFixed(1) + " " + ly.toFixed(1) + ") scale(" + (fl * LS) + " " + LS + ')">' +
        '<ellipse cx="0" cy="' + (lm.top / 2) + '" rx="' + (lm.w + 30) + '" ry="' + (-lm.top / 2 + 12) + '" fill="transparent"/>' + lm.svg + "</g>" });
    });
    // Base camp campfire, placed beside the trail at the About stop
    function campfire() {
      var o = "";
      o += '<ellipse cx="0" cy="0" rx="46" ry="9" fill="' + WARM + '" opacity="0.25" filter="url(#lm-glow)">' + pulseOpacity(0.12, 0.34, 1.7) + "</ellipse>";
      // log seats
      o += '<rect x="-46" y="-7" width="22" height="7" rx="3.5" fill="' + WOOD + '"/><circle cx="-24.5" cy="-3.5" r="3.5" fill="#a07b55"/>';
      o += '<rect x="26" y="-6" width="20" height="7" rx="3.5" fill="' + WOOD_D + '"/><circle cx="26.5" cy="-2.5" r="3.5" fill="#8f6c4a"/>';
      // ring of stones
      [[-15, -1], [-10, 2], [-3, 3], [4, 3], [11, 2], [15, -1], [12, -4], [-12, -4]].forEach(function (st, k) {
        o += '<ellipse cx="' + st[0] + '" cy="' + st[1] + '" rx="3.6" ry="2.4" fill="' + (k % 2 ? STW_S : STW) + '"/>';
      });
      // crossed logs
      o += line("M-11 0 L8 -7", WOOD_D, 3.4) + line("M11 0 L-8 -7", WOOD, 3.4);
      // flames
      var fl1 = ["M-9 -2 C-11 -12 -4 -16 -2 -26 C2 -18 10 -14 9 -2 Z", "M-9 -2 C-12 -10 -6 -18 1 -27 C3 -17 11 -12 9 -2 Z", "M-9 -2 C-10 -13 -2 -15 -4 -24 C3 -19 9 -12 9 -2 Z"];
      var fl2 = ["M-6 -2 C-7 -9 -2 -12 0 -19 C3 -12 7 -9 6 -2 Z", "M-6 -2 C-8 -8 -1 -14 2 -20 C3 -12 8 -8 6 -2 Z", "M-6 -2 C-6 -10 -3 -11 -2 -18 C4 -13 6 -8 6 -2 Z"];
      var fl3 = ["M-3 -2 C-4 -6 -1 -8 0 -12 C2 -8 4 -6 3 -2 Z", "M-3 -2 C-4 -5 0 -9 1 -13 C2 -8 4 -5 3 -2 Z", "M-3 -2 C-3 -7 -1 -7 -1 -11 C2 -8 3 -6 3 -2 Z"];
      [[fl1, "#d9762f", "0.9s"], [fl2, "#f0a93e", "0.7s"], [fl3, "#fde3a0", "0.55s"]].forEach(function (f) {
        o += '<path d="' + f[0][0] + '" fill="' + f[1] + '"><animate attributeName="d" dur="' + f[2] + '" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.33;0.66;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1" values="' + f[0].concat([f[0][0]]).join(";") + '"/></path>';
      });
      // sparks drifting up
      for (var sk2 = 0; sk2 < 4; sk2++) {
        var bg = "-" + (sk2 * 0.6).toFixed(1) + "s", sx2 = -3 + sk2 * 2;
        o += '<circle cx="' + sx2 + '" cy="-14" r="0.9" fill="#fde3a0" opacity="0">' +
          '<animate attributeName="cy" values="-14;-48" dur="2.4s" begin="' + bg + '" repeatCount="indefinite"/>' +
          '<animate attributeName="cx" values="' + sx2 + ";" + (sx2 + 4) + ";" + (sx2 - 2) + '" dur="2.4s" begin="' + bg + '" repeatCount="indefinite"/>' +
          '<animate attributeName="opacity" values="0;1;0" dur="2.4s" begin="' + bg + '" repeatCount="indefinite"/></circle>';
      }
      o += smoke(0, -30, 0.6);
      return o;
    }
    var campP = at(STOP_T[1]);
    var campX = clamp(campP[0] + 90, trailL(campP[1]) + 80, trailR(campP[1]) - 80), campY = campP[1] - 18;
    built.camp = { x: campX, y: campY, lm: { w: 44, top: -40 } };
    depthItems.push({ y: campY, html: '<g transform="translate(' + campX.toFixed(1) + " " + campY.toFixed(1) + ') scale(1.15)">' + campfire() + "</g>" });
    function inClearing(x, y) {
      for (var key in built) {
        var b = built[key], hw = b.lm.w * LS + 14;
        if (Math.abs(x - b.x) < hw && y > b.y + b.lm.top * LS * 0.8 && y < b.y + 18) return true;
      }
      return false;
    }
    // Chairlift between 02 and 03, drawn after the depth-sorted items so it hangs above the trees
    var c0 = built[3], c1 = built[4];
    var A = [c0.x + c0.lm.cable[0] * LS * c0.fl, c0.y + c0.lm.cable[1] * LS], B = [c1.x + c1.lm.cable[0] * LS * c1.fl, c1.y + c1.lm.cable[1] * LS];
    var sag = function (f) { return Math.sin(Math.PI * ((f * 3) % 1)) * 8; };
    // The haul rope wraps each bullwheel: top strand runs up, bottom strand runs back down
    var rA = 14 * LS, rB = 13 * LS;                 // bullwheel radii at the base (02) and top (03) stations
    var dropA = 2 * rA, dropB = 2 * rB;             // bottom strand leaves from the bottom of each wheel
    function strand(fromA, lower) {
      var pts = [];
      for (var q2 = 0; q2 <= 30; q2++) {
        var f = fromA ? q2 / 30 : 1 - q2 / 30;
        pts.push([lerp(A[0], B[0], f), lerp(A[1], B[1], f) + sag(f) + (lower ? lerp(dropA, dropB, f) : 0)]);
      }
      return pts;
    }
    function pts2d(pts, move) { return pts.map(function (pt, k) { return (k === 0 && move ? "M" : "L") + pt[0].toFixed(1) + " " + pt[1].toFixed(1); }).join(" "); }
    var sweep = B[0] > A[0] ? 1 : 0;
    var upper = strand(true, false), lowerBack = strand(false, true);
    var loopPath = pts2d(upper, true) +
      " A" + rB.toFixed(1) + " " + rB.toFixed(1) + " 0 0 " + sweep + " " + B[0].toFixed(1) + " " + (B[1] + dropB).toFixed(1) + " " +
      pts2d(lowerBack.slice(1), false) +
      " A" + rA.toFixed(1) + " " + rA.toFixed(1) + " 0 0 " + sweep + " " + A[0].toFixed(1) + " " + A[1].toFixed(1) + " Z";
    var lift = "";
    [0.33, 0.66].forEach(function (f) {
      var tx2 = lerp(A[0], B[0], f), ty2 = lerp(A[1], B[1], f) + 4, low = lerp(dropA, dropB, f);
      lift += line("M" + tx2.toFixed(0) + " " + ty2.toFixed(0) + " V" + (ty2 + 90 + low * 0.3).toFixed(0), STEEL, 4) +
        line("M" + (tx2 - 11).toFixed(0) + " " + ty2.toFixed(0) + " H" + (tx2 + 11).toFixed(0), STEEL, 2.5) +
        line("M" + (tx2 - 8).toFixed(0) + " " + (ty2 + low - 2).toFixed(0) + " H" + (tx2 + 8).toFixed(0), STEEL, 2);
    });
    lift += line(pts2d(upper, true), WIN, 1.3) + '<path d="' + pts2d(strand(true, true), true) + '" fill="none" stroke="' + WIN + '" stroke-width="1.3" opacity="0.6"/>';
    // Chairs travel one continuous loop: up, around the top wheel, down, around the bottom wheel
    var chairDur = 60, nChairs = 12;
    for (var ch = 0; ch < nChairs; ch++) {
      var begin = "-" + ((ch / nChairs) * chairDur).toFixed(2) + "s";
      lift += "<g>" + line("M0 0 v20 h-12 m12 0 h3 v-8", WIN, 1.6) + shape("M-13 19 h17 v4 h-17 Z", ROOF) +
        '<animateMotion dur="' + chairDur + 's" begin="' + begin + '" repeatCount="indefinite" path="' + loopPath + '"/></g>';
    }
    // Trees in the forest band: staggered rows, only below the treeline, depth-sorted with the landmarks
    for (var fy = 2160, frow = 0; fy < 3170; fy += 30, frow++) {
      for (var fx = -960 + (frow % 2) * 24; fx < W + 1160; fx += 48) {
        if (rnd() < 0.24) continue;
        var tx = fx + (rnd() - 0.5) * 18, ty = fy + (rnd() - 0.5) * 9, sz = 14 + rnd() * 12;
        if (ty < topAt(forestEdge, tx) + 14) continue;                            // above the treeline: bare rock
        if (tx < leftX(ty) + sz * 0.7 + 4 || tx > rightX(ty) - sz * 0.7 - 4) continue; // keep the whole base on the slope
        if (inClearing(tx, ty)) continue;
        depthItems.push({ y: ty, html: pine(tx, ty, sz) });
      }
    }
    depthItems.sort(function (a2, b2) { return a2.y - b2.y; });
    var depthHtml = depthItems.map(function (it) { return it.html; }).join("");
    // Clouds: cumulus clusters with a flat, shaded base and soft edges
    function cumulus(cx, cy, w) {
      var n = 5 + Math.floor(rnd() * 4), out = "", base = "", step = w / n;
      for (var k = 0; k < n; k++) {
        var prof = Math.sin(Math.PI * (k + 0.5) / n);
        var r = step * (0.75 + prof * 0.9 + rnd() * 0.3);
        var px = cx - w / 2 + step * (k + 0.5) + (rnd() - 0.5) * step * 0.4;
        var py = cy - r * (0.35 + prof * 0.35);
        base += '<circle cx="' + px.toFixed(0) + '" cy="' + (py + r * 0.18).toFixed(0) + '" r="' + r.toFixed(0) + '"/>';
        out += '<circle cx="' + (px - r * 0.12).toFixed(0) + '" cy="' + (py - r * 0.08).toFixed(0) + '" r="' + (r * 0.92).toFixed(0) + '"/>';
      }
      var flat = '<ellipse cx="' + cx.toFixed(0) + '" cy="' + cy.toFixed(0) + '" rx="' + (w * 0.55).toFixed(0) + '" ry="' + (step * 0.5).toFixed(0) + '"/>';
      return '<g clip-path="url(#cloud-base)" transform="translate(0 0)"><g fill="#d7dee5">' + base + flat + '</g><g fill="#ffffff">' + out + '</g></g>';
    }
    function cloudBand(count, yMin, yMax, wMin, wMax) {
      var g = "";
      for (var c = 0; c < count; c++) {
        var w = wMin + rnd() * (wMax - wMin);
        g += cumulus(-900 + rnd() * (W + 1800), yMin + rnd() * (yMax - yMin), w);
      }
      return g;
    }
    var cloudsBack = cloudBand(20, 560, 760, 260, 520);
    var cloudsFront = cloudBand(18, 700, 900, 240, 460);
    var cloudsHigh = cloudBand(8, -700, -150, 220, 420);
    var contours = "";
    for (var cc = 0; cc < 7; cc++) {
      var yy = 600 + cc * 360;
      contours += '<path d="M' + (leftX(yy) - 40) + " " + yy + " Q " + (545 * X) + " " + (yy - 140) + " " + (rightX(yy) + 40) + " " + (yy + 60) + '" />';
    }
    // Pines along the lower outline so the mountain's edge reads as treetops, not a cut line
    var edgeTrees = [];
    for (var ey = 2240; ey < 3180; ey += 20) {
      [leftX(ey), rightX(ey)].forEach(function (ex, side) {
        if (rnd() < 0.4) return;
        var dir = side ? 1 : -1, es = 13 + rnd() * 11, ox = ex - dir * (es * 0.55 + rnd() * 8), oy = ey + (rnd() - 0.5) * 6;
        if (oy < topAt(forestEdge, ox) + 14) return;
        edgeTrees.push({ y: oy, html: pine(ox, oy, es) });
      });
    }
    edgeTrees.sort(function (a3, b3) { return a3.y - b3.y; });
    var edgeHtml = edgeTrees.map(function (t3) { return t3.html; }).join("");
    var far = function (base, amp, seed, fill, op) {
      var s = seed, r2 = function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
      var pts = [[-50, 600]];
      for (var x = -50; x <= 1650; x += 70 + r2() * 90) pts.push([x, base - r2() * amp]);
      pts.push([1650, 600]);
      return '<svg class="far" viewBox="0 0 1600 600" preserveAspectRatio="xMidYMax slice" style="position:absolute;left:0;right:0;bottom:0;width:100%;height:60%"><polygon points="' + poly(pts) + '" fill="' + fill + '" opacity="' + op + '"/></svg>';
    };
    host.innerHTML =
      far(330, 220, 11, "#9fb0ad", 0.55) + far(430, 180, 23, "#7d918d", 0.55) +
      '<svg class="mtn" viewBox="0 0 ' + W + " " + Hh + '" width="' + W + '" height="' + Hh + '">' +
      '<defs><clipPath id="mtn-clip"><polygon points="' + silhouette + '"/></clipPath>' +
      '<clipPath id="cloud-base" clipPathUnits="userSpaceOnUse"><rect x="-4000" y="-4000" width="9000" height="9000"/></clipPath>' +
      '<filter id="soft" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="7"/></filter>' +
      '<filter id="softer" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="14"/></filter>' +
      '<filter id="lm-blur" x="-30%" y="-200%" width="160%" height="500%"><feGaussianBlur stdDeviation="4"/></filter>' +
      '<filter id="lm-smoke" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2.2"/></filter>' +
      '<filter id="lm-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3.5"/></filter></defs>' +
      '<g filter="url(#softer)" opacity="0.7">' + cloudsHigh + '</g>' +
      '<g filter="url(#softer)" opacity="0.75">' + cloudsBack + '</g>' +
      '<polygon points="' + poly(hillsBack) + '" fill="#4b6447"/>' +
      '<polygon points="' + poly(hillsFront) + '" fill="#6f7c55"/>' +
      '<polygon points="' + silhouette + '" fill="#8b8476"/>' +
      '<g clip-path="url(#mtn-clip)">' +
      '<polygon points="' + poly(forestPoly) + '" fill="#34503f"/>' +
      '<polygon points="' + poly(meadowPoly) + '" fill="#6f7c55"/>' +
      '<polygon points="' + poly(snowPoly) + '" fill="#f4f2ea"/>' +
      '<g fill="none" stroke="#fffbed" stroke-width="1.2" opacity="0.28">' + contours + "</g>" +
      depthHtml + '<g class="lift">' + lift + "</g>" +
      '<polygon points="' + poly(shadePoly) + '" fill="#1f2621" opacity="0.16" pointer-events="none"/>' + "</g>" +
      edgeHtml +
      '<path id="a-trail" d="' + d + '" fill="none" stroke="#7a5236" stroke-width="3" stroke-dasharray="2 8" stroke-linecap="round" opacity="0.85"/>' +
      '<path id="a-walked" d="' + d + '" fill="none" stroke="#b5653b" stroke-width="4" stroke-linecap="round"/>' +
      '<g transform="translate(' + (545 * X) + ' 150)"><rect x="-1.75" y="-76" width="3.5" height="76" fill="#1f2621"/><circle cx="0" cy="-77" r="2.6" fill="#1f2621"/>' +
      '<g class="summit-flag"><path d="M1.5 -72.0 L4.7 -71.8 L4.7 -48.0 L1.5 -48.0 Z" fill="#b2633a" stroke="#b2633a" stroke-width="0.6" stroke-linejoin="round"><animate attributeName="d" dur="2.4s" repeatCount="indefinite" values="M1.5 -72.0 L4.7 -71.8 L4.7 -48.0 L1.5 -48.0 Z;M1.5 -72.0 L4.7 -71.8 L4.7 -48.0 L1.5 -48.0 Z;M1.5 -72.0 L4.7 -71.8 L4.7 -48.0 L1.5 -48.0 Z;M1.5 -72.0 L4.7 -71.9 L4.7 -48.1 L1.5 -48.0 Z;M1.5 -72.0 L4.7 -72.0 L4.7 -48.1 L1.5 -48.0 Z;M1.5 -72.0 L4.7 -72.0 L4.7 -48.2 L1.5 -48.0 Z;M1.5 -72.0 L4.7 -72.1 L4.7 -48.3 L1.5 -48.0 Z;M1.5 -72.0 L4.7 -72.2 L4.7 -48.3 L1.5 -48.0 Z;M1.5 -72.0 L4.7 -72.3 L4.7 -48.4 L1.5 -48.0 Z;M1.5 -72.0 L4.7 -72.3 L4.7 -48.4 L1.5 -48.0 Z;M1.5 -72.0 L4.7 -72.3 L4.7 -48.4 L1.5 -48.0 Z;M1.5 -72.0 L4.7 -72.3 L4.7 -48.4 L1.5 -48.0 Z;M1.5 -72.0 L4.7 -72.3 L4.7 -48.4 L1.5 -48.0 Z;M1.5 -72.0 L4.7 -72.2 L4.7 -48.3 L1.5 -48.0 Z;M1.5 -72.0 L4.7 -72.1 L4.7 -48.3 L1.5 -48.0 Z;M1.5 -72.0 L4.7 -72.1 L4.7 -48.2 L1.5 -48.0 Z;M1.5 -72.0 L4.7 -72.0 L4.7 -48.2 L1.5 -48.0 Z;M1.5 -72.0 L4.7 -72.0 L4.7 -48.1 L1.5 -48.0 Z;M1.5 -72.0 L4.7 -71.9 L4.7 -48.1 L1.5 -48.0 Z;M1.5 -72.0 L4.7 -71.9 L4.7 -48.0 L1.5 -48.0 Z;M1.5 -72.0 L4.7 -71.9 L4.7 -48.0 L1.5 -48.0 Z;M1.5 -72.0 L4.7 -71.9 L4.7 -48.0 L1.5 -48.0 Z;M1.5 -72.0 L4.7 -71.8 L4.7 -48.0 L1.5 -48.0 Z;M1.5 -72.0 L4.7 -71.8 L4.7 -48.0 L1.5 -48.0 Z;M1.5 -72.0 L4.7 -71.8 L4.7 -48.0 L1.5 -48.0 Z;M1.5 -72.0 L4.7 -71.8 L4.7 -48.0 L1.5 -48.0 Z;M1.5 -72.0 L4.7 -71.8 L4.7 -48.0 L1.5 -48.0 Z;M1.5 -72.0 L4.7 -71.8 L4.7 -48.0 L1.5 -48.0 Z;M1.5 -72.0 L4.7 -71.8 L4.7 -48.0 L1.5 -48.0 Z;M1.5 -72.0 L4.7 -71.8 L4.7 -48.0 L1.5 -48.0 Z;M1.5 -72.0 L4.7 -71.8 L4.7 -48.0 L1.5 -48.0 Z"/><animate attributeName="fill" dur="2.4s" repeatCount="indefinite" values="#b2633a;#b2633a;#b3633a;#b3643a;#b5653b;#b5653b;#b6663c;#b7673d;#b7683e;#b8683e;#b8683e;#b8683e;#b7683e;#b7673d;#b6673d;#b6663c;#b5653b;#b4653b;#b4643a;#b3643a;#b3643a;#b3643a;#b3633a;#b3633a;#b3633a;#b2633a;#b2633a;#b2633a;#b2633a;#b2633a;#b2633a"/><animate attributeName="stroke" dur="2.4s" repeatCount="indefinite" values="#b2633a;#b2633a;#b3633a;#b3643a;#b5653b;#b5653b;#b6663c;#b7673d;#b7683e;#b8683e;#b8683e;#b8683e;#b7683e;#b7673d;#b6673d;#b6663c;#b5653b;#b4653b;#b4643a;#b3643a;#b3643a;#b3643a;#b3633a;#b3633a;#b3633a;#b2633a;#b2633a;#b2633a;#b2633a;#b2633a;#b2633a"/></path><path d="M4.7 -71.8 L7.8 -71.5 L7.8 -47.9 L4.7 -48.0 Z" fill="#b16239" stroke="#b16239" stroke-width="0.6" stroke-linejoin="round"><animate attributeName="d" dur="2.4s" repeatCount="indefinite" values="M4.7 -71.8 L7.8 -71.5 L7.8 -47.9 L4.7 -48.0 Z;M4.7 -71.8 L7.8 -71.5 L7.8 -47.9 L4.7 -48.0 Z;M4.7 -71.8 L7.8 -71.5 L7.8 -47.8 L4.7 -48.0 Z;M4.7 -71.9 L7.8 -71.5 L7.8 -47.8 L4.7 -48.1 Z;M4.7 -72.0 L7.8 -71.5 L7.8 -47.9 L4.7 -48.1 Z;M4.7 -72.0 L7.8 -71.6 L7.8 -48.0 L4.7 -48.2 Z;M4.7 -72.1 L7.8 -71.7 L7.8 -48.1 L4.7 -48.3 Z;M4.7 -72.2 L7.8 -71.9 L7.8 -48.2 L4.7 -48.3 Z;M4.7 -72.3 L7.8 -72.0 L7.8 -48.3 L4.7 -48.4 Z;M4.7 -72.3 L7.8 -72.2 L7.8 -48.5 L4.7 -48.4 Z;M4.7 -72.3 L7.8 -72.4 L7.8 -48.7 L4.7 -48.4 Z;M4.7 -72.3 L7.8 -72.5 L7.8 -48.8 L4.7 -48.4 Z;M4.7 -72.3 L7.8 -72.6 L7.8 -48.9 L4.7 -48.4 Z;M4.7 -72.2 L7.8 -72.6 L7.8 -48.9 L4.7 -48.3 Z;M4.7 -72.1 L7.8 -72.6 L7.8 -48.9 L4.7 -48.3 Z;M4.7 -72.1 L7.8 -72.6 L7.8 -48.8 L4.7 -48.2 Z;M4.7 -72.0 L7.8 -72.5 L7.8 -48.7 L4.7 -48.2 Z;M4.7 -72.0 L7.8 -72.3 L7.8 -48.6 L4.7 -48.1 Z;M4.7 -71.9 L7.8 -72.2 L7.8 -48.5 L4.7 -48.1 Z;M4.7 -71.9 L7.8 -72.0 L7.8 -48.3 L4.7 -48.0 Z;M4.7 -71.9 L7.8 -71.9 L7.8 -48.2 L4.7 -48.0 Z;M4.7 -71.9 L7.8 -71.8 L7.8 -48.1 L4.7 -48.0 Z;M4.7 -71.8 L7.8 -71.7 L7.8 -48.0 L4.7 -48.0 Z;M4.7 -71.8 L7.8 -71.7 L7.8 -48.0 L4.7 -48.0 Z;M4.7 -71.8 L7.8 -71.6 L7.8 -48.0 L4.7 -48.0 Z;M4.7 -71.8 L7.8 -71.6 L7.8 -48.0 L4.7 -48.0 Z;M4.7 -71.8 L7.8 -71.6 L7.8 -48.0 L4.7 -48.0 Z;M4.7 -71.8 L7.8 -71.6 L7.8 -48.0 L4.7 -48.0 Z;M4.7 -71.8 L7.8 -71.6 L7.8 -47.9 L4.7 -48.0 Z;M4.7 -71.8 L7.8 -71.6 L7.8 -47.9 L4.7 -48.0 Z;M4.7 -71.8 L7.8 -71.5 L7.8 -47.9 L4.7 -48.0 Z"/><animate attributeName="fill" dur="2.4s" repeatCount="indefinite" values="#b16239;#b06239;#b06139;#af6139;#ae6138;#ae6138;#af6139;#b06239;#b2633a;#b4643b;#b6663c;#b7673d;#b8693f;#b96a40;#ba6a40;#ba6a40;#b96a40;#b8693f;#b7683e;#b6673d;#b5653b;#b4643b;#b3643a;#b2633a;#b2633a;#b2633a;#b2633a;#b2633a;#b2633a;#b2633a;#b16239"/><animate attributeName="stroke" dur="2.4s" repeatCount="indefinite" values="#b16239;#b06239;#b06139;#af6139;#ae6138;#ae6138;#af6139;#b06239;#b2633a;#b4643b;#b6663c;#b7673d;#b8693f;#b96a40;#ba6a40;#ba6a40;#b96a40;#b8693f;#b7683e;#b6673d;#b5653b;#b4643b;#b3643a;#b2633a;#b2633a;#b2633a;#b2633a;#b2633a;#b2633a;#b2633a;#b16239"/></path><path d="M7.8 -71.5 L10.9 -71.3 L10.9 -47.8 L7.8 -47.9 Z" fill="#b2633a" stroke="#b2633a" stroke-width="0.6" stroke-linejoin="round"><animate attributeName="d" dur="2.4s" repeatCount="indefinite" values="M7.8 -71.5 L10.9 -71.3 L10.9 -47.8 L7.8 -47.9 Z;M7.8 -71.5 L10.9 -71.3 L10.9 -47.8 L7.8 -47.9 Z;M7.8 -71.5 L10.9 -71.3 L10.9 -47.8 L7.8 -47.8 Z;M7.8 -71.5 L10.9 -71.2 L10.9 -47.8 L7.8 -47.8 Z;M7.8 -71.5 L10.9 -71.2 L10.9 -47.7 L7.8 -47.9 Z;M7.8 -71.6 L10.9 -71.2 L10.9 -47.7 L7.8 -48.0 Z;M7.8 -71.7 L10.9 -71.2 L10.9 -47.7 L7.8 -48.1 Z;M7.8 -71.9 L10.9 -71.2 L10.9 -47.7 L7.8 -48.2 Z;M7.8 -72.0 L11.0 -71.3 L11.0 -47.8 L7.8 -48.3 Z;M7.8 -72.2 L11.0 -71.5 L11.0 -48.0 L7.8 -48.5 Z;M7.8 -72.4 L11.0 -71.7 L11.0 -48.2 L7.8 -48.7 Z;M7.8 -72.5 L11.0 -72.0 L11.0 -48.4 L7.8 -48.8 Z;M7.8 -72.6 L11.0 -72.2 L11.0 -48.7 L7.8 -48.9 Z;M7.8 -72.6 L11.0 -72.5 L11.0 -48.9 L7.8 -48.9 Z;M7.8 -72.6 L11.0 -72.7 L11.0 -49.1 L7.8 -48.9 Z;M7.8 -72.6 L11.0 -72.9 L11.0 -49.3 L7.8 -48.8 Z;M7.8 -72.5 L11.0 -73.0 L11.0 -49.4 L7.8 -48.7 Z;M7.8 -72.3 L11.0 -73.0 L11.0 -49.4 L7.8 -48.6 Z;M7.8 -72.2 L11.0 -72.9 L11.0 -49.3 L7.8 -48.5 Z;M7.8 -72.0 L11.0 -72.7 L11.0 -49.1 L7.8 -48.3 Z;M7.8 -71.9 L11.0 -72.5 L11.0 -48.9 L7.8 -48.2 Z;M7.8 -71.8 L11.0 -72.3 L11.0 -48.7 L7.8 -48.1 Z;M7.8 -71.7 L11.0 -72.0 L11.0 -48.5 L7.8 -48.0 Z;M7.8 -71.7 L11.0 -71.8 L11.0 -48.3 L7.8 -48.0 Z;M7.8 -71.6 L11.0 -71.6 L11.0 -48.1 L7.8 -48.0 Z;M7.8 -71.6 L11.0 -71.5 L11.0 -48.0 L7.8 -48.0 Z;M7.8 -71.6 L10.9 -71.4 L10.9 -47.9 L7.8 -48.0 Z;M7.8 -71.6 L10.9 -71.4 L10.9 -47.9 L7.8 -48.0 Z;M7.8 -71.6 L10.9 -71.3 L10.9 -47.9 L7.8 -47.9 Z;M7.8 -71.6 L10.9 -71.3 L10.9 -47.8 L7.8 -47.9 Z;M7.8 -71.5 L10.9 -71.3 L10.9 -47.8 L7.8 -47.9 Z"/><animate attributeName="fill" dur="2.4s" repeatCount="indefinite" values="#b2633a;#b2633a;#b2633a;#b16239;#b06139;#ae6038;#ac5f38;#ab5e37;#aa5e37;#aa5e37;#ab5e37;#ad6038;#b06139;#b3643a;#b6663c;#b8693f;#ba6b41;#bb6c42;#bc6d43;#bc6d43;#bb6c42;#ba6a40;#b8693f;#b6673d;#b5653b;#b3643a;#b2633a;#b16239;#b16239;#b1633a;#b2633a"/><animate attributeName="stroke" dur="2.4s" repeatCount="indefinite" values="#b2633a;#b2633a;#b2633a;#b16239;#b06139;#ae6038;#ac5f38;#ab5e37;#aa5e37;#aa5e37;#ab5e37;#ad6038;#b06139;#b3643a;#b6663c;#b8693f;#ba6b41;#bb6c42;#bc6d43;#bc6d43;#bb6c42;#ba6a40;#b8693f;#b6673d;#b5653b;#b3643a;#b2633a;#b16239;#b16239;#b1633a;#b2633a"/></path><path d="M10.9 -71.3 L14.1 -71.0 L14.1 -47.7 L10.9 -47.8 Z" fill="#b06239" stroke="#b06239" stroke-width="0.6" stroke-linejoin="round"><animate attributeName="d" dur="2.4s" repeatCount="indefinite" values="M10.9 -71.3 L14.1 -71.0 L14.1 -47.7 L10.9 -47.8 Z;M10.9 -71.3 L14.1 -71.0 L14.1 -47.7 L10.9 -47.8 Z;M10.9 -71.3 L14.0 -71.0 L14.0 -47.7 L10.9 -47.8 Z;M10.9 -71.2 L14.0 -71.0 L14.0 -47.7 L10.9 -47.8 Z;M10.9 -71.2 L14.0 -71.0 L14.0 -47.7 L10.9 -47.7 Z;M10.9 -71.2 L14.0 -70.9 L14.0 -47.6 L10.9 -47.7 Z;M10.9 -71.2 L14.0 -70.9 L14.0 -47.6 L10.9 -47.7 Z;M10.9 -71.2 L14.0 -70.8 L14.0 -47.5 L10.9 -47.7 Z;M11.0 -71.3 L14.0 -70.8 L14.0 -47.5 L11.0 -47.8 Z;M11.0 -71.5 L14.1 -70.8 L14.1 -47.5 L11.0 -48.0 Z;M11.0 -71.7 L14.1 -70.8 L14.1 -47.5 L11.0 -48.2 Z;M11.0 -72.0 L14.1 -71.0 L14.1 -47.7 L11.0 -48.4 Z;M11.0 -72.2 L14.1 -71.2 L14.1 -47.9 L11.0 -48.7 Z;M11.0 -72.5 L14.1 -71.5 L14.1 -48.1 L11.0 -48.9 Z;M11.0 -72.7 L14.1 -71.8 L14.1 -48.5 L11.0 -49.1 Z;M11.0 -72.9 L14.1 -72.2 L14.1 -48.8 L11.0 -49.3 Z;M11.0 -73.0 L14.1 -72.6 L14.1 -49.2 L11.0 -49.4 Z;M11.0 -73.0 L14.2 -72.9 L14.2 -49.5 L11.0 -49.4 Z;M11.0 -72.9 L14.2 -73.2 L14.2 -49.7 L11.0 -49.3 Z;M11.0 -72.7 L14.2 -73.3 L14.2 -49.8 L11.0 -49.1 Z;M11.0 -72.5 L14.2 -73.3 L14.2 -49.8 L11.0 -48.9 Z;M11.0 -72.3 L14.2 -73.2 L14.2 -49.7 L11.0 -48.7 Z;M11.0 -72.0 L14.2 -73.0 L14.2 -49.5 L11.0 -48.5 Z;M11.0 -71.8 L14.2 -72.7 L14.2 -49.3 L11.0 -48.3 Z;M11.0 -71.6 L14.1 -72.4 L14.1 -49.0 L11.0 -48.1 Z;M11.0 -71.5 L14.1 -72.0 L14.1 -48.6 L11.0 -48.0 Z;M10.9 -71.4 L14.1 -71.7 L14.1 -48.3 L10.9 -47.9 Z;M10.9 -71.4 L14.1 -71.4 L14.1 -48.1 L10.9 -47.9 Z;M10.9 -71.3 L14.1 -71.2 L14.1 -47.9 L10.9 -47.9 Z;M10.9 -71.3 L14.1 -71.1 L14.1 -47.8 L10.9 -47.8 Z;M10.9 -71.3 L14.1 -71.0 L14.1 -47.7 L10.9 -47.8 Z"/><animate attributeName="fill" dur="2.4s" repeatCount="indefinite" values="#b06239;#b06239;#b16239;#b1633a;#b2633a;#b2633a;#b16239;#af6139;#ad6038;#aa5e37;#a85c36;#a65b35;#a55a35;#a55b35;#a75c36;#ab5e37;#af6139;#b4643b;#b8683e;#ba6b41;#bd6e44;#be6f45;#be7046;#bd6f45;#bc6d43;#ba6b41;#b8683e;#b6663c;#b3643a;#b1633a;#b06239"/><animate attributeName="stroke" dur="2.4s" repeatCount="indefinite" values="#b06239;#b06239;#b16239;#b1633a;#b2633a;#b2633a;#b16239;#af6139;#ad6038;#aa5e37;#a85c36;#a65b35;#a55a35;#a55b35;#a75c36;#ab5e37;#af6139;#b4643b;#b8683e;#ba6b41;#bd6e44;#be6f45;#be7046;#bd6f45;#bc6d43;#ba6b41;#b8683e;#b6663c;#b3643a;#b1633a;#b06239"/></path><path d="M14.1 -71.0 L17.2 -71.2 L17.2 -48.1 L14.1 -47.7 Z" fill="#b7673d" stroke="#b7673d" stroke-width="0.6" stroke-linejoin="round"><animate attributeName="d" dur="2.4s" repeatCount="indefinite" values="M14.1 -71.0 L17.2 -71.2 L17.2 -48.1 L14.1 -47.7 Z;M14.1 -71.0 L17.2 -70.9 L17.2 -47.8 L14.1 -47.7 Z;M14.0 -71.0 L17.2 -70.8 L17.2 -47.6 L14.0 -47.7 Z;M14.0 -71.0 L17.2 -70.6 L17.2 -47.5 L14.0 -47.7 Z;M14.0 -71.0 L17.2 -70.6 L17.2 -47.5 L14.0 -47.7 Z;M14.0 -70.9 L17.1 -70.6 L17.1 -47.5 L14.0 -47.6 Z;M14.0 -70.9 L17.1 -70.6 L17.1 -47.5 L14.0 -47.6 Z;M14.0 -70.8 L17.1 -70.6 L17.1 -47.5 L14.0 -47.5 Z;M14.0 -70.8 L17.1 -70.6 L17.1 -47.4 L14.0 -47.5 Z;M14.1 -70.8 L17.1 -70.5 L17.1 -47.4 L14.1 -47.5 Z;M14.1 -70.8 L17.1 -70.4 L17.1 -47.3 L14.1 -47.5 Z;M14.1 -71.0 L17.1 -70.4 L17.1 -47.3 L14.1 -47.7 Z;M14.1 -71.2 L17.2 -70.4 L17.2 -47.3 L14.1 -47.9 Z;M14.1 -71.5 L17.2 -70.4 L17.2 -47.3 L14.1 -48.1 Z;M14.1 -71.8 L17.2 -70.6 L17.2 -47.5 L14.1 -48.5 Z;M14.1 -72.2 L17.2 -70.8 L17.2 -47.7 L14.1 -48.8 Z;M14.1 -72.6 L17.2 -71.2 L17.2 -48.0 L14.1 -49.2 Z;M14.2 -72.9 L17.3 -71.6 L17.3 -48.4 L14.2 -49.5 Z;M14.2 -73.2 L17.3 -72.1 L17.3 -48.9 L14.2 -49.7 Z;M14.2 -73.3 L17.3 -72.6 L17.3 -49.3 L14.2 -49.8 Z;M14.2 -73.3 L17.3 -73.0 L17.3 -49.7 L14.2 -49.8 Z;M14.2 -73.2 L17.3 -73.4 L17.3 -50.0 L14.2 -49.7 Z;M14.2 -73.0 L17.3 -73.6 L17.3 -50.2 L14.2 -49.5 Z;M14.2 -72.7 L17.3 -73.6 L17.3 -50.3 L14.2 -49.3 Z;M14.1 -72.4 L17.3 -73.5 L17.3 -50.2 L14.1 -49.0 Z;M14.1 -72.0 L17.3 -73.3 L17.3 -49.9 L14.1 -48.6 Z;M14.1 -71.7 L17.3 -72.9 L17.3 -49.6 L14.1 -48.3 Z;M14.1 -71.4 L17.3 -72.5 L17.3 -49.2 L14.1 -48.1 Z;M14.1 -71.2 L17.3 -72.0 L17.3 -48.8 L14.1 -47.9 Z;M14.1 -71.1 L17.3 -71.6 L17.3 -48.4 L14.1 -47.8 Z;M14.1 -71.0 L17.2 -71.2 L17.2 -48.1 L14.1 -47.7 Z"/><animate attributeName="fill" dur="2.4s" repeatCount="indefinite" values="#b7673d;#b4653b;#b1633a;#b06239;#af6139;#b06239;#b16239;#b1633a;#b2633a;#b16239;#af6139;#ac5f37;#a85d36;#a55a35;#a25833;#a05733;#9f5732;#a15833;#a55a35;#aa5e37;#b16239;#b7673d;#ba6b41;#be6f45;#c07248;#c17349;#c07248;#bf7147;#bc6e44;#ba6b41;#b7673d"/><animate attributeName="stroke" dur="2.4s" repeatCount="indefinite" values="#b7673d;#b4653b;#b1633a;#b06239;#af6139;#b06239;#b16239;#b1633a;#b2633a;#b16239;#af6139;#ac5f37;#a85d36;#a55a35;#a25833;#a05733;#9f5732;#a15833;#a55a35;#aa5e37;#b16239;#b7673d;#ba6b41;#be6f45;#c07248;#c17349;#c07248;#bf7147;#bc6e44;#ba6b41;#b7673d"/></path><path d="M17.2 -71.2 L20.5 -72.6 L20.5 -49.5 L17.2 -48.1 Z" fill="#c2744a" stroke="#c2744a" stroke-width="0.6" stroke-linejoin="round"><animate attributeName="d" dur="2.4s" repeatCount="indefinite" values="M17.2 -71.2 L20.5 -72.6 L20.5 -49.5 L17.2 -48.1 Z;M17.2 -70.9 L20.4 -72.0 L20.4 -49.0 L17.2 -47.8 Z;M17.2 -70.8 L20.4 -71.5 L20.4 -48.4 L17.2 -47.6 Z;M17.2 -70.6 L20.4 -71.0 L20.4 -48.0 L17.2 -47.5 Z;M17.2 -70.6 L20.3 -70.6 L20.3 -47.7 L17.2 -47.5 Z;M17.1 -70.6 L20.3 -70.4 L20.3 -47.4 L17.1 -47.5 Z;M17.1 -70.6 L20.3 -70.2 L20.3 -47.3 L17.1 -47.5 Z;M17.1 -70.6 L20.3 -70.1 L20.3 -47.2 L17.1 -47.5 Z;M17.1 -70.6 L20.2 -70.1 L20.2 -47.2 L17.1 -47.4 Z;M17.1 -70.5 L20.2 -70.2 L20.2 -47.2 L17.1 -47.4 Z;M17.1 -70.4 L20.2 -70.2 L20.2 -47.2 L17.1 -47.3 Z;M17.1 -70.4 L20.2 -70.1 L20.2 -47.2 L17.1 -47.3 Z;M17.2 -70.4 L20.2 -70.1 L20.2 -47.2 L17.2 -47.3 Z;M17.2 -70.4 L20.2 -70.0 L20.2 -47.1 L17.2 -47.3 Z;M17.2 -70.6 L20.2 -70.0 L20.2 -47.0 L17.2 -47.5 Z;M17.2 -70.8 L20.2 -69.9 L20.2 -47.0 L17.2 -47.7 Z;M17.2 -71.2 L20.3 -70.0 L20.3 -47.1 L17.2 -48.0 Z;M17.3 -71.6 L20.3 -70.1 L20.3 -47.2 L17.3 -48.4 Z;M17.3 -72.1 L20.3 -70.4 L20.3 -47.5 L17.3 -48.9 Z;M17.3 -72.6 L20.4 -70.8 L20.4 -47.8 L17.3 -49.3 Z;M17.3 -73.0 L20.4 -71.3 L20.4 -48.3 L17.3 -49.7 Z;M17.3 -73.4 L20.4 -71.9 L20.4 -48.8 L17.3 -50.0 Z;M17.3 -73.6 L20.4 -72.5 L20.4 -49.4 L17.3 -50.2 Z;M17.3 -73.6 L20.5 -73.1 L20.5 -49.9 L17.3 -50.3 Z;M17.3 -73.5 L20.5 -73.5 L20.5 -50.3 L17.3 -50.2 Z;M17.3 -73.3 L20.5 -73.8 L20.5 -50.6 L17.3 -49.9 Z;M17.3 -72.9 L20.5 -73.9 L20.5 -50.7 L17.3 -49.6 Z;M17.3 -72.5 L20.5 -73.8 L20.5 -50.6 L17.3 -49.2 Z;M17.3 -72.0 L20.5 -73.6 L20.5 -50.3 L17.3 -48.8 Z;M17.3 -71.6 L20.5 -73.1 L20.5 -50.0 L17.3 -48.4 Z;M17.2 -71.2 L20.5 -72.6 L20.5 -49.5 L17.2 -48.1 Z"/><animate attributeName="fill" dur="2.4s" repeatCount="indefinite" values="#c2744a;#bf7147;#bc6d43;#b8693f;#b5653b;#b2633a;#af6139;#ae6138;#af6138;#b06139;#b16239;#b1633a;#b16239;#af6139;#ab5f37;#a75c35;#a25934;#9e5632;#9b5431;#9a5330;#9b5431;#9f5632;#a55a35;#ad5f38;#b5653b;#ba6b41;#be7046;#c2744a;#c3764c;#c3764c;#c2744a"/><animate attributeName="stroke" dur="2.4s" repeatCount="indefinite" values="#c2744a;#bf7147;#bc6d43;#b8693f;#b5653b;#b2633a;#af6139;#ae6138;#af6138;#b06139;#b16239;#b1633a;#b16239;#af6139;#ab5f37;#a75c35;#a25934;#9e5632;#9b5431;#9a5330;#9b5431;#9f5632;#a55a35;#ad5f38;#b5653b;#ba6b41;#be7046;#c2744a;#c3764c;#c3764c;#c2744a"/></path><path d="M20.5 -72.6 L23.7 -74.1 L23.7 -51.0 L20.5 -49.5 Z" fill="#c3764c" stroke="#c3764c" stroke-width="0.6" stroke-linejoin="round"><animate attributeName="d" dur="2.4s" repeatCount="indefinite" values="M20.5 -72.6 L23.7 -74.1 L23.7 -51.0 L20.5 -49.5 Z;M20.4 -72.0 L23.7 -73.8 L23.7 -50.7 L20.4 -49.0 Z;M20.4 -71.5 L23.6 -73.4 L23.6 -50.3 L20.4 -48.4 Z;M20.4 -71.0 L23.6 -72.7 L23.6 -49.7 L20.4 -48.0 Z;M20.3 -70.6 L23.6 -72.1 L23.6 -49.1 L20.3 -47.7 Z;M20.3 -70.4 L23.5 -71.4 L23.5 -48.5 L20.3 -47.4 Z;M20.3 -70.2 L23.5 -70.8 L23.5 -47.9 L20.3 -47.3 Z;M20.3 -70.1 L23.5 -70.3 L23.5 -47.5 L20.3 -47.2 Z;M20.2 -70.1 L23.4 -70.0 L23.4 -47.2 L20.2 -47.2 Z;M20.2 -70.2 L23.4 -69.7 L23.4 -47.0 L20.2 -47.2 Z;M20.2 -70.2 L23.3 -69.6 L23.3 -46.9 L20.2 -47.2 Z;M20.2 -70.1 L23.3 -69.6 L23.3 -46.9 L20.2 -47.2 Z;M20.2 -70.1 L23.3 -69.7 L23.3 -46.9 L20.2 -47.2 Z;M20.2 -70.0 L23.3 -69.7 L23.3 -46.9 L20.2 -47.1 Z;M20.2 -70.0 L23.3 -69.7 L23.3 -46.9 L20.2 -47.0 Z;M20.2 -69.9 L23.3 -69.6 L23.3 -46.9 L20.2 -47.0 Z;M20.3 -70.0 L23.3 -69.6 L23.3 -46.8 L20.3 -47.1 Z;M20.3 -70.1 L23.3 -69.5 L23.3 -46.8 L20.3 -47.2 Z;M20.3 -70.4 L23.3 -69.5 L23.3 -46.7 L20.3 -47.5 Z;M20.4 -70.8 L23.3 -69.5 L23.3 -46.8 L20.4 -47.8 Z;M20.4 -71.3 L23.4 -69.7 L23.4 -46.9 L20.4 -48.3 Z;M20.4 -71.9 L23.4 -70.0 L23.4 -47.2 L20.4 -48.8 Z;M20.4 -72.5 L23.5 -70.4 L23.5 -47.6 L20.4 -49.4 Z;M20.5 -73.1 L23.5 -71.0 L23.5 -48.1 L20.5 -49.9 Z;M20.5 -73.5 L23.6 -71.7 L23.6 -48.8 L20.5 -50.3 Z;M20.5 -73.8 L23.6 -72.4 L23.6 -49.4 L20.5 -50.6 Z;M20.5 -73.9 L23.6 -73.1 L23.6 -50.0 L20.5 -50.7 Z;M20.5 -73.8 L23.6 -73.6 L23.6 -50.6 L20.5 -50.6 Z;M20.5 -73.6 L23.7 -74.0 L23.7 -50.9 L20.5 -50.3 Z;M20.5 -73.1 L23.7 -74.2 L23.7 -51.1 L20.5 -50.0 Z;M20.5 -72.6 L23.7 -74.1 L23.7 -51.0 L20.5 -49.5 Z"/><animate attributeName="fill" dur="2.4s" repeatCount="indefinite" values="#c3764c;#c6794f;#c6794f;#c5784e;#c2754b;#be7046;#ba6b41;#b6673d;#b2633a;#af6139;#ad6038;#ad6038;#ae6138;#b06239;#b16239;#b06239;#af6138;#ab5e37;#a65b35;#a05733;#9a5330;#96502f;#944f2e;#95502e;#985230;#9f5732;#a85c36;#b2633a;#b96a40;#bf7147;#c3764c"/><animate attributeName="stroke" dur="2.4s" repeatCount="indefinite" values="#c3764c;#c6794f;#c6794f;#c5784e;#c2754b;#be7046;#ba6b41;#b6673d;#b2633a;#af6139;#ad6038;#ad6038;#ae6138;#b06239;#b16239;#b06239;#af6138;#ab5e37;#a65b35;#a05733;#9a5330;#96502f;#944f2e;#95502e;#985230;#9f5732;#a85c36;#b2633a;#b96a40;#bf7147;#c3764c"/></path><path d="M23.7 -74.1 L26.8 -73.7 L26.8 -50.7 L23.7 -51.0 Z" fill="#ae6038" stroke="#ae6038" stroke-width="0.6" stroke-linejoin="round"><animate attributeName="d" dur="2.4s" repeatCount="indefinite" values="M23.7 -74.1 L26.8 -73.7 L26.8 -50.7 L23.7 -51.0 Z;M23.7 -73.8 L26.8 -74.2 L26.8 -51.2 L23.7 -50.7 Z;M23.6 -73.4 L26.8 -74.4 L26.8 -51.4 L23.6 -50.3 Z;M23.6 -72.7 L26.8 -74.4 L26.8 -51.4 L23.6 -49.7 Z;M23.6 -72.1 L26.8 -74.1 L26.8 -51.1 L23.6 -49.1 Z;M23.5 -71.4 L26.8 -73.6 L26.8 -50.7 L23.5 -48.5 Z;M23.5 -70.8 L26.8 -72.9 L26.8 -50.0 L23.5 -47.9 Z;M23.5 -70.3 L26.7 -72.1 L26.7 -49.3 L23.5 -47.5 Z;M23.4 -70.0 L26.7 -71.3 L26.7 -48.6 L23.4 -47.2 Z;M23.4 -69.7 L26.6 -70.6 L26.6 -47.9 L23.4 -47.0 Z;M23.3 -69.6 L26.6 -70.0 L26.6 -47.3 L23.3 -46.9 Z;M23.3 -69.6 L26.5 -69.5 L26.5 -46.9 L23.3 -46.9 Z;M23.3 -69.7 L26.5 -69.2 L26.5 -46.6 L23.3 -46.9 Z;M23.3 -69.7 L26.4 -69.1 L26.4 -46.5 L23.3 -46.9 Z;M23.3 -69.7 L26.4 -69.1 L26.4 -46.5 L23.3 -46.9 Z;M23.3 -69.6 L26.3 -69.1 L26.3 -46.5 L23.3 -46.9 Z;M23.3 -69.6 L26.3 -69.2 L26.3 -46.6 L23.3 -46.8 Z;M23.3 -69.5 L26.3 -69.2 L26.3 -46.6 L23.3 -46.8 Z;M23.3 -69.5 L26.3 -69.2 L26.3 -46.6 L23.3 -46.7 Z;M23.3 -69.5 L26.3 -69.1 L26.3 -46.5 L23.3 -46.8 Z;M23.4 -69.7 L26.3 -69.0 L26.3 -46.5 L23.4 -46.9 Z;M23.4 -70.0 L26.4 -69.0 L26.4 -46.4 L23.4 -47.2 Z;M23.5 -70.4 L26.4 -69.0 L26.4 -46.4 L23.5 -47.6 Z;M23.5 -71.0 L26.5 -69.2 L26.5 -46.6 L23.5 -48.1 Z;M23.6 -71.7 L26.5 -69.5 L26.5 -46.9 L23.6 -48.8 Z;M23.6 -72.4 L26.6 -70.0 L26.6 -47.3 L23.6 -49.4 Z;M23.6 -73.1 L26.6 -70.6 L26.6 -47.9 L23.6 -50.0 Z;M23.6 -73.6 L26.7 -71.4 L26.7 -48.6 L23.6 -50.6 Z;M23.7 -74.0 L26.7 -72.2 L26.7 -49.4 L23.7 -50.9 Z;M23.7 -74.2 L26.8 -73.0 L26.8 -50.1 L23.7 -51.1 Z;M23.7 -74.1 L26.8 -73.7 L26.8 -50.7 L23.7 -51.0 Z"/><animate attributeName="fill" dur="2.4s" repeatCount="indefinite" values="#ae6038;#b8693f;#bf7147;#c4774d;#c87b51;#c97d53;#c87c52;#c5784e;#c1744a;#bd6e44;#b8683e;#b3643a;#af6138;#ac5f37;#ac5f37;#ad5f38;#ae6138;#b06239;#b06239;#ae6138;#ab5e37;#a55a35;#9e5632;#97512f;#914d2d;#8e4b2c;#8e4b2c;#924e2d;#995230;#a35934;#ae6038"/><animate attributeName="stroke" dur="2.4s" repeatCount="indefinite" values="#ae6038;#b8693f;#bf7147;#c4774d;#c87b51;#c97d53;#c87c52;#c5784e;#c1744a;#bd6e44;#b8683e;#b3643a;#af6138;#ac5f37;#ac5f37;#ad5f38;#ae6138;#b06239;#b06239;#ae6138;#ab5e37;#a55a35;#9e5632;#97512f;#914d2d;#8e4b2c;#8e4b2c;#924e2d;#995230;#a35934;#ae6038"/></path><path d="M26.8 -73.7 L29.8 -71.0 L29.8 -48.4 L26.8 -50.7 Z" fill="#8a492a" stroke="#8a492a" stroke-width="0.6" stroke-linejoin="round"><animate attributeName="d" dur="2.4s" repeatCount="indefinite" values="M26.8 -73.7 L29.8 -71.0 L29.8 -48.4 L26.8 -50.7 Z;M26.8 -74.2 L29.9 -71.9 L29.9 -49.3 L26.8 -51.2 Z;M26.8 -74.4 L29.9 -72.8 L29.9 -50.1 L26.8 -51.4 Z;M26.8 -74.4 L30.0 -73.6 L30.0 -50.8 L26.8 -51.4 Z;M26.8 -74.1 L30.0 -74.3 L30.0 -51.4 L26.8 -51.1 Z;M26.8 -73.6 L30.0 -74.6 L30.0 -51.7 L26.8 -50.7 Z;M26.8 -72.9 L30.0 -74.6 L30.0 -51.8 L26.8 -50.0 Z;M26.7 -72.1 L30.0 -74.4 L30.0 -51.5 L26.7 -49.3 Z;M26.7 -71.3 L30.0 -73.8 L30.0 -51.0 L26.7 -48.6 Z;M26.6 -70.6 L29.9 -73.1 L29.9 -50.3 L26.6 -47.9 Z;M26.6 -70.0 L29.9 -72.2 L29.9 -49.5 L26.6 -47.3 Z;M26.5 -69.5 L29.8 -71.2 L29.8 -48.6 L26.5 -46.9 Z;M26.5 -69.2 L29.7 -70.4 L29.7 -47.8 L26.5 -46.6 Z;M26.4 -69.1 L29.7 -69.6 L29.7 -47.1 L26.4 -46.5 Z;M26.4 -69.1 L29.6 -69.1 L29.6 -46.6 L26.4 -46.5 Z;M26.3 -69.1 L29.5 -68.7 L29.5 -46.3 L26.3 -46.5 Z;M26.3 -69.2 L29.5 -68.5 L29.5 -46.1 L26.3 -46.6 Z;M26.3 -69.2 L29.4 -68.5 L29.4 -46.1 L26.3 -46.6 Z;M26.3 -69.2 L29.4 -68.5 L29.4 -46.1 L26.3 -46.6 Z;M26.3 -69.1 L29.3 -68.6 L29.3 -46.2 L26.3 -46.5 Z;M26.3 -69.0 L29.3 -68.6 L29.3 -46.2 L26.3 -46.5 Z;M26.4 -69.0 L29.3 -68.6 L29.3 -46.2 L26.4 -46.4 Z;M26.4 -69.0 L29.3 -68.6 L29.3 -46.2 L26.4 -46.4 Z;M26.5 -69.2 L29.4 -68.5 L29.4 -46.1 L26.5 -46.6 Z;M26.5 -69.5 L29.4 -68.5 L29.4 -46.1 L26.5 -46.9 Z;M26.6 -70.0 L29.5 -68.5 L29.5 -46.1 L26.6 -47.3 Z;M26.6 -70.6 L29.5 -68.6 L29.5 -46.2 L26.6 -47.9 Z;M26.7 -71.4 L29.6 -68.9 L29.6 -46.5 L26.7 -48.6 Z;M26.7 -72.2 L29.7 -69.5 L29.7 -47.0 L26.7 -49.4 Z;M26.8 -73.0 L29.7 -70.2 L29.7 -47.6 L26.8 -50.1 Z;M26.8 -73.7 L29.8 -71.0 L29.8 -48.4 L26.8 -50.7 Z"/><animate attributeName="fill" dur="2.4s" repeatCount="indefinite" values="#8a492a;#924e2d;#9c5531;#a95d36;#b6673d;#be7046;#c5784e;#ca7d53;#cc8056;#cb7f55;#c97c52;#c4774d;#bf7147;#ba6b41;#b5653b;#af6139;#ab5f37;#aa5e37;#ab5e37;#ad5f38;#af6138;#af6139;#ae6038;#aa5e37;#a45a34;#9d5531;#944f2e;#8d4b2b;#884829;#874729;#8a492a"/><animate attributeName="stroke" dur="2.4s" repeatCount="indefinite" values="#8a492a;#924e2d;#9c5531;#a95d36;#b6673d;#be7046;#c5784e;#ca7d53;#cc8056;#cb7f55;#c97c52;#c4774d;#bf7147;#ba6b41;#b5653b;#af6139;#ab5f37;#aa5e37;#ab5e37;#ad5f38;#af6138;#af6139;#ae6038;#aa5e37;#a45a34;#9d5531;#944f2e;#8d4b2b;#884829;#874729;#8a492a"/></path><path d="M29.8 -71.0 L32.6 -68.4 L32.6 -46.1 L29.8 -48.4 Z" fill="#89482a" stroke="#89482a" stroke-width="0.6" stroke-linejoin="round"><animate attributeName="d" dur="2.4s" repeatCount="indefinite" values="M29.8 -71.0 L32.6 -68.4 L32.6 -46.1 L29.8 -48.4 Z;M29.9 -71.9 L32.7 -68.9 L32.7 -46.6 L29.9 -49.3 Z;M29.9 -72.8 L32.8 -69.6 L32.8 -47.3 L29.9 -50.1 Z;M30.0 -73.6 L32.9 -70.6 L32.9 -48.1 L30.0 -50.8 Z;M30.0 -74.3 L33.0 -71.6 L33.0 -49.1 L30.0 -51.4 Z;M30.0 -74.6 L33.0 -72.6 L33.0 -50.0 L30.0 -51.7 Z;M30.0 -74.6 L33.1 -73.5 L33.1 -50.9 L30.0 -51.8 Z;M30.0 -74.4 L33.1 -74.3 L33.1 -51.6 L30.0 -51.5 Z;M30.0 -73.8 L33.2 -74.7 L33.2 -52.0 L30.0 -51.0 Z;M29.9 -73.1 L33.2 -74.9 L33.2 -52.1 L29.9 -50.3 Z;M29.9 -72.2 L33.2 -74.6 L33.2 -51.9 L29.9 -49.5 Z;M29.8 -71.2 L33.1 -74.0 L33.1 -51.3 L29.8 -48.6 Z;M29.7 -70.4 L33.1 -73.2 L33.1 -50.6 L29.7 -47.8 Z;M29.7 -69.6 L33.0 -72.2 L33.0 -49.7 L29.7 -47.1 Z;M29.6 -69.1 L32.9 -71.2 L32.9 -48.7 L29.6 -46.6 Z;M29.5 -68.7 L32.9 -70.1 L32.9 -47.8 L29.5 -46.3 Z;M29.5 -68.5 L32.8 -69.3 L32.8 -46.9 L29.5 -46.1 Z;M29.4 -68.5 L32.7 -68.6 L32.7 -46.3 L29.4 -46.1 Z;M29.4 -68.5 L32.6 -68.1 L32.6 -45.9 L29.4 -46.1 Z;M29.3 -68.6 L32.5 -67.9 L32.5 -45.7 L29.3 -46.2 Z;M29.3 -68.6 L32.5 -67.8 L32.5 -45.6 L29.3 -46.2 Z;M29.3 -68.6 L32.4 -67.8 L32.4 -45.6 L29.3 -46.2 Z;M29.3 -68.6 L32.4 -67.9 L32.4 -45.7 L29.3 -46.2 Z;M29.4 -68.5 L32.3 -68.0 L32.3 -45.8 L29.4 -46.1 Z;M29.4 -68.5 L32.3 -68.1 L32.3 -45.8 L29.4 -46.1 Z;M29.5 -68.5 L32.3 -68.0 L32.3 -45.8 L29.5 -46.1 Z;M29.5 -68.6 L32.4 -68.0 L32.4 -45.8 L29.5 -46.2 Z;M29.6 -68.9 L32.4 -67.9 L32.4 -45.7 L29.6 -46.5 Z;M29.7 -69.5 L32.5 -67.9 L32.5 -45.7 L29.7 -47.0 Z;M29.7 -70.2 L32.6 -68.1 L32.6 -45.8 L29.7 -47.6 Z;M29.8 -71.0 L32.6 -68.4 L32.6 -46.1 L29.8 -48.4 Z"/><animate attributeName="fill" dur="2.4s" repeatCount="indefinite" values="#89482a;#834427;#814226;#834427;#8a492a;#96502f;#a45a34;#b4643a;#be6f45;#c5784e;#cb7f55;#ce8359;#cf8359;#cc8056;#c87b51;#c2744a;#bc6d43;#b6663c;#af6139;#aa5e37;#a85d36;#a95d36;#ab5e37;#ad6038;#ae6138;#ae6038;#aa5e37;#a45a34;#9b5431;#924e2d;#89482a"/><animate attributeName="stroke" dur="2.4s" repeatCount="indefinite" values="#89482a;#834427;#814226;#834427;#8a492a;#96502f;#a45a34;#b4643a;#be6f45;#c5784e;#cb7f55;#ce8359;#cf8359;#cc8056;#c87b51;#c2744a;#bc6d43;#b6663c;#af6139;#aa5e37;#a85d36;#a95d36;#ab5e37;#ad6038;#ae6138;#ae6038;#aa5e37;#a45a34;#9b5431;#924e2d;#89482a"/></path><path d="M32.6 -68.4 L35.4 -67.4 L35.4 -45.3 L32.6 -46.1 Z" fill="#a45934" stroke="#a45934" stroke-width="0.6" stroke-linejoin="round"><animate attributeName="d" dur="2.4s" repeatCount="indefinite" values="M32.6 -68.4 L35.4 -67.4 L35.4 -45.3 L32.6 -46.1 Z;M32.7 -68.9 L35.5 -67.4 L35.5 -45.3 L32.7 -46.6 Z;M32.8 -69.6 L35.6 -67.5 L35.6 -45.4 L32.8 -47.3 Z;M32.9 -70.6 L35.7 -67.8 L35.7 -45.7 L32.9 -48.1 Z;M33.0 -71.6 L35.8 -68.3 L35.8 -46.2 L33.0 -49.1 Z;M33.0 -72.6 L35.9 -69.1 L35.9 -46.9 L33.0 -50.0 Z;M33.1 -73.5 L36.0 -70.1 L36.0 -47.8 L33.1 -50.9 Z;M33.1 -74.3 L36.1 -71.2 L36.1 -48.8 L33.1 -51.6 Z;M33.2 -74.7 L36.2 -72.3 L36.2 -49.9 L33.2 -52.0 Z;M33.2 -74.9 L36.2 -73.4 L36.2 -50.9 L33.2 -52.1 Z;M33.2 -74.6 L36.3 -74.2 L36.3 -51.7 L33.2 -51.9 Z;M33.1 -74.0 L36.3 -74.8 L36.3 -52.2 L33.1 -51.3 Z;M33.1 -73.2 L36.3 -75.0 L36.3 -52.4 L33.1 -50.6 Z;M33.0 -72.2 L36.3 -74.8 L36.3 -52.2 L33.0 -49.7 Z;M32.9 -71.2 L36.3 -74.3 L36.3 -51.7 L32.9 -48.7 Z;M32.9 -70.1 L36.2 -73.4 L36.2 -50.9 L32.9 -47.8 Z;M32.8 -69.3 L36.2 -72.3 L36.2 -49.9 L32.8 -46.9 Z;M32.7 -68.6 L36.1 -71.1 L36.1 -48.8 L32.7 -46.3 Z;M32.6 -68.1 L36.0 -69.9 L36.0 -47.7 L32.6 -45.9 Z;M32.5 -67.9 L35.9 -68.9 L35.9 -46.8 L32.5 -45.7 Z;M32.5 -67.8 L35.8 -68.1 L35.8 -46.0 L32.5 -45.6 Z;M32.4 -67.8 L35.7 -67.5 L35.7 -45.5 L32.4 -45.6 Z;M32.4 -67.9 L35.6 -67.2 L35.6 -45.2 L32.4 -45.7 Z;M32.3 -68.0 L35.5 -67.1 L35.5 -45.1 L32.3 -45.8 Z;M32.3 -68.1 L35.4 -67.1 L35.4 -45.1 L32.3 -45.8 Z;M32.3 -68.0 L35.4 -67.2 L35.4 -45.2 L32.3 -45.8 Z;M32.4 -68.0 L35.3 -67.3 L35.3 -45.3 L32.4 -45.8 Z;M32.4 -67.9 L35.3 -67.4 L35.3 -45.4 L32.4 -45.7 Z;M32.5 -67.9 L35.3 -67.4 L35.3 -45.4 L32.5 -45.7 Z;M32.6 -68.1 L35.4 -67.4 L35.4 -45.4 L32.6 -45.8 Z;M32.6 -68.4 L35.4 -67.4 L35.4 -45.3 L32.6 -46.1 Z"/><animate attributeName="fill" dur="2.4s" repeatCount="indefinite" values="#a45934;#9a5330;#904c2c;#864628;#804226;#804226;#804226;#834427;#8e4c2c;#9e5632;#af6139;#bc6d43;#c5784e;#cc8157;#d1865c;#d2875d;#d0845a;#cb7f55;#c5784e;#be7046;#b8683e;#b06239;#aa5e37;#a75c35;#a65b35;#a85d36;#ab5e37;#ad6038;#ad6038;#aa5e37;#a45934"/><animate attributeName="stroke" dur="2.4s" repeatCount="indefinite" values="#a45934;#9a5330;#904c2c;#864628;#804226;#804226;#804226;#834427;#8e4c2c;#9e5632;#af6139;#bc6d43;#c5784e;#cc8157;#d1865c;#d2875d;#d0845a;#cb7f55;#c5784e;#be7046;#b8683e;#b06239;#aa5e37;#a75c35;#a65b35;#a85d36;#ab5e37;#ad6038;#ad6038;#aa5e37;#a45934"/></path><path d="M35.4 -67.4 L38.3 -66.8 L38.3 -44.9 L35.4 -45.3 Z" fill="#ab5e37" stroke="#ab5e37" stroke-width="0.6" stroke-linejoin="round"><animate attributeName="d" dur="2.4s" repeatCount="indefinite" values="M35.4 -67.4 L38.3 -66.8 L38.3 -44.9 L35.4 -45.3 Z;M35.5 -67.4 L38.3 -66.8 L38.3 -44.9 L35.5 -45.3 Z;M35.6 -67.5 L38.4 -66.8 L38.4 -44.9 L35.6 -45.4 Z;M35.7 -67.8 L38.4 -66.8 L38.4 -44.9 L35.7 -45.7 Z;M35.8 -68.3 L38.5 -66.8 L38.5 -44.9 L35.8 -46.2 Z;M35.9 -69.1 L38.6 -66.9 L38.6 -45.0 L35.9 -46.9 Z;M36.0 -70.1 L38.7 -67.2 L38.7 -45.3 L36.0 -47.8 Z;M36.1 -71.2 L38.8 -67.7 L38.8 -45.8 L36.1 -48.8 Z;M36.2 -72.3 L39.0 -68.5 L39.0 -46.5 L36.2 -49.9 Z;M36.2 -73.4 L39.1 -69.5 L39.1 -47.4 L36.2 -50.9 Z;M36.3 -74.2 L39.2 -70.7 L39.2 -48.5 L36.3 -51.7 Z;M36.3 -74.8 L39.3 -71.9 L39.3 -49.7 L36.3 -52.2 Z;M36.3 -75.0 L39.4 -73.1 L39.4 -50.8 L36.3 -52.4 Z;M36.3 -74.8 L39.4 -74.1 L39.4 -51.7 L36.3 -52.2 Z;M36.3 -74.3 L39.5 -74.8 L39.5 -52.3 L36.3 -51.7 Z;M36.2 -73.4 L39.5 -75.2 L39.5 -52.6 L36.2 -50.9 Z;M36.2 -72.3 L39.5 -75.0 L39.5 -52.5 L36.2 -49.9 Z;M36.1 -71.1 L39.4 -74.5 L39.4 -52.0 L36.1 -48.8 Z;M36.0 -69.9 L39.4 -73.6 L39.4 -51.2 L36.0 -47.7 Z;M35.9 -68.9 L39.3 -72.4 L39.3 -50.1 L35.9 -46.8 Z;M35.8 -68.1 L39.2 -71.1 L39.2 -48.9 L35.8 -46.0 Z;M35.7 -67.5 L39.1 -69.8 L39.1 -47.7 L35.7 -45.5 Z;M35.6 -67.2 L39.0 -68.6 L39.0 -46.6 L35.6 -45.2 Z;M35.5 -67.1 L38.8 -67.6 L38.8 -45.7 L35.5 -45.1 Z;M35.4 -67.1 L38.7 -66.9 L38.7 -45.0 L35.4 -45.1 Z;M35.4 -67.2 L38.6 -66.5 L38.6 -44.6 L35.4 -45.2 Z;M35.3 -67.3 L38.5 -66.3 L38.5 -44.5 L35.3 -45.3 Z;M35.3 -67.4 L38.4 -66.3 L38.4 -44.5 L35.3 -45.4 Z;M35.3 -67.4 L38.4 -66.5 L38.4 -44.6 L35.3 -45.4 Z;M35.4 -67.4 L38.3 -66.6 L38.3 -44.8 L35.4 -45.4 Z;M35.4 -67.4 L38.3 -66.8 L38.3 -44.9 L35.4 -45.3 Z"/><animate attributeName="fill" dur="2.4s" repeatCount="indefinite" values="#ab5e37;#ac5f37;#a95d36;#a35934;#9a5330;#8e4b2c;#824427;#804226;#804226;#804226;#804226;#874629;#97512f;#aa5e37;#ba6b41;#c5784e;#cd8258;#d3885e;#d58a60;#d3895f;#cf8359;#c87c52;#c17349;#ba6a40;#b2633a;#aa5e37;#a55b35;#a45a34;#a55b35;#a85d36;#ab5e37"/><animate attributeName="stroke" dur="2.4s" repeatCount="indefinite" values="#ab5e37;#ac5f37;#a95d36;#a35934;#9a5330;#8e4b2c;#824427;#804226;#804226;#804226;#804226;#874629;#97512f;#aa5e37;#ba6b41;#c5784e;#cd8258;#d3885e;#d58a60;#d3895f;#cf8359;#c87c52;#c17349;#ba6a40;#b2633a;#aa5e37;#a55b35;#a45a34;#a55b35;#a85d36;#ab5e37"/></path></g></g>' +
      hillTrees +
      '<g transform="translate(' + (W * 0.3 - 70) + ' 3152) scale(1.35)">' +
        '<ellipse cx="6" cy="1" rx="44" ry="5" fill="#1f2621" opacity="0.22" filter="url(#lm-blur)"/>' +
        '<rect x="-33" y="-64" width="7" height="64" rx="2" fill="#5a3d28"/><rect x="-28.5" y="-64" width="2.5" height="64" fill="#3f2b1d"/>' +
        '<rect x="26" y="-64" width="7" height="64" rx="2" fill="#5a3d28"/><rect x="30.5" y="-64" width="2.5" height="64" fill="#3f2b1d"/>' +
        '<path d="M-42 -66 L0 -82 L42 -66 L38 -63 L0 -77 L-38 -63 Z" fill="#74432e"/><path d="M0 -82 L42 -66 L38 -63 L0 -77 Z" fill="#5f3624"/>' +
        '<rect x="-38" y="-62" width="76" height="34" rx="2" fill="#4b3a2c"/>' +
        '<rect x="-35" y="-59" width="70" height="28" rx="1.5" fill="#7b5f45"/>' +
        '<path d="M-33 -52 Q-10 -54 12 -51 T33 -52 M-33 -40 Q-8 -38 14 -41 T33 -39 M-33 -35 Q0 -36 33 -34" fill="none" stroke="#6a5240" stroke-width="0.8" opacity="0.8"/>' +
        '<text x="0" y="-41" font-family="Newsreader, Georgia, serif" font-size="13" font-weight="600" text-anchor="middle" fill="#f1e6cc" letter-spacing="0.5">Trailhead</text>' +
        '<circle cx="-31" cy="-55.5" r="1.1" fill="#3f2b1d"/><circle cx="31" cy="-55.5" r="1.1" fill="#3f2b1d"/><circle cx="-31" cy="-34.5" r="1.1" fill="#3f2b1d"/><circle cx="31" cy="-34.5" r="1.1" fill="#3f2b1d"/>' +
        '<path d="M-22 -24 H16 L24 -18 L16 -12 H-22 Z" fill="#d6ccb5"/><path d="M-22 -18 H24 L16 -12 H-22 Z" fill="#b3a891" opacity="0.6"/>' +
        '<text x="-1" y="-15.2" font-family="Manrope, sans-serif" font-size="6.2" font-weight="800" text-anchor="middle" fill="#2a2f2b">Summit trail</text>' +
        '</g>' +
      '<g filter="url(#soft)" opacity="0.92">' + cloudsFront + '</g>' +
      '<g id="a-climber"><circle r="13" fill="#b5653b" opacity="0.25"/><circle r="7" fill="#1f2621" stroke="#fffbed" stroke-width="2.5"/></g>' +
      "</svg>";
    var svg = host.querySelector("svg.mtn");
    var fars = host.querySelectorAll("svg.far");
    var trail = svg.querySelector("#a-trail");
    var walked = svg.querySelector("#a-walked");
    var climber = svg.querySelector("#a-climber");
    walked.setAttribute("stroke-dasharray", len + " " + len);
    var view = { s: 1, tx: 0, ty: 0 };
    Array.prototype.forEach.call(svg.querySelectorAll(".lm"), function (el) { lmEls[+el.getAttribute("data-stop")] = el; });
    return {
      render: function (t) {
        var sw = stage.clientWidth, sh = stage.clientHeight;
        var narrow = sw <= 900;
        var s = clamp(sh / 1350, 0.4, 1.2) * (sw < 600 ? 0.66 : 1);
        var p = at(t);
        var tx, peakX = 545 * X;
        if (sw > 900) tx = sw * 0.62 - lerp(peakX, p[0], 0.55) * s;
        else tx = clamp(sw / 2 - p[0] * s, sw - W * s, 0);
        var ty = sh * (narrow ? 0.42 : 0.6) - p[1] * s;
        ty = clamp(ty, sh - Hh * s, (narrow ? sh * 0.3 : sh * 0.42) - 150 * s + 60);
        view = { s: s, tx: tx, ty: ty };
        svg.style.transform = "translate(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px) scale(" + s.toFixed(4) + ")";
        fars[0].style.transform = "translateY(" + (t * sh * 0.45).toFixed(1) + "px)";
        fars[1].style.transform = "translateY(" + (t * sh * 0.75).toFixed(1) + "px)";
        walked.setAttribute("stroke-dashoffset", (len * (1 - t)).toFixed(1));
        climber.setAttribute("transform", "translate(" + p[0].toFixed(1) + " " + p[1].toFixed(1) + ")");
      },
      landmarks: lmEls,
      svg: svg,
      project: function (t, i) {
        var p = anchors[i] || at(t), x = view.tx + p[0] * view.s, y = view.ty + p[1] * view.s;
        var sh = stage.clientHeight;
        return { x: x, y: y, vis: y > -40 && y < sh + 40 };
      }
    };
  }

  /* ---------------- Snow ---------------- */
  var snowCtx = snowCanvas.getContext("2d"), flakes = [], snowAmt = 0, snowRaf = 0, lastSnow = 0;
  for (var f = 0; f < 320; f++) flakes.push({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 2.2, v: 0.04 + Math.random() * 0.08, ph: Math.random() * 6.28 });
  function snowFrame(now) {
    snowRaf = 0;
    var w = snowCanvas.clientWidth, h = snowCanvas.clientHeight;
    if (snowCanvas.width !== w || snowCanvas.height !== h) { snowCanvas.width = w; snowCanvas.height = h; }
    snowCtx.clearRect(0, 0, w, h);
    if (snowAmt < 0.01) return;
    var dt = lastSnow ? Math.min(0.05, (now - lastSnow) / 1000) : 0.016; lastSnow = now;
    var count = Math.round(flakes.length * snowAmt);
    snowCtx.fillStyle = "rgba(255,255,255,0.9)";
    for (var i = 0; i < count; i++) {
      var fl = flakes[i];
      if (!reduceQ.matches) {
        fl.y += fl.v * dt * (1 + fl.r * 0.4); fl.ph += dt;
        fl.x += Math.sin(fl.ph) * 0.0006 + 0.012 * dt;
        if (fl.y > 1.02) { fl.y = -0.02; fl.x = Math.random(); }
        if (fl.x > 1.02) fl.x = -0.02;
      }
      snowCtx.globalAlpha = 0.5 + fl.r * 0.2;
      snowCtx.beginPath(); snowCtx.arc(fl.x * w, fl.y * h, fl.r, 0, 6.283); snowCtx.fill();
    }
    snowCtx.globalAlpha = 1;
    if (!reduceQ.matches) snowRaf = requestAnimationFrame(snowFrame);
  }
  function setSnow(a) { snowAmt = a; if (!snowRaf) { lastSnow = 0; snowRaf = requestAnimationFrame(snowFrame); } }

  /* ---------------- Mountain ---------------- */
  var mountain = SketchA(sketchHost);
  // Landmark animations (smoke, chairlift, signals, lights) pause for reduced motion
  function applyMotion() { try { if (reduceQ.matches) mountain.svg.pauseAnimations(); else mountain.svg.unpauseAnimations(); } catch (e) {} }
  applyMotion();
  if (reduceQ.addEventListener) reduceQ.addEventListener("change", applyMotion);
  // Landmarks and number markers share hover, focus, and click
  function setHot(i, on) {
    if (markers[i]) markers[i].setAttribute("data-hot", String(on));
    var el = mountain.landmarks[i]; if (el) el.classList.toggle("is-hot", on);
  }
  Object.keys(mountain.landmarks).forEach(function (k) {
    var i = +k, el = mountain.landmarks[i];
    el.addEventListener("mouseenter", function () { setHot(i, true); });
    el.addEventListener("mouseleave", function () { setHot(i, false); });
    el.addEventListener("click", function () { openPanel(i, false, markers[i]); });
    var m = markers[i];
    m.addEventListener("mouseenter", function () { setHot(i, true); });
    m.addEventListener("mouseleave", function () { setHot(i, false); });
    m.addEventListener("focus", function () { setHot(i, true); });
    m.addEventListener("blur", function () { setHot(i, false); });
  });

  /* ---------------- Frame ---------------- */
  var raf = 0, lastFrame = 0, nearest = 0, lastNearest = -1;
  function requestFrame() { if (!raf) raf = requestAnimationFrame(frame); }
  function frame(now) {
    raf = 0;
    var dt = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 0.016; lastFrame = now;
    if (reduceQ.matches) shownT = targetT;
    else shownT = Math.abs(targetT - shownT) < 0.0004 ? targetT : shownT + (targetT - shownT) * (1 - Math.exp(-dt * 7));
    var t = shownT, wx = weather(t);
    sky.style.setProperty("--sky-top", css(wx.top));
    sky.style.setProperty("--sky-bottom", css(wx.bottom));
    stage.style.setProperty("--sun", wx.sun.toFixed(3));
    stage.style.setProperty("--haze", wx.haze.toFixed(3));
    setSnow(wx.snow);
    var sk = mountain;
    sk.render(t, wx);
    // Markers
    STOPS.forEach(function (s, i) {
      var m = markers[i]; if (!m) return;
      var p = sk.project(STOP_T[i], i);
      if (!p.vis) { m.setAttribute("data-hidden", "true"); m.tabIndex = -1; return; }
      m.removeAttribute("data-hidden"); m.tabIndex = 0;
      m.style.transform = "translate(" + (p.x - 19).toFixed(1) + "px," + (p.y - 50).toFixed(1) + "px)";
      m.setAttribute("data-visited", String(STOP_T[i] <= t + 0.005));
    });
    updateHud();
    if (shownT !== targetT) requestFrame();
    else lastFrame = 0;
  }

  function updateHud() {
    nearest = Math.round(u);
    var d = Math.abs(u - nearest), s = STOPS[nearest];
    cards.forEach(function (c) {
      var i = +c.getAttribute("data-card"), dd = Math.abs(u - i);
      var o = clamp(1 - (dd - 0.22) / 0.25, 0, 1);
      c.style.opacity = o.toFixed(3);
      var on = o > 0.35;
      c.setAttribute("data-active", String(on));
      if (on) c.removeAttribute("inert"); else c.setAttribute("inert", "");
    });
    markers.forEach(function (m, i) { if (m) m.setAttribute("data-current", String(i === nearest && d < 0.3)); });
    railButtons.forEach(function (b, i) { if (i === nearest) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current"); });
    var cardShowing = s.kind === "section" && d < 0.47;
    sign.setAttribute("data-hidden", String(cardShowing));
    if (cardShowing) sign.setAttribute("inert", ""); else sign.removeAttribute("inert");
    if (nearest !== lastNearest || true) {
      if (s.kind === "wp" && d < 0.3) {
        signPlace.textContent = "Waypoint " + pad(s.n) + " of 06, " + s.elev;
        signName.textContent = s.name;
        signOpen.hidden = false;
      } else {
        var next = STOPS[Math.min(N - 1, Math.floor(u) + 1)];
        signPlace.textContent = "On the trail";
        signName.textContent = "Climbing toward " + (next.kind === "wp" ? next.name : next.name.toLowerCase());
        signOpen.hidden = true;
      }
      lastNearest = nearest;
    }
  }
  signOpen.addEventListener("click", function () { if (STOPS[nearest].kind === "wp") openPanel(nearest, false, signOpen); });

  /* ---------------- Panel ---------------- */
  var panelStop = -1, returnFocus = null;
  function cleanClone(node) {
    var c = node.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll("[id]"), function (el) { el.removeAttribute("id"); });
    c.removeAttribute("id");
    Array.prototype.forEach.call(c.querySelectorAll("[aria-labelledby]"), function (el) { el.removeAttribute("aria-labelledby"); });
    c.removeAttribute("aria-labelledby");
    Array.prototype.forEach.call(c.querySelectorAll('a[href^="http"], a[href^="mailto"]'), function (a) {
      if (a.getAttribute("href").indexOf("http") === 0) { a.target = "_blank"; a.rel = "noopener"; }
    });
    return c;
  }
  function openPanel(i, showCase, from) {
    var s = STOPS[i]; if (!s || s.kind !== "wp") return;
    panelStop = i; returnFocus = from || returnFocus;
    panelBody.innerHTML = "";
    panelKicker.textContent = "Waypoint " + pad(s.n) + ", " + s.elev;
    if (showCase && s.caseId) {
      var art = cleanClone(document.getElementById(s.caseId));
      Array.prototype.forEach.call(art.querySelectorAll(".cs-bar, .cs-footer"), function (el) { el.remove(); });
      var h = art.querySelector("h2"); if (h) h.id = "panel-title";
      panelBody.appendChild(art);
      panelBack.hidden = false;
    } else {
      var src = document.getElementById(s.slug);
      var wrap = document.createElement("div");
      wrap.className = "panel-waypoint";
      wrap.appendChild(cleanClone(src.querySelector(".waypoint-story")));
      wrap.appendChild(cleanClone(src.querySelector(".waypoint-details")));
      var h3 = wrap.querySelector("h3"); if (h3) h3.id = "panel-title";
      Array.prototype.forEach.call(wrap.querySelectorAll('a[href^="#case-"]'), function (a) {
        a.addEventListener("click", function (e) { e.preventDefault(); openPanel(i, true); });
      });
      panelBody.appendChild(wrap);
      panelBack.hidden = true;
    }
    panel.hidden = false;
    stage.classList.add("panel-open");
    markers.forEach(function (m, j) { if (m) m.setAttribute("data-open", String(j === i)); });
    panelBody.scrollTop = 0;
    panelBody.focus({ preventScroll: true });
  }
  function closePanel() {
    if (panel.hidden) return;
    panel.hidden = true; panelStop = -1;
    stage.classList.remove("panel-open");
    markers.forEach(function (m) { if (m) m.setAttribute("data-open", "false"); });
    if (returnFocus && document.contains(returnFocus) && returnFocus.offsetParent) returnFocus.focus({ preventScroll: true });
  }
  panelClose.addEventListener("click", closePanel);
  panelBack.addEventListener("click", function () { openPanel(panelStop, false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closePanel(); });

  /* ---------------- List view ---------------- */
  function setListMode(on, focus) {
    html.classList.toggle("list-mode", on);
    viewToggle.setAttribute("aria-pressed", String(on));
    viewToggle.textContent = on ? "Climb view" : "List view";
    if (on) { closePanel(); if (focus) document.getElementById("list-view").focus({ preventScroll: true }); if (!location.hash) window.scrollTo(0, 0); }
    else { measure(); }
  }
  viewToggle.addEventListener("click", function () {
    var on = !html.classList.contains("list-mode");
    if (!on && location.hash) history.replaceState(null, "", location.pathname + location.search);
    setListMode(on, true);
    if (!on) window.scrollTo(0, climb.offsetTop);
  });
  function hashWantsList() {
    if (!location.hash || location.hash === "#") return false;
    var el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    return !!(el && el.closest(".list-view"));
  }
  window.addEventListener("hashchange", function () { if (hashWantsList()) setListMode(true); });
  document.querySelector(".climb-header .wordmark").addEventListener("click", function (e) {
    if (!html.classList.contains("list-mode")) { e.preventDefault(); goto(0); }
  });

  /* ---------------- Wiring ---------------- */
  function measure() { readScroll(); requestFrame(); }
  window.addEventListener("scroll", function () { readScroll(); requestFrame(); }, { passive: true });
  window.addEventListener("resize", function () { readScroll(); shownT = targetT; requestFrame(); });
  reduceQ.addEventListener && reduceQ.addEventListener("change", requestFrame);

  if (hashWantsList()) setListMode(true);
  readScroll(); shownT = targetT; requestFrame();
})();
