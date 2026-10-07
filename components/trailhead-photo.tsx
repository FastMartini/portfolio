import Image from "next/image";
import portrait from "../public/photos/dm.jpg";

export function TrailheadPhoto() {
  return <Image className="trailhead-photo" src={portrait} alt="Diego Martinez" loading="eager" />;
}
