// Runtime config sourced from Vite env (build-time). All optional — the app
// runs fully in mock mode when unset.

import { normalizePhone } from './shared/whatsapp'

/**
 * Our WhatsApp Business number (digits only). When set, "Continue with
 * WhatsApp" opens a chat with this number; when empty, it opens the WhatsApp
 * composer instead. In production this is the verified Cloud API sender whose
 * inbound webhook identifies parents with zero OTP.
 */
export const WA_BUSINESS_NUMBER = normalizePhone(import.meta.env.VITE_WA_BUSINESS_NUMBER ?? '')
