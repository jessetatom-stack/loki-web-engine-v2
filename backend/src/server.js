const express = require('express')
const cors = require('cors')

const app = express()
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }))
app.use(express.json())

const PORT = process.env.PORT || 10000
const APP_VERSION = process.env.APP_VERSION || '1.4.0'
const API_BASE = 'https://www.thesportsdb.com/api/v1/json/123'

const SPORT_MAP = {
  NBA: { sport: 'Basketball', league: 'NBA' },
  WNBA: { sport: 'Basketball', league: 'WNBA' },
  NFL: { sport: 'American Football', league: 'NFL' },
  MLB: { sport: 'Baseball', league: 'MLB' },
  NHL: { sport: 'Ice Hockey', league: 'NHL' },
  SOCCER: { sport: 'Soccer', league: '' },
  TENNIS: { sport: 'Tennis', league: '' },
  GOLF: { sport: 'Golf', league: '' }
}

function today(offsetDays = 0) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

function qs(params) {
  const out = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v) out.set(k, v)
  })
  return out.toString()
}

function normalizeEvent(event, sportKey) {
  const away = event.strAwayTeam || event.strPlayer || event.strEventAlternate || 'Away'
  const home = event.strHomeTeam || event.strOpponent || event.strVenue || 'Home'

  const awayScore =
    event.intAwayScore ??
    event.intAwayScoreFT ??
    event.intAwaySets ??
    event.intPlayerScore ??
    '-'

  const homeScore =
    event.intHomeScore ??
    event.intHomeScoreFT ??
    event.intHomeSets ??
    event.intOpponentScore ??
    '-'

  let status = event.strStatus || event.strProgress || 'Scheduled'
  if (!status || status === 'null') {
    if (event.strTime) status = `Starts ${event.strTime}`
    else status = 'Scheduled'
  }

  return {
    id: String(event.idEvent || event.id || `${sportKey}-${away}-${home}`),
    sport: sportKey,
    away,
    home,
    awayScore: String(awayScore),
    homeScore: String(homeScore),
    status,
    startTime: [event.dateEvent, event.strTime].filter(Boolean).join(' · '),
    venue: event.strVenue || '',
    league: event.strLeague || sportKey,
    thumb: event.strThumb || '',
    poster: event.strPoster || '',
    banner: event.strBanner || '',
    note: event.strDescriptionEN || ''
  }
}

async function fetchDay(sportKey, offsetDays = 0) {
  const map = SPORT_MAP[sportKey] || SPORT_MAP.NBA
  const url = `${API_BASE}/eventsday.php?${qs({
    d: today(offsetDays),
    s: map.sport,
    l: map.league
  })}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`TheSportsDB failed: ${res.status}`)
  const data = await res.json()
  return Array.isArray(data.events) ? data.events.map(e => normalizeEvent(e, sportKey)) : []
}

async function fetchSportFeed(sportKey) {
  try {
    const todayEvents = await fetchDay(sportKey, 0)
    if (todayEvents.length) return todayEvents
  } catch (err) {
    // continue to fallback date
  }

  try {
    const tomorrowEvents = await fetchDay(sportKey, 1)
    if (tomorrowEvents.length) return tomorrowEvents
  } catch (err) {
    // continue
  }

  return []
}

app.get('/', (_req, res) => {
  res.send('Loki Max API is running')
})

app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: APP_VERSION,
    source: 'TheSportsDB free API'
  })
})

app.get('/api/v1/scores', async (req, res) => {
  try {
    const sport = String(req.query.sport || process.env.DEFAULT_SPORT || 'NBA').toUpperCase()
    const games = await fetchSportFeed(sport)
    res.json({
      sport,
      source: 'TheSportsDB',
      games
    })
  } catch (err) {
    res.status(500).json({
      error: 'Failed to load real sports data',
      detail: err.message
    })
  }
})

app.listen(PORT, () => {
  console.log(`Loki Max real-data backend listening on ${PORT}`)
})
