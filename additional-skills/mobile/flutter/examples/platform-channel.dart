import 'dart:async';
import 'package:flutter/services.dart';

class BiometricAuthChannel {
  static const _channel = MethodChannel('com.example.app/biometric');

  Future<BiometricCapability> checkCapability() async {
    final result = await _channel.invokeMethod<Map>('checkCapability');
    if (result == null) return BiometricCapability.unavailable;
    return BiometricCapability(
      isAvailable: result['isAvailable'] as bool,
      biometricType: BiometricType.fromString(result['type'] as String?),
    );
  }

  Future<AuthResult> authenticate({required String reason}) async {
    try {
      final success = await _channel.invokeMethod<bool>('authenticate', {
        'reason': reason,
      });
      return success == true ? AuthResult.success : AuthResult.failed;
    } on PlatformException catch (e) {
      return switch (e.code) {
        'USER_CANCELLED' => AuthResult.cancelled,
        'LOCKOUT' => AuthResult.lockout,
        'NOT_ENROLLED' => AuthResult.notEnrolled,
        _ => AuthResult.failed,
      };
    }
  }

  Stream<BiometricState> get stateChanges {
    const eventChannel = EventChannel('com.example.app/biometric_state');
    return eventChannel.receiveBroadcastStream().map((event) {
      return BiometricState.fromString(event as String);
    });
  }
}

class BiometricCapability {
  final bool isAvailable;
  final BiometricType biometricType;

  const BiometricCapability({
    required this.isAvailable,
    required this.biometricType,
  });

  static const unavailable = BiometricCapability(
    isAvailable: false,
    biometricType: BiometricType.none,
  );
}

enum BiometricType {
  fingerprint,
  face,
  iris,
  none;

  static BiometricType fromString(String? value) => switch (value) {
    'fingerprint' => BiometricType.fingerprint,
    'face' => BiometricType.face,
    'iris' => BiometricType.iris,
    _ => BiometricType.none,
  };
}

enum AuthResult { success, failed, cancelled, lockout, notEnrolled }

enum BiometricState {
  available,
  locked,
  notConfigured;

  static BiometricState fromString(String value) => switch (value) {
    'available' => BiometricState.available,
    'locked' => BiometricState.locked,
    _ => BiometricState.notConfigured,
  };
}
