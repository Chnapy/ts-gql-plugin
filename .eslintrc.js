// @ts-check

const prettierRules = {
  'prettier/prettier': ['error', {}, { usePrettierrc: true }], // Includes .prettierrc.js rules
};

/**
 * Common JS rules
 *
 * @see https://eslint.org/docs/rules/
 */
const jsRules = {
  'array-callback-return': ['error'],
  'no-await-in-loop': ['error'],
  'no-duplicate-imports': ['error'],
  'no-self-compare': ['error'],
  'no-template-curly-in-string': ['error'],
  'no-unmodified-loop-condition': ['error'],
  'no-unreachable-loop': ['error'],
  'require-atomic-updates': ['error'],
  'arrow-body-style': ['error', 'as-needed'],
  'block-scoped-var': ['error'],
  curly: ['error'],
  'default-case-last': ['error'],
  'dot-notation': ['error'],
  eqeqeq: ['error'],
  'func-names': ['error', 'as-needed'],
  'func-style': ['error'],
  'id-length': ['error', { exceptions: ['_', 'i', 't', 'e'] }],
  'no-alert': ['error'],
  'no-array-constructor': ['error'],
  'no-bitwise': ['error'],
  'no-caller': ['error'],
  'no-continue': ['error'],
  'no-else-return': ['error'],
  'no-empty-function': ['error', { allow: ['constructors'] }],
  'no-eval': ['error'],
  'no-floating-decimal': ['error'],
  'no-implied-eval': ['error'],
  'no-invalid-this': ['error'],
  'no-iterator': ['error'],
  'no-label-var': ['error'],
  'no-lone-blocks': ['error'],
  'no-lonely-if': ['error'],
  'no-loop-func': ['error'],
  'no-mixed-operators': ['error'],
  'no-multi-assign': ['error'],
  'no-nested-ternary': ['error'],
  'no-new-wrappers': ['error'],
  'no-proto': ['error'],
  'no-restricted-globals': ['error'],
  'no-return-assign': ['error'],
  'no-underscore-dangle': ['error', { allow: ['_id'] }],
  'no-unneeded-ternary': ['error'],
  'no-unused-expressions': ['error', { allowShortCircuit: true }],
  'no-useless-call': ['error'],
  'no-useless-computed-key': ['error'],
  'no-useless-concat': ['error'],
  'no-useless-rename': ['error'],
  'no-useless-return': ['error'],
  'no-var': ['error'],
  'prefer-const': ['error'],
  'prefer-object-spread': ['error'],
  'prefer-rest-params': ['error'],
  'prefer-spread': ['error'],
  'prefer-template': ['error'],
  'eol-last': ['error'],
};

/**
 * Common TS rules
 *
 * @see https://typescript-eslint.io/rules/
 */
const tsRules = {
  '@typescript-eslint/array-type': ['error'],
  '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
  '@typescript-eslint/method-signature-style': ['error'],
  '@typescript-eslint/no-confusing-non-null-assertion': ['error'],
  '@typescript-eslint/no-extraneous-class': [
    'error',
    { allowWithDecorator: true },
  ],
  '@typescript-eslint/no-invalid-void-type': ['error'],
  '@typescript-eslint/no-meaningless-void-operator': ['error'],
  '@typescript-eslint/no-non-null-asserted-nullish-coalescing': ['error'],
  '@typescript-eslint/no-unnecessary-boolean-literal-compare': ['error'],
  '@typescript-eslint/no-unnecessary-condition': ['error'],
  '@typescript-eslint/no-unnecessary-type-arguments': ['error'],
  '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
  '@typescript-eslint/no-shadow': ['error'],
  '@typescript-eslint/non-nullable-type-assertion-style': ['error'],
  '@typescript-eslint/prefer-for-of': ['error'],
  '@typescript-eslint/prefer-includes': ['error'],
  // disabled since rule is quite broken
  // @see https://github.com/typescript-eslint/typescript-eslint/issues/1768
  '@typescript-eslint/prefer-nullish-coalescing': 'off',
  '@typescript-eslint/prefer-optional-chain': ['error'],
  '@typescript-eslint/prefer-regexp-exec': ['error'],
  '@typescript-eslint/prefer-string-starts-ends-with': ['error'],
  '@typescript-eslint/switch-exhaustiveness-check': ['error'],
  '@typescript-eslint/type-annotation-spacing': ['error'],
  '@typescript-eslint/unified-signatures': ['error'],
  '@typescript-eslint/consistent-indexed-object-style': ['error', 'record'],

  // Non-null assertion is useful when we know value being non-null (or should be)
  // Some example: Array.find() use, or graphql return data (data!.byPath!.prop!)
  // A null value is often easy to debug since it generally throw an error
  '@typescript-eslint/no-non-null-assertion': 'off',

  'import/no-relative-packages': 'error',
  'import/no-anonymous-default-export': [
    'error',
    { allowCallExpression: false },
  ],
};

/**
 * Return Eslint config following given options.
 *
 * @param {{
 *   dirname: string;
 *   tsconfigPaths?: string[];
 * }} options
 * @returns Eslint config
 */
module.exports = {
  root: true,
  env: {
    node: true,
    es6: true,
  },
  parserOptions: {
    project: [
      './tsconfig.json',
      './example/tsconfig.json',
      './tsc-gql/tsconfig.json',
    ],
    tsconfigRootDir: '.',
    sourceType: 'module',
    ecmaVersion: 8, // to enable features such as async/await
  },
  extends: ['eslint:recommended'],
  overrides: [
    {
      files: ['**/*.js'],
      parser: '@babel/eslint-parser',
      parserOptions: {
        requireConfigFile: false,
      },
      env: {
        browser: false,
        node: true,
        es6: false,
      },
      plugins: ['import'],
      extends: [
        'eslint:recommended',
        'plugin:prettier/recommended', // Prettier plugin
      ],
      rules: Object.assign({}, prettierRules, jsRules, {
        'prefer-object-spread': 'off',
      }),
    },
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      settings: {
        'import/parsers': {
          '@typescript-eslint/parser': ['.ts', '.tsx'],
        },
        'import/resolver': {
          typescript: {
            // always try to resolve types under `<root>@types` directory
            // even it doesn't contain any source code, like `@types/unist`
            alwaysTryTypes: true,
          },
        },
      },
      env: {
        browser: true,
        node: true,
        es6: true,
      },
      plugins: ['import'],
      extends: [
        'eslint:recommended',
        'plugin:prettier/recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:import/typescript',
        'plugin:unicorn/recommended',
      ],
      rules: Object.assign({}, prettierRules, jsRules, tsRules, {
        'unicorn/prevent-abbreviations': 'off',
        'unicorn/prefer-module': 'off',
        'unicorn/numeric-separators-style': 'off',
        'unicorn/no-null': 'off',
        'unicorn/no-array-for-each': 'off',
        'unicorn/no-useless-undefined': 'off',
        'unicorn/no-array-callback-reference': 'off',
        'unicorn/no-array-reduce': 'off',
        'unicorn/no-abusive-eslint-disable': 'off',
      }),
    },
  ],
};
