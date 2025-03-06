// .eslintrc.mjs
export default {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
      project: './tsconfig.json'
    },
    plugins: ['@typescript-eslint'],
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'next',
      'next/core-web-vitals'
    ],
    rules: {
      // Add custom rules if needed.
    }
  };
  