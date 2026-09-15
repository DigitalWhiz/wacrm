/**
 * WhatsApp Transport Factory
 *
 * Resolves the correct transport implementation based on environment
 * configuration. When YCLOUD_API_KEY is set, YCloud is used; otherwise
 * Meta is the default.
 *
 * Usage in send-message.ts:
 *   import { getTransport } from '@/lib/whatsapp/transports'
 *   const transport = getTransport(config)
 *   const result = await transport.sendText({ to, text })
 *
 * Usage in other files:
 *   import { getTransport, getInboundAdapter } from '@/lib/whatsapp/transports'
 *
 * This file is part of the CUSTOM layer. The core files are
 * INTENTIONALLY NOT MODIFIED after the initial adapter wiring.
 */

import type { WhatsAppConfig } from '@/types'
import type { WhatsAppTransport } from './transport'
import { MetaTransport } from './meta-transport'
import { YCloudTransport } from './ycloud-transport'

export type { WhatsAppTransport, SendResult } from './transport'
export { getInboundAdapter } from './inbound-adapter'
export type { InboundAdapter } from './inbound-adapter'

/**
 * Resolve the outbound transport based on environment config.
 *
 * Priority:
 *   1. YCLOUD_API_KEY set → YCloudTransport
 *   2. Otherwise → MetaTransport
 *
 * To add a new provider:
 *   - Add detection logic (e.g. check for TWILIO_AUTH_TOKEN)
 *   - Instantiate your transport class
 *   - Return it here
 */
export function getTransport(config: WhatsAppConfig): WhatsAppTransport {
  if (process.env.YCLOUD_API_KEY) {
    return new YCloudTransport(config)
  }
  return new MetaTransport(config)
}
