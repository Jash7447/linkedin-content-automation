import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

/**
 * ESLint 9 flat config for Next.js 16.
 *
 * `next lint` and `eslint-config-next` (via FlatCompat) were dropped because
 * the compat shim crashes under ESLint 9 flat config. We compose the same
 * rule sets directly: @next/eslint-plugin-next + typescript-eslint +
 * react-hooks. Lint is run via the `eslint` CLI (see package.json scripts).
 */
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "dist/**",
      "next-env.d.ts",
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooks,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      ...reactHooks.configs.recommended.rules,
    },
  },
];

export default eslintConfig;
