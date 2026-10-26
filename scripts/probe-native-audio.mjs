import { firefox } from '@playwright/test';
const browser = await firefox.launch();
try {
  const page = await browser.newPage();
  page.on('console', message => console.log('[audio-probe]', message.text()));
  await page.setContent('<button>Start sound</button>');
  await page.evaluate(() => {
    document.querySelector('button').onclick = () => {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const meter = context.createAnalyser();
      oscillator.connect(meter).connect(context.destination);
      oscillator.start();
      window.probe = { context, meter };
      context.resume().then(() => console.log('resume resolved'), error => console.log('resume rejected', String(error)));
    };
  });
  await page.click('button');
  await page.waitForTimeout(2000);
  const output = await page.evaluate(() => {
    const { context, meter } = window.probe;
    const samples = new Float32Array(meter.fftSize);
    meter.getFloatTimeDomainData(samples);
    return { state: context.state, time: context.currentTime,
      rms: Math.sqrt(samples.reduce((sum, sample) => sum + sample ** 2, 0) / samples.length) };
  });
  console.log(JSON.stringify(output));
  if (output.state !== 'running' || output.rms < 0.005) process.exitCode = 1;
} finally {
  await browser.close();
}
