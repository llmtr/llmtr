// @env node
import type { TranslationConfig } from './types.js'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
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

/** Config file names searched in each directory, in priority order */
const CONFIG_FILES = [
  'llmtr.config.json',
  '.llmtr.config.json', // global config at home dir (~/.llmtr.config.json)
  '.llmtrrc.json',
  '.llmtrrc',
  'llmtr.config.js',
  'llmtr.config.mjs',
  'llmtr.config.ts',
]

/**
 * Walk up the directory tree from `cwd` to `~`, returning the nearest config.
 * Merges: defaults → nearest file config → explicit overrides (highest priority).
 */
export async function loadTranslationConfig(
  cwd?: string,
  overrides?: Partial<TranslationConfig>,
): Promise<Partial<TranslationConfig>> {
  const fileConfig = await findNearestConfig(resolve(cwd ?? process.cwd()))
  return deepMerge(CONFIG_DEFAULTS, fileConfig, overrides ?? {})
}

/**
 * Validate that the config has all required fields.
 * Throws a descriptive error when something is missing.
 */
export function validateConfig(config: Partial<TranslationConfig>): asserts config is TranslationConfig {
  if (!config.provider) {
    throw new Error('Missing required config: "provider". Set it in llmtr.config.json or pass --provider.')
  }
  if (!config.targetLanguages || config.targetLanguages.length === 0) {
    throw new Error('Missing required config: "targetLanguages". Set it in llmtr.config.json or pass --lang.')
  }
}

/** Path of the global config file (in home directory) */
export const GLOBAL_CONFIG_PATH = join(homedir(), '.llmtr.config.json')

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Walk up from `startDir` to `~`, returning the first config found. */
async function findNearestConfig(startDir: string): Promise<Partial<TranslationConfig>> {
  const home = homedir()
  let dir = startDir

  while (true) {
    // Named config files
    for (const name of CONFIG_FILES) {
      const loaded = await tryLoadConfigFile(join(dir, name), name)
      if (loaded)
        return loaded
    }

    // "llmtr" key in package.json (project-local only, not above home)
    const pkgLoaded = await tryLoadPackageJson(dir)
    if (pkgLoaded)
      return pkgLoaded

    // Stop after checking the home directory
    if (dir === home)
      break

    const parent = dirname(dir)
    if (parent === dir)
      break // filesystem root
    dir = parent
  }

  return {}
}

async function tryLoadConfigFile(
  filePath: string,
  name: string,
): Promise<Partial<TranslationConfig> | null> {
  try {
    if (name.endsWith('.json') || name === '.llmtrrc') {
      return JSON.parse(await readFile(filePath, 'utf-8')) as Partial<TranslationConfig>
    }
    const mod = await import(filePath) as { default?: Partial<TranslationConfig> }
    return mod.default ?? (mod as Partial<TranslationConfig>)
  }
  catch {
    return null
  }
}

async function tryLoadPackageJson(dir: string): Promise<Partial<TranslationConfig> | null> {
  try {
    const raw = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8')) as Record<string, unknown>
    if (raw.llmtr && typeof raw.llmtr === 'object') {
      return raw.llmtr as Partial<TranslationConfig>
    }
  }
  catch {
    // no package.json or no llmtr key
  }
  return null
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
