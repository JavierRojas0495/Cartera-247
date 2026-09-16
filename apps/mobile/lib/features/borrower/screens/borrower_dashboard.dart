import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/borrower_providers.dart';

class BorrowerDashboard extends ConsumerWidget {
  const BorrowerDashboard({super.key});

  String _formatCop(num amount) =>
      NumberFormat.currency(locale: 'es_CO', symbol: r'$', decimalDigits: 0).format(amount);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).valueOrNull;
    final loans = ref.watch(borrowerLoansProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mi cuenta'),
        actions: [
          IconButton(
            tooltip: 'Cerrar sesión',
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppTheme.accent,
        onRefresh: () async => ref.invalidate(borrowerLoansProvider),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
          children: [
            Text(
              'Hola, ${user?.firstName ?? ''}',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 4),
            const Text('Tu crédito activo', style: TextStyle(color: AppTheme.muted, fontSize: 13)),
            const SizedBox(height: 16),
            loans.when(
              loading: () => Container(
                height: 120,
                decoration: BoxDecoration(
                  color: AppTheme.line.withOpacity(0.45),
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              error: (e, _) => Card(
                color: const Color(0xFFFDE8E6),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text('$e', style: const TextStyle(color: AppTheme.danger)),
                ),
              ),
              data: (list) {
                if (list.isEmpty) {
                  return const Card(
                    child: Padding(
                      padding: EdgeInsets.all(20),
                      child: Text(
                        'No tienes préstamos activos.',
                        style: TextStyle(color: AppTheme.muted),
                      ),
                    ),
                  );
                }
                final loan = list.first as Map;
                final balance = (loan['currentBalance'] as num?)?.toInt() ?? 0;
                final principal = (loan['principalAmount'] as num?)?.toInt() ?? 0;
                return Column(
                  children: [
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Por cobrar',
                              style: TextStyle(
                                color: AppTheme.brand,
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _formatCop(balance),
                              style: const TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.w700,
                                letterSpacing: -0.5,
                              ),
                            ),
                            if (principal > 0) ...[
                              const SizedBox(height: 6),
                              Text(
                                'Prestado ${_formatCop(principal)}',
                                style: const TextStyle(color: AppTheme.muted, fontSize: 13),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    _NavTile(
                      icon: Icons.receipt_long_outlined,
                      label: 'Mis pagos',
                      onTap: () => context.go('/borrower/payments'),
                    ),
                    _NavTile(
                      icon: Icons.calendar_month_outlined,
                      label: 'Próximas cuotas',
                      onTap: () => context.go('/borrower/schedule'),
                    ),
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
      child: ListTile(
        leading: Icon(icon, color: AppTheme.brand),
        title: Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
        trailing: const Icon(Icons.chevron_right, color: AppTheme.muted),
        onTap: onTap,
      ),
    );
  }
}
