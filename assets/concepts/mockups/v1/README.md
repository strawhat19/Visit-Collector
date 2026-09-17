# Visit Collector — UI concepts v1

Static visual concepts only. No application code, dependencies, tracking, authentication, deployment, haptics, or notifications were implemented. All analytics numbers are illustrative.

## Concept index

| File | Direction | Screens |
| --- | --- | --- |
| 01-pulse-overview.png | Pulse: a balanced overview with metric tiles and a dominant traffic chart | Light desktop + light mobile |
| 02-live-studio.png | Live Studio: visitors online and recent arrivals take priority | Dark desktop + dark mobile |
| 03-focus-tabs.png | Focus: one large analysis panel, with tabs for deeper questions | Light desktop + dark mobile |
| 04-sign-in-sign-up.png | Compact account entry | Light sign-in + dark sign-up |
| 05-filters-preferences.png | Short overlays keep tools close to the dashboard | Light filters + dark preferences |

Recommended starting point: **Pulse** for a familiar, simple dashboard. **Focus** is the quieter option and the easiest to keep comfortable on small screens. **Live Studio** is best when watching arrivals is the main activity.

## Brand

The selected source is [04-wide-interlock.png](../../logos/v7/04-wide-interlock.png); its [SVG counterpart](../../logos/v7/04-wide-interlock.svg) supplies the exact palette and geometry. Keep that source artwork canonical when the app is implemented. The concept images use it as an image-generation reference.

| Role | Color |
| --- | --- |
| Blue — primary action and visitor series | #2563EB |
| Green — live status and positive change | #159A63 |
| Red — secondary series or attention | #E44747 |
| Light background | #F8FAFC |
| Light text | #101318 |
| Dark background | #0B1018 |
| Dark card | #151D29 |
| Dark text | #F8FAFC |

Use neutral text for normal metrics. Do not communicate meaning through color alone: pair colors with labels, icons, values, and chart legends. A logo color is not automatically suitable for small text; verify contrast during implementation.

Refinements to carry into implementation: a falling bounce rate is an improvement and should use green (the background dashboard in board 05 shows a red decrease); compact phones should use two metrics at a time or a 2 x 2 grid rather than the four-across background in board 05. The small dot map in board 02 is decorative concept artwork, not accurate geolocation.

## One-view behavior

Desktop uses a fixed-height dashboard with finite card rows. Navigation swaps the central content rather than adding sections below it. Overview, Audience, Sources, and Activity/More cover the same information hierarchy; the concepts explore different emphasis.

Mobile is composed specifically for a phone. It is not a scaled desktop dashboard. Keep primary numbers, one main chart, a short summary, and fixed navigation visible. On compact phones show two KPIs at a time; move the other metrics behind a metric selector. Detail lists use finite pages inside an overlay, not an endless main feed.

Site selection, dates, sources, chart details, account, preferences, and alerts open a single modal or sheet at a time. Sign-in and sign-up share a compact tabbed form: a centered modal on desktop and a full-height overlay on phones.

No main-page scrolling is the default design target at standard text size. Small landscape viewports, large accessibility text, browser chrome, and the software keyboard need adaptive layout and a scrollable overlay fallback so controls never become unreachable. These raster mockups do not prove responsive fit.

### Working phone budgets

| Region | 390 x 844 | Compact 375 x 667 |
| --- | ---: | ---: |
| Header | 52 | 44 |
| Site/date controls | 40 | 40 |
| KPI block | 96 | 80 |
| Main chart | 230 | 164 |
| Secondary summary | 108 | 84 |
| Bottom navigation | 64 | 56 |
| Total spacing | 72 | 56 |
| Safe-area allowance | 81 | 78 |
| Total planned height | 843 | 602 |

These are design budgets in logical pixels, not measured rendered layouts. Compact mode leaves additional room for browser controls. Maintain 44–48px touch targets instead of reducing everything to fit.

## Proposed live behavior

- Animate the first chart reveal and interpolate incoming chart points over roughly 200–300ms.
- Update counters without shifting surrounding layout; preserve selection and date range.
- Use Live, Reconnecting, and Last Updated text states, rather than relying only on a colored dot.
- Respect reduced motion, replacing transitions with immediate updates.
- Give a subtle haptic for deliberate selection and successful actions on supported devices; never vibrate for every incoming visitor.
- Add notification preferences later, with explicit permission, traffic thresholds, enabled/denied states, and a sample alert. The preferences concept labels this feature Planned.
- Offer Light, Dark, and System appearance modes.

## Stack note for a later implementation

Expo + React Native + TypeScript can retain one shared application codebase for web, iOS, and Android. SCSS is supported partially for Expo web after adding Sass, but native global stylesheets are ignored; imports from within SCSS/SASS files are also currently unsupported. Native components still need React Native-compatible styling. Share design tokens and component behavior across platforms, with SCSS limited to web-specific surfaces if desired.

Primary references, checked September 17, 2026:
- [Expo Metro CSS and SASS](https://docs.expo.dev/versions/latest/config/metro/#sass)
- [React Native styles](https://reactnative.dev/docs/style)
- [Expo universal web development](https://docs.expo.dev/workflow/web/)
- [Expo Haptics](https://docs.expo.dev/versions/latest/sdk/haptics/)

## Generation

Generated with the built-in image_gen tool using the selected logo as reference. See [PROMPTS.md](PROMPTS.md) for the complete prompts. Only PNG concept boards and these notes belong to this round. No builds, tests, running-app UI checks, or deployments were requested or run.
