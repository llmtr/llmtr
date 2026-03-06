import type { StreamEvent, TranslateFileOptions, TranslateOptions, TranslationResult, Translator } from '@llmtr/core'
import process from 'node:process'
import { Box, Newline, Text, useApp } from 'ink'
import Spinner from 'ink-spinner'
import { useEffect, useState } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

type LangStatus = 'waiting' | 'translating' | 'done' | 'error'

interface LangState {
  status: LangStatus
  /** Streaming text accumulated so far */
  partial: string
  /** Final translated text */
  text: string
  error?: string
  outputPath?: string
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface TranslateAppProps {
  translator: Translator
  /** Raw text to translate (mutually exclusive with filePath) */
  text?: string
  /** File path to translate (mutually exclusive with text) */
  filePath?: string
  options: TranslateOptions & TranslateFileOptions
  /** When true results are printed to stderr after translation; ink renders to stdout */
  printResults?: boolean
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TranslateApp({ translator, text, filePath, options, printResults }: TranslateAppProps) {
  const { exit } = useApp()

  const initState = (): Record<string, LangState> =>
    Object.fromEntries(
      options.targetLanguages.map(l => [l, { status: 'waiting' as LangStatus, partial: '', text: '' }]),
    )

  const [states, setStates] = useState<Record<string, LangState>>(initState)
  const [results, setResults] = useState<TranslationResult[]>([])

  useEffect(() => {
    const handleEvent = (event: StreamEvent) => {
      setStates((prev) => {
        switch (event.type) {
          case 'start':
            return { ...prev, [event.language]: { ...prev[event.language]!, status: 'translating' } }
          case 'delta':
            return {
              ...prev,
              [event.language]: {
                ...prev[event.language]!,
                partial: (prev[event.language]?.partial ?? '') + event.delta,
              },
            }
          case 'done':
            return {
              ...prev,
              [event.language]: { ...prev[event.language]!, status: 'done', text: event.text, partial: '' },
            }
          case 'error':
            return {
              ...prev,
              [event.language]: {
                ...prev[event.language]!,
                status: 'error',
                error: event.error.message,
                partial: '',
              },
            }
          default:
            return prev
        }
      })

      if (event.type === 'complete') {
        setResults(event.results)
      }
    }

    const run = async () => {
      if (filePath) {
        return translator.translateFile(filePath, options, handleEvent)
      }
      return translator.translateWithStream(text ?? '', options, handleEvent)
    }

    run()
      .then((finalResults) => {
        if (printResults) {
          for (const r of finalResults) {
            if (!r.error) {
              process.stderr.write(`\n=== ${r.language} ===\n${r.text}\n`)
            }
          }
        }
        // Brief pause so user can see the ✓ marks
        setTimeout(() => exit(), 400)
      })
      .catch((err: unknown) => {
        process.stderr.write(`\nFatal error: ${String(err)}\n`)
        exit(err instanceof Error ? err : new Error(String(err)))
      })
  }, [])

  const allDone = results.length > 0
  const hasErrors = results.some(r => r.error)

  return (
    <Box flexDirection="column" paddingX={1} paddingY={0}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {filePath ? `Translating file: ${filePath}` : 'Translating text…'}
        </Text>
      </Box>

      {options.targetLanguages.map(lang => (
        <LanguageRow key={lang} language={lang} state={states[lang]} />
      ))}

      {allDone && (
        <>
          <Newline />
          <Text color={hasErrors ? 'yellow' : 'green'}>
            {hasErrors ? '⚠ Completed with some errors.' : '✓ All translations complete.'}
          </Text>
        </>
      )}
    </Box>
  )
}

// ─── LanguageRow ─────────────────────────────────────────────────────────────

function LanguageRow({ language, state }: { language: string, state?: LangState }) {
  const status = state?.status ?? 'waiting'
  const preview = (state?.partial ?? '').slice(-40).replace(/\n/g, ' ')

  return (
    <Box flexDirection="column" marginBottom={status === 'done' && state?.text && !state.outputPath ? 1 : 0}>
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

        {status === 'translating' && preview && (
          <Text color="gray" dimColor>
            {preview}
          </Text>
        )}
        {status === 'done' && state?.outputPath && (
          <Text color="gray">
            →
            {state.outputPath}
          </Text>
        )}
        {status === 'error' && (
          <Text color="red">{state?.error}</Text>
        )}
      </Box>

      {status === 'done' && state?.text && !state.outputPath && (
        <Box marginLeft={3} marginTop={0}>
          <Text>{state.text.trimEnd()}</Text>
        </Box>
      )}
    </Box>
  )
}
