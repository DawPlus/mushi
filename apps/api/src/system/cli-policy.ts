export type ReadOnlyCommand = 'node-version' | 'git-version'
export type SafeCommand = { file: string; args: readonly string[]; timeoutMs: number; maxBuffer: number }

/** Fixed commands only. Do not accept arbitrary shell text, paths, or environment reads. */
export function resolveReadOnlyCommand(input: string): SafeCommand {
  const common = { timeoutMs: 3000, maxBuffer: 4096 }
  switch (input as ReadOnlyCommand) {
    case 'node-version': return { file: 'node', args: ['--version'], ...common }
    case 'git-version': return { file: 'git', args: ['--version'], ...common }
    default: throw new Error('Command not allowed')
  }
}
