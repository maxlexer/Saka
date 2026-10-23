---
target: home page
total_score: 23
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 2
timestamp: 2026-10-22T16-49-20Z
slug: src-app-home-page-tsx
---
# Critique: home page (2026-10-22)
Method: dual-agent. Score 23/32 (heuristics 7 and 10 n/a), Good.

## Priority issues
- [P1] Hero bottle is the owner's blue Armani bottle: breaks the no-blue rule, dominates first impression. Owner decision. /impeccable colorize
- [P1] 17 of 20 shelf bottles are hatched placeholders. Give photo-coming a designed state, show only photographed scents on home and in finder results. /impeccable harden
- [P2] No line says what the shop sells (10/20/50ml). Use the brief subheadline under "On our shelves today". No prices. /impeccable clarify
- [P2] Finder tabs read as text links; about 110px dead space when empty. Segmented control, drop reserved height. /impeccable layout
- [P3] Lower half is flat with no closing moment. Linen or shop photo behind Visit, vary rhythm. /impeccable delight

## Detector
Static scan clean. Browser: hero-eyebrow-chip (accepted, owner asked), kicker-above-heading (real), buried-raster (false positive), gradient-text (untraced, check), overused-font and cream-palette (brand-mandated).

## Measured
Eyebrow contrast 5.2 to 5.8, h1 13 to 15.5. No overflow, no console errors. Small tap targets: nav links, finder tabs, Clear all, View products link, phone links.
