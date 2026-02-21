import nextConfig from "eslint-config-next";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextConfig,
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Downgrade noisy pre-existing violations to warnings for gradual cleanup
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-require-imports": "warn",
      "react/no-unescaped-entities": "warn",
      "@next/next/no-img-element": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "prefer-const": "warn",
      "react/display-name": "warn",
      "jsx-a11y/alt-text": "warn",
      // Downgrade React Compiler rules (shipped with eslint-config-next@16) to warnings
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      // Disable link rule — project uses next-intl Link, not next/link
      "@next/next/no-html-link-for-pages": "off",
    },
  },
];

export default eslintConfig;
