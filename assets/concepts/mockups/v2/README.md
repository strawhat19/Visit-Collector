# Visit Collector — Live Studio v2

Refinement of the selected [Live Studio v1](../v1/02-live-studio.png). Static image concepts only; no application code was changed.

## Images

- **01-live-studio-map.png** — desktop with the Map tab selected
- **02-live-studio-globe.png** — the same desktop with Globe selected
- **03-live-studio-mobile.png** — mobile Map, Globe, and Traffic views

## Changes

- Narrower desktop icon rail; matching outline panel expand/collapse and settings controls replace the bottom avatar, user name, and plan.
- Site dropdown replaced with **Welcome Alex (Visitor #1024)**. Alex and #1024 are sample identity values.
- Removed the Live overview heading, explanatory subheading, and Last 30 minutes selector; the cards begin immediately below the header.
- Map/Globe tabs replace Visitors online, the large 24 count, and Across 3 countries.
- Larger geography visualization with the country list directly beneath it.
- Preserved arrivals bars, summary metrics, recent activity, top utility controls, dark theme, and selected logo.
- Reduced decoration through compact spacing, smaller corner radii, simpler surfaces, consistent outline navigation icons, and full-frame app views rather than device marketing renders.
- The top avatar uses initials instead of an artificial portrait.

## Mobile

Geography and Traffic tabs swap the main panel in place. Geography contains Map/Globe tabs, the location visualization, and country rows. Traffic contains the arrivals chart, metrics, and recent activity. The fixed bottom navigation includes Settings.

This preserves the larger geographic view without stacking the entire desktop dashboard vertically. No main-page scrolling is the target at standard text size; keyboard and accessibility layouts will still need appropriate overflow handling in the eventual app. Raster mockups do not establish responsive behavior.

## Brand and data

The canonical logo remains [v7/04-wide-interlock.png](../../logos/v7/04-wide-interlock.png). Blue #2563EB, green #159A63, and red #E44747 are retained with near-black and charcoal surfaces.

All visitor counts, identity text, activity records, and location markers are illustrative. Maps are conceptual raster artwork rather than validated geographic data. Globe interaction, chart animation, live data, navigation, and settings are proposed behavior, not functional in these PNGs.

## Generation

Created with the built-in image_gen tool using the selected v1 concept and logo as references. The Globe screenshot derives from the v2 Map image to preserve the layout. Complete prompts are in [PROMPTS.md](PROMPTS.md).

The existing v1 files are retained. No builds, tests, app runtime checks, or deployment were needed for this design-only refinement.

