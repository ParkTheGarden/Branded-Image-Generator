import { supabase } from './supabaseClient'

const SESSION_ID_KEY = 'aivex_session_id'
const PAGE_VIEW_SENT_KEY = 'aivex_page_view_sent'

function safeRandomId() {
  try {
    if (crypto?.randomUUID) return crypto.randomUUID()
  } catch (_) {}
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export function getOrCreateSessionId() {
  try {
    const existing = sessionStorage.getItem(SESSION_ID_KEY)
    if (existing) return existing
    const created = safeRandomId()
    sessionStorage.setItem(SESSION_ID_KEY, created)
    return created
  } catch (_) {
    // If storage is blocked, tracking should still not crash the app.
    return safeRandomId()
  }
}

function buildPayload(payload) {
  // Normalize keys to match the suggested DB schema.
  return {
    ratio: payload?.ratio,
    background: payload?.background,
    overlay_category: payload?.overlayCategory,
    overlay_opacity: payload?.overlayOpacity,
    overlay_grayscale: payload?.overlayGrayscale,
  }
}

async function insertEvent(event) {
  if (!supabase) return

  // Only log event type to avoid leaking any secrets.
  try {
    console.info('[tracking] insert event_type:', event?.event_type)
    const { error } = await supabase.from('events').insert(event)
    if (error) {
      console.error('[tracking] insert failed:', {
        event_type: event?.event_type,
        message: error.message,
      })
    } else {
      console.info('[tracking] insert ok:', event?.event_type)
    }
  } catch (e) {
    console.error('[tracking] insert exception:', {
      event_type: event?.event_type,
      message: e?.message,
    })
  }
}

export function trackPageViewOncePerSession(payload) {
  if (!supabase) return
  try {
    if (sessionStorage.getItem(PAGE_VIEW_SENT_KEY) === '1') return
    sessionStorage.setItem(PAGE_VIEW_SENT_KEY, '1')
  } catch (_) {
    // If storage is blocked, fallback to sending once per session render.
  }

  const session_id = getOrCreateSessionId()
  void insertEvent({
    event_type: 'page_view',
    session_id,
    ...buildPayload(payload),
  })
}

export function trackPngDownload(payload) {
  if (!supabase) return
  const session_id = getOrCreateSessionId()
  void insertEvent({
    event_type: 'png_download',
    session_id,
    ...buildPayload(payload),
  })
}

