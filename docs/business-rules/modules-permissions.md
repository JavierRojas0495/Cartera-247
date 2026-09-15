# Catálogo de módulos y permisos

## Módulos del sistema

| Código | Nombre | Descripción | MVP |
|---|---|---|---|
| `CORE_CLIENTS` | Clientes | Gestión de prestatarios | Sí |
| `CORE_LOANS` | Préstamos | Creación y gestión de préstamos | Sí |
| `CORE_PAYMENTS` | Pagos | Registro manual de pagos | Sí |
| `REPORTS` | Informes | Reportes cartera, deuda, pagos | Fase 6 |
| `BORROWER_PORTAL` | Portal prestatario | Acceso móvil/web prestatario | Fase 5 |
| `COLLECTORS` | Cobradores | Asignación y rutas de cobro | Futuro |
| `NOTIFICATIONS` | Notificaciones | Push, SMS, email | Futuro |

## Permisos por rol (tenant)

| Permiso | owner | admin | operator | readonly |
|---|---|---|---|---|
| `borrower.create` | ✓ | ✓ | ✓ | |
| `borrower.read` | ✓ | ✓ | ✓ | ✓ |
| `borrower.update` | ✓ | ✓ | ✓ | |
| `borrower.delete` | ✓ | ✓ | | |
| `loan.create` | ✓ | ✓ | ✓ | |
| `loan.read` | ✓ | ✓ | ✓ | ✓ |
| `loan.update` | ✓ | ✓ | | |
| `payment.create` | ✓ | ✓ | ✓ | |
| `payment.read` | ✓ | ✓ | ✓ | ✓ |
| `payment.void` | ✓ | ✓ | | |
| `overdue.approve` | ✓ | ✓ | | |
| `overdue.waive` | ✓ | ✓ | | |
| `report.read` | ✓ | ✓ | ✓ | ✓ |
| `tenant.settings` | ✓ | ✓ | | |

## Permisos super admin (plataforma)

| Permiso | Descripción |
|---|---|
| `platform.tenant.create` | Crear prestamista |
| `platform.tenant.update` | Editar prestamista |
| `platform.tenant.deactivate` | Inactivar prestamista |
| `platform.module.activate` | Activar módulo en tenant |
| `platform.module.deactivate` | Desactivar módulo |
| `platform.support.impersonate` | Entrar a cuenta tenant |

## Funciones móvil por módulo

| Módulo activo | Pantallas prestamista | Pantallas prestatario |
|---|---|---|
| CORE_CLIENTS | Lista prestatarios | — |
| CORE_LOANS | Préstamos, detalle saldo | Saldo, cuotas |
| CORE_PAYMENTS | Registrar pagos | Pagos aceptados |
| BORROWER_PORTAL | — | Login, historial |
| REPORTS | Resumen cartera | — |
