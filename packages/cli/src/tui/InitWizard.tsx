import type { ProviderName, TranslationConfig } from '@llmtr/core'
import { writeFile } from 'node:fs/promises'
import { DEFAULT_MODELS, ENV_API_KEYS } from '@llmtr/core'
import { Box, Newline, Text, useApp, useInput } from 'ink'
import TextInput from 'ink-text-input'
import { useState } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Step
  = | 'provider'
    | 'apiKey'
    | 'model'
    | 'languages'
    | 'systemPrompt'
    | 'outputDir'
    | 'fileNamePattern'
    | 'confirm'
    | 'done'

interface WizardState {
  provider?: ProviderName
  apiKey?: string
  model?: string
  languages?: string[]
  systemPrompt?: string
  outputDir?: string
  fileNamePattern?: string
}

const PROVIDERS: Array<{ name: ProviderName, label: string }> = [
  { name: 'openai', label: 'OpenAI' },
  { name: 'anthropic', label: 'Anthropic' },
  { name: 'google', label: 'Google AI' },
  { name: 'mistral', label: 'Mistral' },
  { name: 'deepseek', label: 'DeepSeek' },
]

// ─── Component ───────────────────────────────────────────────────────────────

interface InitWizardProps {
  outputFile?: string
}

export function InitWizard({ outputFile = 'llmtr.config.json' }: InitWizardProps) {
  const { exit } = useApp()
  const [step, setStep] = useState<Step>('provider')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [inputValue, setInputValue] = useState('')
  const [state, setState] = useState<WizardState>({})
  const [savedPath, setSavedPath] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useInput((_input, key) => {
    if (step === 'provider') {
      if (key.upArrow)
        setSelectedIdx(i => Math.max(0, i - 1))
      if (key.downArrow)
        setSelectedIdx(i => Math.min(PROVIDERS.length - 1, i + 1))
      if (key.return) {
        const provider = PROVIDERS[selectedIdx]!.name
        setState(s => ({ ...s, provider }))
        setInputValue('')
        setStep('apiKey')
      }
    }

    if (step === 'confirm') {
      if (key.return || _input.toLowerCase() === 'y') {
        saveConfig(state, outputFile)
          .then((path) => {
            setSavedPath(path)
            setStep('done')
            setTimeout(() => exit(), 800)
          })
          .catch((err: unknown) => {
            setSaveError(String(err))
            setStep('done')
            setTimeout(() => exit, 1200)
          })
      }
      if (_input.toLowerCase() === 'n') {
        exit()
      }
    }
  })

  const advance = (nextStep: Step, patch: Partial<WizardState>) => {
    setState(s => ({ ...s, ...patch }))
    setInputValue('')
    setStep(nextStep)
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">llmtr init</Text>
        <Text color="gray"> — interactive config setup</Text>
      </Box>

      {/* ── Already-answered steps (summary) ── */}
      {state.provider && step !== 'provider' && (
        <AnsweredRow label="Provider" value={`${state.provider} (default model: ${DEFAULT_MODELS[state.provider]})`} />
      )}
      {state.apiKey !== undefined && step !== 'apiKey' && (
        <AnsweredRow label="API Key" value="••••••••" />
      )}
      {state.model !== undefined && step !== 'model' && (
        <AnsweredRow label="Model" value={state.model || `(default: ${DEFAULT_MODELS[state.provider!]})`} />
      )}
      {state.languages !== undefined && step !== 'languages' && (
        <AnsweredRow label="Languages" value={state.languages.join(', ')} />
      )}
      {state.systemPrompt !== undefined && step !== 'systemPrompt' && (
        <AnsweredRow label="System Prompt" value={state.systemPrompt || '(none)'} />
      )}
      {state.outputDir !== undefined && step !== 'outputDir' && (
        <AnsweredRow label="Output Dir" value={state.outputDir || '(same as input)'} />
      )}

      <Newline />

      {/* ── Current step ── */}
      {step === 'provider' && (
        <Box flexDirection="column">
          <Text bold>Select AI provider:</Text>
          {PROVIDERS.map((p, i) => (
            <Box key={p.name}>
              <Text color={i === selectedIdx ? 'cyan' : undefined}>
                {i === selectedIdx ? '❯ ' : '  '}
                {p.label}
                {'  '}
              </Text>
              <Text color="gray">{DEFAULT_MODELS[p.name]}</Text>
            </Box>
          ))}
        </Box>
      )}

      {step === 'apiKey' && (
        <Box>
          <Text bold>
            {ENV_API_KEYS[state.provider!]}
            {' '}
            (or press Enter to use env var):
            {' '}
          </Text>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            mask="*"
            onSubmit={value => advance('model', { apiKey: value || undefined })}
          />
        </Box>
      )}

      {step === 'model' && (
        <Box>
          <Text bold>
            Model name (Enter for default "
            {DEFAULT_MODELS[state.provider!]}
            "):
            {' '}
          </Text>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={value => advance('languages', { model: value || undefined })}
          />
        </Box>
      )}

      {step === 'languages' && (
        <Box flexDirection="column">
          <Text bold>Target languages (comma-separated, e.g. French, German, Japanese):</Text>
          <Box>
            <Text color="gray">❯ </Text>
            <TextInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={(value) => {
                const langs = value.split(',').map(l => l.trim()).filter(Boolean)
                if (langs.length > 0)
                  advance('systemPrompt', { languages: langs })
              }}
            />
          </Box>
        </Box>
      )}

      {step === 'systemPrompt' && (
        <Box flexDirection="column">
          <Text bold>System prompt (Enter to skip):</Text>
          <Box>
            <Text color="gray">❯ </Text>
            <TextInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={value => advance('outputDir', { systemPrompt: value || undefined })}
            />
          </Box>
        </Box>
      )}

      {step === 'outputDir' && (
        <Box flexDirection="column">
          <Text bold>Output directory (Enter for same dir as input file):</Text>
          <Box>
            <Text color="gray">❯ </Text>
            <TextInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={value => advance('fileNamePattern', { outputDir: value || undefined })}
            />
          </Box>
        </Box>
      )}

      {step === 'fileNamePattern' && (
        <Box flexDirection="column">
          <Text bold>
            File name pattern (Enter for default "
            {'{name}.{lang}{ext}'}
            "):
          </Text>
          <Box>
            <Text color="gray">❯ </Text>
            <TextInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={value => advance('confirm', { fileNamePattern: value || undefined })}
            />
          </Box>
        </Box>
      )}

      {step === 'confirm' && (
        <Box flexDirection="column">
          <Text bold>Save to </Text>
          <Text color="cyan">{outputFile}</Text>
          <Text bold>? (Y/n) </Text>
        </Box>
      )}

      {step === 'done' && savedPath && (
        <Text color="green">
          ✓ Config saved to
          {savedPath}
        </Text>
      )}
      {step === 'done' && saveError && (
        <Text color="red">
          ✗ Failed to save:
          {saveError}
        </Text>
      )}
    </Box>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function AnsweredRow({ label, value }: { label: string, value: string }) {
  return (
    <Box>
      <Text color="green">✓ </Text>
      <Text bold>{`${label}: `}</Text>
      <Text color="gray">{value}</Text>
    </Box>
  )
}

async function saveConfig(state: WizardState, outputFile: string): Promise<string> {
  const config: Partial<TranslationConfig> = {
    provider: state.provider,
    ...(state.apiKey ? { apiKey: state.apiKey } : {}),
    ...(state.model ? { model: state.model } : {}),
    targetLanguages: state.languages ?? [],
    ...(state.systemPrompt ? { systemPrompt: state.systemPrompt } : {}),
    output: {
      ...(state.outputDir ? { directory: state.outputDir } : {}),
      ...(state.fileNamePattern ? { fileNamePattern: state.fileNamePattern } : {}),
    },
  }

  await writeFile(outputFile, `${JSON.stringify(config, null, 2)}\n`, 'utf-8')
  return outputFile
}
