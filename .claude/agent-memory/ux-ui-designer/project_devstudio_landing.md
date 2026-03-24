---
name: DevStudio AI Landing Page
description: Design tokens, section structure, and UX patterns for the DevStudio AI landing page (index.html)
type: project
---

Landing page for an AI-powered Italian web agency. Single HTML file deployed on Vercel.

**Stack:** Vanilla HTML/CSS/JS, Three.js for 3D robot, no framework.

**Design tokens:**
- Accent: #6d5cff (purple), #00e5ff (cyan), #00e676 (green)
- Backgrounds: #050505 (primary), #0a0a0a (elevated), #0d0d0d (card)
- Text: #f4f4f5 (primary), #a1a1aa (secondary), #71717a (muted)
- Fonts: Space Grotesk (headings), Inter (body), JetBrains Mono (mono/labels)
- Radius: 12px (default), 20px (large)

**Section order:**
Preloader → Navbar → Hero (video bg + 3D text canvas) → Trust bar → Tech logos (2 rows desktop / marquee mobile) → 3D robot (340x550px canvas) → Services (3 cards) → Robot video fullscreen (85vh) → Process (4 steps) → Pricing (3 tiers: €497/€997/€1997) → Why Us (3 feature cards) → CTA box → Footer with PWA install

**Key UX notes:**
- All CTAs link to WhatsApp (wa.me/393285515590) with pre-filled messages
- Secondary CTA links to mailto with pre-filled subject
- No actual client testimonials — "Why Us" replaces testimonials
- Portfolio section defined in CSS but not present in current HTML
- Floating 3D shapes are draggable and react to mouse rotation
- Robot video section unmutes on scroll into view
- Price counter animates on scroll into pricing section
- Hamburger menu fully functional on mobile (nav links hidden, only logo + hamburger shown)
- The hero has a 55vh spacer div pushing copy to bottom of viewport — 3D text canvas fills top half
- Hero h1 is positioned off-screen (left:-9999px) for SEO only; visible text is the 3D canvas

**Known design issues (audit 2026-03-23):**
- Heavy inline styles throughout HTML (process steps, why us cards, robot video section)
- Trust bar icons too small (18px) relative to the viewport
- Hero "Clicca per cambiare colore" label has low visual weight/discoverability
- Section headings left-aligned by default but some sections override to center — inconsistency
- Process step-number (3.5rem) and icon both compete for attention as visual anchors
- Pricing: pricing-per (.pricing-per color is --text-ghost #3f3f46) — very low contrast
- Robot 3D canvas z-index:50 may cause stacking issues on some browsers
- Social links in footer all href="#" — not wired up

**Why:** Full code audit 2026-03-23. Page is live and conversion-oriented.
**How to apply:** Use these tokens as ground truth for any future design suggestions on this project.
