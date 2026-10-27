import type { AmbientMix } from "./profile";

const RATE = 24000, SECONDS = 8;

function random(seed: number) {
  return () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
}

function noise(context: BaseAudioContext, channels: number, seed: number, gusts = false) {
  const buffer = context.createBuffer(channels, RATE * SECONDS, RATE);
  const next = random(seed);
  for (let channel = 0; channel < channels; channel++) {
    const data = buffer.getChannelData(channel);
    let envelope = 1;
    for (let index = 0; index < data.length; index++) {
      if (gusts && index % 128 === 0) {
        const phase = index / data.length * Math.PI * 2;
        envelope = 0.65 + 0.22 * Math.sin(phase + channel * 0.4) + 0.12 * Math.sin(phase * 3 + 1.7);
      }
      data[index] = (next() * 2 - 1) * envelope;
    }
  }
  return buffer;
}

function crackles(context: BaseAudioContext) {
  const buffer = context.createBuffer(1, RATE * SECONDS, RATE);
  const data = buffer.getChannelData(0), next = random(87291);
  // Bursts finish before the loop seam. Noise beds pass through continuous
  // native filters, so looping does not reset their acoustic state.
  for (let time = 0.12; time < SECONDS - 0.25; time += 0.025 + next() * 0.17) {
    const duration = 0.012 + next() * 0.055, amplitude = 0.12 + next() ** 3 * 0.85;
    const resonance = 500 + next() * 1700, offset = Math.floor(time * RATE);
    for (let index = 0; index < duration * RATE; index++) {
      const elapsed = index / RATE, attack = Math.min(1, elapsed / 0.0008);
      const envelope = attack * Math.exp(-elapsed / (duration * 0.16));
      data[offset + index] += amplitude * envelope *
        (0.8 * (next() * 2 - 1) + 0.2 * Math.sin(elapsed * Math.PI * 2 * resonance));
    }
  }
  return buffer;
}

// Three fixed, looping voices run on the audio rendering thread. No sound files,
// worklets, per-scroll buffer/node allocations, or JS timers are needed.
export function createAmbientGraph(context: BaseAudioContext) {
  const nodes: AudioNode[] = [], sources: AudioBufferSourceNode[] = [];
  function gain(value = 0) {
    const node = context.createGain(); node.gain.value = value; nodes.push(node); return node;
  }
  function filter(type: BiquadFilterType, frequency: number, quality = 0.7) {
    const node = context.createBiquadFilter();
    node.type = type; node.frequency.value = frequency; node.Q.value = quality;
    nodes.push(node); return node;
  }
  function voice(buffer: AudioBuffer, destination: AudioNode) {
    const node = context.createBufferSource(); node.buffer = buffer; node.loop = true;
    node.connect(destination); sources.push(node); nodes.push(node); node.start();
  }
  const bus = gain(1), master = gain(), compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -18; compressor.knee.value = 18; compressor.ratio.value = 3;
  compressor.attack.value = 0.005; compressor.release.value = 0.25;
  nodes.push(compressor); bus.connect(compressor); compressor.connect(master); master.connect(context.destination);

  const fireBody = gain(), firePops = gain(), fireDistance = filter("lowpass", 450);
  const fireWarmth = filter("lowpass", 350), firePan = context.createStereoPanner();
  nodes.push(firePan);
  fireWarmth.connect(fireBody); fireBody.connect(fireDistance); firePops.connect(fireDistance);
  fireDistance.connect(firePan); firePan.connect(bus);
  voice(noise(context, 1, 12407, true), fireWarmth);
  voice(crackles(context), firePops);

  const snowWind = gain(), snowFilter = filter("lowpass", 350);
  snowFilter.connect(snowWind); snowWind.connect(bus);
  voice(noise(context, 1, 12407, true), snowFilter);

  const targets = new Map<AudioParam, number>();
  function ramp(parameter: AudioParam, target: number, immediate = false) {
    if (targets.get(parameter) === target) return;
    targets.set(parameter, target);
    const now = context.currentTime, current = parameter.value;
    parameter.cancelScheduledValues(now);
    parameter.setValueAtTime(immediate ? target : current, now);
    if (!immediate) parameter.linearRampToValueAtTime(target, now + 0.12);
  }
  return {
    setMix(mix: AmbientMix) {
      ramp(fireBody.gain, mix.fire * 0.09);
      ramp(firePops.gain, mix.fire ** 2 * 0.22);
      ramp(fireDistance.frequency, 450 + mix.fire ** 1.5 * 3500);
      ramp(firePan.pan, mix.firePan);
      ramp(snowWind.gain, mix.snow * 0.35);
      // Exact zero, including compressor/filter tails, at the clear summit.
      // Place silence after the compressor rather than merely fading sources.
      ramp(master.gain, mix.fire || mix.snow ? 0.7 : 0, !mix.fire && !mix.snow);
    },
    silence() { ramp(master.gain, 0, true); },
    dispose() {
      sources.forEach((source) => source.stop());
      nodes.forEach((node) => node.disconnect());
    },
  };
}
