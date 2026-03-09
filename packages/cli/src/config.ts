import type { ProviderName, TranslationConfig } from '@llmtr/core'
import { loadTranslationConfig, validateConfig } from '@llmtr/core'

export interface CliOverrides {
  provider?: string
  model?: string
  apiKey?: string
  lang?: string
  outputDir?: string
  fileNamePattern?: string
}

/** Load config file then apply CLI arg overrides. Throws if required fields are missing. */
export async function resolveConfig(overrides: CliOverrides): Promise<TranslationConfig> {
  const patch: Partial<TranslationConfig> = {}

  if (overrides.provider)
    patch.provider = overrides.provider as ProviderName
  if (overrides.model)
    patch.model = overrides.model
  if (overrides.apiKey)
    patch.apiKey = overrides.apiKey
  if (overrides.lang)
    patch.targetLanguages = overrides.lang.split(',').map(l => l.trim()).filter(Boolean)
  if (overrides.outputDir || overrides.fileNamePattern) {
    patch.output = {
      ...(overrides.outputDir ? { directory: overrides.outputDir } : {}),
      ...(overrides.fileNamePattern ? { fileNamePattern: overrides.fileNamePattern } : {}),
    }
  }

  const config = await loadTranslationConfig(undefined, patch)
  validateConfig(config)
  return config
}
