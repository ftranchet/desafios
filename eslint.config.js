import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

const METADATA_ALLOWED_IMPORTS = new Set([
  '../../core/contract',
  '../../core/modes',
  './icon.svg',
]);

// Frontera ejecutable de ADR-011. Una lista negra de `./logic`/`./ui` no
// alcanza: metadata también podría arrastrar shell, storage u otro juego. Esta
// regla local falla ante cualquier dependencia que no sea parte del contrato
// mínimo y también prohíbe imports dinámicos dentro de metadata.ts.
const metadataBoundaryPlugin = {
  rules: {
    'only-lightweight-imports': {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          forbidden:
            'metadata.ts solo puede importar core/contract, core/modes y ./icon.svg; "{{ source }}" rompe la carga liviana.',
          dynamic: 'metadata.ts no puede usar import() dinámico.',
          staticName:
            'metadata.ts debe declarar name como un literal de string para que el generador pueda validar unicidad sin ejecutar código.',
        },
      },
      create(context) {
        function checkStaticSource(node) {
          const source = node.source;
          if (source && !METADATA_ALLOWED_IMPORTS.has(source.value)) {
            context.report({
              node: source,
              messageId: 'forbidden',
              data: { source: String(source.value) },
            });
          }
        }

        return {
          ImportDeclaration: checkStaticSource,
          ExportNamedDeclaration: checkStaticSource,
          ExportAllDeclaration: checkStaticSource,
          ImportExpression(node) {
            context.report({ node, messageId: 'dynamic' });
          },
          Property(node) {
            const isNameProperty =
              !node.computed &&
              ((node.key.type === 'Identifier' && node.key.name === 'name') ||
                (node.key.type === 'Literal' && node.key.value === 'name'));
            if (
              isNameProperty &&
              (node.value.type !== 'Literal' || typeof node.value.value !== 'string')
            ) {
              context.report({ node: node.value, messageId: 'staticName' });
            }
          },
        };
      },
    },
  },
};

export default tseslint.config(
  { ignores: ['dist', 'dev-dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended, prettier],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    extends: [js.configs.recommended],
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
  },
  {
    files: ['src/games/*/metadata.ts'],
    plugins: {
      'metadata-boundary': metadataBoundaryPlugin,
    },
    rules: {
      'metadata-boundary/only-lightweight-imports': 'error',
    },
  },
);
