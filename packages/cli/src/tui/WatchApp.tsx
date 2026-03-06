import type { StreamEvent, Translator, WatcherHandle, WatchTranslateOptions } from '@llmtr/core'
import { createWatcher } from '@llmtr/core'
import { Box, Newline, Text, useApp, useInput } from 'ink'
import Spinner from 'ink-spinner'
import { useEffect, useRef, useState } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

type LangStatus = 'waiting' | 'translating' | 'done' | 'error'

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
          return { ...prev, [event.language]: { status: 'done' } }
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
      const results = await translator.translateFile(fp, options, handleEvent)
      // Patch output paths into state
      setLangStates((prev) => {
        const next = { ...prev }
        for (const r of results) {
          if (r.outputPath) {
            next[r.language] = { ...next[r.language]!, outputPath: r.outputPath }
          }
        }
        return next
      })
      setLastTranslated(new Date())
      setAppStatus('idle')
    }
    catch (err) {
      setErrorMsg(String(err))
      setAppStatus('error')
    }
  }

  useEffect(() => {
    // Initial translation
    runTranslation(filePath)

    // Start file watcher
    watcherRef.current = createWatcher(filePath, runTranslation, {
      debounce: options.debounce,
    })

    return () => {
      watcherRef.current?.stop()
    }
  }, [])

  // Ctrl+C to exit cleanly
  useInput((_input, key) => {
    if (key.ctrl) {
      watcherRef.current?.stop().then(() => exit())
    }
  })

  return (
    <Box flexDirection="column" paddingX={1} paddingY={0}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">👁  Watching: </Text>
        <Text>{filePath}</Text>
      </Box>

      {/* Status */}
      <Box marginBottom={1}>
        {appStatus === 'translating' && (
          <Text color="yellow">
            <Spinner type="dots" />
            {'  Translating…'}
          </Text>
        )}
        {appStatus === 'idle' && (
          <Text color="green">● Idle — waiting for changes</Text>
        )}
        {appStatus === 'error' && (
          <Text color="red">
            ✗ Error:
            {errorMsg}
          </Text>
        )}
      </Box>

      {/* Language rows */}
      {options.targetLanguages.map(lang => (
        <LangRow key={lang} language={lang} state={langStates[lang]} />
      ))}

      {/* Last translated */}
      {lastTranslated && (
        <>
          <Newline />
          <Text color="gray">
            Last translated:
            {lastTranslated.toLocaleTimeString()}
          </Text>
        </>
      )}

      <Newline />
      <Text dimColor>Press Ctrl+C to stop</Text>
    </Box>
  )
}

function LangRow({ language, state }: { language: string, state?: LangState }) {
  const status = state?.status ?? 'waiting'
  return (
    <Box>
      <Box width={3}>
        {status === 'waiting' && <Text color="gray">○</Text>}
        {status === 'translating' && (
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
        )}
        {status === 'done' && <Text color="green">✓</Text>}
        {status === 'error' && <Text color="red">✗</Text>}
      </Box>
      <Text bold>{language.padEnd(20)}</Text>
      {state?.outputPath && (
        <Text color="gray">
          →
          {state.outputPath}
        </Text>
      )}
      {state?.error && <Text color="red">{state.error}</Text>}
    </Box>
  )
}
