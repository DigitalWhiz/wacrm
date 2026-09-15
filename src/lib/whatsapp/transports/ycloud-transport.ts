/**
 * YCloud WhatsApp API Transport
 *
 * Wraps the existing ycloud-api.ts functions behind the WhatsAppTransport
 * interface. This file does NOT modify ycloud-api.ts — it delegates to it.
 *
 * Key difference from Meta: YCloud requires a `from` field (sender phone
 * in E.164 format) in every request body. This is read from
 * whatsapp_config.display_phone_number.
 *
 * Environment variables required:
 *   YCLOUD_API_KEY — auth for outbound sends
 */

import {
  ycloudSendTextMessage,
  ycloudSendMediaMessage,
  ycloudSendTemplateMessage,
  ycloudSendInteractiveButtons,
  ycloudSendInteractiveList,
  ycloudSendReaction,
} from '@/lib/whatsapp/ycloud-api'
import type { WhatsAppConfig } from '@/types'
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

export class YCloudTransport implements WhatsAppTransport {
  private from: string

  constructor(config: WhatsAppConfig) {
    // display_phone_number is stored when the user configures WhatsApp.
    // YCloud requires this in E.164 format as the `from` field.
    const from = (config as unknown as Record<string, unknown>)
      .display_phone_number as string | undefined
    if (!from) {
      throw new Error(
        'WhatsApp display_phone_number not configured. ' +
          'Save your phone number in Settings → WhatsApp.'
      )
    }
    this.from = from
  }

  async sendText(args: SendTextArgs): Promise<SendResult> {
    const result = await ycloudSendTextMessage({
      from: this.from,
      to: args.to,
      text: args.text,
      contextMessageId: args.contextMessageId,
    })
    return { messageId: result.messageId }
  }

  async sendMedia(args: SendMediaArgs): Promise<SendResult> {
    const result = await ycloudSendMediaMessage({
      from: this.from,
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
    const result = await ycloudSendTemplateMessage({
      from: this.from,
      to: args.to,
      templateName: args.templateName,
      language: args.language,
      params: args.params,
      contextMessageId: args.contextMessageId,
    })
    return { messageId: result.messageId }
  }

  async sendInteractiveButtons(args: SendButtonsArgs): Promise<SendResult> {
    const result = await ycloudSendInteractiveButtons({
      from: this.from,
      to: args.to,
      body: args.body,
      buttons: args.buttons.map((b) => ({
        type: 'reply' as const,
        reply: { id: b.id, title: b.title },
      })),
      contextMessageId: args.contextMessageId,
    })
    return { messageId: result.messageId }
  }

  async sendInteractiveList(args: SendListArgs): Promise<SendResult> {
    const result = await ycloudSendInteractiveList({
      from: this.from,
      to: args.to,
      body: args.body,
      buttonText: args.buttonText,
      sections: args.sections,
      contextMessageId: args.contextMessageId,
    })
    return { messageId: result.messageId }
  }

  async sendReaction(args: SendReactionArgs): Promise<SendResult> {
    const result = await ycloudSendReaction({
      from: this.from,
      to: args.to,
      messageId: args.messageId,
      emoji: args.emoji,
    })
    return { messageId: result.messageId }
  }
}
