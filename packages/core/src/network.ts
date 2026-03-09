// @env node
import { applyProxyFromEnv, getProxyUrl, hasEmptyProxyVar } from './proxy.js'

const TIMEOUT_MS = 5000

/**
 * Verify connectivity to a specific URL (typically the provider's API base URL).
 * Falls back to a pair of generic endpoints only when no target URL is supplied.
 *
 * By probing the actual provider endpoint we avoid false negatives in environments
 * where generic IPs (1.1.1.1, 8.8.8.8) are unreachable but the LLM API is
 * accessible — e.g. DeepSeek / domestic APIs in China without a proxy.
 *
 * Applies proxy settings before the check so proxied environments work.
 * Throws a detailed, actionable error when the target is unreachable.
 *
 * @param targetUrl  Provider base URL to probe. When omitted, falls back to
 *                   `https://1.1.1.1` and `https://8.8.8.8` as a last resort.
 */
export async function checkNetwork(targetUrl?: string): Promise<void> {
  applyProxyFromEnv()

  // Probe the provider URL first (most accurate signal), then generic fallbacks.
  const candidates = targetUrl
    ? [targetUrl, 'https://1.1.1.1']
    : ['https://1.1.1.1', 'https://8.8.8.8']

  let lastError: Error | undefined

  for (const url of candidates) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      await fetch(url, { method: 'HEAD', signal: controller.signal })
      return // any success → network is reachable
    }
    catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
    finally {
      clearTimeout(timer)
    }
  }

  throw buildNetworkError(lastError, targetUrl)
}

function buildNetworkError(cause: Error | undefined, targetUrl: string | undefined): Error {
  const reason = cause?.message ?? 'unknown error'
  const proxy = getProxyUrl()
  const target = targetUrl ?? 'the remote API'

  if (proxy) {
    return new Error(
      `Network unreachable (${target}): ${reason}\n`
      + `  Proxy in use: ${proxy}\n`
      + `  Hint: verify the proxy is running and can reach ${target}.\n`
      + `  To disable the proxy: unset HTTPS_PROXY HTTP_PROXY ALL_PROXY`,
    )
  }

  if (hasEmptyProxyVar()) {
    return new Error(
      `Network unreachable (${target}): ${reason}\n`
      + `  Hint: a proxy variable is set to an empty string (export VAR= instead of unset).\n`
      + `  Fix: unset HTTPS_PROXY HTTP_PROXY ALL_PROXY https_proxy http_proxy all_proxy`,
    )
  }

  return new Error(
    `Network unreachable (${target}): ${reason}\n`
    + `  Hint: if you access the internet through a proxy, set it via:\n`
    + `    export HTTPS_PROXY=http://host:port   (HTTP/HTTPS proxy)\n`
    + `    export HTTPS_PROXY=socks5://host:port (SOCKS5 proxy, e.g. Clash)`,
  )
}
