import type { ProviderName, TranslationConfig } from '@llmtr/core'
import { writeFile } from 'node:fs/promises'
import { DEFAULT_FILE_NAME_PATTERN, DEFAULT_MODELS, ENV_API_KEYS } from '@llmtr/core'
import { Box, Text, useApp, useInput } from 'ink'
import TextInput from 'ink-text-input'
import { useState } from 'react'
import { LocaleSelector } from './LocaleSelector.js'

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = 'provider' | 'apiKey' | 'model' | 'languages' | 'systemPrompt' | 'outputDir' | 'fileNamePattern' | 'confirm' | 'done'

interface WizardState {
  provider?: ProviderName
  apiKey?: string
  model?: string
  languages?: string[]
  systemPrompt?: string
  outputDir?: string
  fileNamePattern?: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PROVIDERS: Array<{ name: ProviderName, label: string }> = [
  { name: 'openai', label: 'OpenAI' },
  { name: 'anthropic', label: 'Anthropic' },
  { name: 'google', label: 'Google AI' },
  { name: 'mistral', label: 'Mistral' },
  { name: 'deepseek', label: 'DeepSeek' },
]

// Map each config card field key to its editing step
const FIELD_STEP: Record<string, Step> = {
  provider: 'provider',
  apiKey: 'apiKey',
  model: 'model',
  locales: 'languages',
  prompt: 'systemPrompt',
  output: 'outputDir',
  pattern: 'fileNamePattern',
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface InitWizardProps {
  outputFile?: string
  /** Pre-fill wizard fields from an existing config file */
  initialConfig?: Partial<TranslationConfig>
}

function configToWizardState(config: Partial<TranslationConfig>): WizardState {
  return {
    provider: config.provider,
    apiKey: config.apiKey,
    model: config.model,
    languages: config.targetLanguages?.length ? config.targetLanguages : undefined,
    systemPrompt: config.systemPrompt,
    outputDir: config.output?.directory,
    fileNamePattern: config.output?.fileNamePattern,
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function InitWizard({ outputFile = 'llmtr.config.json', initialConfig }: InitWizardProps) {
  const { exit } = useApp()
  const isEditing = !!initialConfig

  const [step, setStep] = useState<Step>('provider')
  const [selectedIdx, setSelectedIdx] = useState(
    initialConfig?.provider ? Math.max(0, PROVIDERS.findIndex(p => p.name === initialConfig.provider)) : 0,
  )
  const [inputValue, setInputValue] = useState('')
  const [state, setState] = useState<WizardState>(initialConfig ? configToWizardState(initialConfig) : {})
  const [savedPath, setSavedPath] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const advance = (nextStep: Step, patch: Partial<WizardState>) => {
    setState(s => ({ ...s, ...patch }))
    setInputValue('')
    setStep(nextStep)
  }

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
            setTimeout(() => exit(), 1200)
          })
      }
      if (_input.toLowerCase() === 'n')
        exit()
    }
  })

  // Derive display values for all fields regardless of step
  const provider = state.provider
  const cardFields: Array<{ key: string, label: string, value: string, isEmpty: boolean }> = [
    {
      key: 'provider',
      label: 'provider',
      value: provider ?? '—',
      isEmpty: !provider,
    },
    {
      key: 'apiKey',
      label: 'apiKey',
      value: state.apiKey ? '••••••••' : '(env var)',
      isEmpty: !state.apiKey,
    },
    {
      key: 'model',
      label: 'model',
      value: state.model ?? (provider ? DEFAULT_MODELS[provider] : '—'),
      isEmpty: !state.model,
    },
    {
      key: 'locales',
      label: 'locales',
      value: state.languages?.join(', ') ?? '—',
      isEmpty: !state.languages,
    },
    {
      key: 'prompt',
      label: 'prompt',
      value: state.systemPrompt ?? '(default)',
      isEmpty: !state.systemPrompt,
    },
    {
      key: 'output',
      label: 'output',
      value: state.outputDir ?? '(same as input)',
      isEmpty: !state.outputDir,
    },
    {
      key: 'pattern',
      label: 'pattern',
      value: state.fileNamePattern ?? DEFAULT_FILE_NAME_PATTERN,
      isEmpty: !state.fileNamePattern,
    },
  ]

  const isDone = step === 'done'
  const cardBorderColor = isDone ? (savedPath ? 'green' : 'red') : step === 'confirm' ? 'cyan' : 'gray'

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>

      {/* ── Header ── */}
      <Box marginBottom={1} gap={1}>
        <Text bold color="magenta">◆ llmtr config</Text>
        <Text color="gray">{isEditing ? '— editing' : '— new'}</Text>
        <Text color="gray" dimColor>{outputFile}</Text>
      </Box>

      {/* ── Unified config card (always visible) ── */}
      <Box flexDirection="column" borderStyle="round" borderColor={cardBorderColor} paddingX={1} marginBottom={1}>
        {cardFields.map(({ key, label, value, isEmpty }) => {
          const isActive = FIELD_STEP[key] === step
          return (
            <Box key={key} gap={1}>
              <Text color={isActive ? 'cyan' : 'gray'} bold={isActive}>
                {isActive ? '❯' : ' '}
                {' '}
                {label.padEnd(10)}
              </Text>
              <Text
                color={isActive ? 'cyan' : isEmpty ? 'gray' : 'white'}
                dimColor={!isActive && isEmpty}
                bold={isActive}
              >
                {value}
              </Text>
            </Box>
          )
        })}
      </Box>

      {/* ── Active step input ── */}
      {step === 'provider' && (
        <Box flexDirection="column" marginTop={1}>
          {PROVIDERS.map((p, i) => (
            <Box key={p.name} gap={2}>
              <Text color={i === selectedIdx ? 'cyan' : 'gray'} bold={i === selectedIdx}>
                {i === selectedIdx ? '❯' : ' '}
                {' '}
                {p.label.padEnd(14)}
              </Text>
              <Text color="gray" dimColor>{DEFAULT_MODELS[p.name]}</Text>
            </Box>
          ))}
        </Box>
      )}

      {step === 'apiKey' && (
        <Question label={ENV_API_KEYS[state.provider!]} hint={isEditing ? 'Enter to keep existing' : 'Enter to use env var'}>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            mask="*"
            placeholder={isEditing ? '(keep existing)' : ''}
            onSubmit={v => advance('model', { apiKey: v || state.apiKey })}
          />
        </Question>
      )}

      {step === 'model' && (
        <Question label="Model name" hint={`default: ${state.model ?? DEFAULT_MODELS[state.provider!]}`}>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            placeholder={state.model ?? DEFAULT_MODELS[state.provider!]}
            onSubmit={v => advance('languages', { model: v || state.model || undefined })}
          />
        </Question>
      )}

      {step === 'languages' && (
        <LocaleSelector
          initialSelected={state.languages}
          onConfirm={langs => advance('systemPrompt', { languages: langs })}
        />
      )}

      {step === 'systemPrompt' && (
        <Question label="System prompt" hint="Enter to skip">
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            placeholder={state.systemPrompt ?? '(none)'}
            onSubmit={v => advance('outputDir', { systemPrompt: v || state.systemPrompt || undefined })}
          />
        </Question>
      )}

      {step === 'outputDir' && (
        <Question label="Output directory" hint="Enter for same dir as input">
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            placeholder={state.outputDir ?? '(same as input)'}
            onSubmit={v => advance('fileNamePattern', { outputDir: v || state.outputDir || undefined })}
          />
        </Question>
      )}

      {step === 'fileNamePattern' && (
        <Question label="File name pattern" hint="Enter for default">
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            placeholder={state.fileNamePattern ?? DEFAULT_FILE_NAME_PATTERN}
            onSubmit={v => advance('confirm', { fileNamePattern: v || state.fileNamePattern || undefined })}
          />
        </Question>
      )}

      {step === 'confirm' && (
        <Box gap={1}>
          <Text bold>Save to</Text>
          <Text color="cyan">{outputFile}</Text>
          <Text color="gray">? (Y/n)</Text>
        </Box>
      )}

      {step === 'done' && savedPath && (
        <Box gap={1}>
          <Text color="green" bold>✓</Text>
          <Text>Config saved to</Text>
          <Text color="cyan">{savedPath}</Text>
        </Box>
      )}
      {step === 'done' && saveError && (
        <Box gap={1}>
          <Text color="red" bold>✗</Text>
          <Text color="red">{saveError}</Text>
        </Box>
      )}
    </Box>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Question({ label, hint, children }: { label: string, hint?: string, children: React.ReactNode }) {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Box gap={1}>
        <Text bold>{label}</Text>
        {hint && (
          <Text color="gray" dimColor>
            ·
            {hint}
          </Text>
        )}
      </Box>
      <Box gap={1}>
        <Text color="cyan">❯</Text>
        {children}
      </Box>
    </Box>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
