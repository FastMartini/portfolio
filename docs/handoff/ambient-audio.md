# Fire and snowstorm ambience

The illustrated Climb has an optional **Ambient sound** toggle. It starts off on each page visit and creates an audio context only when the visitor enables it. Starting from a user gesture follows [Web Audio autoplay guidance](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices#autoplay_policy). Keyboard and touch use the same native button and pressed state.

The campfire grows louder and brighter as the climber approaches its world position. Nearby crackles become more prominent; distance lowers both volume and the high-frequency detail. A small stereo pan follows the fire's direction relative to the climber. The smooth distance envelope is full within 120 world units and silent beyond 650.

The snowstorm starts gently above trail position 0.48, builds to full intensity by 0.84, then fades from 0.88 to silence at 0.995. The summit is exactly silent. A low, gusting wind layer and a wider, finer snow layer grow in volume and frequency range together. Sound follows the rendered climb position in both directions, including when the visitor chooses static visuals with reduced motion.

`components/climb/audio/profile.ts` owns the position-to-sound mapping. `synthesis.ts` creates four fixed Web Audio voices: a warm fire bed, dry crackles, storm wind, and fine snow. Their eight-second procedural buffers total approximately 4.4 MiB and need no external recordings, downloads, attribution licenses, or backend. Parameter ramps smooth changes on the audio thread. A gain after the compressor removes residual filter/compressor tails when both environments are silent.

`controller.ts` handles context activity and asynchronous resume/suspend races. `AmbientSound.tsx` owns the control and optional failure feedback. Audio suspends in List View, while a Waypoint Panel is open, and when the document is hidden. It resumes only if the visitor still has sound enabled. Contexts and nodes are disposed on unmount; missing or blocked audio leaves the Climb and reading controls usable. Audio never participates in scene recovery.

`tests/climb-audio.spec.ts` checks the smooth envelopes and actual output samples through native offline rendering and an analyser at the production audio output. Checks cover fire distance, snow intensity, digital silence at the summit, descent, explicit opt-in, context reuse, visibility/reading suspension, delayed resume after mute, and unsupported or rejected audio. The audio suite runs in Chromium, Firefox, and WebKit in CI. Browser-engine tests do not constitute a physical speaker/headphone listening test.

Compare production scrolling with and without audio using `scripts/measure-climb-scroll.mjs` and `SCROLL_SOUND=1` for the enabled run. The probe uses the real sound button and rejects a run that silently falls back to disabled audio. It also continues checking visible vectors and running decorative animation.
