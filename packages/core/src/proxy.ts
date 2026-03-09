// @env node
import process from 'node:process'
import { ProxyAgent, setGlobalDispatcher } from 'undici'

let applied = false

/**
 * Returns the effective proxy URL from environment variables, or `undefined`
 * when no proxy is configured. Empty / whitespace-only values are ignored so
 * that `export HTTPS_PROXY=` (setting to an empty string instead of unsetting)
 * is treated as "no proxy" rather than passed to ProxyAgent.
 *
 * Priority: HTTPS_PROXY → https_proxy → ALL_PROXY → all_proxy → HTTP_PROXY → http_proxy
 */
export function getProxyUrl(): string | undefined {
  const candidates = [
    process.env.HTTPS_PROXY,
    process.env.https_proxy,
    process.env.ALL_PROXY,
    process.env.all_proxy,
    process.env.HTTP_PROXY,
    process.env.http_proxy,
  ]
  for (const candidate of candidates) {
    const trimmed = candidate?.trim()
    if (trimmed)
      return trimmed
  }
  return undefined
}

/**
 * Returns true when any proxy env var is set to an empty / whitespace string
 * (i.e. the user ran `export HTTPS_PROXY=` instead of `unset HTTPS_PROXY`).
 * Useful for diagnosing "Network unreachable" after seemingly clearing proxy.
 */
export function hasEmptyProxyVar(): boolean {
  const vars = ['HTTPS_PROXY', 'https_proxy', 'ALL_PROXY', 'all_proxy', 'HTTP_PROXY', 'http_proxy']
  return vars.some((k) => {
    const v = process.env[k]
    return v !== undefined && v.trim() === ''
  })
}

/**
 * If an HTTP/HTTPS proxy is configured via environment variables, configure
 * undici's global dispatcher so that Node.js `fetch` uses the proxy.
 *
 * Robustness guarantees:
 * - Empty / whitespace-only values are skipped (no crash on `export HTTPS_PROXY=`).
 * - Malformed URLs (e.g. missing protocol) log a warning instead of throwing.
 * - Idempotent: safe to call multiple times.
 */
export function applyProxyFromEnv(): void {
  if (applied)
    return
  applied = true

  const proxy = getProxyUrl()
  if (!proxy)
    return

  // Validate URL before handing it to ProxyAgent — an invalid URL would throw
  // an unrecoverable error deep inside undici.
  if (!URL.canParse(proxy)) {
    process.stderr.write(
      `[llmtr] Warning: proxy URL "${proxy}" is not a valid URL — proceeding without proxy.\n`
      + `  Hint: make sure the value includes a protocol, e.g. http://host:port\n`,
    )
    return
  }

  try {
    setGlobalDispatcher(new ProxyAgent(proxy))
  }
  catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    process.stderr.write(
      `[llmtr] Warning: failed to configure proxy "${proxy}" — proceeding without proxy. (${reason})\n`,
    )
  }
}

/** Reset idempotency guard — only for use in tests. */
export function _resetApplied(): void {
  applied = false
}
