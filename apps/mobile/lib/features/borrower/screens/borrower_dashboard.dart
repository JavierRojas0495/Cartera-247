import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/borrower_providers.dart';

class BorrowerDashboard extends ConsumerWidget {
  const BorrowerDashboard({super.key});

  String _formatCop(int amount) =>
      NumberFormat.currency(locale: 'es_CO', symbol: '\$', decimalDigits: 0).format(amount);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).valueOrNull;
    final loans = ref.watch(borrowerLoansProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mi cuenta'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(borrowerLoansProvider),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text('Hola, ${user?.firstName ?? ''}', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            loans.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Text('Error: $e'),
              data: (list) {
                if (list.isEmpty) return const Text('No tienes préstamos activos');
                final loan = list.first;
                return Column(
                  children: [
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          children: [
                            const Text('Saldo pendiente', style: TextStyle(color: Colors.grey)),
                            const SizedBox(height: 8),
                            Text(_formatCop(loan['currentBalance'] ?? 0), style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    _NavTile(icon: Icons.receipt_long, label: 'Mis pagos', onTap: () => context.go('/borrower/payments')),
                    _NavTile(icon: Icons.calendar_month, label: 'Próximas cuotas', onTap: () => context.go('/borrower/schedule')),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _NavTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _NavTile({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(leading: Icon(icon), title: Text(label), trailing: const Icon(Icons.chevron_right), onTap: onTap),
    );
  }
}
