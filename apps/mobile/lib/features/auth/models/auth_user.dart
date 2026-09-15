class AuthUser {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String role;
  final String? tenantId;
  final bool isPlatformAdmin;
  final List<String> modules;

  AuthUser({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
    this.tenantId,
    required this.isPlatformAdmin,
    required this.modules,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
        id: json['id'] as String,
        email: json['email'] as String,
        firstName: json['firstName'] as String,
        lastName: json['lastName'] as String,
        role: json['role'] as String,
        tenantId: json['tenantId'] as String?,
        isPlatformAdmin: json['isPlatformAdmin'] as bool? ?? false,
        modules: List<String>.from(json['modules'] ?? []),
      );

  bool get isLender => ['owner', 'admin', 'operator', 'readonly'].contains(role);
  bool get isBorrower => role == 'borrower';
  bool hasModule(String code) => modules.contains(code);
}
