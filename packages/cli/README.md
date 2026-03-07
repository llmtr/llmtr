# @llmtr/cli

> AI-powered translation CLI — translate text & files using your favourite LLM.

Translate text, files, or watch for changes and auto-retranslate. Supports multiple providers and multiple target languages in one run. Comes with an interactive TUI for real-time progress and a config wizard.

## Install

```bash
npm install -g @llmtr/cli
```

Or use without installing:

```bash
npx @llmtr/cli translate "Hello" --lang zh-CN
```

## Quick Start

```bash
# Interactive config wizard
llmtr config

# Translate text
llmtr translate "Good morning" --lang zh-CN,ja,fr

# Translate a file
llmtr translate --file README.md --lang zh-CN --output ./i18n

# Watch mode — re-translate whenever the file changes
llmtr watch content.md --lang zh-CN,de

# Short alias
llmtr t "Hello" --lang es
```

## Commands

### `llmtr config`

Interactive TUI wizard to create or edit a config file.

```text
Options:
  -g, --global    Edit global config at ~/.llmtr.config.json
  -o, --output    Config file path (overrides default)
```

The wizard shows a live config card at the top that updates as you fill in each field.

### `llmtr translate` (alias: `llmtr t`)

One-shot translation of text or a file.

```text
Arguments:
  [text]            Text to translate

Options:
  -f, --file        Input file to translate
  -l, --lang        Target languages, comma-separated  (e.g. "zh-CN,ja,fr")
  -o, --output      Output directory for translated files
  -p, --provider    AI provider: openai | anthropic | google | mistral | deepseek
  -m, --model       Model name (uses provider default when omitted)
      --api-key     API key (overrides env var and config file)
      --prompt      One-time user prompt appended to the request
      --stdout      Print result to stdout (single language only, pipeable)
      --concurrency Max parallel translations (default: 3)
```

**Examples:**

```bash
# Translate inline text
llmtr t "Hello, world!" --lang zh-CN,ja

# Translate a file into two languages
llmtr translate --file docs/guide.md --lang zh-CN,ko --output docs/i18n

# Pipe output to another command
llmtr t "Hello" --lang fr --stdout | pbcopy

# Use a one-time prompt
llmtr t --file CHANGELOG.md --lang zh-CN --prompt "Use simplified technical language"
```

### `llmtr watch`

Watch a file and re-translate automatically whenever it changes.

```text
Arguments:
  <file>            File to watch (required)

Options:
  -l, --lang        Target languages, comma-separated
  -o, --output      Output directory for translated files
  -p, --provider    AI provider
  -m, --model       Model name
      --api-key     API key
      --prompt      One-time user prompt
      --debounce    Debounce delay in ms (default: 500)
```

**Example:**

```bash
llmtr watch src/content.md --lang zh-CN,de --output src/i18n
```

## Configuration

`llmtr` searches for a config file starting from the current directory and walking up to `~`. The first file found wins.

**Config file names (searched in order):**

- `llmtr.config.json`
- `.llmtr.config.json`
- `.llmtrrc.json` / `.llmtrrc`
- `llmtr.config.js` / `.mjs` / `.ts`
- `package.json` → `"llmtr"` key

**Global config:** `~/.llmtr.config.json`

### Config Schema

```json
{
  "provider": "openai",
  "model": "gpt-4o",
  "apiKey": "sk-...",
  "sourceLanguage": "en",
  "targetLanguages": ["zh-CN", "ja", "fr"],
  "systemPrompt": "Translate naturally and preserve formatting.",
  "output": {
    "directory": "./i18n",
    "fileNamePattern": "{name}.{lang}{ext}"
  },
  "watch": {
    "debounce": 500
  }
}
```

`fileNamePattern` tokens: `{name}` (basename without ext), `{lang}`, `{ext}` (with dot).

### API Key

API keys are resolved in this priority order:

1. `--api-key` CLI flag
2. `apiKey` in config file
3. Environment variable (see table below)

| Provider | Environment Variable |
|---|---|
| `openai` | `OPENAI_API_KEY` |
| `anthropic` | `ANTHROPIC_API_KEY` |
| `google` | `GOOGLE_API_KEY` |
| `mistral` | `MISTRAL_API_KEY` |
| `deepseek` | `DEEPSEEK_API_KEY` |

### `package.json` Integration

```json
{
  "llmtr": {
    "provider": "openai",
    "targetLanguages": ["zh-CN"]
  }
}
```

## Proxy

Set `HTTP_PROXY` / `HTTPS_PROXY` environment variables to route requests through a proxy.

## License

MIT © [Moozon](https://github.com/llmtr/llmtr)
