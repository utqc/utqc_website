/**
 * GET /api/events  —  UTQC public events feed
 *
 * Reads the club's public Google Calendar server-side and returns a small,
 * clean JSON payload for events.html. Running this on the server (rather than
 * calling Google from the browser) means:
 *   - no CORS problem
 *   - the API key stays in a Vercel environment variable, never in page source
 *   - Google's sprawling event objects get trimmed to the fields we render
 *
 * Written as a CommonJS handler on purpose: it needs no package.json and no
 * build step, so it deploys on a plain static project exactly as-is.
 *
 * Required Vercel environment variables:
 *   GOOGLE_CALENDAR_ID   e.g. abc123@group.calendar.google.com
 *   GOOGLE_CALENDAR_KEY  a Google Cloud API key restricted to the Calendar API
 *
 * Exec can add two optional lines to any event's description and they'll be
 * picked up automatically — no code change needed:
 *   RSVP: https://forms.gle/...
 *   Type: qLearn
 */

const API = 'https://www.googleapis.com/calendar/v3/calendars';

// How many upcoming events to return. The page shows all of them; the homepage
// can slice the first two off this same cached response later.
const MAX_EVENTS = 25;

module.exports = async function handler(request, response) {
  const calendarId = normaliseCalendarId(process.env.GOOGLE_CALENDAR_ID);
  const apiKey = (process.env.GOOGLE_CALENDAR_KEY || '').trim();

  if (!calendarId || !apiKey) {
    // Misconfiguration is our fault, not Google's — don't cache it.
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
      timeMin: new Date().toISOString(), // filters on END time, so events
      singleEvents: 'true', //             happening right now still appear
      orderBy: 'startTime', //             (requires singleEvents)
      maxResults: String(MAX_EVENTS),
    });

  let items;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      // Google puts the real reason in the body. Surface it in the logs —
      // a bare status code sends you hunting for the wrong problem.
      const detail = await res.text().catch(() => '');
      let reason = '';
      try {
        reason = JSON.parse(detail)?.error?.message || '';
      } catch (_) {
        reason = detail.slice(0, 200);
      }
      if (res.status === 404) {
        reason +=
          ' — a 404 here almost always means the calendar is not shared publicly' +
          ' (Settings and sharing > Access permissions > "Make available to public",' +
          ' with "See all event details"), or GOOGLE_CALENDAR_ID is wrong.' +
          ` Using calendar id: ${calendarId}`;
      }
      throw new Error(`Google responded ${res.status}. ${reason}`);
    }
    ({ items = [] } = await res.json());
  } catch (err) {
    console.error('[api/events] calendar fetch failed:', err.message);
    // Let the CDN keep serving the last good copy rather than caching a failure.
    response.setHeader('Cache-Control', 'no-store');
    // Still send the calendar ID: the "subscribe" buttons stay useful even
    // when we can't list the events.
    return response.status(502).json({
      events: [],
      calendarId,
      error: 'Could not reach Google Calendar.',
    });
  }

  const events = items
    .filter((e) => e.status !== 'cancelled' && e.start)
    .map(normalise);

  // Browsers recheck after 5 minutes. Vercel's CDN holds the response for an
  // hour and, for a day after that, serves the stale copy instantly while it
  // refreshes in the background. Net effect: Google sees ~24 requests a day
  // no matter how much traffic the site gets, and nobody waits on a refresh.
  response.setHeader('Cache-Control', 'public, max-age=300');
  response.setHeader(
    'Vercel-CDN-Cache-Control',
    'public, s-maxage=3600, stale-while-revalidate=86400'
  );

  return response.status(200).json({
    events,
    // Public info — the page uses it to build the "subscribe" links.
    calendarId,
    generatedAt: new Date().toISOString(),
  });
};

/**
 * Accept whatever form of the calendar ID someone pasted into the env var.
 *
 * The ID is easy to copy from the wrong place. Google shows it plainly under
 * Settings and sharing > Integrate calendar, but people often grab it out of
 * the embed URL instead, where the "@" is already percent-encoded as "%40".
 * Encoding that a second time gives "%2540", which Google reads as a calendar
 * that doesn't exist — a 404 that looks exactly like a permissions problem.
 * Rather than make the next exec debug that, we just accept every form:
 *
 *   abc@group.calendar.google.com                        (as documented)
 *   abc%40group.calendar.google.com                      (from an embed URL)
 *   https://calendar.google.com/calendar/embed?src=abc%40...   (whole URL)
 */
function normaliseCalendarId(value) {
  let id = (value || '').trim();
  if (!id) return '';

  // Someone pasted a whole calendar URL — pull the id back out of it.
  if (/^https?:\/\//i.test(id)) {
    const ical = id.match(/\/calendar\/ical\/([^/]+)\//i);
    if (ical) {
      id = ical[1]; // .../calendar/ical/<id>/public/basic.ics
    } else {
      try {
        id = new URL(id).searchParams.get('src') || id; // ...embed?src=<id>
      } catch (_) {
        /* fall through and treat it as a plain string */
      }
    }
  }

  // Undo percent-encoding, but only if it actually looks encoded — a literal
  // "%" in a real calendar id would otherwise throw.
  if (/%[0-9a-f]{2}/i.test(id)) {
    try {
      id = decodeURIComponent(id);
    } catch (_) {
      /* leave it alone if it isn't valid encoding */
    }
  }

  return id.trim();
}

/** Trim one Google event down to what the cards actually render. */
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

/**
 * Google descriptions may contain HTML. We render event text with textContent
 * on the page, but strip tags here anyway so the payload is plain text and
 * there is nothing dangerous to render in the first place.
 */
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

/** Pull `RSVP:` and `Type:` lines out of the description and return the rest. */
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
