import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/app_constants.dart';

class ApiClient {
  late final Dio _dio;

  ApiClient() {
    _dio = Dio(BaseOptions(
      baseUrl: AppConstants.apiBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString(AppConstants.accessTokenKey);
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          final prefs = await SharedPreferences.getInstance();
          final refresh = prefs.getString(AppConstants.refreshTokenKey);
          if (refresh != null) {
            try {
              final res = await Dio().post(
                '${AppConstants.apiBaseUrl}/auth/refresh',
                data: {'refreshToken': refresh},
              );
              final newToken = res.data['accessToken'] as String;
              await prefs.setString(AppConstants.accessTokenKey, newToken);
              error.requestOptions.headers['Authorization'] = 'Bearer $newToken';
              final retry = await _dio.fetch(error.requestOptions);
              return handler.resolve(retry);
            } catch (_) {}
          }
        }
        handler.next(error);
      },
    ));
  }

  Dio get dio => _dio;
}
