/**
 * Inbound Webhook Adapter Registry
 *
 * Detects which provider sent an incoming webhook, verifies its signature,
 * and converts the payload to the Meta Webhook format that processWebhook()
 * already understands.
 *
 * Adding a new provider:
 *   1. Create a class implementing InboundAdapter
 *   2. Add a detector function (checks headers, body shape, etc.)
 *   3. Register it in getInboundAdapter()
 *
 * This file is part of the CUSTOM layer. The core files (route.ts,
 * webhook-signature.ts) are INTENTIONALLY NOT MODIFIED after the
 * initial adapter wiring. All new provider logic goes here.
 */

import crypto from 'node:crypto'
import { convertYCloudToMetaFormat } from '@/lib/whatsapp/ycloud-adapter'

// ============================================================
// InboundAdapter interface
// ============================================================

export interface InboundAdapter {
  /** Returns true if this adapter should handle the request. */
  detect(request: Request): boolean
  /** Verify the webhook signature. Returns true if valid. */
  verify(rawBody: string, request: Request): boolean
  /**
   * Convert the raw webhook body to Meta's format.
   * Returns null if the event is unrecognized (should be ack'd as ignored).
   */
  convert(rawBody: string): { phoneNumberId: string; metaBody: unknown } | null
}

// ============================================================
// Meta Inbound Adapter (default)
// ============================================================

class MetaInboundAdapter implements InboundAdapter {
  detect(request: Request): boolean {
    // Meta sends x-hub-signature-256
    return request.headers.get('x-hub-signature-256') !== null
  }

  verify(rawBody: string, request: Request): boolean {
    const secret = process.env.META_APP_SECRET
    if (!secret) {
      console.error(
        '[webhook] META_APP_SECRET is not set — rejecting request. ' +
          'Configure the env var to enable signature verification.',
      )
      return false
    }

    const signatureHeader = request.headers.get('x-hub-signature-256')
    if (!signatureHeader) return false
    if (!signatureHeader.startsWith('sha256=')) return false

    const expected =
      'sha256=' +
      crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

    const a = Buffer.from(signatureHeader)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  }

  convert(rawBody: string): { phoneNumberId: string; metaBody: unknown } | null {
    // Meta payloads are already in the format processWebhook() expects.
    // No conversion needed — just parse and return.
    const body = JSON.parse(rawBody)
    // Extract phone_number_id from the first entry for the caller
    const phoneNumberId =
      body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id || ''
    return { phoneNumberId, metaBody: body }
  }
}

// ============================================================
// YCloud Inbound Adapter
// ============================================================

class YCloudInboundAdapter implements InboundAdapter {
  detect(request: Request): boolean {
    return request.headers.get('ycloud-signature') !== null
  }

  verify(rawBody: string, request: Request): boolean {
    const secret = process.env.YCLOUD_WEBHOOK_SECRET
    if (!secret) {
      console.error(
        '[webhook] YCLOUD_WEBHOOK_SECRET is not set — rejecting YCloud request. ' +
          'Configure the env var to enable YCloud signature verification.',
      )
      return false
    }

    const signatureHeader = request.headers.get('ycloud-signature')
    if (!signatureHeader) return false

    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')

    const a = Buffer.from(signatureHeader)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  }

  convert(rawBody: string): { phoneNumberId: string; metaBody: unknown } | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const event: any = JSON.parse(rawBody)

    const phoneNumberId =
      event?.whatsappInboundMessage?.to ||
      event?.whatsappMessage?.to ||
      ''

    if (!phoneNumberId) {
      console.warn('[webhook] YCloud event missing phone_number_id')
      return null
    }

    const metaBody = convertYCloudToMetaFormat(event, phoneNumberId)
    if (!metaBody) {
      return null
    }

    return { phoneNumberId, metaBody }
  }
}

// ============================================================
// Registry
// ============================================================

const metaAdapter = new MetaInboundAdapter()
const ycloudAdapter = new YCloudInboundAdapter()

/**
 * Detect which provider sent this webhook and return the matching adapter.
 * Falls back to Meta if no specific adapter matches (Meta is the default).
 */
export function getInboundAdapter(request: Request): InboundAdapter {
  if (ycloudAdapter.detect(request)) return ycloudAdapter
  return metaAdapter
}
