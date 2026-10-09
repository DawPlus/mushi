import tseslint from 'typescript-eslint'

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/components/ui/**', 'src/components/common/**', 'src/routeTree.gen.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['@/components/ui', '@/components/ui/**', '**/components/ui/**', '../ui/**', './ui/**'],
          message: 'Import Mushi wrappers from @/components/common instead of raw shadcn UI.',
        }],
      }],
    },
  },
  { ignores: ['dist/**', 'src/routeTree.gen.ts'] },
)
