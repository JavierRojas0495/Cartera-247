# Contratos API — Cartera24/7

Base URL: `http://localhost:3000/api/v1`

Autenticación: `Authorization: Bearer <accessToken>`

---

## Auth

### POST /auth/login
```json
// Request
{ "email": "dueno@demo.com", "password": "Demo123!" }

// Response 200
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "dueno@demo.com",
    "firstName": "Carlos",
    "lastName": "Prestamista",
    "role": "owner",
    "tenantId": "demo-tenant-id",
    "isPlatformAdmin": false,
    "modules": ["CORE_CLIENTS", "CORE_LOANS", "CORE_PAYMENTS"],
    "permissions": ["borrower.create", "loan.create", ...],
    "tenants": [{ "id": "...", "name": "Prestamista Demo", "role": "owner" }]
  }
}
```

### POST /auth/refresh
```json
{ "refreshToken": "eyJ..." }
// Response: { "accessToken": "eyJ..." }
```

---

## Health

### GET /health (público)
```json
{ "status": "ok", "service": "cartera247-api", "timestamp": "..." }
```

---

## Tenants (super admin)

| Método | Ruta | Descripción |
|---|---|---|
| GET | /tenants | Listar prestamistas |
| GET | /tenants/:id | Detalle tenant |
| POST | /tenants | Crear tenant + dueño |
| PATCH | /tenants/:id | Actualizar tenant |
| POST | /tenants/:id/modules | Activar módulo |
| POST | /tenants/:id/modules/:code/deactivate | Desactivar módulo |
| POST | /tenants/:id/support-session | Iniciar sesión soporte |

---

## Borrowers (prestamista)

| Método | Ruta | Descripción |
|---|---|---|
| GET | /borrowers | Listar prestatarios |
| GET | /borrowers/:id | Detalle prestatario |
| POST | /borrowers | Crear prestatario |
| PATCH | /borrowers/:id | Actualizar prestatario |
| GET | /borrowers/field-definitions | Campos custom |
| POST | /borrowers/field-definitions | Crear campo custom |

---

## Loan Products

| Método | Ruta | Descripción |
|---|---|---|
| GET | /loan-products | Listar productos |
| POST | /loan-products | Crear producto |
| PATCH | /loan-products/:id | Actualizar producto |

---

## Loans

| Método | Ruta | Descripción |
|---|---|---|
| GET | /loans | Listar préstamos |
| GET | /loans/:id | Detalle con cuotas y pagos |
| POST | /loans | Crear préstamo |

---

## Payments

| Método | Ruta | Descripción |
|---|---|---|
| GET | /payments | Listar pagos |
| GET | /payments/loan/:loanId | Pagos por préstamo |
| GET | /payments/borrower/:borrowerId | Pagos prestatario (aceptados) |
| POST | /payments | Registrar pago |
| POST | /payments/:id/void | Anular pago |

### POST /payments
```json
{
  "loanId": "uuid",
  "amount": 150000,
  "paymentDate": "2025-02-15",
  "method": "cash",
  "notes": "Pago en efectivo"
}
```

---

## Overdue

| Método | Ruta | Descripción |
|---|---|---|
| GET | /overdue | Eventos de mora |
| GET | /overdue/alerts | Alertas no leídas |
| POST | /overdue/:id/approve | Aprobar cobro mora |
| POST | /overdue/:id/waive | Condonar mora |

---

## Reports

| Método | Ruta | Descripción |
|---|---|---|
| GET | /reports/portfolio | Resumen cartera |
| GET | /reports/payments?from=&to= | Pagos por periodo |
| GET | /reports/debt | Reporte de deuda |
| GET | /reports/clients | Reporte de clientes |

---

## Audit

| Método | Ruta | Descripción |
|---|---|---|
| GET | /audit?limit=50 | Logs de auditoría |

---

## Modules

| Método | Ruta | Descripción |
|---|---|---|
| GET | /modules | Catálogo de módulos |

---

Swagger completo: `http://localhost:3000/api/docs`
