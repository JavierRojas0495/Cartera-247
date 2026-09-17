# Cartera24/7

Plataforma SaaS multi-tenant para prestamistas en Colombia.

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Node.js 24 + NestJS + Prisma |
| Base de datos | PostgreSQL 16+ |
| Web admin | React + Vite |
| Web prestamista | React + Vite |
| Móvil | Flutter (app única por rol) |

## Estructura

```
cartera247/
├── apps/
│   ├── api/           # NestJS API REST
│   ├── web-admin/     # Panel super admin
│   ├── web-tenant/    # Panel prestamista
│   └── mobile/        # Flutter
├── packages/
│   └── shared/        # Tipos y contratos compartidos
├── docs/
│   ├── ESTRUCTURA.md  # Funcionamiento y reglas (fuente de verdad)
│   ├── er-diagram/
│   └── business-rules/
├── AGENTS.md          # Guía para agentes Cursor
└── .cursor/rules/     # Reglas persistentes del agente
```

> **Desarrollo:** trabajar en `E:\Desarrollo\cartera247`.  
> Antes de cambiar lógica de negocio, leer [`docs/ESTRUCTURA.md`](docs/ESTRUCTURA.md).

## Inicio rápido

### Requisitos

- Node.js 24
- PostgreSQL 16+
- Flutter 3.x (para móvil)

### Backend

```bash
cp apps/api/.env.example apps/api/.env
# Editar DATABASE_URL y JWT_SECRET

npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev:api
```

API: http://localhost:3000  
Swagger: http://localhost:3000/api/docs

### Web

```bash
npm run dev:web-admin    # http://localhost:5173
npm run dev:web-tenant   # http://localhost:5174
```

### Móvil

```bash
cd apps/mobile
flutter pub get
flutter run
```

## Credenciales demo (seed)

| Rol | Email | Contraseña |
|---|---|---|
| Super admin | admin@cartera247.com | Admin123! |
| Prestamista | dueno@demo.com | Demo123! |
| Prestatario | prestatario@demo.com | Demo123! |
