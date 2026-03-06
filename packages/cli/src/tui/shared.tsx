import { resolve } from 'node:path'
import { Text } from 'ink'
import Spinner from 'ink-spinner'
import terminalLink from 'terminal-link'

export type LangStatus = 'waiting' | 'translating' | 'done' | 'error'

export function StatusIcon({ status }: { status: LangStatus }) {
  if (status === 'waiting')
    return <Text color="gray">○</Text>
  if (status === 'translating') {
    return (
      <Text color="cyan">
        <Spinner type="dots" />
      </Text>
    )
  }
  if (status === 'done')
    return <Text color="green">●</Text>
  return <Text color="red">✗</Text>
}

export function fileLink(outputPath: string): string {
  return terminalLink.isSupported
    ? `🖱 ${terminalLink(resolve(outputPath), `file://${resolve(outputPath)}`)}`
    : resolve(outputPath)
}
