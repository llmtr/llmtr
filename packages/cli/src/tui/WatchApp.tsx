import type { StreamEvent, Translator, WatcherHandle, WatchTranslateOptions } from '@llmtr/core'
import type { LangStatus } from './shared.js'
import { createWatcher } from '@llmtr/core'
import { Box, Newline, Text, useApp, useInput } from 'ink'
import Spinner from 'ink-spinner'
import { useEffect, useRef, useState } from 'react'
import { fileLink, StatusIcon } from './shared.js'

interface LangState {
  status: LangStatus
  outputPath?: string
  error?: string
}

type AppStatus = 'translating' | 'idle' | 'error'

// ─── Component ───────────────────────────────────────────────────────────────

interface WatchAppProps {
  translator: Translator
  filePath: string
  options: WatchTranslateOptions
}

export function WatchApp({ translator, filePath, options }: WatchAppProps) {
  const { exit } = useApp()
  const watcherRef = useRef<WatcherHandle | null>(null)

  const initLangStates = (): Record<string, LangState> =>
    Object.fromEntries(options.targetLanguages.map(l => [l, { status: 'waiting' as LangStatus }]))

  const [appStatus, setAppStatus] = useState<AppStatus>('translating')
  const [langStates, setLangStates] = useState<Record<string, LangState>>(initLangStates)
  const [lastTranslated, setLastTranslated] = useState<Date | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleEvent = (event: StreamEvent) => {
    setLangStates((prev) => {
      switch (event.type) {
        case 'start':
          return { ...prev, [event.language]: { status: 'translating' } }
        case 'done':
          return { ...prev, [event.language]: { status: 'done', outputPath: event.outputPath } }
        case 'error':
          return { ...prev, [event.language]: { status: 'error', error: event.error.message } }
        default:
          return prev
      }
    })
  }

  const runTranslation = async (fp: string) => {
    setAppStatus('translating')
    setLangStates(initLangStates())

    try {
      await translator.translateFile(fp, options, handleEvent)
      setLastTranslated(new Date())
      setAppStatus('idle')
    }
    catch (err) {
      setErrorMsg(String(err))
      setAppStatus('error')
    }
  }

  useEffect(() => {
    runTranslation(filePath)
    watcherRef.current = createWatcher(filePath, runTranslation, { debounce: options.debounce })
    return () => {
      watcherRef.current?.stop()
    }
  }, [])

  // Ctrl+C exits cleanly, stopping the watcher before ink unmounts
  useInput((_input, key) => {
    if (key.ctrl)
      watcherRef.current?.stop().then(() => exit())
  })

  return (
    <Box flexDirection="column" paddingX={1} paddingTop={1}>
      <Box marginBottom={1} gap={1}>
        <Text color="magenta" bold>◆ llmtr</Text>
        <Text color="gray">
          watching:
          {' '}
          {filePath}
        </Text>
      </Box>

      <Box marginBottom={1}>
        {appStatus === 'translating' && (
          <Text color="cyan">
            <Spinner type="dots" />
            {'  Translating…'}
          </Text>
        )}
        {appStatus === 'idle' && <Text color="green">● Idle — waiting for changes</Text>}
        {appStatus === 'error' && <Text color="red">{`✗ ${errorMsg}`}</Text>}
      </Box>

      {options.targetLanguages.map(lang => (
        <LangRow key={lang} language={lang} state={langStates[lang]} />
      ))}

      {lastTranslated && (
        <>
          <Newline />
          <Text color="gray">
            Last translated:
            {' '}
            {lastTranslated.toLocaleTimeString()}
          </Text>
        </>
      )}

      <Newline />
      <Text dimColor>Press Ctrl+C to stop</Text>
    </Box>
  )
}

// ─── LangRow ─────────────────────────────────────────────────────────────────

function LangRow({ language, state }: { language: string, state?: LangState }) {
  const status = state?.status ?? 'waiting'

  return (
    <Box gap={1}>
      <StatusIcon status={status} />
      <Text bold>{language}</Text>
      {status === 'done' && state?.outputPath && (
        <Text color="cyan">
          {fileLink(state.outputPath)}
        </Text>
      )}
      {status === 'error' && <Text color="red">{state?.error}</Text>}
    </Box>
  )
}
