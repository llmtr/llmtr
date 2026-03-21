# llmtr

AI-powered translation CLI. Translate text and files into multiple languages simultaneously using your favourite LLM provider — with a live TUI, watch mode, and a config wizard.

https://github.com/user-attachments/assets/fb4d9845-215c-44cb-8182-f70221212932

## Packages

| Package | Description |
|---|---|
| [`@llmtr/cli`](./packages/cli) | CLI with interactive TUI |
| [`@llmtr/core`](./packages/core) | Reusable translation API |

## Features

- **Multi-language** — translate into any number of target languages in one command
- **Multiple providers** — OpenAI, Anthropic, Google, Mistral, DeepSeek
- **Watch mode** — re-translate automatically whenever the source file changes
- **Live TUI** — real-time streaming progress per language
- **Config wizard** — interactive `llmtr config` with a live config card
- **Config walk-up** — finds the nearest config file from CWD up to `~`
- **Pipeable** — `--stdout` flag for scripting and shell pipelines
- **Proxy-aware** — auto-reads `HTTPS_PROXY` / `ALL_PROXY` (HTTP & SOCKS5); validates proxy URL and shows active proxy in TUI



```bash
npm install -g @llmtr/cli

# Check version
llmtr version

# Interactive setup
llmtr config

# Translate text
llmtr translate "Hello, world!" --lang zh-CN,ja,fr

# Translate a file
llmtr translate --file README.md --lang zh-CN --output ./i18n

# Watch for changes
llmtr watch content.md --lang zh-CN,de
```

## Providers

| Provider | Default Model | Env Var |
|---|---|---|
| `openai` | `gpt-4o` | `OPENAI_API_KEY` |
| `anthropic` | `claude-3-5-sonnet-20241022` | `ANTHROPIC_API_KEY` |
| `google` | `gemini-1.5-pro` | `GOOGLE_API_KEY` |
| `mistral` | `mistral-large-latest` | `MISTRAL_API_KEY` |
| `deepseek` | `deepseek-chat` | `DEEPSEEK_API_KEY` |

## Config

Run `llmtr config` to generate a config file, or create `llmtr.config.json` manually:

```json
{
  "provider": "openai",
  "targetLanguages": ["zh-CN", "ja", "fr"],
  "systemPrompt": "Translate naturally and preserve all formatting.",
  "output": {
    "directory": "./i18n",
    "fileNamePattern": "{name}.{lang}{ext}"
  }
}
```

Config files are discovered by walking up from the current directory (`llmtr.config.json`, `.llmtr.config.json`, `.llmtrrc`, `package.json#llmtr`, …). The global config lives at `~/.llmtr.config.json`.

## Development

Requires Node.js ≥ 22 and pnpm.

```bash
pnpm install
pnpm build       # build all packages
pnpm lint:fix    # lint and auto-fix
pnpm test        # run tests
```

## License

MIT © [Moozon](https://github.com/llmtr/llmtr)
