import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../providers/lender_providers.dart';
import '../../auth/providers/auth_provider.dart';

final debtSummaryProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, loanId) async {
  final client = ref.read(apiClientProvider);
  final res = await client.dio.get('/loans/$loanId/debt-summary');
  return Map<String, dynamic>.from(res.data);
});

class PaymentsScreen extends ConsumerStatefulWidget {
  const PaymentsScreen({super.key});

  @override
  ConsumerState<PaymentsScreen> createState() => _PaymentsScreenState();
}

class _PaymentsScreenState extends ConsumerState<PaymentsScreen> {
  final _amountCtrl = TextEditingController(text: '30000');
  String? _selectedLoanId;
  bool _submitting = false;
  bool _showForm = false;

  String _formatCop(dynamic amount) =>
      NumberFormat.currency(locale: 'es_CO', symbol: '\$', decimalDigits: 0).format(amount ?? 0);

  void _openNewForm() {
    setState(() {
      _showForm = true;
      _selectedLoanId = null;
      _amountCtrl.text = '30000';
    });
  }

  void _closeForm() {
    setState(() {
      _showForm = false;
      _selectedLoanId = null;
    });
  }

  Future<void> _showSuccessDialog(Map<String, dynamic> result) async {
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Text('Pago registrado'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Pagó: ${_formatCop(result['paidAmount'])}'),
            Text('A intereses: ${_formatCop(result['appliedToInterest'])}'),
            Text('A capital: ${_formatCop(result['appliedToPrincipal'])}'),
            Text(
              'Faltó por intereses: ${_formatCop(result['interestRemaining'])}',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: (result['interestRemaining'] as num) > 0 ? Colors.red : Colors.green,
              ),
            ),
            Text('Deuda restante: ${_formatCop(result['totalDebtRemaining'])}'),
            const SizedBox(height: 12),
            const Text(
              'Para registrar otro pago, use el botón + Nuevo pago.',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Entendido'),
          ),
        ],
      ),
    );
  }

  Future<void> _submit() async {
    if (_selectedLoanId == null || _submitting) return;
    setState(() => _submitting = true);
    try {
      final client = ref.read(apiClientProvider);
      final res = await client.dio.post('/payments', data: {
        'loanId': _selectedLoanId,
        'amount': int.parse(_amountCtrl.text),
        'paymentDate': DateTime.now().toIso8601String().split('T')[0],
        'method': 'cash',
      });
      final result = Map<String, dynamic>.from(res.data['result'] ?? {});
      ref.invalidate(paymentsProvider);
      ref.invalidate(loansProvider);
      ref.invalidate(portfolioProvider);
      _closeForm();
      await _showSuccessDialog(result);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final payments = ref.watch(paymentsProvider);
    final debt = (_showForm && _selectedLoanId != null)
        ? ref.watch(debtSummaryProvider(_selectedLoanId!))
        : null;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Pagos'),
        actions: [
          if (!_showForm)
            IconButton(
              icon: const Icon(Icons.add),
              tooltip: 'Nuevo pago',
              onPressed: _openNewForm,
            ),
        ],
      ),
      body: Column(
        children: [
          if (_showForm)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Nuevo registro de pago', style: TextStyle(fontWeight: FontWeight.bold)),
                          TextButton(
                            onPressed: _submitting ? null : _closeForm,
                            child: const Text('Cancelar'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      ref.watch(loansProvider).when(
                        data: (list) => DropdownButtonFormField<String>(
                          decoration: const InputDecoration(labelText: 'Préstamo'),
                          value: _selectedLoanId,
                          items: list.where((l) => l['status'] == 'active').map((l) {
                            final b = l['borrower'];
                            return DropdownMenuItem(
                              value: l['id'] as String,
                              child: Text('${b?['firstName']} ${b?['lastName']}'),
                            );
                          }).toList(),
                          onChanged: _submitting ? null : (v) => setState(() => _selectedLoanId = v),
                        ),
                        loading: () => const LinearProgressIndicator(),
                        error: (e, _) => Text('Error: $e'),
                      ),
                      if (debt != null) ...[
                        const SizedBox(height: 12),
                        debt.when(
                          data: (d) => Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.blue.shade50,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Deuda total: ${_formatCop(d['totalDebt'])}',
                                    style: const TextStyle(fontWeight: FontWeight.bold)),
                                Text('Saldo capital: ${_formatCop(d['principalBalance'])}'),
                                Text('Interés pendiente: ${_formatCop(d['pendingInterest'])}'),
                              ],
                            ),
                          ),
                          loading: () => const LinearProgressIndicator(),
                          error: (e, _) => Text('Error: $e'),
                        ),
                      ],
                      const SizedBox(height: 8),
                      TextField(
                        controller: _amountCtrl,
                        enabled: !_submitting,
                        decoration: const InputDecoration(labelText: 'Monto a pagar (COP)'),
                        keyboardType: TextInputType.number,
                      ),
                      const SizedBox(height: 12),
                      FilledButton(
                        onPressed: (_submitting || _selectedLoanId == null) ? null : _submit,
                        child: _submitting
                            ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                            : const Text('Registrar pago'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          if (!_showForm)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: FilledButton.icon(
                onPressed: _openNewForm,
                icon: const Icon(Icons.add),
                label: const Text('Registrar pago'),
              ),
            ),
          Expanded(
            child: payments.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Error: $e')),
              data: (list) => list.isEmpty
                  ? const Center(child: Text('No hay pagos registrados'))
                  : ListView.builder(
                      itemCount: list.length,
                      itemBuilder: (_, i) {
                        final p = list[i];
                        final alloc = (p['allocations'] as List?)?.first;
                        return ListTile(
                          title: Text(_formatCop(p['amount'])),
                          subtitle: Text(
                            'Int: ${_formatCop(alloc?['toInterest'])} | Cap: ${_formatCop(alloc?['toPrincipal'])}',
                          ),
                          trailing: Text(DateFormat('dd/MM/yy').format(DateTime.parse(p['paymentDate']))),
                        );
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
