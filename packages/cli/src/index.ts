import { defineCommand, runMain } from 'citty'
import { configCommand } from './commands/config.js'
import { translateCommand } from './commands/translate.js'
import { watchCommand } from './commands/watch.js'

const main = defineCommand({
  meta: {
    name: 'llmtr',
    version: '0.0.1',
    description: 'AI-powered translation CLI — translate text & files using your favourite LLM',
  },
  subCommands: {
    translate: translateCommand,
    t: translateCommand,
    watch: watchCommand,
    config: configCommand,
  },
})

runMain(main)
