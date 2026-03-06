import { createLanguageModel, Translator } from '@llmtr/core'
import { defineCommand } from 'citty'
import { render } from 'ink'
import { createElement } from 'react'
import { resolveConfig } from '../config.js'
import { WatchApp } from '../tui/WatchApp.js'

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
      description: 'AI provider: openai | anthropic | google | mistral',
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

    const model = createLanguageModel(config)
    const translator = new Translator(model)

    const options = {
      targetLanguages: config.targetLanguages,
      systemPrompt: config.systemPrompt,
      userPrompt: args.prompt,
      outputDirectory: args.output ?? config.output?.directory,
      fileNamePattern: config.output?.fileNamePattern,
      debounce: args.debounce
        ? Number.parseInt(args.debounce, 10)
        : (config.watch?.debounce ?? 500),
    }

    const { waitUntilExit } = render(
      createElement(WatchApp, {
        translator,
        filePath: args.file,
        options,
      }),
    )

    await waitUntilExit()
  },
})
