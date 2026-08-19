import reactPlugin from 'eslint-plugin-react';
import globals from 'globals';

export default [
  {
    ignores: ['vendor/**', 'public/**', 'bootstrap/**', 'storage/**']
  },
  {
    files: ['**/*.jsx', '**/*.js'],
    plugins: { react: reactPlugin },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true }
      },
      globals: {
        ...globals.browser,
        route: 'readonly'
      }
    },
    rules: {
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'no-undef': 'error'
    }
  }
];
