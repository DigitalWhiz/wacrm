/**
 * Meta WhatsApp Cloud API Transport
 *
 * Wraps the existing meta-api.ts functions behind the WhatsAppTransport
 * interface. This file does NOT modify meta-api.ts — it delegates to it.
 *
 * Meta requires phoneNumberId + Bearer token auth. These are resolved
 * from whatsapp_config at the call site and passed through the interface.
 */

import {
  sendTextMessage,
  sendTemplateMessage,
  sendMediaMessage,
  sendInteractiveButtons,
  sendInteractiveList,
} from '@/lib/whatsapp/meta-api'
import type { WhatsAppConfig } from '@/types'
import { decrypt } from '@/lib/whatsapp/encryption'
import type {
  WhatsAppTransport,
  SendResult,
  SendTextArgs,
  SendMediaArgs,
  SendTemplateArgs,
  SendButtonsArgs,
  SendListArgs,
  SendReactionArgs,
} from './transport'

export class MetaTransport implements WhatsAppTransport {
  private phoneNumberId: string
  private accessToken: string

  constructor(config: WhatsAppConfig) {
    this.phoneNumberId = config.phone_number_id
    this.accessToken = decrypt(config.access_token)
  }

  async sendText(args: SendTextArgs): Promise<SendResult> {
    const result = await sendTextMessage({
      phoneNumberId: this.phoneNumberId,
      accessToken: this.accessToken,
      to: args.to,
      text: args.text,
      contextMessageId: args.contextMessageId,
    })
    return { messageId: result.messageId }
  }

  async sendMedia(args: SendMediaArgs): Promise<SendResult> {
    const result = await sendMediaMessage({
      phoneNumberId: this.phoneNumberId,
      accessToken: this.accessToken,
      to: args.to,
      kind: args.kind,
      link: args.link,
      caption: args.caption,
      filename: args.filename,
      contextMessageId: args.contextMessageId,
    })
    return { messageId: result.messageId }
  }

  async sendTemplate(args: SendTemplateArgs): Promise<SendResult> {
    const result = await sendTemplateMessage({
      phoneNumberId: this.phoneNumberId,
      accessToken: this.accessToken,
      to: args.to,
      templateName: args.templateName,
      language: args.language,
      params: args.params,
      contextMessageId: args.contextMessageId,
    })
    return { messageId: result.messageId }
  }

  async sendInteractiveButtons(args: SendButtonsArgs): Promise<SendResult> {
    const result = await sendInteractiveButtons({
      phoneNumberId: this.phoneNumberId,
      accessToken: this.accessToken,
      to: args.to,
      bodyText: args.body,
      buttons: args.buttons,
      contextMessageId: args.contextMessageId,
    })
    return { messageId: result.messageId }
  }

  async sendInteractiveList(args: SendListArgs): Promise<SendResult> {
    const result = await sendInteractiveList({
      phoneNumberId: this.phoneNumberId,
      accessToken: this.accessToken,
      to: args.to,
      bodyText: args.body,
      buttonLabel: args.buttonText,
      sections: args.sections,
      contextMessageId: args.contextMessageId,
    })
    return { messageId: result.messageId }
  }

  async sendReaction(_args: SendReactionArgs): Promise<SendResult> {
    // Meta reactions go through a different endpoint not yet wrapped.
    // For now, throw — the core already handles this case.
    throw new Error('MetaTransport.sendReaction not yet implemented')
  }
}
