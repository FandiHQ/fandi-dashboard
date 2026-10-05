# Mensaje para Claude Code (cópialo tal cual)

Vas a aplicar el nuevo sistema visual "Azul Bloque" de Fandi en la app del fan (móvil) y en el panel del artista (web, Next.js). En la carpeta `design-handoff/` tienes:
- `DESIGN_GUIDELINES.md`: las reglas. Léelo completo antes de tocar código.
- `design-tokens.css` y `design-tokens.json`: los tokens. Llévalos al sistema de estilos que ya usamos (Tailwind theme / CSS vars / theme de React Native) y no pongas valores a mano en los componentes.
- `Fandi Fan App.dc.html` y `Fandi Artist Dashboard.dc.html`: la referencia visual exacta. Ábrelos en el navegador; cada pantalla tiene `data-screen-label`. Son **referencia**, no código de producción: no copies su HTML ni sus estilos en línea. Reconstruye cada pantalla con nuestros componentes.

Orden de trabajo (haz un PR por paso y muéstrame capturas antes de seguir):
1. Tokens + fuentes (Archivo variable, Space Mono) + componentes base: Block, InkBlock, Button (lime/white/ghost), Pill, Chip, CategoryRow, BottomSheet, StatBlock, Tabs, Sidebar.
2. Móvil: Inicio (billetera arriba + en vivo + más en vivo), Billetera, Recargar (conversión COP↔F en vivo; sin métodos de pago, que se eligen en la pasarela).
3. Móvil: Oportunidad en vivo con sus 6 estados como una sola pantalla con máquina de estados; saldo insuficiente + hoja de recarga rápida con "Otro monto".
4. Móvil: Subasta, Evento, Perfil.
5. Web: Sala en vivo, Inicio, Evento (Resumen, Oportunidades con panel lateral para crear, Subastas, Insignias, Analítica), Login.

Reglas que no se negocian:
- `COP_PER_FANDI` es configurable; todo valor en pesos sale de ahí.
- "DESDE X F" por categoría y "+N F Y PASAS A X" vienen del backend en tiempo real. Nunca muestres al fan probabilidades, "1 de cada N" ni porcentajes de categoría.
- Nada de naranja, degradados, sombras difusas ni confeti. Solo el protagonista de cada pantalla va inclinado.
- Los textos van en español de Colombia y tal cual aparecen en las referencias.
- Si una pantalla no está diseñada (Impacto, Ganadores, Notificaciones, retorno de pago), constrúyela con los mismos componentes y márcala para que la revise.

Al final de cada paso compara tu pantalla contra la referencia (captura lado a lado) y lista cualquier diferencia que no hayas podido resolver.
