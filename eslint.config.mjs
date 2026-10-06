import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  // The handoff's browser prototype is design evidence, not application code.
  globalIgnores([".next/**", "out/**", "playwright-report/**", "test-results/**", "docs/handoff/**"]),
]);
