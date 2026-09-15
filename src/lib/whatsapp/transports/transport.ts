/**
 * WhatsApp Transport Interface
 *
 * Abstract contract for message-sending providers (Meta, YCloud, Twilio, etc.).
 * Every provider implements this interface, and the send core dispatches
 * through getTransport() — so adding a new provider never touches core files.
 *
 * This file is part of the CUSTOM layer. The core files (meta-api.ts,
 * send-message.ts, webhook/route.ts) are INTENTIONALLY NOT MODIFIED after
 * the initial adapter wiring. All new provider logic goes here or in
 * sibling files under transports/.
 */

// ============================================================
// Shared result type
// ============================================================

export interface SendResult {
  messageId: string
}

// ============================================================
// Send method arguments
// ============================================================

export interface SendTextArgs {
  to: string
  text: string
  contextMessageId?: string
}

export interface SendMediaArgs {
  to: string
  kind: 'image' | 'video' | 'document' | 'audio'
  link: string
  caption?: string
  filename?: string
  contextMessageId?: string
}

export interface SendTemplateArgs {
  to: string
  templateName: string
  language?: string
  params?: string[]
  contextMessageId?: string
}

export interface SendButtonsArgs {
  to: string
  body: string
  buttons: Array<{ id: string; title: string }>
  contextMessageId?: string
}

export interface SendListArgs {
  to: string
  body: string
  buttonText: string
  sections: Array<{
    title: string
    rows: Array<{ id: string; title: string; description?: string }>
  }>
  contextMessageId?: string
}

export interface SendReactionArgs {
  to: string
  messageId: string
  emoji: string
}

// ============================================================
// Transport interface
// ============================================================

export interface WhatsAppTransport {
  sendText(args: SendTextArgs): Promise<SendResult>
  sendMedia(args: SendMediaArgs): Promise<SendResult>
  sendTemplate(args: SendTemplateArgs): Promise<SendResult>
  sendInteractiveButtons(args: SendButtonsArgs): Promise<SendResult>
  sendInteractiveList(args: SendListArgs): Promise<SendResult>
  sendReaction(args: SendReactionArgs): Promise<SendResult>
}
