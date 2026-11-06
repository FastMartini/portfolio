import { seededRandom } from "./mountain/scenery";

const random = seededRandom(41);
const stars = Array.from({ length: 30 }, (_, index) => ({
  index, x: 4 + random() * 92, y: 2 + random() * 52,
  size: 1 + random() * 1.3, opacity: 0.45 + random() * 0.45,
})).filter(({ x, y }) => !(x > 74 && y < 40));

export function Sky() {
  return <div className="climb-sky" aria-hidden="true">
    <div className="climb-stars">{stars.map((star) => <i key={star.index} data-m={star.index % 2}
      style={{ left: `${star.x.toFixed(2)}%`, top: `${star.y.toFixed(2)}%`, width: `${star.size.toFixed(1)}px`, height: `${star.size.toFixed(1)}px`, opacity: star.opacity.toFixed(2) }} />)}</div>
    <div className="climb-sun" />
    <div className="climb-moon" />
    <div className="climb-twilight" />
  </div>;
}
