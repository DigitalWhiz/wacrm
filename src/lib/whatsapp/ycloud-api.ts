/**
 * YCloud WhatsApp API Client
 *
 * Sends messages through YCloud's API instead of Meta's Cloud API.
 * YCloud wraps Meta's API but uses its own auth and endpoint format.
 *
 * API Base: https://api.ycloud.com/v2
 * Auth: X-API-Key header
 *
 * YCloud send endpoint: POST /v2/whatsapp/messages
 * Request body is similar to Meta's but wrapped in YCloud's envelope.
 */

const YCLOUD_API_BASE = 'https://api.ycloud.com/v2'

interface YCloudSendResult {
  messageId: string
}

interface YCloudErrorResponse {
  message?: string
  code?: number
}

async function throwYCloudError(response: Response, fallback: string): Promise<never> {
  let message = fallback
  try {
    const data = (await response.json()) as YCloudErrorResponse
    if (data.message) message = data.message
  } catch {
    // response body wasn't JSON — keep the fallback
  }
  throw new Error(message)
}

function getYCloudApiKey(): string {
  const key = process.env.YCLOUD_API_KEY
  if (!key) {
    throw new Error(
      'YCLOUD_API_KEY is not set. Configure the env var to enable YCloud message sending.'
    )
  }
  return key
}

function ycloudHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': getYCloudApiKey(),
  }
}

// ============================================================
// Text messages
// ============================================================

export interface YCloudSendTextArgs {
  to: string
  text: string
  contextMessageId?: string
}

/**
 * Send a text message via YCloud API.
 */
export async function ycloudSendTextMessage(
  args: YCloudSendTextArgs
): Promise<YCloudSendResult> {
  const { to, text, contextMessageId } = args
  const url = `${YCLOUD_API_BASE}/whatsapp/messages`

  const body: Record<string, unknown> = {
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { body: text },
  }
  if (contextMessageId) {
    body.context = { message_id: contextMessageId }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: ycloudHeaders(),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    await throwYCloudError(response, `YCloud API error: ${response.status}`)
  }
  const data = await response.json()
  // YCloud returns { id: "xxx" } or { messages: [{ id: "xxx" }] }
  const messageId = data.messages?.[0]?.id || data.id || `ycloud_${Date.now()}`
  return { messageId }
}

// ============================================================
// Media messages
// ============================================================

export type YCloudMediaKind = 'image' | 'video' | 'document' | 'audio'

export interface YCloudSendMediaArgs {
  to: string
  kind: YCloudMediaKind
  link: string
  caption?: string
  filename?: string
  contextMessageId?: string
}

/**
 * Send a media message (image, video, document, audio) via YCloud API.
 */
export async function ycloudSendMediaMessage(
  args: YCloudSendMediaArgs
): Promise<YCloudSendResult> {
  const { to, kind, link, caption, filename, contextMessageId } = args
  if (!link) throw new Error('ycloudSendMediaMessage requires a link.')
  const url = `${YCLOUD_API_BASE}/whatsapp/messages`

  const media: Record<string, unknown> = { link }
  if (caption && kind !== 'audio') media.caption = caption
  if (kind === 'document' && filename) media.filename = filename

  const body: Record<string, unknown> = {
    recipient_type: 'individual',
    to,
    type: kind,
    [kind]: media,
  }
  if (contextMessageId) body.context = { message_id: contextMessageId }

  const response = await fetch(url, {
    method: 'POST',
    headers: ycloudHeaders(),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    await throwYCloudError(response, `YCloud API error: ${response.status}`)
  }
  const data = await response.json()
  const messageId = data.messages?.[0]?.id || data.id || `ycloud_${Date.now()}`
  return { messageId }
}

// ============================================================
// Template messages
// ============================================================

export interface YCloudSendTemplateArgs {
  to: string
  templateName: string
  language?: string
  params?: string[]
  contextMessageId?: string
}

/**
 * Send a template message via YCloud API.
 */
export async function ycloudSendTemplateMessage(
  args: YCloudSendTemplateArgs
): Promise<YCloudSendResult> {
  const { to, templateName, language = 'en_US', params, contextMessageId } = args
  const url = `${YCLOUD_API_BASE}/whatsapp/messages`

  const templatePayload: Record<string, unknown> = {
    name: templateName,
    language: { code: language },
  }

  if (params && params.length > 0) {
    templatePayload.components = [
      {
        type: 'body',
        parameters: params.map((p) => ({ type: 'text', text: String(p) })),
      },
    ]
  }

  const body: Record<string, unknown> = {
    recipient_type: 'individual',
    to,
    type: 'template',
    template: templatePayload,
  }
  if (contextMessageId) body.context = { message_id: contextMessageId }

  const response = await fetch(url, {
    method: 'POST',
    headers: ycloudHeaders(),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    await throwYCloudError(response, `YCloud API error: ${response.status}`)
  }
  const data = await response.json()
  const messageId = data.messages?.[0]?.id || data.id || `ycloud_${Date.now()}`
  return { messageId }
}

// ============================================================
// Interactive messages (buttons + list)
// ============================================================

export interface YCloudSendInteractiveButtonsArgs {
  to: string
  body: string
  buttons: Array<{ type: 'reply'; reply: { id: string; title: string } }>
  contextMessageId?: string
}

/**
 * Send interactive buttons via YCloud API.
 */
export async function ycloudSendInteractiveButtons(
  args: YCloudSendInteractiveButtonsArgs
): Promise<YCloudSendResult> {
  const { to, body: bodyText, buttons, contextMessageId } = args
  const url = `${YCLOUD_API_BASE}/whatsapp/messages`

  const msgBody: Record<string, unknown> = {
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: { buttons },
    },
  }
  if (contextMessageId) msgBody.context = { message_id: contextMessageId }

  const response = await fetch(url, {
    method: 'POST',
    headers: ycloudHeaders(),
    body: JSON.stringify(msgBody),
  })

  if (!response.ok) {
    await throwYCloudError(response, `YCloud API error: ${response.status}`)
  }
  const data = await response.json()
  const messageId = data.messages?.[0]?.id || data.id || `ycloud_${Date.now()}`
  return { messageId }
}

export interface YCloudSendInteractiveListArgs {
  to: string
  body: string
  buttonText: string
  sections: Array<{
    title: string
    rows: Array<{ id: string; title: string; description?: string }>
  }>
  contextMessageId?: string
}

/**
 * Send an interactive list via YCloud API.
 */
export async function ycloudSendInteractiveList(
  args: YCloudSendInteractiveListArgs
): Promise<YCloudSendResult> {
  const { to, body: bodyText, buttonText, sections, contextMessageId } = args
  const url = `${YCLOUD_API_BASE}/whatsapp/messages`

  const msgBody: Record<string, unknown> = {
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: bodyText },
      action: { button: buttonText, sections },
    },
  }
  if (contextMessageId) msgBody.context = { message_id: contextMessageId }

  const response = await fetch(url, {
    method: 'POST',
    headers: ycloudHeaders(),
    body: JSON.stringify(msgBody),
  })

  if (!response.ok) {
    await throwYCloudError(response, `YCloud API error: ${response.status}`)
  }
  const data = await response.json()
  const messageId = data.messages?.[0]?.id || data.id || `ycloud_${Date.now()}`
  return { messageId }
}

// ============================================================
// Reactions
// ============================================================

export interface YCloudSendReactionArgs {
  to: string
  messageId: string
  emoji: string
}

/**
 * Send or remove a reaction via YCloud API.
 */
export async function ycloudSendReaction(
  args: YCloudSendReactionArgs
): Promise<YCloudSendResult> {
  const { to, messageId, emoji } = args
  const url = `${YCLOUD_API_BASE}/whatsapp/messages`

  const body: Record<string, unknown> = {
    recipient_type: 'individual',
    to,
    type: 'reaction',
    reaction: { message_id: messageId, emoji },
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: ycloudHeaders(),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    await throwYCloudError(response, `YCloud API error: ${response.status}`)
  }
  const data = await response.json()
  const id = data.messages?.[0]?.id || data.id || `ycloud_${Date.now()}`
  return { messageId: id }
}
