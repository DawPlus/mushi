const { test } = require('node:test')
const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const path = require('node:path')

const cwd = path.resolve(__dirname, '..')
function lintImport(source) {
  return spawnSync('pnpm', ['exec', 'eslint', '--stdin', '--stdin-filename', 'src/features/boundary-probe.tsx'], {
    cwd,
    input: `import { ${source.includes('/common') ? 'AppButton' : 'Button'} } from '${source}'\nvoid ${source.includes('/common') ? 'AppButton' : 'Button'}\n`,
    encoding: 'utf8',
  })
}

test('feature can import Mushi common wrappers', () => {
  const result = lintImport('@/components/common')
  assert.equal(result.status, 0, result.stdout + result.stderr)
})

for (const specifier of ['@/components/ui/button', '../components/ui/button']) {
  test(`feature cannot import shadcn source: ${specifier}`, () => {
    const result = lintImport(specifier)
    assert.notEqual(result.status, 0)
    assert.match(result.stdout, /Import Mushi wrappers/)
  })
}
