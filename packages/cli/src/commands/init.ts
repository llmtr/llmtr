import { defineCommand } from 'citty'
import { render } from 'ink'
import { createElement } from 'react'
import { InitWizard } from '../tui/InitWizard.js'

export const initCommand = defineCommand({
  meta: { description: 'Interactively create a llmtr config file' },
  args: {
    output: {
      type: 'string',
      alias: 'o',
      description: 'Config file path (default: llmtr.config.json)',
      default: 'llmtr.config.json',
    },
  },

  run: async ({ args }) => {
    const { waitUntilExit } = render(
      createElement(InitWizard, { outputFile: args.output }),
    )
    await waitUntilExit()
  },
})
