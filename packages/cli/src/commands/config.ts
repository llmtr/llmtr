import type { TranslationConfig } from '@llmtr/core'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { GLOBAL_CONFIG_PATH } from '@llmtr/core'
import { defineCommand } from 'citty'
import { InitWizard } from '../tui/InitWizard.js'
import { renderTUI } from '../utils.js'

export const configCommand = defineCommand({
  meta: { description: 'Interactively create or edit llmtr config' },
  args: {
    global: {
      type: 'boolean',
      alias: 'g',
      description: `Create/edit global config at ${join(homedir(), '.llmtr.config.json')}`,
      default: false,
    },
    output: {
      type: 'string',
      alias: 'o',
      description: 'Config file path (overrides default location)',
    },
  },

  run: async ({ args }) => {
    const outputFile = args.output ?? (args.global ? GLOBAL_CONFIG_PATH : 'llmtr.config.json')

    // Load existing config to pre-fill the wizard
    let initialConfig: Partial<TranslationConfig> | undefined
    try {
      initialConfig = JSON.parse(await readFile(outputFile, 'utf-8')) as Partial<TranslationConfig>
    }
    catch {
      // File doesn't exist yet — start fresh
    }

    await renderTUI(InitWizard, { outputFile, initialConfig })
  },
})
