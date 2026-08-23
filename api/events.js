/**
 * GET /api/events  —  UTQC public events feed
 *
 * Required Vercel environment variables:
 *   GOOGLE_CALENDAR_ID   e.g. abc123@group.calendar.google.com
 *   GOOGLE_CALENDAR_KEY  a Google Cloud API key restricted to the Calendar API
 *
 =
 */

const API = 'https://www.googleapis.com/calendar/v3/calendars';

// How many (maximum) upcoming events to return
const MAX_EVENTS = 25;

module.exports = async function handler(request, response) {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const apiKey = process.env.GOOGLE_CALENDAR_KEY;

  if (!calendarId || !apiKey) {
    response.setHeader('Cache-Control', 'no-store');
    return response.status(500).json({
      events: [],
      error: 'Calendar is not configured on the server.',
    });
  }

  const url =
    `${API}/${encodeURIComponent(calendarId)}/events?` +
    new URLSearchParams({
      key: apiKey,
      timeMin: new Date().toISOString(),
      singleEvents: 'true', 
      orderBy: 'startTime',
      maxResults: String(MAX_EVENTS),
    });

  let items;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Google responded ${res.status}`);
    }
    ({ items = [] } = await res.json());
  } catch (err) {
    console.error('[api/events] calendar fetch failed:', err.message);
    
    response.setHeader('Cache-Control', 'no-store');
    
    return response.status(502).json({
      events: [],
      calendarId,
      error: 'Could not reach Google Calendar.',
    });
  }

  const events = items
    .filter((e) => e.status !== 'cancelled' && e.start)
    .map(normalise);

  
  response.setHeader('Cache-Control', 'public, max-age=300');
  response.setHeader(
    'Vercel-CDN-Cache-Control',
    'public, s-maxage=3600, stale-while-revalidate=86400'
  );

  return response.status(200).json({
    events,
    
    calendarId,
    generatedAt: new Date().toISOString(),
  });
};

// Trimming so not super long
function normalise(e) {
  const raw = htmlToText(e.description || '');
  const { rsvp, type, text } = extractMeta(raw);

  return {
    id: e.id,
    title: (e.summary || 'Untitled event').trim(),
    // All-day events use `date` (YYYY-MM-DD); timed events use `dateTime`.
    start: e.start.dateTime || e.start.date,
    end: e.end?.dateTime || e.end?.date || null,
    allDay: !e.start.dateTime,
    location: e.location ? e.location.trim() : null,
    description: text,
    rsvp,
    type,
    link: e.htmlLink || null,
  };
}


const ENTITIES = {
  nbsp: ' ', lt: '<', gt: '>', quot: '"', apos: "'",
  mdash: '—', ndash: '–', hellip: '…',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  bull: '•', deg: '°', times: '×',
};

function htmlToText(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|h[1-6])>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n• ')
    .replace(/<[^>]+>/g, '')
    // Numeric entities: &#8212; and &#x2014;
    .replace(/&#(\d+);/g, (_, n) => safeChar(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => safeChar(parseInt(n, 16)))
    // Named entities. &amp; is handled last so "&amp;lt;" doesn't become "<".
    .replace(/&([a-z]+);/gi, (m, name) => {
      const key = name.toLowerCase();
      return Object.prototype.hasOwnProperty.call(ENTITIES, key) ? ENTITIES[key] : m;
    })
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function safeChar(code) {
  return Number.isFinite(code) && code > 0 && code <= 0x10ffff
    ? String.fromCodePoint(code)
    : '';
}

function extractMeta(text) {
  let rsvp = null;
  let type = null;

  const kept = text.split('\n').filter((line) => {
    const rsvpMatch = line.match(/^\s*(?:RSVP|Register|Signup|Sign up)\s*:\s*(\S+)/i);
    if (rsvpMatch) {
      const url = rsvpMatch[1];
      // Only accept real web links — never javascript: or data: URLs.
      if (/^https?:\/\//i.test(url)) rsvp = url;
      return false;
    }
    const typeMatch = line.match(/^\s*(?:Type|Category|Tag)\s*:\s*(.+)$/i);
    if (typeMatch) {
      type = typeMatch[1].trim().slice(0, 40);
      return false;
    }
    return true;
  });

  return { rsvp, type, text: kept.join('\n').trim() };
}
