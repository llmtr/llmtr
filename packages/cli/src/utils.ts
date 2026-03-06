import type { TranslationConfig, WatchTranslateOptions } from '@llmtr/core'
import type { ComponentType } from 'react'
import { render } from 'ink'
import { createElement } from 'react'

/** Build translate/file options from resolved config + CLI args */
export function buildTranslateOptions(
  config: TranslationConfig,
  args: { prompt?: string, output?: string, concurrency?: string },
): WatchTranslateOptions {
  return {
    targetLanguages: config.targetLanguages,
    systemPrompt: config.systemPrompt,
    userPrompt: args.prompt,
    concurrency: args.concurrency ? Number.parseInt(args.concurrency, 10) : undefined,
    outputDirectory: args.output ?? config.output?.directory,
    fileNamePattern: config.output?.fileNamePattern,
  }
}

/** Mount an ink component and wait for it to unmount */
export async function renderTUI<P extends object>(Component: ComponentType<P>, props: P): Promise<void> {
  const { waitUntilExit } = render(createElement(Component, props))
  await waitUntilExit()
}
