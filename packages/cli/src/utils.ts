import type { TranslationConfig, WatchTranslateOptions } from '@llmtr/core'
import type { ComponentType } from 'react'
import process from 'node:process'
import { checkNetwork, PROVIDER_BASE_URLS } from '@llmtr/core'
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

/**
 * Check network connectivity against the provider's API endpoint.
 * Writes a human-readable error to stderr and exits with code 1 on failure.
 * Uses the provider's known base URL so region-specific routing (e.g. DeepSeek
 * in China without a proxy) is validated correctly instead of generic IPs.
 */
export async function assertNetwork(config: Pick<TranslationConfig, 'provider' | 'baseURL'>): Promise<void> {
  const url = config.baseURL ?? PROVIDER_BASE_URLS[config.provider]
  try {
    await checkNetwork(url)
  }
  catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`)
    process.exit(1)
  }
}

/** Mount an ink component and wait for it to unmount */
export async function renderTUI<P extends object>(Component: ComponentType<P>, props: P): Promise<void> {
  const { waitUntilExit } = render(createElement(Component, props))
  await waitUntilExit()
}
