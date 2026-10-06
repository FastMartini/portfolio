import { defineConfig, devices } from "@playwright/test";

const testSite = {
  host: "127.0.0.1",
  port: 4173,
  basePath: "/portfolio",
} as const;

const testOrigin = `http://${testSite.host}:${testSite.port}`;
const testBaseUrl = `${testOrigin}${testSite.basePath}/`;

export default defineConfig({
  testDir: "./tests",
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}-{projectName}-{platform}{ext}",
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: testBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox-adaptive",
      testMatch: "climb-adaptive.spec.ts",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit-adaptive",
      testMatch: "climb-adaptive.spec.ts",
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: {
    command: "npm run build:test && node scripts/serve-static-export.mjs",
    url: testBaseUrl,
    env: {
      NEXT_PUBLIC_BASE_PATH: testSite.basePath,
      NEXT_PUBLIC_SITE_URL: `${testOrigin}${testSite.basePath}`,
      TEST_SITE_BASE_PATH: testSite.basePath,
      TEST_SITE_HOST: testSite.host,
      TEST_SITE_PORT: String(testSite.port),
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
