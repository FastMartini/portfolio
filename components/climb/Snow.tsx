"use client";

import { useEffect, useImperativeHandle, useRef } from "react";
import type { Ref } from "react";
import { seededRandom } from "./mountain/scenery";

export type SnowController = { setWeather: (amount: number, reducedMotion: boolean) => void };

export function Snow({ ref }: { ref: Ref<SnowController> }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const controller = useRef<SnowController | null>(null);
  useImperativeHandle(ref, () => ({ setWeather: (amount, reduced) => controller.current?.setWeather(amount, reduced) }), []);

  useEffect(() => {
    const element = canvas.current;
    let context: CanvasRenderingContext2D | null = null;
    try { context = element?.getContext("2d") ?? null; }
    catch { return; } // Snow is optional; a blocked canvas must not break content.
    if (!element || !context) return;
    const random = seededRandom(31);
    const flakes = Array.from({ length: 320 }, () => ({ x: random(), y: random(), radius: 0.6 + random() * 2.2, speed: 0.04 + random() * 0.08, phase: random() * 6.28 }));
    let amount = 0, raf = 0, last = 0;
    let failed = false;
    function disable() {
      failed = true;
      cancelAnimationFrame(raf);
      raf = 0;
      element!.hidden = true;
      element!.dataset.flakes = "0";
      controller.current = null;
    }
    function paint(now: number) {
      raf = 0;
      if (failed) return;
      // Stay at or below one device-independent pixel and a 2M-pixel budget.
      const scale = Math.min(1, Math.sqrt(2000000 / Math.max(1, element!.clientWidth * element!.clientHeight)));
      const width = Math.max(1, Math.floor(element!.clientWidth * scale));
      const height = Math.max(1, Math.floor(element!.clientHeight * scale));
      if (element!.width !== width || element!.height !== height) { element!.width = width; element!.height = height; }
      context!.clearRect(0, 0, width, height);
      const count = Math.round(flakes.length * amount);
      element!.dataset.flakes = String(count);
      if (!count) { last = 0; return; }
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      context!.fillStyle = "rgba(255,255,255,0.9)";
      for (let index = 0; index < count; index++) {
        const flake = flakes[index];
        flake.y += flake.speed * dt * (1 + flake.radius * 0.4);
        flake.phase += dt;
        flake.x += Math.sin(flake.phase) * 0.0006 + 0.012 * dt;
        if (flake.y > 1.02) { flake.y = -0.02; flake.x = random(); }
        if (flake.x > 1.02) flake.x = -0.02;
        context!.globalAlpha = 0.5 + flake.radius * 0.2;
        context!.beginPath(); context!.arc(flake.x * width, flake.y * height, flake.radius * scale, 0, Math.PI * 2); context!.fill();
      }
      context!.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }
    function draw(now: number) {
      try { paint(now); }
      catch { disable(); }
    }
    controller.current = { setWeather(next, reduced) {
      if (failed) return;
      amount = reduced ? 0 : next;
      if (amount < 0.01) {
        cancelAnimationFrame(raf); raf = 0; last = 0;
        try { context.clearRect(0, 0, element.width, element.height); }
        catch { disable(); }
        element.dataset.flakes = "0";
      } else if (!raf) raf = requestAnimationFrame(draw);
    } };
    element.addEventListener("contextlost", disable);
    return () => {
      cancelAnimationFrame(raf);
      controller.current = null;
      element.removeEventListener("contextlost", disable);
    };
  }, []);

  return <canvas className="climb-snow" ref={canvas} aria-hidden="true" data-flakes="0" />;
}
