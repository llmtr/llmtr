export { CONFIG_DEFAULTS, GLOBAL_CONFIG_PATH, loadTranslationConfig, validateConfig } from './config.js'
export {
  DEFAULT_FILE_NAME_PATTERN,
  DEFAULT_MODELS,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_WATCH_DEBOUNCE,
  ENV_API_KEYS,
  PROVIDER_BASE_URLS,
} from './constants.js'
export { fetchLocales } from './locale.js'
export type { LocaleEntry } from './locale.js'
export { checkNetwork } from './network.js'
export { createLanguageModel, hasApiKey } from './providers.js'
export { applyProxyFromEnv, getProxyUrl, hasEmptyProxyVar } from './proxy.js'
export { Translator } from './translator.js'
export type {
  OutputConfig,
  ProviderConfig,
  ProviderName,
  StreamEvent,
  StreamEventHandler,
  TranslateFileOptions,
  TranslateOptions,
  TranslationConfig,
  TranslationResult,
  WatchConfig,
  WatcherHandle,
  WatchTranslateOptions,
} from './types.js'

export { createWatcher } from './watcher.js'
