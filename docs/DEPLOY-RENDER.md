# Deploy en Render (demo gratuita)

Sube **API + panel prestamista** con el Blueprint `render.yaml`.
La BD sigue siendo **SQLite** (como en local). En el plan free el disco es efímero: si el servicio se duerme o se redespliega, los datos pueden volver al seed.

## Pasos en Render

1. Entra a [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
2. Conecta el repo `JavierRojas0495/Cartera-247` (rama `develop` o la que uses).
3. Render lee `render.yaml` y crea:
   - `cartera247-api` (Web Service)
   - `cartera247-web-tenant` (Static Site)
4. Espera el primer deploy (puede tardar varios minutos).
5. Abre la URL del static site e inicia sesión:
   - `dueno@demo.com` / `Demo123!`

## URLs

| Servicio | Uso |
|---|---|
| `cartera247-web-tenant` | Panel prestamista (lo usas en el navegador) |
| `cartera247-api` | API + Swagger en `/api/docs` |

`VITE_API_URL` se rellena solo desde la URL del API.

## Limitaciones del plan free

- El API **se duerme** sin tráfico (~15 min). La primera visita después puede tardar 30–60 s.
- SQLite **no es persistente** de verdad en free: tras sleep/redeploy puede regenerarse el seed.
- No es producción; solo para **probar / mostrar** la app.

## Local sin cambios

Sigue igual:

```bash
npm run dev:api
npm run dev:web-tenant
```

`VITE_API_URL` no hace falta en local (usa `http://localhost:3000`).

## Super admin (opcional)

Para `web-admin`, crea otro Static Site a mano con:

- Build: `npm install --include=dev && npm run build --workspace=@cartera247/web-admin`
- Publish: `apps/web-admin/dist`
- Env build: `VITE_API_URL` = URL del API
