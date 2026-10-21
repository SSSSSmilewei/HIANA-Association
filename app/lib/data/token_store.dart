import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// 登录令牌和少量本地设置。令牌存在 Android Keystore / iOS Keychain 里。
class TokenStore {
  TokenStore([FlutterSecureStorage? storage]) : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;
  static const _tokenKey = 'hiana_token';
  static const _themeKey = 'hiana_theme';

  String? _token;
  bool _loaded = false;

  /// 内存里有就直接用，免得每个请求都读一次 Keystore。
  Future<String?> read() async {
    if (!_loaded) {
      _token = await _storage.read(key: _tokenKey);
      _loaded = true;
    }
    return _token;
  }

  Future<void> save(String token) async {
    _token = token;
    _loaded = true;
    await _storage.write(key: _tokenKey, value: token);
  }

  Future<void> clear() async {
    _token = null;
    _loaded = true;
    await _storage.delete(key: _tokenKey);
  }

  Future<String?> readTheme() => _storage.read(key: _themeKey);
  Future<void> saveTheme(String value) => _storage.write(key: _themeKey, value: value);
}
