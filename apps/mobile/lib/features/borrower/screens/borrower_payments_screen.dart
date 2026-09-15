import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../providers/borrower_providers.dart';

class BorrowerPaymentsScreen extends ConsumerWidget {
  const BorrowerPaymentsScreen({super.key});

  String _formatCop(int amount) =>
      NumberFormat.currency(locale: 'es_CO', symbol: '\$', decimalDigits: 0).format(amount);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final payments = ref.watch(borrowerPaymentsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Mis pagos')),
      body: payments.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (list) => list.isEmpty
            ? const Center(child: Text('No hay pagos registrados'))
            : RefreshIndicator(
                onRefresh: () async => ref.invalidate(borrowerPaymentsProvider),
                child: ListView.builder(
                  itemCount: list.length,
                  itemBuilder: (_, i) {
                    final p = list[i];
                    final alloc = (p['allocations'] as List?)?.first;
                    return Card(
                      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                      child: ListTile(
                        title: Text(_formatCop(p['amount'] ?? 0)),
                        subtitle: Text(
                          'Interés: ${_formatCop(alloc?['toInterest'] ?? 0)} | Capital: ${_formatCop(alloc?['toPrincipal'] ?? 0)}',
                        ),
                        trailing: Text(DateFormat('dd/MM/yyyy').format(DateTime.parse(p['paymentDate']))),
                      ),
                    );
                  },
                ),
              ),
      ),
    );
  }
}
