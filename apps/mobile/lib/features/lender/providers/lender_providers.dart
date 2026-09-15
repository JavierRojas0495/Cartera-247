import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';

final portfolioProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final client = ref.read(apiClientProvider);
  final res = await client.dio.get('/reports/portfolio');
  return Map<String, dynamic>.from(res.data);
});

final borrowersProvider = FutureProvider<List<dynamic>>((ref) async {
  final client = ref.read(apiClientProvider);
  final res = await client.dio.get('/borrowers');
  return List<dynamic>.from(res.data);
});

final loansProvider = FutureProvider<List<dynamic>>((ref) async {
  final client = ref.read(apiClientProvider);
  final res = await client.dio.get('/loans');
  return List<dynamic>.from(res.data);
});

final paymentsProvider = FutureProvider<List<dynamic>>((ref) async {
  final client = ref.read(apiClientProvider);
  final res = await client.dio.get('/payments');
  return List<dynamic>.from(res.data);
});

final alertsProvider = FutureProvider<List<dynamic>>((ref) async {
  final client = ref.read(apiClientProvider);
  final res = await client.dio.get('/overdue/alerts');
  return List<dynamic>.from(res.data);
});

final overdueProvider = FutureProvider<List<dynamic>>((ref) async {
  final client = ref.read(apiClientProvider);
  final res = await client.dio.get('/overdue');
  return List<dynamic>.from(res.data);
});
