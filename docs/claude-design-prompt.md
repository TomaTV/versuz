# Prompt Claude Design — Versuz brand kit + logo animations

Copy-paste l'intégralité du bloc ci-dessous dans claude.ai (Sonnet 4.5+ recommandé pour les artifacts complexes). Claude génère un artifact React unique qui contient toutes les variantes du logo, les patterns brand, les animations CSS prêtes à exporter, et un mode "export" pour télécharger les assets.

---

```
I'm building Versuz — a public benchmark and marketplace for AI agent skills (https://versuz.dev). I need a complete brand kit artifact with logo variants and animations, in a single React artifact I can interact with and export from.

Brand identity :
- Tagline : "Skills go in. Only one wins."
- Aesthetic : flat 2026 editorial design — think Linear meets Stripe Press meets early Notion. NO gradient, NO shadow, NO 3D, NO skeuomorphism, NO glassmorphism, NO neumorphism. Square corners only. Generous whitespace. Confidence over decoration.

Color palette (strict, do not deviate) :
- bone-cream  #FAF8F3 (background, base)
- ember       #C2410C (accent, primary action, brand color)
- azure       #1E40AF (secondary accent, official badge)
- sage        #84A98C (success, owned items)
- amber       #D97706 (warning, boosted items)
- crimson     #B91C1C (danger, copyleft license)
- ink         #0A0908 (text, foreground)
- fg-muted    #6B6B6B (secondary text)
- rule        #E8E4DC (border, divider)

Typography :
- Display : Instrument Serif (serif, italic available on letters like 's' and 'z')
- Mono    : IBM Plex Mono (uppercase eyebrow text, small caps, 10-12px)
- Sans    : Inter (body text, 14-16px)

Logo concept :
- The "mark" : 2 stylized ember-colored flat flame shapes side by side, square-cornered, simple geometry. Reads as a single unit but you can see 2 distinct flames. Aspect ratio roughly 1:1.
- The "wordmark" : "verSuz" typed in Instrument Serif, with the 's' rendered in italic (the rest upright). Followed by a small ember-colored square dot (18×18px scaled to context). Letter-spacing tight (-0.02em).
- "Full lockup" : mark + wordmark horizontal, with the mark sized to match the cap-height of the wordmark.

What I need in the artifact :

1. LOGO VARIANTS section :
   - Mark only (ember on bone-cream)
   - Mark only (ember on ink — dark mode)
   - Mark only (monochrome ink on bone-cream)
   - Mark only (monochrome bone-cream on ink)
   - Wordmark only (ink on bone-cream, with ember dot)
   - Wordmark only (bone-cream on ink, with ember dot)
   - Full lockup horizontal (mark + wordmark, ember + ink on bone-cream)
   - Full lockup vertical (mark above wordmark, for square contexts)
   - Each variant at 3 sizes : 24px (favicon), 72px (header), 200px (hero)
   - Click any variant to copy its SVG markup to clipboard

2. LOGO ANIMATIONS section :
   - "Reveal" : the 2 flames scale in (0.3s ease-out, slight stagger 0.1s between them), then the wordmark types letter-by-letter (0.4s total), then the dot pulses once (scale 1 → 1.3 → 1, opacity 1 → 0.7 → 1, over 0.4s). Total ~1.5s.
   - "Heartbeat" : the dot pulses subtly every 2s (scale 1 → 1.15 → 1, ember opacity 1 → 0.85 → 1), with the mark and wordmark static. Loop forever. Good for loading states.
   - "Hover ember" : on hover over the lockup, the mark's left flame fades and the right flame brightens (ember 100% → 70%, 70% → 100%), creating a subtle "lit candle" effect. Reverses on mouseleave.
   - "Glitch" (optional) : the wordmark briefly desaturates and shifts 1px crimson on the 's', 1px azure on the 'z', then snaps back. Use once on initial page load, not loop. Conveys "adversarial" theme.
   - Each animation : a play button, a "copy CSS" button, and a "copy keyframes" button.

3. BRAND PATTERNS section (decorative):
   - "Ember dot grid" : a tileable 60×60px pattern with bone-cream background and small 4×4px ember squares at random positions, 5-7 dots per tile, monospaced grid not too regular. Looks like dim embers in a fire.
   - "Square mosaic" : tessellation of 24×24px squares in alternating ember (10%), azure (5%), sage (5%), bone-cream (80%). Asymmetric, sparse. Use as Twitter banner background, OG image accent.
   - "Vertical rule pattern" : 1px wide ember vertical rules spaced 64px apart on bone-cream, with occasional 2px rules every 4th column. For section dividers, hero decorations.
   - Each pattern : preview at 600×400, "copy CSS background" button.

4. SOCIAL FORMATS section :
   - Instagram square 1080×1080 : full lockup centered, "skills go in. only one wins." in Instrument Serif italic below, bone-cream background, ember accent corner.
   - Instagram portrait 1080×1350 : full lockup top, big tagline center, "versuz.dev · npx versuz" mono bottom.
   - TikTok / Reels 1080×1920 : mark centered vertical, wordmark below, sized for safe area (avoid bottom 240px for captions).
   - LinkedIn 1200×627 : mark left third, copy "Public benchmark for AI agent skills · 100k+ ranked · versuz.dev" right two-thirds in Instrument Serif.
   - Twitter banner 1500×500 : wordmark centered horizontal, square mosaic pattern subtle in background.
   - OG image 1200×630 : full lockup top-left, "Skills go in. Only one wins." Instrument Serif italic center, "versuz.dev" mono bottom-right.
   - Each : "download SVG" + "download PNG @ 2x" buttons (use canvas-to-image for PNG).

5. UI MICRO-INTERACTIONS section :
   - Button hover : ember background, bone-cream text, "inset 0 -2px 0 rgba(0,0,0,0.18)" pseudo-press effect on click (no shadow, just darker inset).
   - Link hover : underline appears (border-bottom 1px ember), no color change.
   - Card hover : border color transition rule → ember (0.18s ease), no transform, no shadow.
   - Pill / chip hover : background bone-cream → "color-mix(in oklab, ember 8%, bone-cream)", border same.
   - Each : live demo + copy CSS.

6. EXPORT panel (top-right or bottom of artifact) :
   - "Download all SVGs as ZIP" button (use JSZip via CDN)
   - "Copy color palette as CSS variables"
   - "Copy color palette as Tailwind config"
   - "Copy color palette as JSON tokens"

Technical constraints :
- Single React artifact, no external dependencies beyond React itself and Tailwind (use Tailwind v3 via CDN if needed in artifact env)
- All SVGs inline in the artifact, hand-written paths, viewBox normalized to 0 0 100 100 where possible
- All animations pure CSS keyframes, no Framer Motion
- Use Instrument Serif and IBM Plex Mono via Google Fonts <link> in head if artifact allows it, else fallback to serif/monospace generic
- Keep the artifact under ~600 lines if possible by reusing the same Logo component with prop-based variants
- The artifact should work as a standalone HTML file when exported

Output :
1. The full React artifact code, ready to use.
2. After the artifact, a short summary of the design decisions made (especially for the flame mark — describe the path geometry you chose so I can reproduce it elsewhere).
```

---

## Quand tu reçois l'artifact Claude

1. **Download le HTML** depuis l'artifact (bouton en haut à droite)
2. Ouvre dans Chrome localement — l'artifact est interactif
3. **Click sur "Reveal animation"** → copy CSS keyframes
4. **Click sur chaque variante de logo** → copy SVG
5. **Download all SVGs as ZIP** → tu as ton press kit complet
6. Pour les **formats sociaux PNG**, l'artifact a des boutons download par format (canvas-to-image)

Le tout en 10-15 min depuis 1 prompt. T'as plus à ouvrir Figma pour la majorité.

## Si tu veux Figma quand même

Une fois l'artifact reçu, tu peux importer les SVG dans Figma pour ajustements :
- File → Import → drag-and-drop tes `.svg`
- Chaque variant devient un component Figma
- Tu peux ensuite faire des compositions plus complexes (carousel Insta avec 10 slides custom, etc.)

Mais pour les formats sociaux pré-définis (les 5 listés dans la section 4 du prompt), l'artifact suffit.

---

## Astuce pour itérer

Si la 1ère sortie de Claude n'est pas top sur le mark (les 2 flammes peuvent rendre bizarres), reply :

```
The 2-flame mark looks too literal / too cartoon. Make it more abstract — think
Russian Constructivism or Bauhaus geometry. 2 simple shapes that suggest fire
but read as a symbol, not an illustration. The viewer should think "oh, that's
a logo" before "oh, that's flames".
```

Ou pour un style plus "tech" :

```
Replace the flames with something more minimalist : two stacked rectangles with
the top one slightly offset to the right (like a stylized "vs" or a chevron).
Keep it ember. Square corners, flat fill, no curves.
```

Tu peux itérer 3-4 fois dans la même conversation Claude — il garde le context.
