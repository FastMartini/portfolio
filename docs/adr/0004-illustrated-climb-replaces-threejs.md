# Replace Three.js atmosphere with the illustrated Climb

The approved handoff makes the mountain the Ascent's navigation rather than an optional atmospheric backdrop. We replace Three.js, React Three Fiber, and Motion with deterministic SVG scenery and Landmarks, native scrolling, SVG SMIL animation, and a small 2D snowfall canvas: this is cheaper on mobile and permits reference comparisons and repeatable visual tests without a GPU.

This supersedes ADR 0002 and the rendering-library choice in ADR 0003; static Next.js export and GitHub Pages remain unchanged. ADR 0001's complete semantic content and standalone Case Study routes remain durable: the server-rendered List View works without JavaScript, including hash-targeted MDX Case Studies, while the client-enhanced Climb opens those same canonical stories in a Waypoint Panel. Frame updates mutate cached scene attributes instead of rerendering content; reduced motion pauses the SVG timeline and clears snowfall.
