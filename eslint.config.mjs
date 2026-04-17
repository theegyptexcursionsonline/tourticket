import nextConfig from "eslint-config-next";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/.netlify/**",
      "**/out/**",
      "**/coverage/**",
      "**/dist/**",
      "**/scripts/**",
      "**/__tests__/**",
      "**/*.config.{js,cjs,mjs,ts}",
      "**/next.config.ts",
      "**/jest.config.js",
      "**/jest.setup.js",
      "test-email-templates.ts",
      "types/**/*.d.ts",
    ],
  },
  ...nextConfig,
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Downgrade noisy pre-existing violations to warnings for gradual cleanup
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-require-imports": "warn",
      "prefer-const": "warn",
    },
  },
];

export default eslintConfig;
