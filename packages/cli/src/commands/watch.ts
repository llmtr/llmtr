import { createLanguageModel, Translator } from '@llmtr/core'
import { defineCommand } from 'citty'
import { resolveConfig } from '../config.js'
import { WatchApp } from '../tui/WatchApp.js'
import { assertNetwork, buildTranslateOptions, renderTUI } from '../utils.js'

export const watchCommand = defineCommand({
  meta: { description: 'Watch a file and re-translate on every change' },
  args: {
    'file': {
      type: 'positional',
      description: 'File to watch',
      required: true,
    },
    'lang': {
      type: 'string',
      alias: 'l',
      description: 'Target languages, comma-separated',
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
      description: 'API key',
    },
    'prompt': {
      type: 'string',
      description: 'One-time user prompt',
    },
    'debounce': {
      type: 'string',
      description: 'Debounce delay in ms (default: 500)',
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

    const options = {
      ...buildTranslateOptions(config, args),
      debounce: args.debounce
        ? Number.parseInt(args.debounce, 10)
        : (config.watch?.debounce ?? 500),
    }

    await renderTUI(WatchApp, {
      translator: new Translator(createLanguageModel(config)),
      filePath: args.file,
      options,
    })
  },
})
