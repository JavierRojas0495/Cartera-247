import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../providers/lender_providers.dart';

class LoansScreen extends ConsumerWidget {
  const LoansScreen({super.key});

  String _formatCop(int amount) =>
      NumberFormat.currency(locale: 'es_CO', symbol: '\$', decimalDigits: 0).format(amount);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final loans = ref.watch(loansProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Préstamos')),
      body: loans.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (list) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(loansProvider),
          child: ListView.builder(
            itemCount: list.length,
            itemBuilder: (_, i) {
              final l = list[i];
              final borrower = l['borrower'];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                child: ListTile(
                  title: Text('${borrower?['firstName'] ?? ''} ${borrower?['lastName'] ?? ''}'),
                  subtitle: Text('Saldo: ${_formatCop(l['currentBalance'] ?? 0)}'),
                  trailing: Chip(
                    label: Text(l['status'] ?? '', style: const TextStyle(fontSize: 11)),
                    backgroundColor: l['status'] == 'active' ? Colors.green.shade100 : Colors.grey.shade200,
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
