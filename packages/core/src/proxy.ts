// @env node
import process from 'node:process'
import { ProxyAgent, setGlobalDispatcher } from 'undici'

let applied = false

/**
 * If an HTTP/HTTPS proxy is configured via environment variables
 * (https_proxy, HTTPS_PROXY, http_proxy, HTTP_PROXY), configure
 * undici's global dispatcher so that Node.js fetch uses the proxy.
 *
 * Call once at startup (idempotent).
 */
export function applyProxyFromEnv(): void {
  if (applied)
    return
  applied = true

  const proxy
    = process.env.HTTPS_PROXY
      ?? process.env.https_proxy
      ?? process.env.HTTP_PROXY
      ?? process.env.http_proxy

  if (proxy) {
    setGlobalDispatcher(new ProxyAgent(proxy))
  }
}
