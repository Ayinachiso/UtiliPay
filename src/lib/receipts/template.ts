/**
 * Receipt HTML template — used both as the email body (via Resend)
 * and as the in-app downloadable receipt page (via /receipts/[id]).
 *
 * Inline CSS only (no external stylesheets) so email clients render it.
 * Emerald accent matches the rest of the UtiliPay brand.
 */

import { formatNaira } from '@/lib/utils'

export interface ReceiptViewModel {
  receiptNumber: string
  paidAt: string // ISO timestamp
  amount: number
  payerName: string
  payerEmail: string | null
  unitLabel: string
  communityName: string
  billTitle: string
  billDescription: string | null
  channel: 'web' | 'ussd' | 'whatsapp' | 'admin_logged'
  provider: 'korapay' | 'manual_cash' | 'manual_transfer'
  reference: string
}

function channelLabel(c: ReceiptViewModel['channel']): string {
  switch (c) {
    case 'web':
      return 'Web (card / bank)'
    case 'ussd':
      return 'USSD'
    case 'whatsapp':
      return 'WhatsApp'
    case 'admin_logged':
      return 'Manual (logged at gate)'
  }
}

function providerLabel(p: ReceiptViewModel['provider']): string {
  switch (p) {
    case 'korapay':
      return 'Korapay'
    case 'manual_cash':
      return 'Cash to Admin'
    case 'manual_transfer':
      return 'Bank transfer to Admin'
  }
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-NG', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Africa/Lagos',
  })
}

const PRIMARY = '#065F46' // emerald-800
const PRIMARY_SOFT = '#ECFDF5'
const INK = '#0F172A'
const MUTE = '#475569'
const HAIR = '#E2E8F0'

export function renderReceiptHtml(rcpt: ReceiptViewModel): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>UtiliPay Receipt ${rcpt.receiptNumber}</title>
</head>
<body style="margin:0;padding:24px;background:#F8FAFC;font-family:Inter, Helvetica, Arial, sans-serif;color:${INK};">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="600" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${HAIR};border-radius:12px;overflow:hidden;">
    <tr>
      <td style="padding:32px 32px 16px 32px;border-bottom:1px solid ${HAIR};">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-family:Georgia, serif;font-size:22px;font-weight:700;color:${PRIMARY};letter-spacing:-0.01em;">UtiliPay</div>
          <div style="text-align:right;font-size:12px;color:${MUTE};">
            <div style="text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Receipt</div>
            <div style="margin-top:4px;font-family:'SFMono-Regular',Menlo,monospace;color:${INK};">${rcpt.receiptNumber}</div>
          </div>
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding:28px 32px;">
        <div style="font-size:13px;color:${MUTE};text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Amount paid</div>
        <div style="font-family:Georgia, serif;font-size:40px;font-weight:700;color:${INK};margin-top:6px;letter-spacing:-0.02em;">${formatNaira(rcpt.amount)}</div>
        <div style="font-size:13px;color:${MUTE};margin-top:8px;">${formatDateTime(rcpt.paidAt)}</div>
      </td>
    </tr>

    <tr>
      <td style="padding:0 32px 8px 32px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
          <tr>
            <td style="padding:12px 0;border-top:1px solid ${HAIR};font-size:13px;color:${MUTE};width:40%;">Bill</td>
            <td style="padding:12px 0;border-top:1px solid ${HAIR};font-size:13px;color:${INK};text-align:right;">
              <div style="font-weight:600;">${rcpt.billTitle}</div>
              ${rcpt.billDescription ? `<div style="color:${MUTE};font-size:12px;margin-top:2px;">${rcpt.billDescription}</div>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:12px 0;border-top:1px solid ${HAIR};font-size:13px;color:${MUTE};">Unit</td>
            <td style="padding:12px 0;border-top:1px solid ${HAIR};font-size:13px;color:${INK};text-align:right;">${rcpt.unitLabel}</td>
          </tr>
          <tr>
            <td style="padding:12px 0;border-top:1px solid ${HAIR};font-size:13px;color:${MUTE};">Community</td>
            <td style="padding:12px 0;border-top:1px solid ${HAIR};font-size:13px;color:${INK};text-align:right;">${rcpt.communityName}</td>
          </tr>
          <tr>
            <td style="padding:12px 0;border-top:1px solid ${HAIR};font-size:13px;color:${MUTE};">Payer</td>
            <td style="padding:12px 0;border-top:1px solid ${HAIR};font-size:13px;color:${INK};text-align:right;">
              <div style="font-weight:600;">${rcpt.payerName}</div>
              ${rcpt.payerEmail ? `<div style="color:${MUTE};font-size:12px;margin-top:2px;">${rcpt.payerEmail}</div>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:12px 0;border-top:1px solid ${HAIR};font-size:13px;color:${MUTE};">Channel</td>
            <td style="padding:12px 0;border-top:1px solid ${HAIR};font-size:13px;color:${INK};text-align:right;">${channelLabel(rcpt.channel)}</td>
          </tr>
          <tr>
            <td style="padding:12px 0;border-top:1px solid ${HAIR};font-size:13px;color:${MUTE};">Method</td>
            <td style="padding:12px 0;border-top:1px solid ${HAIR};font-size:13px;color:${INK};text-align:right;">${providerLabel(rcpt.provider)}</td>
          </tr>
          <tr>
            <td style="padding:12px 0;border-top:1px solid ${HAIR};border-bottom:1px solid ${HAIR};font-size:13px;color:${MUTE};">Reference</td>
            <td style="padding:12px 0;border-top:1px solid ${HAIR};border-bottom:1px solid ${HAIR};font-size:12px;color:${INK};text-align:right;font-family:'SFMono-Regular',Menlo,monospace;">${rcpt.reference}</td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:24px 32px 32px 32px;">
        <div style="background:${PRIMARY_SOFT};color:${PRIMARY};padding:14px 16px;border-radius:8px;font-size:13px;line-height:1.5;">
          This receipt is your record of payment. Forward it to your estate admin if there's ever any dispute about whether the bill was settled.
        </div>
        <div style="margin-top:24px;font-size:12px;color:${MUTE};line-height:1.5;">
          UtiliPay · Estate operations, made simple.<br/>
          If you didn't make this payment, reply to this email immediately.
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function renderReceiptPlainText(rcpt: ReceiptViewModel): string {
  return [
    `UtiliPay Receipt ${rcpt.receiptNumber}`,
    `Amount paid: ${formatNaira(rcpt.amount)}`,
    `Date: ${formatDateTime(rcpt.paidAt)}`,
    `Bill: ${rcpt.billTitle}`,
    `Unit: ${rcpt.unitLabel}`,
    `Community: ${rcpt.communityName}`,
    `Payer: ${rcpt.payerName}`,
    `Channel: ${channelLabel(rcpt.channel)}`,
    `Method: ${providerLabel(rcpt.provider)}`,
    `Reference: ${rcpt.reference}`,
    '',
    'This receipt is your record of payment.',
  ].join('\n')
}
