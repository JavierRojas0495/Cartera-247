import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/lender_providers.dart';

class BorrowersScreen extends ConsumerWidget {
  const BorrowersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final borrowers = ref.watch(borrowersProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Prestatarios')),
      body: borrowers.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (list) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(borrowersProvider),
          child: ListView.builder(
            itemCount: list.length,
            itemBuilder: (_, i) {
              final b = list[i];
              return ListTile(
                leading: CircleAvatar(child: Text('${b['firstName'][0]}${b['lastName'][0]}')),
                title: Text('${b['firstName']} ${b['lastName']}'),
                subtitle: Text('CC: ${b['documentNum']}'),
                trailing: Text('${b['_count']?['loans'] ?? 0} prést.'),
              );
            },
          ),
        ),
      ),
    );
  }
}
