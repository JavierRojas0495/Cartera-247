import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../providers/lender_providers.dart';
import '../../../core/network/api_client.dart';
import '../../auth/providers/auth_provider.dart';

class AlertsScreen extends ConsumerWidget {
  const AlertsScreen({super.key});

  String _formatCop(int amount) =>
      NumberFormat.currency(locale: 'es_CO', symbol: '\$', decimalDigits: 0).format(amount);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final overdue = ref.watch(overdueProvider);
    final alerts = ref.watch(alertsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Alertas de mora')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(overdueProvider);
          ref.invalidate(alertsProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text('Alertas', style: Theme.of(context).textTheme.titleMedium),
            alerts.when(
              loading: () => const LinearProgressIndicator(),
              error: (e, _) => Text('Error: $e'),
              data: (list) => list.isEmpty
                  ? const Padding(padding: EdgeInsets.all(8), child: Text('Sin alertas'))
                  : Column(
                      children: list.map((a) => Card(
                        color: Colors.orange.shade50,
                        child: ListTile(
                          leading: const Icon(Icons.warning_amber, color: Colors.orange),
                          title: Text(a['title'] ?? ''),
                          subtitle: Text(a['message'] ?? ''),
                        ),
                      )).toList(),
                    ),
            ),
            const SizedBox(height: 16),
            Text('Eventos de mora', style: Theme.of(context).textTheme.titleMedium),
            overdue.when(
              loading: () => const LinearProgressIndicator(),
              error: (e, _) => Text('Error: $e'),
              data: (list) => Column(
                children: list.map((e) {
                  final inst = e['installment'];
                  final borrower = inst?['loan']?['borrower'];
                  return Card(
                    child: ListTile(
                      title: Text('${borrower?['firstName'] ?? ''} ${borrower?['lastName'] ?? ''}'),
                      subtitle: Text('${e['daysOverdue']} días — ${_formatCop(e['calculatedFee'] ?? 0)}'),
                      trailing: e['status'] == 'pending_review'
                          ? Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.check, color: Colors.green),
                                  onPressed: () async {
                                    final client = ref.read(apiClientProvider);
                                    await client.dio.post('/overdue/${e['id']}/approve');
                                    ref.invalidate(overdueProvider);
                                  },
                                ),
                              ],
                            )
                          : Chip(label: Text(e['status'] ?? '')),
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
