import { resolve } from 'node:path'
import { getProxyUrl } from '@llmtr/core'
import { Box, Text } from 'ink'
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

/**
 * A subtle secondary row shown below the app header when a proxy is active.
 * Uses dim gray + indent to signal it's contextual info, not primary content.
 */
export function ProxyBadge() {
  const raw = getProxyUrl()
  if (!raw)
    return null

  let protocol = 'proxy'
  let host = raw
  try {
    const url = new URL(raw)
    protocol = url.protocol.replace(/:$/, '') // socks5 | http | https
    host = url.host
  }
  catch {}

  return (
    <Box gap={1} marginBottom={1}>
      <Text dimColor>  ↳</Text>
      <Text dimColor>
        via
        {' '}
        {protocol}
      </Text>
      <Text color="gray" dimColor>{host}</Text>
    </Box>
  )
}
