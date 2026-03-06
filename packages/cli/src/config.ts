import type { ProviderName, TranslationConfig } from '@llmtr/core'
import {
  CONFIG_DEFAULTS,
  DEFAULT_MODELS,
  ENV_API_KEYS,
  loadTranslationConfig,
  validateConfig,
} from '@llmtr/core'

export interface CliOverrides {
  provider?: string
  model?: string
  apiKey?: string
  lang?: string
  outputDir?: string
  prompt?: string
  fileNamePattern?: string
}

/**
 * Load config file and merge CLI argument overrides on top.
 * Throws if required fields are missing after merging.
 */
export async function resolveConfig(overrides: CliOverrides): Promise<TranslationConfig> {
  const fileConfig = await loadTranslationConfig(undefined, {
    ...(overrides.provider ? { provider: overrides.provider as ProviderName } : {}),
    ...(overrides.model ? { model: overrides.model } : {}),
    ...(overrides.apiKey ? { apiKey: overrides.apiKey } : {}),
    ...(overrides.lang
      ? { targetLanguages: overrides.lang.split(',').map(l => l.trim()).filter(Boolean) }
      : {}),
    ...(overrides.outputDir
      ? { output: { ...CONFIG_DEFAULTS.output, directory: overrides.outputDir } }
      : {}),
    ...(overrides.fileNamePattern
      ? { output: { ...CONFIG_DEFAULTS.output, fileNamePattern: overrides.fileNamePattern } }
      : {}),
  })

  validateConfig(fileConfig)
  return fileConfig
}

export { DEFAULT_MODELS, ENV_API_KEYS }
