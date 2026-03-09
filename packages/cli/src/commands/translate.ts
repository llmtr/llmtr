import { readFile } from 'node:fs/promises'
import process from 'node:process'
import { createLanguageModel, Translator } from '@llmtr/core'
import { defineCommand } from 'citty'
import { resolveConfig } from '../config.js'
import { TranslateApp } from '../tui/TranslateApp.js'
import { assertNetwork, buildTranslateOptions, renderTUI } from '../utils.js'

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
      description: 'AI provider: openai | anthropic | google | mistral | deepseek',
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
      description: 'Print translated text to stdout (single language only)',
      default: false,
    },
    'concurrency': {
      type: 'string',
      description: 'Max parallel translations (default: 3)',
    },
  },

  run: async ({ args }) => {
    const config = await resolveConfig({
      provider: args.provider,
      model: args.model,
      apiKey: args['api-key'],
      lang: args.lang,
      outputDir: args.output,
    })

    await assertNetwork(config)

    const options = buildTranslateOptions(config, args)

    // stdout mode — no TUI, output is pipeable
    if (args.stdout) {
      if (options.targetLanguages.length > 1) {
        process.stderr.write('Error: --stdout only supports a single target language.\n')
        process.exit(1)
      }

      const text = args.file ? await readFile(args.file, 'utf-8') : args.text
      if (!text) {
        process.stderr.write('Error: provide text as a positional argument or --file.\n')
        process.exit(1)
      }

      const translator = new Translator(createLanguageModel(config))
      const [result] = await translator.translate(text, options)
      if (result!.error) {
        process.stderr.write(`Error: ${result!.error.message}\n`)
        process.exit(1)
      }
      process.stdout.write(result!.text.trimEnd())
      return
    }

    // TUI mode
    if (!args.file && !args.text) {
      process.stderr.write('Error: provide text as a positional argument or --file.\n')
      process.exit(1)
    }

    await renderTUI(TranslateApp, {
      translator: new Translator(createLanguageModel(config)),
      text: args.text,
      filePath: args.file,
      options,
    })
  },
})
