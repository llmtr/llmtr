import { defineCommand, runMain } from 'citty'
import { initCommand } from './commands/init.js'
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
    watch: watchCommand,
    init: initCommand,
  },
})

runMain(main)
