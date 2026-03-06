import process from 'node:process'
import { checkNetwork, createLanguageModel, Translator } from '@llmtr/core'
import { defineCommand } from 'citty'
import { render } from 'ink'
import { createElement } from 'react'
import { resolveConfig } from '../config.js'
import { TranslateApp } from '../tui/TranslateApp.js'

export const translateCommand = defineCommand({
  meta: { description: 'Translate text or a file (one-shot)' },
  args: {
    'text': {
      type: 'positional',
      description: 'Text to translate',
      required: false,
    },
    'file': {
      type: 'string',
      alias: 'f',
      description: 'Input file to translate',
    },
    'lang': {
      type: 'string',
      alias: 'l',
      description: 'Target languages, comma-separated (e.g. "French,German")',
    },
    'output': {
      type: 'string',
      alias: 'o',
      description: 'Output directory for translated files',
    },
    'provider': {
      type: 'string',
      alias: 'p',
      description: 'AI provider: openai | anthropic | google | mistral',
    },
    'model': {
      type: 'string',
      alias: 'm',
      description: 'Model name',
    },
    'api-key': {
      type: 'string',
      description: 'API key (overrides env var and config file)',
    },
    'prompt': {
      type: 'string',
      description: 'One-time user prompt appended to the translation request',
    },
    'stdout': {
      type: 'boolean',
      description: 'Print translated text to stdout instead of writing files',
      default: false,
    },
    'concurrency': {
      type: 'string',
      description: 'Max parallel translations (default: 3)',
    },
  },

  run: async ({ args }) => {
    try {
      await checkNetwork()
    }
    catch (err) {
      process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`)
      process.exit(1)
    }

    const config = await resolveConfig({
      provider: args.provider,
      model: args.model,
      apiKey: args['api-key'],
      lang: args.lang,
      outputDir: args.output,
      prompt: args.prompt,
    })

    const model = createLanguageModel(config)
    const translator = new Translator(model)

    const options = {
      targetLanguages: config.targetLanguages,
      systemPrompt: config.systemPrompt,
      userPrompt: args.prompt,
      concurrency: args.concurrency ? Number.parseInt(args.concurrency, 10) : undefined,
      outputDirectory: args.output ?? config.output?.directory,
      fileNamePattern: config.output?.fileNamePattern,
    }

    // ── stdout mode: skip TUI, just print ──────────────────────────────────
    if (args.stdout) {
      if (options.targetLanguages.length > 1) {
        process.stderr.write('Error: stdout mode only supports a single target language.\n')
        process.exit(1)
      }

      const text = args.file
        ? await (await import('node:fs/promises')).readFile(args.file, 'utf-8')
        : args.text

      if (!text) {
        process.stderr.write('Error: provide text as an argument or --file.\n')
        process.exit(1)
      }

      const results = await translator.translate(text, options)
      const r = results[0]!
      if (r.error) {
        process.stderr.write(`Error: ${r.error.message}\n`)
        process.exit(1)
      }
      process.stdout.write(r.text.trimEnd())
      return
    }

    // ── TUI mode ───────────────────────────────────────────────────────────
    const filePath = args.file
    const rawText = args.text

    if (!filePath && !rawText) {
      process.stderr.write('Error: provide text as a positional argument or --file.\n')
      process.exit(1)
    }

    const { waitUntilExit } = render(
      createElement(TranslateApp, {
        translator,
        text: rawText,
        filePath,
        options,
      }),
    )

    await waitUntilExit()
  },
})
