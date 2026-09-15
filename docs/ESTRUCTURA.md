# Estructura y funcionamiento — Cartera24/7

> **Fuente de verdad del producto.** Antes de implementar o cambiar comportamiento, lee este documento.
> Ruta canónica del repo de desarrollo: `E:\Desarrollo\cartera247`
>
> También: `PRODUCT.md` (quién usa y para qué) · `DESIGN.md` (sistema visual Operate / responsive) · `AGENTS.md`

Actualizado: 2026-09-13

---

## 1. Qué es el producto

SaaS multi-tenant para **prestamistas en Colombia** (COP enteros).

Modelo de crédito: **sin plazo fijo**. El préstamo vive mientras haya capital por cobrar. El prestatario paga intereses sobre el saldo y puede abonar a capital cuando quiera.

### Actores

| Actor | Qué hace | App |
|---|---|---|
| Prestamista (tenant) | Prestatarios, préstamos, pagos, mora, informes | `apps/web-tenant` (+ Flutter lender) |
| Prestatario | Consulta su deuda / pagos | Flutter borrower (portal web pendiente) |
| Super admin | Tenants, módulos, soporte | `apps/web-admin` |

### Demo (seed)

- Prestamista: `dueno@demo.com` / `Demo123!`
- Super admin: `admin@cartera247.com` / `Admin123!`

---

## 2. Mapa del monorepo

```
cartera247/
├── apps/
│   ├── api/            # NestJS + Prisma — única fuente de reglas de negocio
│   ├── web-tenant/     # Panel prestamista (React + Vite :5174)
│   ├── web-admin/      # Super admin (React + Vite :5173)
│   └── mobile/         # Flutter (lender + borrower)
├── packages/shared/    # Tipos compartidos (aún delgados)
├── docs/
│   ├── ESTRUCTURA.md   # ← ESTE ARCHIVO (funcionamiento)
│   ├── business-rules/ # Cálculos COP, permisos
│   ├── er-diagram/     # Modelo de datos
│   └── api-contracts.md
├── AGENTS.md           # Entrada rápida para el agente Cursor
└── .cursor/rules/      # Reglas persistentes del agente
```

### Stack real hoy

| Capa | Tecnología |
|---|---|
| API | NestJS 10, Prisma, JWT, Swagger, cron |
| DB en desarrollo | **SQLite** (`apps/api/prisma/dev.db`) — docs/docker hablan de Postgres |
| Web | React 18 + Vite |
| Móvil | Flutter 3 |

API: `http://localhost:3000/api/v1` · Swagger: `/api/docs`

---

## 3. Dominio (conceptos que el prestamista ve)

| Término UI | Significado | Campo / origen |
|---|---|---|
| **Prestado** | Dinero entregado al prestatario | `Loan.principalAmount` |
| **Por cobrar** | Capital que aún debe | `Loan.currentBalance` |
| **Tasa** | Interés del ciclo (ej. 3% = `0.03` por periodo de cobro) | `Loan.interestRate` |
| **Interés pendiente** | Interés de ciclo(s) abiertos aún no pagado | cuotas `pending/partial/overdue` |
| **Fecha de corte** | Mismo día del mes del desembolso | `startDate` + N periodos |
| **Días vs corte** | Atraso del pago respecto al corte (− gracia) | UI detalle crédito |
| **Mora cobrada** | Interés de mora que el prestamista decidió cobrar | `toLateFee` + `OverdueEvent.applied` |

### Entidades clave (Prisma)

- `Borrower` → identidad, contacto, trabajo, referencias, teléfonos
- `Loan` → préstamo activo / saldado
- `LoanTerm` → snapshot inmutable (tasa, frecuencia, reglas de mora)
- `LoanInstallment` → **ciclo de interés** interno (no es “cuota de plazo fijo”; no mostrar como plan de cuotas en UI)
- `Payment` + `PaymentAllocation` → pago y cómo se repartió
- `OverdueEvent` → mora detectada o cobrada
- `LoanProduct` + late rules → producto y `% diario`, gracia, recargo fijo

Archivo: `apps/api/prisma/schema.prisma`

---

## 4. Reglas de negocio (obligatorias)

### 4.1 Interés por ciclo de cobro

La **tasa** del préstamo aplica al **periodo de cobro** elegido (no se prorratea desde mensual):

```
interés_ciclo = Math.round(saldo_capital × tasa)
```

| Ejemplo | Frecuencia | Interés del ciclo ($1.000.000, tasa 3%) |
|---|---|---|
| 3% diario | Diario | $30.000 |
| 3% cada 15 días | Cada 15 días | $30.000 |
| 3% mensual | Mensual | $30.000 |

Método implementado: `interest_first_monthly` + `calculatePeriodInterest`. Otros enums (`fixed_installment`, `daily_accrual`) **no** están implementados.

Código: `apps/api/src/common/utils/money.util.ts`

### 4.2 Fecha de corte y ciclos

- Al crear el préstamo se elige frecuencia: **diario**, **cada 15 días**, **mensual** (o semanal).
- Corte = aniversario del desembolso según esa frecuencia (día +1 / +15 / +1 mes).
- El ciclo N+1 **solo aparece el día DESPUÉS** del corte N.
- Varios pagos el **mismo día** (antes o en el corte) **no** abren el periodo siguiente.
- Por eso **no** se muestra “periodos / plan de cuotas” en el detalle del crédito: no hay plazo fijo.

Código: `apps/api/src/common/utils/loan-cycle.util.ts`  
Scheduler: `apps/api/src/modules/loans/installment-scheduler.service.ts`

### 4.3 Orden de asignación de un pago

```
1. Interés pendiente (todos los ciclos ya vencidos / abiertos a la fecha)
2. Mora (solo si el prestamista marca cobrarla y hay días cobrables)
3. Capital (excedente)
```

**Capital baja solo si:**
- El crédito está al día o ya se cubrió el interés que aplica a esa fecha, **y**
- Sobró dinero después del interés (y de la mora si se cobró).

**Capital NO baja si:**
- El monto solo alcanza para meses de interés vencidos  
  (ej. 2 meses × $30.000 = $60.000 → todo a interés).

Código: `payments.service.ts` + `allocatePayment`.

### 4.4 Mora

Reglas del producto (demo seed):

- Tasa diaria: **0,1%** (`dailyRate = 0.001`) sobre interés pendiente
- Gracia: **3 días**
- Recargo fijo: **$5.000** (solo en el primer cobro del episodio)

Fórmula sugerida:

```
mora ≈ interés_pendiente × tasa_diaria × días_cobrables [+ fijo si es primer cobro]
```

Comportamiento acordado con el negocio:

1. Si hay días de atraso al pagar → **preguntar** si se cobra mora.
2. El prestamista pone el **valor** (sugerido o acordado con el cliente).
3. Si **ya se cobró** mora de esos días → **no volver a cobrarlos**, aunque aún falte interés de un mes o varios.
4. Solo se podrían cobrar **días nuevos** después de la última fecha en que se cobró mora.
5. En el detalle del crédito, “días vs corte” se mide contra la **fecha de corte del mes**, no contra cuotas internas antiguas.

Código: `chargeableLateDays`, `lastMoraSettledThrough`, UI pagos en `web-tenant`.

### 4.5 Prestatarios

- No se puede **desactivar** un prestatario con préstamos activos.
- Datos sensibles (cédula, nombre, dirección) con préstamos activos requieren confirmar contraseña.

### 4.6 Lenguaje de UI (préstamos)

| Evitar | Preferir |
|---|---|
| Monto / Saldo capital | **Prestado** / **Por cobrar** |
| Interés del periodo / Periodos de interés | **Interés pendiente** (y detalle de pagos) |
| Cuota #N como plan | Solo historial de pagos + mora cobrada |

---

## 5. Flujos principales

### Crear préstamo

1. Elegir prestatario + monto + tasa + frecuencia de cobro (diario / cada 15 días / mensual).
2. Desembolso → `principalAmount = currentBalance`.
3. Se crea `LoanTerm` + 1.er ciclo de interés (tasa × saldo del periodo) + evento desembolso.
   El producto del tenant se asigna en segundo plano solo para reglas de mora.

### Registrar pago

1. `GET /loans/:id/debt-summary?asOf=YYYY-MM-DD`
2. Vista previa: a interés / a mora / a capital.
3. Si `canChargeLateFee` → checkbox + valor.
4. `POST /payments` con `chargeLateFee` / `lateFeeAmount` opcionales.
5. Respuesta con desglose aplicado.

### Ver crédito

- Resumen: prestado, por cobrar, interés pendiente, pagado.
- Historial de pagos (aplicación + días vs corte).
- Sección mora: solo recargos **realmente cobrados** (`applied`).

### Mora (pantalla Overdue)

- Lista eventos, aprobar/condonar (flujo legacy del job diario).
- **Nota:** el cobro real al pagar usa el checkbox del pago; ambos flujos coexisten — no mezclarlos sin unificar.

---

## 6. API — módulos que importan

Prefijo: `/api/v1`

| Módulo | Responsabilidad |
|---|---|
| `auth` | Login, refresh, verify-password |
| `borrowers` | CRUD prestatarios + datos extendidos |
| `loan-products` | Productos y reglas de mora |
| `loans` | CRUD préstamos, `debt-summary` |
| `payments` | Registrar / anular pagos |
| `overdue` | Eventos mora job + approve/waive |
| `reports` | Cartera, deuda, clientes |
| `tenants` | Solo platform admin |

Archivos de verdad:

- `apps/api/src/modules/payments/payments.service.ts`
- `apps/api/src/modules/loans/loans.service.ts`
- `apps/api/src/common/utils/loan-cycle.util.ts`
- `apps/api/src/common/utils/money.util.ts`

---

## 7. UI web-tenant — archivos

| Área | Archivo |
|---|---|
| Rutas / páginas | `apps/web-tenant/src/App.tsx` |
| Detalle préstamo | `LoanDetailView.tsx` |
| Detalle prestatario | `BorrowerDetailView.tsx` |
| Formulario prestatario | `BorrowerFormPanel.tsx` |
| Diálogos | `app-dialog.tsx` |
| API client + formatters | `api.ts` |
| Estilos | `styles.css` |

---

## 8. Gaps conocidos (no “arreglar” sin pedirlo)

1. Schema Prisma en **SQLite** vs docs/docker en **Postgres**.
2. Dos vías de mora (job approve vs cobro al pagar) aún no unificadas.
3. `voidPayment` incompleto (no revierte bien cuotas / múltiples allocations).
4. RBAC seedeado pero no enforceado en todos los endpoints.
5. `api-contracts.md` desactualizado respecto a `debt-summary` y mora al pagar.
6. Zona horaria documentada `America/Bogota`; código usa fecha local del servidor.

---

## 9. Cómo debe trabajar el agente

1. Leer **este archivo** y `AGENTS.md` al inicio de tareas de negocio.
2. Preferir cambiar reglas en **API** (`utils` + services); la UI solo refleja.
3. Mantener COP en **enteros** y redondeo con `roundCop` / `Math.round`.
4. No reintroducir “plan de cuotas / periodos” en UI de detalle.
5. No cobrarmora de días ya saldados.
6. Actualizar este documento si cambia una regla de negocio.
7. Trabajar en `F:\Desarrollo\cartera247` como ruta de desarrollo.
