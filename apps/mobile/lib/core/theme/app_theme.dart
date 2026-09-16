import 'package:flutter/material.dart';

/// Alineado con DESIGN.md web-tenant: papel frío + verde marca.
class AppTheme {
  static const Color bg = Color(0xFFE8EEF2);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color ink = Color(0xFF12202C);
  static const Color muted = Color(0xFF5A6B7A);
  static const Color line = Color(0xFFD0DBE4);
  static const Color brand = Color(0xFF0B4F3A);
  static const Color accent = Color(0xFF0F8A5F);
  static const Color warn = Color(0xFFB45309);
  static const Color danger = Color(0xFFB42318);
  static const Color info = Color(0xFF1D4E89);

  static ThemeData get light => ThemeData(
        colorScheme: ColorScheme.light(
          primary: accent,
          onPrimary: Colors.white,
          secondary: brand,
          onSecondary: Colors.white,
          surface: surface,
          onSurface: ink,
          error: danger,
          onError: Colors.white,
        ),
        scaffoldBackgroundColor: bg,
        useMaterial3: true,
        appBarTheme: const AppBarTheme(
          centerTitle: false,
          elevation: 0,
          backgroundColor: surface,
          foregroundColor: ink,
          surfaceTintColor: Colors.transparent,
        ),
        cardTheme: CardTheme(
          elevation: 0,
          color: surface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: line),
          ),
        ),
        textTheme: const TextTheme(
          titleLarge: TextStyle(color: ink, fontWeight: FontWeight.w700),
          titleMedium: TextStyle(color: ink, fontWeight: FontWeight.w700),
          bodyMedium: TextStyle(color: ink),
          bodySmall: TextStyle(color: muted),
        ),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            backgroundColor: accent,
            foregroundColor: Colors.white,
            minimumSize: const Size(44, 44),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        ),
      );
}
