# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Prestamistas y operadores de cartera en Colombia (dueños de negocio y cobradores). Usan el panel en el escritorio de la oficina **y en el celular en la calle** al registrar pagos, consultar saldos y ver mora. Prioridad de uso: móvil en movimiento + web en oficina.

*(Inferido desde docs/ESTRUCTURA.md y conversación de producto; pendiente confirmar si hay rol “solo cobrador” con menos pantallas.)*

## Product Purpose

Cartera24/7 permite administrar préstamos **sin plazo fijo**: el capital vive hasta saldarse; el interés se calcula sobre el saldo; los pagos se aplican interés → mora (opcional) → capital. Éxito = registrar cobros correctos en segundos y ver “prestado / por cobrar / interés pendiente” sin ambigüedad.

## Positioning

Crédito informal/comercial colombiano (COP enteros) con fecha de corte por aniversario de desembolso, abono a capital cuando hay excedente, y mora **acordada** (no automática ciega).

## Operating Context

- Flujo diario: listar prestatarios → ver crédito → registrar pago → confirmar desglose.
- Ambiente: luz de día, pantalla chica, una mano; en escritorio con mouse.
- Terminología fija: Prestado, Por cobrar, Interés pendiente, Fecha de corte, Mora.

## Constraints

- Idioma UI: español.
- Moneda: COP enteros.
- No mostrar “plan de cuotas / periodos” como plazo fijo.
- Debe funcionar en viewport ~360px y desktop ≥1024px.
- Accesibilidad: contraste legible, targets táctiles ≥44px en móvil.

## Brand Commitments

- Nombre de producto: **Cartera24/7** (hero en login y shell).
- Sin claims comerciales inventados.

## Open Decisions

- Paleta exacta de marca corporativa del cliente (hoy se define sistema Operate en DESIGN.md).
- App Flutter nativa vs PWA: este trabajo cubre **web responsive** (móvil + desktop).
