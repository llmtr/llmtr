import type { StreamEvent, TranslateFileOptions, TranslateOptions, TranslationResult, Translator } from '@llmtr/core'
import type { LangStatus } from './shared.js'
import process from 'node:process'
import { Box, Newline, Text, useApp } from 'ink'
import { useEffect, useState } from 'react'
import { fileLink, StatusIcon } from './shared.js'

interface LangState {
  status: LangStatus
  partial: string
  text: string
  error?: string
  outputPath?: string
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface TranslateAppProps {
  translator: Translator
  text?: string
  filePath?: string
  options: TranslateOptions & TranslateFileOptions
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
              [event.language]: { ...prev[event.language]!, status: 'done', text: event.text, partial: '', outputPath: event.outputPath },
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
        setTimeout(() => exit(), 400)
      })
      .catch((err: unknown) => {
        process.stderr.write(`\nFatal error: ${String(err)}\n`)
        exit(err instanceof Error ? err : new Error(String(err)))
      })
  }, [])

  const allDone = results.length > 0
  const hasErrors = results.some(r => r.error)
  const doneCount = results.filter(r => !r.error).length
  const total = options.targetLanguages.length

  return (
    <Box flexDirection="column" paddingX={1} paddingTop={1}>

      {/* Header */}
      <Box marginBottom={1} gap={1}>
        <Text color="magenta" bold>◆ llmtr</Text>
        <Text color="gray">
          {filePath ? `file: ${filePath}` : `"${(text ?? '').slice(0, 40)}${(text ?? '').length > 40 ? '…' : ''}"`}
        </Text>
      </Box>

      {/* Language rows */}
      {options.targetLanguages.map((lang, i) => (
        <LanguageRow
          key={lang}
          language={lang}
          state={states[lang]}
          index={i}
          total={total}
          isFile={!!filePath}
        />
      ))}

      {/* Footer */}
      {allDone && (
        <Box marginTop={1} gap={1}>
          {hasErrors
            ? <Text color="yellow">⚠ Done with errors</Text>
            : <Text color="green">✓ Done</Text>}
          <Text color="gray">
            {doneCount}
            /
            {total}
            {' '}
            translated
          </Text>
        </Box>
      )}
      <Newline />
    </Box>
  )
}

// ─── LanguageRow ─────────────────────────────────────────────────────────────

function LanguageRow({
  language,
  state,
  index,
  total,
  isFile,
}: {
  language: string
  state?: LangState
  index: number
  total: number
  isFile: boolean
}) {
  const status = state?.status ?? 'waiting'
  const isLast = index === total - 1
  const hasResult = !isFile && status === 'done' && !!state?.text && !state.outputPath

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={
        status === 'done'
          ? 'green'
          : status === 'error'
            ? 'red'
            : status === 'translating'
              ? 'cyan'
              : 'gray'
      }
      marginBottom={isLast ? 0 : 1}
      paddingX={1}
    >
      {/* Row header */}
      <Box gap={1}>
        <StatusIcon status={status} />
        <Text bold color={status === 'done' ? 'white' : status === 'error' ? 'red' : 'white'}>
          {language}
        </Text>
        {!isFile && status === 'translating' && state?.partial && (
          <Text color="gray" dimColor>
            {state.partial.replace(/\n/g, ' ').slice(-50)}
          </Text>
        )}
        {status === 'done' && state?.outputPath && (
          <Text color="cyan">
            {fileLink(state.outputPath)}
          </Text>
        )}
        {status === 'error' && (
          <Text color="red">{state?.error}</Text>
        )}
      </Box>

      {/* Result text for text translation */}
      {hasResult && (
        <Box marginTop={0} paddingTop={0}>
          <Text color="white">{state!.text.trimEnd()}</Text>
        </Box>
      )}
    </Box>
  )
}
