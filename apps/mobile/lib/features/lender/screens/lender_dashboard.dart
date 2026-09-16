import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/lender_providers.dart';

class LenderDashboard extends ConsumerWidget {
  const LenderDashboard({super.key});

  String _formatCop(num amount) =>
      NumberFormat.currency(locale: 'es_CO', symbol: r'$', decimalDigits: 0).format(amount);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).valueOrNull;
    final portfolio = ref.watch(portfolioProvider);
    final alerts = ref.watch(alertsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Inicio'),
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
        onRefresh: () async {
          ref.invalidate(portfolioProvider);
          ref.invalidate(alertsProvider);
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
          children: [
            Text(
              'Hola, ${user?.firstName ?? ''}',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 4),
            Text(
              'Resumen de cartera',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 16),
            portfolio.when(
              loading: () => const _DashboardSkeleton(),
              error: (e, _) => _ErrorCard(message: '$e'),
              data: (data) => _PortfolioBody(
                data: data,
                formatCop: _formatCop,
                alerts: alerts.valueOrNull ?? const [],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PortfolioBody extends StatelessWidget {
  final Map<String, dynamic> data;
  final String Function(num) formatCop;
  final List<dynamic> alerts;

  const _PortfolioBody({
    required this.data,
    required this.formatCop,
    required this.alerts,
  });

  @override
  Widget build(BuildContext context) {
    final outstanding = (data['totalOutstanding'] as num?)?.toInt() ?? 0;
    final principal = (data['totalPrincipal'] as num?)?.toInt() ?? 0;
    final loans = (data['activeLoansCount'] as num?)?.toInt() ?? 0;
    final borrowers = (data['activeBorrowers'] as num?)?.toInt() ?? 0;
    final overdue = (data['overdueLoans'] as num?)?.toInt() ??
        (data['overdueInstallments'] as num?)?.toInt() ??
        0;
    final collected = (data['totalCollected'] as num?)?.toInt() ?? 0;
    final months = (data['collectionsByMonth'] as List?) ?? const [];
    final allocation = Map<String, dynamic>.from(data['allocationTotals'] as Map? ?? {});

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
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
                  formatCop(outstanding),
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.5,
                    color: AppTheme.ink,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Prestado ${formatCop(principal)} · $loans préstamos',
                  style: const TextStyle(color: AppTheme.muted, fontSize: 13),
                ),
                const SizedBox(height: 14),
                const Divider(height: 1, color: AppTheme.line),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _MiniMetric(label: 'Cobrado', value: formatCop(collected))),
                    Expanded(child: _MiniMetric(label: 'Clientes', value: '$borrowers')),
                    Expanded(
                      child: _MiniMetric(
                        label: 'En mora',
                        value: '$overdue',
                        alert: overdue > 0,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        Card(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Expanded(
                      child: Text(
                        'Cobros recientes',
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                      ),
                    ),
                    Text(
                      formatCop(_monthTotal(months)),
                      style: const TextStyle(color: AppTheme.muted, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 170,
                  child: months.isEmpty || _monthTotal(months) == 0
                      ? const Center(
                          child: Text(
                            'Sin cobros en los últimos meses',
                            style: TextStyle(color: AppTheme.muted),
                          ),
                        )
                      : _CollectionsChart(months: months),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        Card(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Destino de los pagos',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Interés → mora → capital',
                  style: TextStyle(color: AppTheme.muted, fontSize: 12),
                ),
                const SizedBox(height: 12),
                _AllocationBars(allocation: allocation, formatCop: formatCop),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        Card(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(8, 8, 8, 8),
            child: Column(
              children: [
                ListTile(
                  title: const Text('Alertas de mora', style: TextStyle(fontWeight: FontWeight.w700)),
                  trailing: TextButton(
                    onPressed: () => context.go('/lender/alerts'),
                    child: const Text('Ver todas'),
                  ),
                ),
                if (alerts.isEmpty)
                  const Padding(
                    padding: EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Sin alertas pendientes. La cartera está al día.',
                        style: TextStyle(color: AppTheme.muted),
                      ),
                    ),
                  )
                else
                  ...alerts.take(3).map((a) {
                    final title = '${a['title'] ?? 'Alerta'}';
                    final message = '${a['message'] ?? ''}';
                    return ListTile(
                      dense: true,
                      leading: const Icon(Icons.warning_amber_rounded, color: AppTheme.warn),
                      title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
                      subtitle: Text(message, maxLines: 2, overflow: TextOverflow.ellipsis),
                    );
                  }),
              ],
            ),
          ),
        ),
        const SizedBox(height: 18),
        Text('Acciones rápidas', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 10),
        _NavTile(icon: Icons.people_outline, label: 'Prestatarios', onTap: () => context.go('/lender/borrowers')),
        _NavTile(icon: Icons.request_quote_outlined, label: 'Préstamos', onTap: () => context.go('/lender/loans')),
        _NavTile(icon: Icons.payments_outlined, label: 'Registrar pago', onTap: () => context.go('/lender/payments')),
      ],
    );
  }

  int _monthTotal(List months) {
    var sum = 0;
    for (final m in months) {
      sum += ((m as Map)['amount'] as num?)?.toInt() ?? 0;
    }
    return sum;
  }
}

class _CollectionsChart extends StatelessWidget {
  final List months;
  const _CollectionsChart({required this.months});

  @override
  Widget build(BuildContext context) {
    final amounts = months
        .map((m) => ((m as Map)['amount'] as num?)?.toDouble() ?? 0)
        .toList();
    final maxY = amounts.fold<double>(0, (a, b) => a > b ? a : b);
    final ceiling = maxY <= 0 ? 1.0 : maxY * 1.15;

    return BarChart(
      BarChartData(
        maxY: ceiling,
        gridData: const FlGridData(show: false),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 28,
              getTitlesWidget: (value, meta) {
                final i = value.toInt();
                if (i < 0 || i >= months.length) return const SizedBox.shrink();
                final label = '${(months[i] as Map)['label'] ?? ''}';
                return Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(label, style: const TextStyle(fontSize: 11, color: AppTheme.muted, fontWeight: FontWeight.w600)),
                );
              },
            ),
          ),
        ),
        barGroups: [
          for (var i = 0; i < months.length; i++)
            BarChartGroupData(
              x: i,
              barRods: [
                BarChartRodData(
                  toY: amounts[i] <= 0 ? 0.01 : amounts[i],
                  width: 18,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                  color: amounts[i] <= 0 ? AppTheme.line : AppTheme.accent,
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class _AllocationBars extends StatelessWidget {
  final Map<String, dynamic> allocation;
  final String Function(num) formatCop;

  const _AllocationBars({required this.allocation, required this.formatCop});

  @override
  Widget build(BuildContext context) {
    final rows = [
      (label: 'Interés', value: (allocation['interest'] as num?)?.toInt() ?? 0, color: AppTheme.accent),
      (label: 'Mora', value: (allocation['lateFee'] as num?)?.toInt() ?? 0, color: AppTheme.warn),
      (label: 'Capital', value: (allocation['principal'] as num?)?.toInt() ?? 0, color: AppTheme.info),
    ];
    final max = rows.map((r) => r.value).fold<int>(0, (a, b) => a > b ? a : b);
    final sum = rows.fold<int>(0, (a, r) => a + r.value);

    if (sum == 0) {
      return const Text(
        'Aún no hay pagos aceptados para desglosar.',
        style: TextStyle(color: AppTheme.muted),
      );
    }

    return Column(
      children: [
        for (final r in rows) ...[
          Row(
            children: [
              Expanded(child: Text(r.label, style: const TextStyle(fontSize: 13))),
              Text(
                formatCop(r.value),
                style: const TextStyle(fontWeight: FontWeight.w700, fontFeatures: [FontFeature.tabularFigures()]),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: max == 0 ? 0 : (r.value / max).clamp(0.0, 1.0),
              minHeight: 10,
              backgroundColor: AppTheme.bg,
              color: r.color,
            ),
          ),
          const SizedBox(height: 12),
        ],
      ],
    );
  }
}

class _MiniMetric extends StatelessWidget {
  final String label;
  final String value;
  final bool alert;

  const _MiniMetric({required this.label, required this.value, this.alert = false});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label.toUpperCase(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppTheme.muted, letterSpacing: 0.3)),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: alert ? AppTheme.warn : AppTheme.ink,
          ),
        ),
      ],
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

class _ErrorCard extends StatelessWidget {
  final String message;
  const _ErrorCard({required this.message});

  @override
  Widget build(BuildContext context) {
    return Card(
      color: const Color(0xFFFDE8E6),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Text(message, style: const TextStyle(color: AppTheme.danger)),
      ),
    );
  }
}

class _DashboardSkeleton extends StatelessWidget {
  const _DashboardSkeleton();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          height: 140,
          decoration: BoxDecoration(
            color: AppTheme.line.withOpacity(0.45),
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        const SizedBox(height: 14),
        Container(
          height: 180,
          decoration: BoxDecoration(
            color: AppTheme.line.withOpacity(0.45),
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ],
    );
  }
}
