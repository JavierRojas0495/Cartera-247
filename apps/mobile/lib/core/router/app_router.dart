import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/lender/screens/lender_dashboard.dart';
import '../../features/lender/screens/borrowers_screen.dart';
import '../../features/lender/screens/loans_screen.dart';
import '../../features/lender/screens/payments_screen.dart';
import '../../features/lender/screens/alerts_screen.dart';
import '../../features/borrower/screens/borrower_dashboard.dart';
import '../../features/borrower/screens/borrower_payments_screen.dart';
import '../../features/borrower/screens/borrower_schedule_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final user = authState.valueOrNull;
      final loggingIn = state.matchedLocation == '/login';

      if (user == null && !loggingIn) return '/login';
      if (user != null && loggingIn) {
        if (user.isLender) return '/lender';
        if (user.isBorrower) return '/borrower';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(
        path: '/lender',
        builder: (_, __) => const LenderDashboard(),
        routes: [
          GoRoute(path: 'borrowers', builder: (_, __) => const BorrowersScreen()),
          GoRoute(path: 'loans', builder: (_, __) => const LoansScreen()),
          GoRoute(path: 'payments', builder: (_, __) => const PaymentsScreen()),
          GoRoute(path: 'alerts', builder: (_, __) => const AlertsScreen()),
        ],
      ),
      GoRoute(
        path: '/borrower',
        builder: (_, __) => const BorrowerDashboard(),
        routes: [
          GoRoute(path: 'payments', builder: (_, __) => const BorrowerPaymentsScreen()),
          GoRoute(path: 'schedule', builder: (_, __) => const BorrowerScheduleScreen()),
        ],
      ),
    ],
  );
});
