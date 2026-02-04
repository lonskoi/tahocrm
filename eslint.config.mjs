import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
  ]),
  // Test & config files often use CommonJS require/mocks; allow it there.
  {
    files: [
      "**/__tests__/**/*.{js,jsx,ts,tsx}",
      "**/*.{test,spec}.{js,jsx,ts,tsx}",
      "jest.config.js",
      "jest.setup.js",
    ],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // This codebase uses `any` pragmatically in API glue/mapping layers.
  // Keeping this as error makes initial commits and rapid iteration painful.
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      // Common data fetching patterns set loading/error state in effects.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
