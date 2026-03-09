import process from 'node:process'
import { defineCommand, runMain } from 'citty'
import pkg from '../package.json' with { type: 'json' }
import { configCommand } from './commands/config.js'
import { translateCommand } from './commands/translate.js'
import { watchCommand } from './commands/watch.js'

const versionCommand = defineCommand({
  meta: { description: 'Print the current version' },
  run: () => { process.stdout.write(`${pkg.version}\n`) },
})

const main = defineCommand({
  meta: {
    name: 'llmtr',
    version: pkg.version,
    description: 'AI-powered translation CLI — translate text & files using your favourite LLM',
  },
  subCommands: {
    translate: translateCommand,
    t: translateCommand,
    watch: watchCommand,
    config: configCommand,
    version: versionCommand,
    v: versionCommand,
  },
})

runMain(main)
