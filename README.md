# Visit Collector

A compact analytics dashboard built from one Expo 57, React Native, and TypeScript codebase for web, iOS, and Android. The Live Studio layout includes Map/Globe views, saved location markers, animated charts, unique-visit details, local accounts, and light/dark/system themes. Desktop uses an animated expandable sidebar with navigation labels; mobile switches panels with tabs. The main dashboard fits the available viewport on desktop and portrait phones. Dialogs and very short landscape screens use contained scrolling so controls remain reachable.

## AI Coding Instructions

Start with [AGENTS.md](AGENTS.md), the single place to maintain coding style, working agreements, architecture, design, and validation rules. Open **Visit-Collector** itself as the project/workspace root.

| Assistant | Project instruction entry point |
| --- | --- |
| Codex | [AGENTS.md](AGENTS.md), discovered as repository instructions ([official guide](https://learn.chatgpt.com/docs/agent-configuration/agents-md)) |
| Cursor Agent | [AGENTS.md](AGENTS.md), supported directly ([official guide](https://cursor.com/docs/rules)) |
| Claude Code | [CLAUDE.md](CLAUDE.md) imports `AGENTS.md` ([official guide](https://code.claude.com/docs/en/memory#agentsmd)) |
| Gemini CLI | [GEMINI.md](GEMINI.md) imports `AGENTS.md` ([official guide](https://geminicli.com/docs/cli/gemini-md/)) |
| GitHub Copilot | [.github/copilot-instructions.md](.github/copilot-instructions.md) directs supported agents to the shared file ([official guide](https://code.visualstudio.com/docs/agent-customization/custom-instructions)) |

For other assistants, attach or explicitly ask them to read `AGENTS.md`. Automatic loading depends on the tool, mode, workspace, and instruction settings; these files cannot force every AI or inline completion tool to use them. After changing rules, start a fresh session or reload the tool's project context and ask it to identify the instructions it loaded. Keep shared rules in `AGENTS.md` so the reference files do not drift.

## Run Locally

Use Node.js 24, matching `.nvmrc`, then install the locked dependencies:

```sh
npm ci
npm run web
```

To start Expo's LAN development server for a phone or simulator:

```sh
npm start
```

`npm run android` and `npm run ios` ask Expo to open the corresponding development target. Android emulators need the Android SDK; the iOS simulator requires macOS and Xcode. Use a compatible Expo client or configured development build on physical devices. Native rendering, signing, and device behavior still need actual iOS/Android verification.

## Piratechs API

Start the API in a separate terminal from the Expo app:

```sh
npm run api:dev
```

Then open or reload the app running with `npm run web`. In local web development it automatically syncs saved visit sessions to port **3001** on the same host (loopback uses `127.0.0.1`). The API cannot read browser localStorage directly; the app sends an allowlisted snapshot after loading or saving visits. Failed requests retry without interrupting local collection.

| Method | Route | Response |
| --- | --- | --- |
| GET | `/api/Piratechs/` | API name and visits route |
| GET | `/api/Piratechs/visits` | JSON array of collected visit sessions, newest first |
| POST | `/api/Piratechs/visits` | Sync `{ sourceId, visits }`; return the combined visits array |

Open [the local visits API](http://127.0.0.1:3001/api/Piratechs/visits) after opening the app. It returns `[]` until the first sync. Both routes accept a trailing slash. Visits contain `id`, `pages`, `active`, `activeMs`, `lastSeen`, `startedAt`, `source`, `device`, `browser`, `countryCode`, `operatingSystem`, and nullable `ipAddress`. New visits also include optional `entryPath`, `lastPath`, and `metadata`. Paths omit query strings and fragments. Timestamps are Unix milliseconds. IP addresses remain `null` unless already collected; the API does not invent or look them up. Demo data, account credentials, email addresses, and visitor account IDs are excluded.

Visit metadata uses free browser and platform APIs, with optional `client`, `locale`, `display`, `preferences`, `connection`, `hardware`, `page`, `performance`, and `capabilities` groups plus a `capturedAt` timestamp. Availability varies by browser and platform; unsupported values are omitted. Collection does not silently request permissions or call an external data-enrichment service. Both the client and API normalize an allowlist of bounded metadata fields; arbitrary extra properties are discarded, and metadata is limited to 5 KiB per visit. Existing visits without metadata remain valid.

Metadata includes reported browser/OS versions, language(s), time zone, UTC offset, screen and viewport sizes, pixel ratio, appearance/accessibility preferences, connectivity estimates, reported CPU/memory, entry/referrer paths, six UTM campaign fields, navigation/paint timings, transfer sizes, and supported browser features. Page attribution is retained from the session's first capture; other snapshots refresh with activity. Hardware values may be approximate or unavailable ([MDN device memory](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory)). Native builds capture the built-in platform, locale, appearance and display values; web-only fields remain absent.

**Settings → Clear Local Data** resets this device's visits, accounts, locations and preferences, then records a fresh current visit. The API source identifier remains stable so the next successful sync replaces this device's previous snapshot. **Clear Visit History** clears only visits and page events.

Data persists in `.local/visits.json`, which is excluded from Git. Each app installation gets a local source UUID; a sync replaces that source's retained visits, including an empty array when history is cleared. Other sources remain intact. The API keeps up to 500 visits per source and 100 sources, with a 4 MiB request-body limit. Web Locks serialize syncs from same-origin tabs where supported, and each send rereads the latest saved sessions. Browsers without Web Locks use last-arriving snapshot semantics. The dashboard continues to show device-local data.

The API binds to `127.0.0.1:3001` by default. Set `API_PORT` to choose another port, and `API_HOST=0.0.0.0` only when you want it reachable on your LAN. Native apps require `EXPO_PUBLIC_API_BASE_URL`, for example `http://192.168.1.20:3001/api/Piratechs`, using your computer's actual LAN address. Put the Expo variable in `.env.local` and reload Expo after changing it. The same override works for web. Localhost web origins are allowed; for a LAN-hosted web app, set the API process's `API_ALLOWED_ORIGINS` to its exact origin, such as `http://192.168.1.20:8085` (comma-separated for several origins). No authentication service is included in this local API.

The route files use [Vercel's TypeScript function handlers](https://vercel.com/docs/functions/runtimes/node-js#create-a-nodejs-function-in-api), and the SPA rewrite excludes `/api`. Local JSON is for local development; on Vercel, the visits endpoint explicitly returns **503** until its storage adapter is replaced with a shared persistent database. It does not pretend temporary function storage is a database.

## Data And Accounts

**This Device** records this browser or app's sessions, page views, foreground visit duration, referrer source, device type, browser, and operating system. Dashboard navigation records page events. Local analytics refresh while the app is active; browser tabs on the same origin synchronize through local storage. Session history is capped at 500 entries and activity history at 1,000 events.

Web persists data in `localStorage`; native uses AsyncStorage. The local Piratechs API receives visit-session snapshots from connected app instances and exposes them as one array. The dashboard still reads this device's storage; it does not yet display the API's combined data. An external-site tracking snippet, shared cloud database, and production account service are not implemented.

**Add Your Location** accepts a name and latitude/longitude, or fills the coordinates after you choose **Use Current Location** and grant foreground location permission. Browser location requires a secure context such as HTTPS or localhost. Manual entry works without permission; the app does not use IP geolocation or background location tracking. Saving adds a persistent marker, assigns it to the current local visit, and remembers the location for future visits under that local account or guest identity. Visits without an assigned location appear as **Unknown Location**. Up to 100 locations can be saved on the device. Saving a location while viewing Demo Data switches to This Device.

**Unique Views** counts distinct visitor/page pairs in retained activity, so repeat views of the same page by the same known visitor count once. **Users Signed Up** counts accounts saved on this device. A second row of stat cards shows **Active Visitors**, **Total Visits** (retained sessions), and **Saved Locations**. Older imported records with no recoverable visitor identity are not counted as unique page views.

**Unique Visits** shows the latest recorded visit for each known visitor, with Status, Source, Page, IP Address, Location, and Time columns. Times use the viewer's local date and time zone. On narrow screens, Network and Traffic tabs split the columns; selecting a row opens all its details. Local visits show **Not Collected** for IP addresses unless an address is already supplied in stored data. The app makes no external IP lookup; demo rows use reserved example IP addresses.

The charts form a **2 × 2 grid**. The first card switches between **Visits** and **Users**; **Browsers**, **Operating Systems**, and **Devices** each have a separate card. Visits and Users show session starts and account signups in 12 five-minute buckets; their totals cover those visible buckets. Saved accounts without a creation timestamp remain in the Users Signed Up stat without an invented signup time. Category charts group retained sessions and paginate when space is limited. Compact layouts provide Geography, Charts, and Stats tabs, keeping all four charts together and all six stats in two rows. A Unique Visits shortcut opens the full table when a preview will not fit.

**Demo Data** displays an explicitly simulated stream that updates about every four seconds while the app is active. Demo locations and activity are illustrative and are not saved into local visit history. Switch modes from the header or Preferences.

Sign-up/sign-in accounts also stay on the current device. Passwords use randomly salted PBKDF2-SHA256 verifiers with 600,000 iterations; plaintext passwords are not stored. Device storage can be edited, so local sign-in is a prototype convenience, not a production authentication or authorization boundary. Production accounts and multi-visitor analytics require a backend. Clearing visit history preserves accounts, preferences, and saved locations.

## Styling And Interaction

Shared screens use React Native `StyleSheet` styles and the tokens in `src/ui/theme.ts`. Browser-specific styling and smooth state transitions use SCSS in `src/styles/web.scss`, imported only through `platform.web.ts`; native platforms use `platform.ts`. SCSS does not style native views.

Authored interface elements expose descriptive classes and IDs through `src/ui/elementProps.ts`. Repeated rows include their item identity and reusable components use a React instance ID. The web adapter retains these classes alongside React Native Web's generated style classes, so inspector names can be shared directly when requesting changes. Native views receive the corresponding IDs.

The compact footer shows the local weekday, month, date, year, and clock time, updated every second, with a blue clock icon. The current copyright year sits beside a [Piratechs](https://piratechs.com/) link. Expanding the sidebar smoothly reveals **Visit Collector** beside the VC mark and hides the header name; the collapsed and mobile layouts keep the header name.

Selection haptics use `expo-haptics` where supported and can be disabled in Preferences. Reduced-motion settings suppress chart, globe, dialog, and sidebar animation. Push notifications are labeled **Planned**; notification permission requests, push-token registration, and a delivery service are not implemented.

Globe is the default view and includes a lightweight, deterministic starfield. Map and globe markers are red with visible expanding pulse rings; pausing globe rotation leaves the marker pulses running. Saving a location smoothly focuses its marker, then resumes globe rotation, including when rotation was previously paused. Map mode pans and zooms to the saved marker. Selecting another location or switching Globe/Map reframes the selection; routine live metric updates do not restart the focus animation. Drag, zoom, reset, and pause controls remain available. Reduced motion uses static red halos, moves directly to the location, and disables automatic rotation; rendering pauses while the app is in the background.

The canonical logo remains `assets/concepts/logos/v7/04-wide-interlock.png`, with its matching SVG source preserved. App, Android adaptive, and browser-tab icons in `assets/icons/` contain only the colored VC on transparent canvases. These tightly framed, brighter derivatives are designed for small sizes; their editable SVG sources and export details are in [assets/icons/README.md](assets/icons/README.md). Earlier design boards remain in `assets/concepts/mockups/`.

## Builds And Deployment

```sh
npm run build
```

This exports the Expo web app to `dist`. `vercel.json` specifies `npm ci`, that build command, the output directory, and single-page routing. Import this directory as a Vercel project to deploy it; deployment configuration is present, but no deployment has been performed.

`eas.json` defines development, preview, and production build profiles. For example:

```sh
npx eas-cli login
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform ios --profile production
```

EAS requires an Expo account/project connection and platform signing setup. iOS distribution needs Apple credentials and provisioning; Android distribution needs a signing keystore. Store submission and physical-device validation remain separate steps. The development-client profile additionally needs the Expo development-client setup before use.

## Checks

```sh
npm test
npm run typecheck
npm run build
```

These commands are available for manual review. Under the current `AGENTS.md`, coding agents leave verification, tests, and builds to the user. They cover state tests, TypeScript checking, and web export respectively; they do not establish native-device compatibility or successful deployment.

## Earth Imagery

The bundled 4096 × 2048 daytime, nighttime, and packed-detail textures are satellite-derived illustrations, not live imagery or weather. They are credited to Solar System Scope / INOVE under CC BY 4.0, based on NASA imagery and processed by Three.js contributors. Rendering shaders derive from GeoCorp under its MIT license. Keep the attribution and license details in [assets/earth/SOURCES.md](assets/earth/SOURCES.md) with redistributed assets; it links the original creators, textures, and Three.js example.
