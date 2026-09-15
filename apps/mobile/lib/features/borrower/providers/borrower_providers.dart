import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';

final borrowerLoansProvider = FutureProvider<List<dynamic>>((ref) async {
  final client = ref.read(apiClientProvider);
  final res = await client.dio.get('/loans');
  return List<dynamic>.from(res.data);
});

final borrowerPaymentsProvider = FutureProvider<List<dynamic>>((ref) async {
  final user = ref.watch(authProvider).valueOrNull;
  if (user == null) return [];
  final client = ref.read(apiClientProvider);
  final loans = await client.dio.get('/loans');
  final list = List<dynamic>.from(loans.data);
  if (list.isEmpty) return [];
  final borrowerId = list.first['borrowerId'];
  final res = await client.dio.get('/payments/borrower/$borrowerId');
  return List<dynamic>.from(res.data);
});
