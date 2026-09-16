# AGENTS.md — Cartera24/7

Guía de entrada para agentes de Cursor.

## Antes de tocar código

1. Lee `docs/ESTRUCTURA.md` (funcionamiento y reglas de negocio).
2. Si el cambio es de interés/pagos/mora, confirma también:
   - `docs/business-rules/calculo-cop.md`
   - `apps/api/src/common/utils/money.util.ts`
   - `apps/api/src/common/utils/loan-cycle.util.ts`

## Ruta de desarrollo

```
F:\Desarrollo\cartera247
```

## Comandos útiles

```bash
npm install
npm run db:generate
npm run db:seed
npm run dev:api          # :3000
npm run dev:web-tenant   # :5174
```

Demo en Render (API + front gratis): `docs/DEPLOY-RENDER.md`.

Demo prestamista: `dueno@demo.com` / `Demo123!`

## Reglas cortas

- Préstamo **sin plazo fijo**; interés sobre **saldo**.
- Pago: **interés → mora (opcional) → capital**.
- No abrir el mes siguiente solo porque se pagó el interés el mismo día de corte.
- Mora: preguntar, valor editable; **no repetir** días ya cobrados.
- UI préstamos: **Prestado** / **Por cobrar** (no “Monto/Saldo capital”).
- No mostrar “periodos de interés” como plan de cuotas.

## Dónde implementar

| Cambio | Dónde |
|---|---|
| Cálculo / reglas | `apps/api` |
| Pantallas prestamista | `apps/web-tenant` |
| Super admin | `apps/web-admin` |
| Móvil | `apps/mobile` |
| Documentar regla nueva | `docs/ESTRUCTURA.md` |
