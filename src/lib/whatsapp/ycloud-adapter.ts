/**
 * YCloud Webhook Adapter
 *
 * Converts YCloud's proprietary webhook format into the Meta Cloud API
 * format that the existing webhook handler expects. This allows wacrm
 * to process YCloud webhooks without changing the core processing logic.
 *
 * YCloud event types:
 *   - whatsapp.inbound_message.received → incoming messages
 *   - whatsapp.message.updated → outbound status updates (sent/delivered/read)
 *
 * YCloud webhook payload examples:
 *
 * Inbound message:
 * {
 *   "id": "evt_xxx",
 *   "type": "whatsapp.inbound_message.received",
 *   "whatsappInboundMessage": {
 *     "id": "msg_xxx",
 *     "wamid": "wamid.xxx",
 *     "from": "5493571432567",
 *     "to": "5493571345450",
 *     "type": "text",
 *     "text": { "body": "Hello" },
 *     "contact": { "wa_id": "5493571432567", "profile": { "name": "Test" } }
 *   }
 * }
 *
 * Status update:
 * {
 *   "id": "evt_xxx",
 *   "type": "whatsapp.message.updated",
 *   "whatsappMessage": {
 *     "id": "msg_xxx",
 *     "wamid": "wamid.xxx",
 *     "status": "delivered"
 *   }
 * }
 */

interface YCloudInboundMessage {
  id?: string
  wamid?: string
  from: string
  to: string
  type: string
  text?: { body: string }
  image?: { id: string; mime_type?: string; caption?: string; url?: string }
  video?: { id: string; mime_type?: string; caption?: string; url?: string }
  document?: { id: string; mime_type?: string; filename?: string; caption?: string; url?: string }
  audio?: { id: string; mime_type?: string; url?: string }
  sticker?: { id: string; mime_type?: string; url?: string }
  location?: { latitude: number; longitude: number; name?: string; address?: string }
  reaction?: { message_id: string; emoji: string }
  interactive?: {
    type: string
    button_reply?: { id: string; title: string }
    list_reply?: { id: string; title: string; description?: string }
  }
  button?: { text?: string; payload?: string }
  context?: { id: string }
  contact?: { wa_id: string; profile: { name: string } }
}

interface YCloudStatusMessage {
  id?: string
  wamid?: string
  status: string
  timestamp?: string
  recipient_id?: string
}

interface YCloudWebhookEvent {
  id: string
  type: string
  apiVersion?: string
  createTime?: string
  whatsappInboundMessage?: YCloudInboundMessage
  whatsappMessage?: YCloudStatusMessage
}

interface MetaWebhookEntry {
  id: string
  changes: Array<{
    value: {
      messaging_product: string
      metadata: {
        display_phone_number: string
        phone_number_id: string
      }
      contacts?: Array<{
        profile: { name: string }
        wa_id: string
      }>
      messages?: Array<{
        id: string
        from: string
        timestamp: string
        type: string
        text?: { body: string }
        image?: { id: string; mime_type: string; caption?: string }
        video?: { id: string; mime_type: string; caption?: string }
        document?: { id: string; mime_type: string; filename?: string; caption?: string }
        audio?: { id: string; mime_type: string }
        sticker?: { id: string; mime_type: string }
        location?: { latitude: number; longitude: number; name?: string; address?: string }
        reaction?: { message_id: string; emoji: string }
        interactive?: {
          type: string
          button_reply?: { id: string; title: string }
          list_reply?: { id: string; title: string; description?: string }
        }
        button?: { text?: string; payload?: string }
        context?: { id: string }
      }>
      statuses?: Array<{
        id: string
        status: string
        timestamp: string
        recipient_id: string
      }>
    }
    field: string
  }>
}

/**
 * Convert a YCloud webhook event into Meta's webhook format.
 * Returns null if the event type is not recognized.
 */
export function convertYCloudToMetaFormat(
  event: YCloudWebhookEvent,
  phoneNumberId: string,
): MetaWebhookEntry | null {
  const timestamp = event.createTime
    ? Math.floor(new Date(event.createTime).getTime() / 1000).toString()
    : Math.floor(Date.now() / 1000).toString()

  if (event.type === 'whatsapp.inbound_message.received' && event.whatsappInboundMessage) {
    const msg = event.whatsappInboundMessage
    const contact = msg.contact || { wa_id: msg.from, profile: { name: '' } }

    // Map YCloud message type to Meta format
    const message: Record<string, unknown> = {
      id: msg.wamid || msg.id || `ycloud_${Date.now()}`,
      from: msg.from,
      timestamp: timestamp,
      type: msg.type === 'button' ? 'button' : msg.type,
    }

    // Copy type-specific fields
    if (msg.text) message.text = msg.text
    if (msg.image) {
      message.image = {
        id: msg.image.id || '',
        mime_type: msg.image.mime_type || 'image/jpeg',
        ...(msg.image.caption && { caption: msg.image.caption }),
      }
    }
    if (msg.video) {
      message.video = {
        id: msg.video.id || '',
        mime_type: msg.video.mime_type || 'video/mp4',
        ...(msg.video.caption && { caption: msg.video.caption }),
      }
    }
    if (msg.document) {
      message.document = {
        id: msg.document.id || '',
        mime_type: msg.document.mime_type || 'application/pdf',
        ...(msg.document.filename && { filename: msg.document.filename }),
        ...(msg.document.caption && { caption: msg.document.caption }),
      }
    }
    if (msg.audio) {
      message.audio = {
        id: msg.audio.id || '',
        mime_type: msg.audio.mime_type || 'audio/ogg',
      }
    }
    if (msg.sticker) {
      message.sticker = {
        id: msg.sticker.id || '',
        mime_type: msg.sticker.mime_type || 'image/webp',
      }
    }
    if (msg.location) message.location = msg.location
    if (msg.reaction) message.reaction = msg.reaction
    if (msg.interactive) message.interactive = msg.interactive
    if (msg.button) message.button = msg.button
    if (msg.context) message.context = msg.context

    return {
      id: phoneNumberId,
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '',
            phone_number_id: phoneNumberId,
          },
          contacts: [{
            profile: contact.profile,
            wa_id: contact.wa_id,
          }],
          messages: [message as unknown as NonNullable<MetaWebhookEntry['changes'][0]['value']['messages']>[0]],
        },
        field: 'messages',
      }],
    }
  }

  if (event.type === 'whatsapp.message.updated' && event.whatsappMessage) {
    const msg = event.whatsappMessage
    return {
      id: phoneNumberId,
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '',
            phone_number_id: phoneNumberId,
          },
          statuses: [{
            id: msg.wamid || msg.id || '',
            status: msg.status,
            timestamp: msg.timestamp || timestamp,
            recipient_id: msg.recipient_id || '',
          }],
        },
        field: 'messages',
      }],
    }
  }

  // Unrecognized event type
  console.warn('[ycloud-adapter] unrecognized event type:', event.type)
  return null
}
