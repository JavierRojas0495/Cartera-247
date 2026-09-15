# Design System — Cartera24/7 (web-tenant)

<!-- impeccable:design-schema 1 -->

## Mode

Operate (panel de trabajo: scanability, affordances familiares, touch-first).

## Thesis

La interfaz es una **libreta de campo digital**: cifras de dinero grandes, acciones a un pulgar, sin decoración de dashboard genérico. Se niega el sidebar-desktop-only y el azul-púrpura SaaS por defecto.

## Scene

Prestamista bajo luz de día, celular en la mano al cobrar. Fondo claro frío (no cream editorial). Acento verde dinero sobrio, no neón.

## Color (Restrained → Committed accent)

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#E8EEF2` | Fondo app |
| `--surface` | `#FFFFFF` | Paneles |
| `--ink` | `#12202C` | Texto |
| `--muted` | `#5A6B7A` | Secundario |
| `--line` | `#D0DBE4` | Bordes |
| `--brand` | `#0B4F3A` | Marca / nav activa |
| `--accent` | `#0F8A5F` | Primario / dinero OK |
| `--warn` | `#B45309` | Mora / pendiente |
| `--danger` | `#B42318` | Destructivo |
| `--info` | `#1D4E89` | Info |

## Typography

- UI: **Source Sans 3** (Google Fonts) — lectura densa en español, no Inter/DM/Plus Jakarta.
- Cifras de dinero: mismo face, `tabular-nums`, peso 700.
- Escala: 12 / 14 / 16 / 20 / 28 (rem fijos, no fluid display).

## Layout

- **Desktop ≥900px:** sidebar izquierda fija + main.
- **Móvil &lt;900px:** top bar + **bottom nav** (Dashboard, Prestatarios, Préstamos, Pagos, Más) + drawer para Mora/Informes/salir.
- Contenido: una columna en móvil; grids de stats 2×2.
- Tablas: scroll horizontal mínimo; en móvil se convierten a **filas-tarjeta** con `data-label`.

## Components

- Botones: radio 10px, altura min 44px en touch; primario = accent.
- Inputs: 16px font (anti-zoom iOS), borde `line`, focus ring brand.
- Badges: soft fill, no pills enormes.
- Cards: superficie blanca, borde sutil, sombra corta offset (no glow).
- Diálogos: centrados, full-width max 420px en móvil.

## Motion

- Drawer/nav: 200ms ease-out.
- Sin entradas de página orquestadas.

## Responsive rules

1. Touch targets ≥44×44.
2. Bottom nav fija; main con `padding-bottom` para no taparla.
3. Headers sticky con título + CTA primario.
4. Formularios apilan; `form-row` → 1 col &lt;768px.
5. Números de dinero siempre visibles (no truncar COP).

## Anti-patterns (este producto)

- Gradientes púrpura / glow / dark-neon.
- Cream + serif terracotta.
- Cards anidadas en el hero de login.
- Sidebar única sin alternativa móvil.
