import type { LanguageModel } from 'ai'
import type { ProviderConfig } from './types.js'
import process from 'node:process'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createMistral } from '@ai-sdk/mistral'
import { createOpenAI } from '@ai-sdk/openai'
import { DEFAULT_MODELS, ENV_API_KEYS } from './constants.js'
import { applyProxyFromEnv } from './proxy.js'

export { DEFAULT_MODELS, ENV_API_KEYS }

export function createLanguageModel(config: ProviderConfig): LanguageModel {
  applyProxyFromEnv()
  const apiKey = config.apiKey ?? process.env[ENV_API_KEYS[config.provider]]
  const model = config.model ?? DEFAULT_MODELS[config.provider]

  switch (config.provider) {
    case 'openai': {
      const openai = createOpenAI({ apiKey, ...(config.baseURL ? { baseURL: config.baseURL } : {}) })
      return openai(model)
    }
    case 'anthropic':
      return createAnthropic({ apiKey })(model)
    case 'google':
      return createGoogleGenerativeAI({ apiKey })(model)
    case 'mistral':
      return createMistral({ apiKey })(model)
    case 'deepseek': {
      const deepseek = createDeepSeek({ apiKey, ...(config.baseURL ? { baseURL: config.baseURL } : {}) })
      return deepseek(model)
    }
    default:
      throw new Error(`Unsupported provider: "${config.provider as string}"`)
  }
}

export function hasApiKey(config: Pick<ProviderConfig, 'provider' | 'apiKey'>): boolean {
  return !!(config.apiKey ?? process.env[ENV_API_KEYS[config.provider]])
}
