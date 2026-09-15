import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_client.dart';
import '../models/auth_user.dart';

final apiClientProvider = Provider((ref) => ApiClient());

final authProvider = StateNotifierProvider<AuthNotifier, AsyncValue<AuthUser?>>(
  (ref) => AuthNotifier(ref),
);

class AuthNotifier extends StateNotifier<AsyncValue<AuthUser?>> {
  AuthNotifier(this.ref) : super(const AsyncValue.loading()) {
    _loadStoredUser();
  }

  final Ref ref;

  Future<void> _loadStoredUser() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(AppConstants.userKey);
    if (raw != null) {
      state = AsyncValue.data(AuthUser.fromJson(jsonDecode(raw)));
    } else {
      state = const AsyncValue.data(null);
    }
  }

  Future<void> login(String email, String password) async {
    state = const AsyncValue.loading();
    try {
      final client = ref.read(apiClientProvider);
      final res = await client.dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      final data = res.data as Map<String, dynamic>;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(AppConstants.accessTokenKey, data['accessToken']);
      await prefs.setString(AppConstants.refreshTokenKey, data['refreshToken']);
      await prefs.setString(AppConstants.userKey, jsonEncode(data['user']));
      state = AsyncValue.data(AuthUser.fromJson(data['user']));
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    state = const AsyncValue.data(null);
  }
}
