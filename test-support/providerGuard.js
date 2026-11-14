/**
 * No test may reach a real mail, message, payment or model provider.
 *
 * Installed for every test file from the test setup. It removes provider keys
 * from the test process and makes any request to a provider host (fetch,
 * http/https, raw sockets, mail ports) throw instead of leaving the machine.
 * A test that needs a provider uses a fake; it never gets the real one.
 */
const http = require('node:http')
const https = require('node:https')
const net = require('node:net')
const tls = require('node:tls')

const PROVIDER_HOSTS = [
  /(^|\.)mailgun\.(net|org|com)$/i,
  /(^|\.)sendgrid\.(com|net)$/i,
  /(^|\.)postmarkapp\.com$/i,
  /(^|\.)resend\.com$/i,
  /(^|\.)twilio\.com$/i,
  /(^|\.)whatsapp\.(com|net)$/i,
  /^graph\.facebook\.com$/i,
  /^fcm\.googleapis\.com$/i,
  /(^|\.)stripe\.com$/i,
  /(^|\.)paypal\.com$/i,
  /(^|\.)openai\.com$/i,
  /(^|\.)anthropic\.com$/i,
  /(^|\.)elevenlabs\.io$/i,
  /^smtp\./i,
]
const MAIL_PORTS = new Set([25, 465, 587, 2525])
const PROVIDER_ENV = /^(MAILGUN_|SENDGRID_|POSTMARK_|RESEND_|SMTP_|TWILIO_|WHATSAPP_|STRIPE_SECRET|STRIPE_WEBHOOK|PAYPAL_|OPENAI_API_KEY|ANTHROPIC_API_KEY|ELEVENLABS_|FIREBASE_(PRIVATE_KEY|CLIENT_EMAIL|SERVICE_ACCOUNT))/

class ProviderBlockedError extends Error {
  constructor(target) {
    super(`Tests may not reach a real provider (${target}). Use a fake.`)
    this.name = 'ProviderBlockedError'
  }
}

const isProviderHost = (host) => Boolean(host) && PROVIDER_HOSTS.some((pattern) => pattern.test(String(host).replace(/:\d+$/, '')))

function targetOf(input) {
  try {
    if (typeof input === 'string' || input instanceof URL) {
      const url = new URL(String(input))
      return { host: url.hostname, port: Number(url.port) || undefined }
    }
    if (input && typeof input === 'object') {
      if (typeof input.url === 'string') return targetOf(input.url)
      return { host: input.hostname || input.host, port: Number(input.port) || undefined }
    }
  } catch {
    // A relative URL cannot leave the machine.
  }
  return { host: undefined, port: undefined }
}

function assertAllowed(input, extra) {
  const target = targetOf(input)
  const host = target.host || (extra && targetOf(extra).host)
  const port = target.port || (extra && targetOf(extra).port)
  if (isProviderHost(host)) throw new ProviderBlockedError(host)
  if (port && MAIL_PORTS.has(port)) throw new ProviderBlockedError(`${host || 'host'}:${port}`)
}

function scrubProviderEnv(env) {
  const removed = []
  for (const key of Object.keys(env)) {
    if (PROVIDER_ENV.test(key)) {
      delete env[key]
      removed.push(key)
    }
  }
  return removed
}

function installProviderGuard() {
  scrubProviderEnv(process.env)
  if (globalThis.__providerGuardInstalled) return
  globalThis.__providerGuardInstalled = true

  for (const mod of [http, https]) {
    for (const name of ['request', 'get']) {
      const original = mod[name]
      mod[name] = function guarded(input, options, ...rest) {
        assertAllowed(input, typeof options === 'object' ? options : undefined)
        return original.call(this, input, options, ...rest)
      }
    }
  }
  for (const mod of [net, tls]) {
    const original = mod.connect
    const guarded = function guarded(...args) {
      const first = args[0]
      if (typeof first === 'number') assertAllowed({ port: first, host: args[1] })
      else assertAllowed(first)
      return original.apply(this, args)
    }
    mod.connect = guarded
    if (mod === net) mod.createConnection = guarded
  }
}

function guardFetch(target) {
  if (typeof target.fetch !== 'function' || target.fetch.__providerGuarded) return
  const original = target.fetch
  const guarded = function guardedFetch(input, init) {
    try {
      assertAllowed(input)
    } catch (error) {
      return Promise.reject(error)
    }
    return original.call(this, input, init)
  }
  guarded.__providerGuarded = true
  target.fetch = guarded
}

module.exports = { installProviderGuard, guardFetch, scrubProviderEnv, isProviderHost, ProviderBlockedError }
