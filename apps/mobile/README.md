# Flutter Mobile — Cartera24/7

App única con pantallas según rol (prestamista / prestatario).

## Requisitos

- Flutter 3.x
- Android Studio o VS Code con extensión Flutter

## Configuración

```bash
cd apps/mobile
flutter pub get
```

Para Android emulator, cambiar `apiBaseUrl` en `lib/core/constants/app_constants.dart`:
- Emulador Android: `http://10.0.2.2:3000/api/v1`
- Dispositivo físico: IP de tu PC en la red local

## Ejecutar

```bash
flutter run
```

## Credenciales demo

| Rol | Email | Contraseña |
|---|---|---|
| Prestamista | dueno@demo.com | Demo123! |
| Prestatario | prestatario@demo.com | Demo123! |

## Estructura

```
lib/
├── core/           # theme, router, network, constants
├── features/
│   ├── auth/       # login, providers
│   ├── lender/     # dashboard, borrowers, loans, payments, alerts
│   └── borrower/   # dashboard, payments, schedule
└── main.dart
```
