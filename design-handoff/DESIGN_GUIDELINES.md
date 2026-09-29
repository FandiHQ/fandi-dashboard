# FANDI · DESIGN GUIDELINES "AZUL BLOQUE" (v3)
Source of truth for **mobile (fan app, iOS/Android)** and **web (artist dashboard)**.
Visual references: `Fandi Fan App.dc.html` and `Fandi Artist Dashboard.dc.html`. Open them in a browser. Every screen has a `data-screen-label`.
Tokens: `design-tokens.css` / `design-tokens.json`. Assets: `assets/`.

---

## 0. Product in one paragraph
Fandi is used **live** during concerts and football matches in Colombia. Fans load an in-app credit called **Fandis (F)** and spend it on three live dynamics:
- **Oportunidades:** a short window. Contributors are grouped into 4 categories, and each category draws its own winners.
- **Subastas:** highest bid wins, with anti-sniping extension.
- **Impacto:** donation dynamic.

Artists and their teams create and run these dynamics from the web dashboard.

**Core promise:** a fan in the lowest category always has a real chance. The UI must never imply "the highest spender wins" (except in Subastas, where that is the rule).

## 1. Principles
1. **Blue is the world.** Main surfaces use a flat #2D00F7. No gradients, glows or blurred shadows.
2. **Hard extrusion.** Key blocks get a 2px ink border and a solid offset shadow with no blur, like the logo's 3D edge.
3. **One tilt per screen.** Only the protagonist (live count, balance, result) is rotated −1.5°. Frozen or disabled states never tilt.
4. **Lime means live or your action.** Use it for live status, the primary CTA and the active nav item. Never decorate with it.
5. **Two block types on blue:** white blocks carry information, ink blocks carry lists, sheets and live cards.
6. **Easy for anyone.** One primary action per screen. Touch targets ≥ 48px on mobile. Plain verbs: Aportar, Recargar, Pujar, Entrar. The CTA always contains the amount ("APORTAR 60 F", "PAGAR $ 40.000").
7. **Banned:** orange, gradients, confetti, illustrations, emoji, spinners-as-theatre.

## 2. Tokens (summary; full list in `design-tokens.css`)
| Token | Value | Use |
|---|---|---|
| `--fandi-blue` | #2D00F7 | Screen background; accent numbers on white |
| `--ink` | #0B0B0F | Borders, extrusion, dark blocks, sheets, nav |
| `--white` | #FFFFFF | Info blocks, text on blue/ink |
| `--lime` | #C6FF3D | Live, primary CTA, active nav |
| `--lilac-text` | #D9D3FF | Secondary text on blue |
| `--muted-on-white` | #55555E | Secondary text on white |
| `--muted-on-ink` | #9A9AA8 | Secondary text on ink |
| `--chip-ink` | #1A1A22 | Chips/inputs inside ink sheets |
| `--line-on-white` | #EAEAF0 | Dividers on white |
| `--alert` | #FF4FA3 | Errors, "te superaron", "te faltan", destructive (Cerrar ahora) |
| `--alert-on-white` | #D6006F | Error text on white |

**Category colours** have equal visual weight on purpose, so no category looks "better":
- VIP #B7A8FF
- ALTA #5CE1FF
- MEDIA #C6FF3D
- BASE #FFFFFF (on white surfaces it gets a 2px ink outline)

**Type**
- **Archivo** (variable, Google Fonts) for display and UI. Headlines are weight 900, `font-stretch:112–115%`, UPPERCASE, line-height .9–.95.
- **Space Mono** for data and labels: UPPERCASE, letter-spacing .1–.2em.
- Mobile scale: hero number 58–66 · H1 27–34 · card title 18–23 · body 13–15 · label 9–11.
- Web scale: hero number 124 (Sala en vivo) · H1 44–48 · stat 36–42 · body 14–17 · label 10–12.
- Numbers use the es-CO format: `1.578 F`, `$ 40.000`. Currency is `$ ` + space.

**Shape**
- Radius: blocks 16 (web 16–18) · rows/chips 10–12 · buttons 12–14 · sheet top 22–26 · pills 999.
- Extrusion: large blocks `6px 6px 0 ink` (web 5–8) · buttons/chips `3–4px` · primary CTA inside an ink sheet `4px 4px 0 blue`. A live card on blue uses a **lime** extrusion.
- Pressed state: `translate(3px,3px)` and the shadow goes to 0.
- Spacing: 4-pt grid. Screen padding 20 (mobile) / 36 (web). Block gaps 10–18.
- Motion: live dot pulse 1.6s (final 30 s: 0.6s); count ticks up with no jumpy animations. Respect reduce-motion by disabling the pulse and keeping the numbers.

## 3. Mobile components
- **Status/top bar:** a white 38px back button (border + 3px extrusion) · event name in Space Mono (lilac) · balance chip (white, "1.578 **F**" with the F in blue). Tapping the chip opens Recargar.
- **Wallet block (Home, top):** white, 6px extrusion. "TUS FANDIS", a 58px number, the helper "Te alcanza para N aportes de X F", and a lime "+ RECARGAR" button.
- **Live pill:** lime with an ink border, a pulsing ink dot and "EN VIVO". Scheduled uses a white outline pill. Closed uses an ink pill with a square dot.
- **Live card (Home/Evento):** ink block with a lime extrusion: event · title · live count · "ENTRAR →". Below the first live card, other live dynamics appear as compact ink rows (dot · name · countdown · ›), max 2, then "VER LAS N EN VIVO".
- **Hero count:** a white block tilted −1.5°: "FANS PARTICIPANDO" + a blue 58–66px number + a ticker "+12 EN LOS ÚLTIMOS 10 S".
- **User line (quiet, never a hero):** `TU APORTE 60 F · ALTA · +60 F Y PASAS A VIP` in 10px mono. The upgrade hint is lime.
- **Category row:** ink card with a 6px coloured bar on the left. It shows the name, "N GANADORES · DESDE X F" and "N FANS".
  - The active category has a 2px white border, a 4px ink extrusion and an outlined tag "ESTÁS AQUÍ" in the category colour. No bright fill.
- **Action sheet (ink):** 4 chips (20 · 60 · 200 · OTRO; the selected chip has a lime border and text), a full-width lime CTA with the amount, and a helper "TE QUEDAN X F".
- **Quick-recharge sheet (white, modal):** see §5.
- **Bottom nav (ink):** INICIO · DESCUBRE · BILLETERA · PERFIL. The active tab is lime.
- **Badge tile:** 3:4 artwork, 2px ink border, 3px extrusion. Locked slots are dashed "POR DESBLOQUEAR".

## 4. Live Opportunity: state machine (same skeleton in every state)
| State | Pill | Hero | Categories | Sheet |
|---|---|---|---|---|
| **Programada** | white outline "PROGRAMADA" + "ABRE EN" | dashed outline, "—", "EL CONTEO EMPIEZA A LAS HH:MM", no tilt | winners only, 60% opacity | "Avísame cuando abra" toggle + disabled APORTAR |
| **En vivo** | lime "EN VIVO" + "CIERRA EN" | white tilted, blue number, ticker | "DESDE X F" live, active marked | chips + "APORTAR N F" |
| **Últimos 30 s** | lime "ÚLTIMOS SEGUNDOS", fast pulse, countdown in lime | **inverted**: ink block, lime number, lime extrusion, progress bar | same | CTA "APORTAR N F ANTES DEL CIERRE" |
| **Cerrada** | ink "CERRADA" | white, **no tilt**, "CONTEO FINAL", ink number | "N GANADORES · LISTO / SORTEANDO / EN COLA" | "SELECCIONANDO GANADORES" + short copy, no spinner |
| **No seleccionado** | white outline "RESULTADO PUBLICADO" | the badge block (tilted) is the hero | — | "SIGUIENTE OPORTUNIDAD · HH:MM" + "VER LOS N GANADORES" |
| **Seleccionado** | lime "RESULTADO PUBLICADO" | white tilted, lime extrusion, "SALISTE ELEGIDO" in blue | — | "CÓMO LLEGAR AL PUNTO" + calendar |

**"DESDE X F"** is the current entry threshold per category. It is computed server-side and pushed live, because it moves as others contribute. It is always a *current* value, never a promise. BASE shows the opportunity minimum. The upgrade hint in the user line is the difference to the next category.

**Subasta:** the hero is "PUJA MÁS ALTA" with the price. The status row is "VAS GANANDO" (lime dot) or "TE SUPERARON" (alert dot). The rule line is "SI ALGUIEN PUJA EN EL ÚLTIMO MINUTO, SE SUMAN 2 MINUTOS". The sheet has a stepper (min increment) and "PUJAR N F · SOLO SE DESCUENTA SI GANAS".

## 5. Money: recharge & insufficient balance
- **Rate** is one config value, `COP_PER_FANDI` (currently 5.000). Every COP figure is derived from it.
- **Recargar screen:**
  - A white tilted amount block with a PESOS/FANDIS toggle and a live conversion ("$ 50.000 = 10 F").
  - Packs of $20.000 · $50.000 · $100.000 · $200.000.
  - An ink "CON ESTA RECARGA" summary: new balance · how many entries to BASE · "Vencimiento: Nunca".
  - The CTA "PAGAR $ X" goes to the payment gateway.
  - **We don't show payment methods.** The gateway screen handles Nequi, PSE and Tarjeta. The note reads "EN EL SIGUIENTE PASO ELIGES NEQUI, PSE O TARJETA".
  - The minimum is $20.000; below it the CTA is disabled with "EL MÍNIMO ES $ 20.000".
- **Insufficient balance** (Oportunidad, Subasta or Impacto):
  1. The sheet shows "Te faltan N F · tienes X F" (alert dot) and the CTA becomes "RECARGAR Y APORTAR N F" (or "…Y PUJAR").
  2. It opens a **white modal sheet over the live screen**. The countdown stays visible (ink pill, lime digits).
  3. Options: **the exact shortfall** (preselected, "LO JUSTO"), two larger options showing the leftover, and **"Otro monto"**, a free input with live F conversion and validation (≥ shortfall and ≥ minimum).
  4. The CTA is "PAGAR $ X Y APORTAR N F", then the gateway opens. On success the contribution or bid executes automatically and returns to the live screen.
  5. The footer says: "SI CIERRA ANTES DE PAGAR, LOS FANDIS QUEDAN EN TU SALDO."
- Upgrade suggestions are allowed only as the factual "+N F Y PASAS A X" in the user line, and the "DESDE X F" per category.

## 6. Copy rules (Spanish, Colombia)
- Tone: direct, warm, short. Use "tú". Sentence case in body text, UPPERCASE in labels and titles.
- **Allowed:** "Te alcanza para N aportes de X F" · "Con 20 F ya participas" · "Cada categoría sortea sus propios ganadores" · "DESDE X F" · "+N F Y PASAS A VIP" · "Los Fandis no vencen" · "Solo se descuenta si ganas".
- **Forbidden on the fan side:** odds or "1 de cada N" · "competirías con N personas" · "aumenta tus probabilidades" · percentage rules for categories · the word "barato" · loss language ("perdiste").
- The not-selected result is dignified: "Esta vez no salió tu nombre" + the badge + a permanent record.
- The term is **Categorías** (never "Escuadras"). Everything is in Spanish, including dates ("SÁBADO, 26 DE SEPTIEMBRE DE 2026").

## 7. Web (artist dashboard)
- **Layout:** 84px ink sidebar (logo tile, icon nav; the active item is a lime 50px tile; "En vivo" has a lime dot) + a blue canvas. Top bar: workspace switcher (white extruded chip "J Balvin ▾") and user + role (role in lilac, never orange). Content max padding 36px.
- **Section tabs:** an ink segmented bar; the active tab is white with ink text, inactive tabs are #9A9AA8. Tabs: RESUMEN · OPORTUNIDADES · SUBASTAS · INSIGNIAS · GANADORES · ANALÍTICA · NOTIFICACIONES.
- **Stat block:** white, 5px extrusion. Mono label, 36–42px number, sub-line (COP equivalent or context).
- **Tables:** inside a white block. 11px row padding, `--line-on-white` dividers. Status pills: HOY (lime), PROGRAMADO (white + ink border), BORRADOR (white + grey border), FINALIZADO (grey).
- **Create/edit:** always a **right side panel** (520px, white, 3px ink left border, `-10px 0 0 ink` extrusion) over a 45% ink scrim. Never a separate page. The footer has "VISTA DEL FAN" + a lime save CTA.
  - Winners per category use steppers.
  - The category rules (TOP 5% etc.) are shown only here, labelled "EL FAN NUNCA VE ESTOS PORCENTAJES".
- **Sala en vivo** (control room during the show):
  - A full-width ink top bar: live pill, event, Reloj Fandi, "PROYECTAR EN PANTALLA", Salir.
  - The left column shows, in order:
    - Title and a big lime countdown with a progress bar.
    - The tilted white live-count hero.
    - Recaudado (F + COP).
    - The 4 category blocks (the artist *can* see "1 DE CADA N").
    - Controls: +1 MINUTO · PAUSAR · VER COMO FAN, and **CERRAR AHORA** as an alert outline that needs confirmation.
  - Right column: EN COLA (next dynamics with "Abrir ahora"), the live auction mini card, and an aggregated ACTIVIDAD feed with no individual amounts.
- **Event timeline:** one timeline with two tracks ("Ingreso con boleta" grey, "Dinámicas Fandi" blue), not two separate clocks.
- **Charts:** flat fills, ink hairlines. Aportes use blue, Subastas lilac, categories their category colours. No pink or red slices.
- **Web breakpoints:** designed at 1440. At ≥1280, keep it as is. At 1024–1279, the Sala en vivo right column moves under the main column and the stat grids go from 4 to 2 columns. Below 1024, show "Usa el panel en una pantalla más grande", except Sala en vivo, which must work on a tablet.

## 8. Accessibility
- Text contrast ≥ 4.5:1. White on blue ≈ 8.6 ✓. Lime on blue ✓. Lime on ink ✓. **Never lime text on white.**
- Touch ≥ 48px on mobile; web hit areas ≥ 36px.
- Support Dynamic Type up to +2 steps: category rows grow in height, and titles wrap to at most 3 lines.
- Live values need `aria-live="polite"`, throttled to one announcement per 10 s.
- State is never communicated by colour alone: every pill has a word.

## 9. Screen inventory (by `data-screen-label`)
**Fan:**
- Inicio · Evento · Billetera · Perfil · Subasta
- Oportunidad A · Antes · Oportunidad · En vivo · Oportunidad B · Urgencia · Oportunidad C · Cerrada · Oportunidad D · No seleccionado · Oportunidad E · Seleccionado
- Recargar · Saldo insuficiente · Recarga rápida

**Web:**
- 01 Login · 02 Inicio · 03 Sala en vivo · 04 Evento resumen · 05 Oportunidades (with create panel) · 06 Subastas · 07 Insignias · 08 Analitica

**Not designed yet (build with the same components):**
- Impacto (fan + web)
- Ganadores, Notificaciones and Equipo tabs
- Onboarding / login for fans
- Payment return screens (success / failed / pending)
