// @env node
import type { TranslationConfig } from './types.js'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { DEFAULT_FILE_NAME_PATTERN, DEFAULT_WATCH_DEBOUNCE } from './constants.js'

export const CONFIG_DEFAULTS: Partial<TranslationConfig> = {
  targetLanguages: [],
  output: {
    fileNamePattern: DEFAULT_FILE_NAME_PATTERN,
  },
  watch: {
    debounce: DEFAULT_WATCH_DEBOUNCE,
  },
}

/** Config file names searched in order */
const CONFIG_FILES = [
  'llmtr.config.json',
  '.llmtrrc.json',
  '.llmtrrc',
  'llmtr.config.js',
  'llmtr.config.mjs',
  'llmtr.config.ts',
]

/**
 * Load llmtr configuration by scanning for config files in `cwd`.
 * Merges defaults → file config → explicit overrides (highest priority).
 */
export async function loadTranslationConfig(
  cwd?: string,
  overrides?: Partial<TranslationConfig>,
): Promise<Partial<TranslationConfig>> {
  const dir = resolve(cwd ?? process.cwd())
  let fileConfig: Partial<TranslationConfig> = {}

  for (const name of CONFIG_FILES) {
    const filePath = join(dir, name)
    const loaded = await tryLoadConfigFile(filePath, name)
    if (loaded) {
      fileConfig = loaded
      break
    }
  }

  // Also support "llmtr" key in package.json
  if (Object.keys(fileConfig).length === 0) {
    const pkgPath = join(dir, 'package.json')
    try {
      const raw = JSON.parse(await readFile(pkgPath, 'utf-8')) as Record<string, unknown>
      if (raw.llmtr && typeof raw.llmtr === 'object') {
        fileConfig = raw.llmtr as Partial<TranslationConfig>
      }
    }
    catch {
      // no package.json, ignore
    }
  }

  return deepMerge(CONFIG_DEFAULTS, fileConfig, overrides ?? {})
}

/**
 * Validate that the config has all required fields.
 * Throws a descriptive error when something is missing.
 */
export function validateConfig(config: Partial<TranslationConfig>): asserts config is TranslationConfig {
  if (!config.provider) {
    throw new Error(
      'Missing required config: "provider". Set it in llmtr.config.json or pass --provider.',
    )
  }
  if (!config.targetLanguages || config.targetLanguages.length === 0) {
    throw new Error(
      'Missing required config: "targetLanguages". Set it in llmtr.config.json or pass --lang.',
    )
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function tryLoadConfigFile(
  filePath: string,
  name: string,
): Promise<Partial<TranslationConfig> | null> {
  try {
    if (name.endsWith('.json') || name === '.llmtrrc') {
      const raw = await readFile(filePath, 'utf-8')
      return JSON.parse(raw) as Partial<TranslationConfig>
    }
    // JS/TS: dynamic import (requires file to exist and export default)
    const mod = await import(filePath) as { default?: Partial<TranslationConfig> }
    return mod.default ?? (mod as Partial<TranslationConfig>)
  }
  catch {
    return null
  }
}

function deepMerge<T extends object>(...objects: Array<Partial<T>>): Partial<T> {
  const result: Partial<T> = {}
  for (const obj of objects) {
    for (const key of Object.keys(obj) as Array<keyof T>) {
      const val = obj[key]
      const existing = result[key]
      if (
        val !== undefined
        && val !== null
        && typeof val === 'object'
        && !Array.isArray(val)
        && typeof existing === 'object'
        && existing !== null
        && !Array.isArray(existing)
      ) {
        result[key] = deepMerge(existing as object, val as object) as T[keyof T]
      }
      else if (val !== undefined) {
        result[key] = val as T[keyof T]
      }
    }
  }
  return result
}
