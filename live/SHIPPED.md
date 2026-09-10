# SABLE HQ — shipped

Live production: **https://sable-hq.vercel.app**

Sable.co command surface. HQ navigates and commands Grok bots. It does not run agent runtimes in the page.

## Company

- Brand: Sable.co — leather shoes; brand-first; the shoe is the hero
- North star: more leads + paying customers
- Owner: Luan Lensley
- Timezone: Africa/Johannesburg
- Chain: Luan → CEO SABLE (JARVIS voice) → Marketing CEO or Sales Manager (peers)
- Escalate through CEO SABLE. Do not skip to Luan unless Luan asks.
- Cadence: desks collect ~17:00, rollup CEO ~17:15, Luan brief 17:30

## Rooms

Config: `src/lib/hq/rooms.json`

| id | name | layer | desk | open |
|---|---|---|---|---|
| ceo | CEO SABLE | ceo | command | Grok bot |
| marketing | Marketing CEO | director | marketing | Grok bot |
| ideas | Sable Ideas | worker | marketing | Grok bot |
| social | Sable Social | worker | marketing | Grok bot |
| ads | Sable Ads | worker | marketing | Grok bot (R0 until Reels + Meta BM) |
| inbox | Sable Inbox | worker | marketing | Grok bot |
| analytics | Sable Analytics | worker | marketing | Grok bot |
| edit | Sable Edit | worker | marketing | Grok bot |
| sales | Sales Manager | director | sales | Grok bot |
| sales-inbox | Sales Inbox | worker | sales | Grok bot |
| sales-chase | Sales Chase | worker | sales | Grok bot |
| crm | Sable CRM assistant | worker | sales | live CRM |
| research | Sable Research | worker | company | Grok bot |
| security | Sable Security | worker | company | Grok bot |
| shoe | Sable Shoe Machine | worker | company | Grok bot |
| tester | Sable app tester | worker | company | Grok bot |
| prompt | Prompt bot | worker | channel | Grok bot |
| floor | Sable Floor | worker | channel | Grok bot |

## Config schema

```json
{
  "docks": [{ "id": "string", "label": "string", "url": "https://..." }],
  "rooms": [{
    "id": "string",
    "slug": "string",
    "name": "string",
    "callsign": "string",
    "layer": "ceo | director | worker",
    "parentId": "string | null",
    "kind": "grok-bot | dock",
    "desk": "command | marketing | sales | company | channel",
    "function": "string",
    "openTarget": "https://...",
    "keywords": ["string"],
    "doneCheck": "string",
    "jobTemplate": "string",
    "layout": { "x": 0, "y": 0 }
  }]
}
```

Paste real Grok bot share URLs in HQ → deep links. Defaults open https://grok.com/.

## Docks (untouched live apps)

- CRM: https://sable-floor.vercel.app/login
- Shop / Enquire: https://sable-floor-web.vercel.app/want

## What is real

- Animated HQ shell (NETWORK / COMMS / HOLD TO SPEAK / nodes)
- Open bot = config deep-link (new tab). No iframe agent runtime.
- Copy GPT-6 job and JARVIS mission pack (who + one job + done-check) — client-side
- Profit checklist in localStorage: listedPrice faults, Team bank empty, Delivery R150
- Operator comms log (copy / open / pack). Not agent sitreps.

## What is optional / not live

- Grok API panel is labeled OPTIONAL / SEPARATE. Inert without `GROK_API_KEY`.
- Device speech is browser STT/TTS, not a hosted Grok voice runtime.
- HQ does not stream fake sitreps or host AI employees inside the page.
