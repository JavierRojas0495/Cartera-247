import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/lender_providers.dart';

class LenderDashboard extends ConsumerWidget {
  const LenderDashboard({super.key});

  String _formatCop(int amount) =>
      NumberFormat.currency(locale: 'es_CO', symbol: '\$', decimalDigits: 0).format(amount);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).valueOrNull;
    final portfolio = ref.watch(portfolioProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mi Cartera'),
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
        onRefresh: () async => ref.invalidate(portfolioProvider),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text('Hola, ${user?.firstName ?? ''}', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            portfolio.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Text('Error: $e'),
              data: (data) => Column(
                children: [
                  _StatCard(label: 'Cartera activa', value: _formatCop(data['totalOutstanding'] ?? 0)),
                  _StatCard(label: 'Préstamos activos', value: '${data['activeLoansCount'] ?? 0}'),
                  _StatCard(label: 'Cuotas en mora', value: '${data['overdueInstallments'] ?? 0}', alert: (data['overdueInstallments'] ?? 0) > 0),
                  _StatCard(label: 'Total cobrado', value: _formatCop(data['totalCollected'] ?? 0)),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Text('Acciones rápidas', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            _NavTile(icon: Icons.people, label: 'Prestatarios', onTap: () => context.go('/lender/borrowers')),
            _NavTile(icon: Icons.request_quote, label: 'Préstamos', onTap: () => context.go('/lender/loans')),
            _NavTile(icon: Icons.payments, label: 'Registrar pago', onTap: () => context.go('/lender/payments')),
            _NavTile(icon: Icons.warning_amber, label: 'Alertas de mora', onTap: () => context.go('/lender/alerts')),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final bool alert;
  const _StatCard({required this.label, required this.value, this.alert = false});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(label, style: const TextStyle(fontSize: 13, color: Colors.grey)),
        trailing: Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: alert ? Colors.orange : null)),
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
