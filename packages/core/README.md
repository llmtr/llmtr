# @llmtr/core

> Core AI translation API for llmtr — reusable across tools.

This package provides the translation engine, config discovery, provider abstraction, and file watcher used by [`@llmtr/cli`](../cli). It is designed to be embedded in any Node.js tool that needs AI-powered translation.

## Install

```bash
npm install @llmtr/core
```

## Providers

| Provider | Default Model | Env Var |
|---|---|---|
| `openai` | `gpt-4o` | `OPENAI_API_KEY` |
| `anthropic` | `claude-3-5-sonnet-20241022` | `ANTHROPIC_API_KEY` |
| `google` | `gemini-1.5-pro` | `GOOGLE_API_KEY` |
| `mistral` | `mistral-large-latest` | `MISTRAL_API_KEY` |
| `deepseek` | `deepseek-chat` | `DEEPSEEK_API_KEY` |

API keys are read from the matching environment variable when not provided explicitly.

## Usage

### Translate text

```ts
import { createLanguageModel, Translator } from '@llmtr/core'

const model = createLanguageModel({ provider: 'openai' })
const translator = new Translator(model)

const results = await translator.translate('Hello, world!', {
  targetLanguages: ['zh-CN', 'ja', 'fr'],
})

for (const r of results) {
  console.log(r.language, r.text)
}
```

### Translate a file

```ts
const results = await translator.translateFile('./README.md', {
  targetLanguages: ['zh-CN', 'ja'],
  outputDirectory: './i18n',
  fileNamePattern: '{name}.{lang}{ext}', // e.g. README.zh-CN.md
})
```

### Streaming events

```ts
await translator.translateStream('Good morning', {
  targetLanguages: ['de', 'es'],
  onEvent(event) {
    if (event.type === 'delta')
      process.stdout.write(event.delta)
    if (event.type === 'done')
      console.log('\nDone:', event.language)
  },
})
```

### Watch a file

```ts
import { createLanguageModel, createWatcher, Translator } from '@llmtr/core'

const model = createLanguageModel({ provider: 'anthropic' })
const translator = new Translator(model)

const handle = await createWatcher('./content.md', translator, {
  targetLanguages: ['zh-CN'],
  debounce: 500,
  onEvent(event) { /* StreamEvent */ },
})

// Later:
await handle.stop()
```

### Config discovery

`loadTranslationConfig` walks the directory tree from `cwd` up to `~` and merges the nearest config with defaults and explicit overrides.

```ts
import { loadTranslationConfig, validateConfig } from '@llmtr/core'

const config = await loadTranslationConfig(process.cwd(), {
  provider: 'openai', // CLI flag — highest priority
})

validateConfig(config) // throws if provider or targetLanguages are missing
```

**Config file names searched (in order):**

- `llmtr.config.json`
- `.llmtr.config.json`
- `.llmtrrc.json` / `.llmtrrc`
- `llmtr.config.js` / `.mjs` / `.ts`
- `package.json` → `"llmtr"` key

Global config: `~/.llmtr.config.json`

### Locales

```ts
import { fetchLocales } from '@llmtr/core'

const locales = fetchLocales() // synchronous, no network request
// [{ locale: 'zh-CN', language: { name: 'Chinese', ... }, country: { name: 'China', ... } }, ...]
```

## Config Schema

```ts
interface TranslationConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'mistral' | 'deepseek'
  apiKey?: string // falls back to env var
  model?: string // falls back to provider default
  baseURL?: string // OpenAI-compatible custom endpoint
  sourceLanguage?: string // auto-detected when omitted
  targetLanguages: string[]
  systemPrompt?: string
  output?: {
    directory?: string
    fileNamePattern?: string // default: '{name}.{lang}{ext}'
  }
  watch?: {
    debounce?: number // default: 500ms
  }
}
```

## API

| Export | Description |
|---|---|
| `Translator` | Core translation class |
| `createLanguageModel(config)` | Create a Vercel AI SDK `LanguageModel` |
| `hasApiKey(config)` | Check whether an API key is available |
| `loadTranslationConfig(cwd?, overrides?)` | Load and merge config from file + overrides |
| `validateConfig(config)` | Assert config has required fields |
| `createWatcher(file, translator, options)` | Watch a file and re-translate on change |
| `fetchLocales()` | Return bundled list of locale entries |
| `checkNetwork()` | Verify internet connectivity |
| `GLOBAL_CONFIG_PATH` | Path to `~/.llmtr.config.json` |
| `CONFIG_DEFAULTS` | Default config values |
| `DEFAULT_MODELS` | Default model per provider |
| `ENV_API_KEYS` | Env var name per provider |

## License

MIT © [Moozon](https://github.com/llmtr/llmtr)
