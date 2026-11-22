import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  // Approved design prototypes are test fixtures, not application code.
  globalIgnores([".next/**", "out/**", "playwright-report/**", "test-results/**", "tests/fixtures/reference/**"]),
]);
