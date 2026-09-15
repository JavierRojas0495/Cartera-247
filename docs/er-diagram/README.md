# Diagrama Entidad-Relación — Cartera24/7

## Vista general

```mermaid
erDiagram
    PlatformAdmin ||--o{ TenantSupportSession : inicia
    Tenant ||--o{ TenantModule : activa
    Module ||--o{ TenantModule : usado_en
    Tenant ||--o{ TenantMembership : tiene
    User ||--o{ TenantMembership : pertenece
    User ||--o| PlatformAdmin : puede_ser
    User ||--o| BorrowerAccount : puede_ser
    Tenant ||--o{ Borrower : tiene
    Borrower ||--o| BorrowerAccount : vincula
    Tenant ||--o{ BorrowerFieldDefinition : define
    Borrower ||--o{ BorrowerFieldValue : tiene
    Tenant ||--o{ LoanProduct : define
    LoanProduct ||--o{ LoanProductLateFeeRule : tiene
    Borrower ||--o{ Loan : recibe
    LoanProduct ||--o{ Loan : usa
    Loan ||--|| LoanTerm : congela
    Loan ||--o{ LoanInstallment : genera
    Loan ||--o{ LoanBalanceEvent : registra
    Loan ||--o{ Payment : recibe
    Payment ||--o{ PaymentAllocation : desglosa
    LoanInstallment ||--o{ OverdueEvent : puede_tener
    OverdueEvent ||--o| LateFeeDecision : decide
    Tenant ||--o{ Alert : genera
    Tenant ||--o{ AuditLog : registra
    Tenant ||--o{ Notification : envia
    Tenant ||--o{ CollectorAssignment : reserva
    Borrower ||--o{ CollectorAssignment : asignado
```

## Capas del modelo

### 1. Plataforma
- `PlatformAdmin` — administradores globales de Cartera24/7
- `Tenant` — prestamista (organización)
- `Module` — catálogo de módulos activables
- `TenantModule` — módulos activos por tenant
- `TenantSupportSession` — impersonación/soporte con auditoría

### 2. Identidad y permisos
- `User` — credenciales globales
- `TenantMembership` — usuario ↔ tenant + rol
- `Permission` / `RolePermission` — RBAC
- `BorrowerAccount` — login de prestatario

### 3. Prestatarios
- `Borrower` — datos base + `customData` JSONB
- `BorrowerFieldDefinition` — campos custom por tenant
- `BorrowerFieldValue` — valores por prestatario

### 4. Crédito
- `LoanProduct` — plantilla de producto
- `LoanProductLateFeeRule` — reglas de mora
- `Loan` — préstamo activo
- `LoanTerm` — snapshot inmutable de condiciones
- `LoanInstallment` — cuotas/obligaciones
- `LoanBalanceEvent` — ledger de saldo

### 5. Pagos
- `Payment` — registro de pago manual
- `PaymentAllocation` — desglose interés / mora / capital
- `PaymentReceipt` — comprobantes adjuntos

### 6. Mora y alertas
- `OverdueEvent` — cuota vencida con interés calculado
- `LateFeeDecision` — aprobación/condonación
- `Alert` — alertas internas

### 7. Transversal
- `AuditLog` — auditoría completa
- `Notification` / `NotificationTemplate` / `NotificationPreference`
- `CollectorAssignment` — reservado para fase futura

## Índices recomendados

```sql
-- Multi-tenant en todas las tablas operativas
CREATE INDEX idx_borrowers_tenant ON borrowers(tenant_id, status);
CREATE INDEX idx_loans_tenant ON loans(tenant_id, status);
CREATE INDEX idx_payments_tenant_date ON payments(tenant_id, payment_date);
CREATE INDEX idx_installments_due ON loan_installments(loan_id, due_date, status);
CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id, created_at);
```

## Aislamiento multi-tenant

Estrategia: **shared database, shared schema** con `tenant_id` + Row Level Security (RLS) en PostgreSQL.
