// @env node
import type { ProviderName } from './types.js'

export const DEFAULT_MODELS: Record<ProviderName, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-3-5-sonnet-20241022',
  google: 'gemini-1.5-pro',
  mistral: 'mistral-large-latest',
  deepseek: 'deepseek-chat',
}

export const ENV_API_KEYS: Record<ProviderName, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
}

export const DEFAULT_SYSTEM_PROMPT
  = 'You are a professional translator. Translate the provided text accurately and naturally into the target language. Preserve the original formatting, structure, and tone. Output only the translated text without any explanations or comments.'

export const DEFAULT_FILE_NAME_PATTERN = '{name}.{lang}{ext}'

export const DEFAULT_WATCH_DEBOUNCE = 500

/**
 * Canonical base URLs for each provider. Used as the network-check probe target
 * so that provider-specific connectivity (including regional routing) is validated
 * rather than generic IPs that may be unreachable in some networks.
 */
export const PROVIDER_BASE_URLS: Record<ProviderName, string> = {
  openai: 'https://api.openai.com',
  anthropic: 'https://api.anthropic.com',
  google: 'https://generativelanguage.googleapis.com',
  mistral: 'https://api.mistral.ai',
  deepseek: 'https://api.deepseek.com',
}
