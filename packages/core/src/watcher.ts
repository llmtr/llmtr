// @env node
import type { WatcherHandle } from './types.js'
import { watch } from 'node:fs'

export interface WatchOptions {
  /** Debounce delay in ms. Default: 500 */
  debounce?: number
}

/**
 * Watch one or more file paths and call `onChange` (debounced) on each change.
 * Uses Node.js built-in `fs.watch`. Returns a handle with a `stop()` method.
 */
export function createWatcher(
  filePaths: string | string[],
  onChange: (filePath: string) => void,
  options: WatchOptions = {},
): WatcherHandle {
  const { debounce = 500 } = options
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  const paths = Array.isArray(filePaths) ? filePaths : [filePaths]

  const watchers = paths.map(filePath =>
    watch(filePath, () => {
      const existing = timers.get(filePath)
      if (existing)
        clearTimeout(existing)

      timers.set(
        filePath,
        setTimeout(() => {
          timers.delete(filePath)
          onChange(filePath)
        }, debounce),
      )
    }),
  )

  return {
    stop: async () => {
      for (const timer of timers.values()) clearTimeout(timer)
      timers.clear()
      for (const w of watchers) w.close()
    },
  }
}
