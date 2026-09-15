import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../providers/borrower_providers.dart';

class BorrowerScheduleScreen extends ConsumerWidget {
  const BorrowerScheduleScreen({super.key});

  String _formatCop(int amount) =>
      NumberFormat.currency(locale: 'es_CO', symbol: '\$', decimalDigits: 0).format(amount);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final loans = ref.watch(borrowerLoansProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Próximas cuotas')),
      body: loans.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (list) {
          if (list.isEmpty) return const Center(child: Text('Sin cuotas pendientes'));
          final installments = list.first['installments'] as List? ?? [];
          return ListView.builder(
            itemCount: installments.length,
            itemBuilder: (_, i) {
              final inst = installments[i];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                child: ListTile(
                  title: Text('Cuota #${inst['installmentNumber']}'),
                  subtitle: Text('Interés: ${_formatCop(inst['expectedInterest'] ?? 0)}'),
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(DateFormat('dd/MM/yyyy').format(DateTime.parse(inst['dueDate']))),
                      Text(inst['status'] ?? '', style: TextStyle(fontSize: 11, color: inst['status'] == 'overdue' ? Colors.red : Colors.grey)),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
