// @env node
import { applyProxyFromEnv } from './proxy.js'

const CHECK_URL = 'https://1.1.1.1'
const TIMEOUT_MS = 5000

/**
 * Verify internet connectivity by sending a HEAD request to a lightweight endpoint.
 * Applies proxy settings before the check so proxied environments work correctly.
 * Throws an error with a human-readable message when the network is unreachable.
 */
export async function checkNetwork(): Promise<void> {
  applyProxyFromEnv()

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    await fetch(CHECK_URL, { method: 'HEAD', signal: controller.signal })
  }
  catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    throw new Error(`Network unreachable: ${reason}`)
  }
  finally {
    clearTimeout(timer)
  }
}
