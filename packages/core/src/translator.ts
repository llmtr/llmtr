// @env node
import type { LanguageModel } from 'ai'
import type {
  StreamEventHandler,
  TranslateFileOptions,
  TranslateOptions,
  TranslationResult,
} from './types.js'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, extname } from 'node:path'
import { generateText, streamText } from 'ai'
import { join } from 'pathe'
import { DEFAULT_FILE_NAME_PATTERN, DEFAULT_SYSTEM_PROMPT } from './constants.js'

function buildPrompt(text: string, targetLanguage: string, userPrompt?: string): string {
  const base = `Translate the following text to ${targetLanguage}:\n\n${text}`
  return userPrompt ? `${userPrompt}\n\n${base}` : base
}

export class Translator {
  constructor(private readonly model: LanguageModel) {}

  /**
   * Translate `text` into all `targetLanguages` in parallel batches.
   * Returns final results once all translations are complete.
   */
  async translate(text: string, options: TranslateOptions): Promise<TranslationResult[]> {
    const { targetLanguages, systemPrompt, userPrompt, concurrency = 3 } = options
    const results: TranslationResult[] = []

    for (let i = 0; i < targetLanguages.length; i += concurrency) {
      const batch = targetLanguages.slice(i, i + concurrency)
      const batchResults = await Promise.all(
        batch.map(lang => this._translateOne(text, lang, { systemPrompt, userPrompt })),
      )
      results.push(...batchResults)
    }

    return results
  }

  /**
   * Like `translate`, but streams tokens for each language and calls `onEvent` for
   * every `start` / `delta` / `done` / `error` / `complete` event.
   * Languages within a batch are streamed concurrently.
   */
  async translateWithStream(
    text: string,
    options: TranslateOptions,
    onEvent: StreamEventHandler,
  ): Promise<TranslationResult[]> {
    const { targetLanguages, systemPrompt, userPrompt, concurrency = 3 } = options
    const results: TranslationResult[] = []

    const translateLanguage = async (language: string): Promise<TranslationResult> => {
      onEvent({ type: 'start', language })
      try {
        const { textStream, text: textPromise } = streamText({
          model: this.model,
          system: systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
          prompt: buildPrompt(text, language, userPrompt),
        })

        for await (const delta of textStream) {
          onEvent({ type: 'delta', language, delta })
        }

        const finalText = await textPromise
        onEvent({ type: 'done', language, text: finalText })
        return { language, text: finalText }
      }
      catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        onEvent({ type: 'error', language, error: err })
        return { language, text: '', error: err }
      }
    }

    for (let i = 0; i < targetLanguages.length; i += concurrency) {
      const batch = targetLanguages.slice(i, i + concurrency)
      const batchResults = await Promise.all(batch.map(translateLanguage))
      results.push(...batchResults)
    }

    onEvent({ type: 'complete', results })
    return results
  }

  /**
   * Read a file, translate its content, and write output files alongside the input.
   * Passes a `StreamEventHandler` when provided (enables TUI progress display).
   */
  async translateFile(
    filePath: string,
    options: TranslateFileOptions,
    onEvent?: StreamEventHandler,
  ): Promise<TranslationResult[]> {
    const content = await readFile(filePath, 'utf-8')

    const results = onEvent
      ? await this.translateWithStream(content, options, onEvent)
      : await this.translate(content, options)

    // Write output files for successful translations
    await Promise.all(
      results
        .filter(r => !r.error)
        .map(async (result) => {
          const outputPath = await this._writeOutputFile(filePath, result, options)
          result.outputPath = outputPath
        }),
    )

    return results
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async _translateOne(
    text: string,
    language: string,
    options: { systemPrompt?: string, userPrompt?: string },
  ): Promise<TranslationResult> {
    try {
      const { text: result } = await generateText({
        model: this.model,
        system: options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
        prompt: buildPrompt(text, language, options.userPrompt),
      })
      return { language, text: result }
    }
    catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      return { language, text: '', error: err }
    }
  }

  private async _writeOutputFile(
    inputPath: string,
    result: TranslationResult,
    options: TranslateFileOptions,
  ): Promise<string> {
    const ext = extname(inputPath)
    const name = inputPath.slice(0, inputPath.length - ext.length).split('/').pop()!
    const pattern = options.fileNamePattern ?? DEFAULT_FILE_NAME_PATTERN
    const fileName = pattern
      .replace('{name}', name)
      .replace('{lang}', result.language)
      .replace('{ext}', ext)

    const outputDir = options.outputDirectory ?? dirname(inputPath)
    await mkdir(outputDir, { recursive: true })

    const outputPath = join(outputDir, fileName)
    await writeFile(outputPath, result.text, 'utf-8')
    return outputPath
  }
}
