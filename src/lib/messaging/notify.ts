/**
 * Defaulter notifications.
 *
 * Real channels:
 *   - email (Resend)
 *
 * Simulated channels (return success without actually sending — recorded
 * in the API response so the UI can show the chairman what would have
 * happened in live mode):
 *   - whatsapp
 *   - sms
 *
 * The real WhatsApp + SMS integrations land post-hackathon. The code
 * paths exist now so the UI doesn't need to change when they do.
 */

import { sendEmail } from '@/lib/email/resend'
import { formatNaira } from '@/lib/utils'

export interface DefaulterRecipient {
  memberId: string
  fullName: string
  email: string | null
  phone: string | null
  unitLabel: string
  outstanding: number
}

export interface NotifyChannels {
  email: boolean
  whatsapp: boolean
  sms: boolean
}

export interface NotifyInput {
  communityName: string
  billTitle: string
  dueDate: string
  customMessage?: string
  recipients: DefaulterRecipient[]
  channels: NotifyChannels
}

export interface NotifyResult {
  emailSent: number
  emailSkipped: number
  whatsappSimulated: number
  smsSimulated: number
  errors: { memberId: string; channel: string; message: string }[]
}

function buildEmailHtml(args: {
  communityName: string
  billTitle: string
  dueDate: string
  recipient: DefaulterRecipient
  customMessage?: string
}): string {
  const dueLabel = new Date(args.dueDate).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const greeting = `Hello ${args.recipient.fullName.split(' ').slice(-1)[0] || args.recipient.fullName},`
  const customBlock = args.customMessage
    ? `<p style="margin:16px 0;color:#475569;line-height:1.55;">${escapeHtml(args.customMessage)}</p>`
    : ''
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Reminder: ${escapeHtml(args.billTitle)}</title></head>
<body style="margin:0;padding:24px;background:#F7F3EA;font-family:Inter,Helvetica,Arial,sans-serif;color:#1A1F1B;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="560" style="max-width:560px;width:100%;background:#FDFAF3;border:1px solid #DDD6C2;border-radius:12px;overflow:hidden;">
    <tr><td style="padding:28px 32px 16px 32px;border-bottom:1px solid #DDD6C2;">
      <div style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#1B4332;letter-spacing:-0.01em;">UtiliPay</div>
      <p style="margin:6px 0 0 0;font-size:12px;color:#6E6B5C;letter-spacing:0.08em;text-transform:uppercase;">Reminder from ${escapeHtml(args.communityName)}</p>
    </td></tr>
    <tr><td style="padding:24px 32px;">
      <p style="margin:0 0 18px 0;color:#1A1F1B;">${greeting}</p>
      <p style="margin:0 0 14px 0;color:#475569;line-height:1.55;">
        This is a friendly reminder that the following bill on your unit is still outstanding:
      </p>
      <div style="border:1px solid #DDD6C2;border-radius:8px;padding:16px;background:#F7F3EA;">
        <p style="margin:0 0 6px 0;font-family:Georgia,serif;font-size:20px;color:#1A1F1B;letter-spacing:-0.01em;">${escapeHtml(args.billTitle)}</p>
        <p style="margin:0;font-size:12px;color:#6E6B5C;">Unit: ${escapeHtml(args.recipient.unitLabel)} · Due ${dueLabel}</p>
        <p style="margin:14px 0 0 0;font-family:Georgia,serif;font-size:28px;color:#1B4332;letter-spacing:-0.02em;">${formatNaira(args.recipient.outstanding)} outstanding</p>
      </div>
      ${customBlock}
      <p style="margin:18px 0 0 0;color:#475569;line-height:1.55;font-size:14px;">
        You can settle it on the UtiliPay dashboard via card, bank transfer, USSD, or WhatsApp. If you have already paid, please ignore this message.
      </p>
    </td></tr>
    <tr><td style="padding:18px 32px 28px 32px;border-top:1px solid #DDD6C2;background:#F7F3EA;">
      <p style="margin:0;font-size:11px;color:#6E6B5C;">UtiliPay · Estate operations, made simple.</p>
    </td></tr>
  </table>
</body></html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function notifyDefaulters(input: NotifyInput): Promise<NotifyResult> {
  const result: NotifyResult = {
    emailSent: 0,
    emailSkipped: 0,
    whatsappSimulated: 0,
    smsSimulated: 0,
    errors: [],
  }

  // Email — actually fires via Resend
  if (input.channels.email) {
    for (const r of input.recipients) {
      if (!r.email) {
        result.emailSkipped += 1
        continue
      }
      try {
        const html = buildEmailHtml({
          communityName: input.communityName,
          billTitle: input.billTitle,
          dueDate: input.dueDate,
          recipient: r,
          customMessage: input.customMessage,
        })
        await sendEmail({
          to: r.email,
          subject: `Reminder: ${input.billTitle} is still outstanding`,
          html,
        })
        result.emailSent += 1
      } catch (err) {
        result.errors.push({
          memberId: r.memberId,
          channel: 'email',
          message: err instanceof Error ? err.message : 'unknown',
        })
      }
    }
  }

  // WhatsApp — simulated
  if (input.channels.whatsapp) {
    for (const r of input.recipients) {
      if (r.phone) {
        result.whatsappSimulated += 1
        // Log so the chairman/dev can see what would have fired
        console.log(
          `[notify:whatsapp:simulated] -> ${r.phone} (${r.fullName}, ${input.billTitle})`
        )
      }
    }
  }

  // SMS — simulated
  if (input.channels.sms) {
    for (const r of input.recipients) {
      if (r.phone) {
        result.smsSimulated += 1
        console.log(
          `[notify:sms:simulated] -> ${r.phone} (${r.fullName}, ${input.billTitle})`
        )
      }
    }
  }

  return result
}
