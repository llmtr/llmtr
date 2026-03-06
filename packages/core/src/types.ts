// ─── Provider ───────────────────────────────────────────────────────────────

export type ProviderName = 'openai' | 'anthropic' | 'google' | 'mistral' | 'deepseek'

export interface ProviderConfig {
  /** AI provider to use */
  provider: ProviderName
  /** API key. Falls back to provider-specific env var when omitted */
  apiKey?: string
  /** Model name. Falls back to provider default when omitted */
  model?: string
  /** Custom base URL for OpenAI-compatible endpoints */
  baseURL?: string
}

// ─── Config ─────────────────────────────────────────────────────────────────

export interface OutputConfig {
  /** Directory to write translated files. Defaults to the same dir as input */
  directory?: string
  /**
   * File name pattern for output files.
   * Tokens: `{name}` (basename without ext), `{lang}`, `{ext}` (with dot).
   * Default: `{name}.{lang}{ext}`
   */
  fileNamePattern?: string
}

export interface WatchConfig {
  /** Debounce delay in ms before re-translating after a file change. Default: 500 */
  debounce?: number
}

export interface TranslationConfig extends ProviderConfig {
  /** Source language hint (optional, AI will auto-detect when omitted) */
  sourceLanguage?: string
  /** List of target languages to translate into */
  targetLanguages: string[]
  /** Persistent system prompt sent with every translation request */
  systemPrompt?: string
  output?: OutputConfig
  watch?: WatchConfig
}

// ─── Translation ─────────────────────────────────────────────────────────────

export interface TranslateOptions {
  /** Target languages to translate into */
  targetLanguages: string[]
  /** Source language hint */
  sourceLanguage?: string
  /** Persistent system prompt override for this call */
  systemPrompt?: string
  /** One-time user-level prompt appended to the translation request */
  userPrompt?: string
  /** Maximum number of languages translated in parallel. Default: 3 */
  concurrency?: number
}

export interface TranslateFileOptions extends TranslateOptions {
  /** Override output directory */
  outputDirectory?: string
  /** Override file name pattern */
  fileNamePattern?: string
}

export interface WatchTranslateOptions extends TranslateFileOptions {
  /** Debounce delay in ms */
  debounce?: number
}

export interface TranslationResult {
  language: string
  text: string
  /** Path of written output file (only present when translating a file) */
  outputPath?: string
  error?: Error
}

// ─── Streaming ───────────────────────────────────────────────────────────────

export type StreamEvent
  = | { type: 'start', language: string }
    | { type: 'delta', language: string, delta: string }
    | { type: 'done', language: string, text: string }
    | { type: 'error', language: string, error: Error }
    | { type: 'complete', results: TranslationResult[] }

export type StreamEventHandler = (event: StreamEvent) => void

// ─── Watcher ─────────────────────────────────────────────────────────────────

export interface WatcherHandle {
  stop: () => Promise<void>
}
