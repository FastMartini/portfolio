import math
# Traveling-wave flag: waves start at the pole and grow toward the free end; shading follows each fold.
L, H, x0, top = 38.0, 24.0, 1.5, -72.0
N = 30          # frames per loop
cols = 12       # vertical strips for shading
def disp(u, t):
    a = 4.2 * (u ** 1.15)
    ph = 2 * math.pi * t
    return a * math.sin(2 * math.pi * 1.25 * u - ph) + 0.35 * a * math.sin(2 * math.pi * 2.6 * u - 2 * ph + 1.1)
def xs(u, t):
    # the cloth shortens slightly where it ripples hardest
    return x0 + L * u - 1.2 * (u ** 2) * (1 + math.sin(2 * math.pi * 1.25 * u - 2 * math.pi * t)) * 0.5
def droop(u):
    return 2.5 * u * u  # the free end sags a touch
frames_outline, strips = [], [[] for _ in range(cols)]
shade = [[] for _ in range(cols)]
for f in range(N + 1):
    t = (f % N) / N
    us = [k / cols for k in range(cols + 1)]
    topPts = [(xs(u, t), top + disp(u, t) + droop(u)) for u in us]
    botPts = [(xs(u, t), top + H - 0.08 * H * u + disp(u, t) * 0.92 + droop(u)) for u in us]
    d = "M" + " L".join("%.1f %.1f" % p for p in topPts) + " L" + " L".join("%.1f %.1f" % p for p in reversed(botPts)) + " Z"
    frames_outline.append(d)
    for k in range(cols):
        a, b = topPts[k], topPts[k + 1]; c, e = botPts[k + 1], botPts[k]
        strips[k].append("M%.1f %.1f L%.1f %.1f L%.1f %.1f L%.1f %.1f Z" % (a + b + c + e))
        slope = (b[1] - a[1]) / max(0.1, b[0] - a[0])
        # facing the light (from the left) is brighter; folding away is darker
        lt = max(-1, min(1, -slope * 0.9))
        def mix(c1, c2, w): return tuple(round(c1[i] + (c2[i] - c1[i]) * w) for i in range(3))
        base = (181, 101, 59)
        col = mix(base, (214, 140, 98), lt) if lt > 0 else mix(base, (128, 66, 38), -lt)
        shade[k].append("#%02x%02x%02x" % col)
dur = "2.4s"
out = '<g class="summit-flag">'
for k in range(cols):
    out += '<path d="%s" fill="%s" stroke="%s" stroke-width="0.6" stroke-linejoin="round"><animate attributeName="d" dur="%s" repeatCount="indefinite" values="%s"/><animate attributeName="fill" dur="%s" repeatCount="indefinite" values="%s"/><animate attributeName="stroke" dur="%s" repeatCount="indefinite" values="%s"/></path>' % (
        strips[k][0], shade[k][0], shade[k][0], dur, ";".join(strips[k]), dur, ";".join(shade[k]), dur, ";".join(shade[k]))
out += '</g>'
open('/home/claude/build/flag.svgfrag', 'w').write(out)
print(len(out))
