#!/usr/bin/env bash
# 检查 App 代码有没有用 Material 控件。
# 规则：只有 lib/app/miuix_root.dart 可以 import material.dart（MaterialApp 和透明 Material 只作底座），
# 其余文件只能 import flutter/widgets.dart 和 flutter_miuix。
set -euo pipefail
cd "$(dirname "$0")/.."

fail=0

bad_imports=$(grep -rln "package:flutter/material.dart" lib | grep -v "^lib/app/miuix_root.dart$" || true)
if [ -n "$bad_imports" ]; then
  echo "这些文件 import 了 material.dart，请改用 flutter/widgets.dart + flutter_miuix："
  echo "$bad_imports"
  fail=1
fi

# 常见的 Material 可见控件，即使通过别的方式引入也不允许
pattern='\b(Scaffold|AppBar|ElevatedButton|FilledButton|OutlinedButton|TextButton|IconButton|TextField|TextFormField|Card|ListTile|Switch|Checkbox|Radio|Slider|SnackBar|ScaffoldMessenger|InkWell|showDialog|showModalBottomSheet|AlertDialog|MaterialPageRoute|BottomNavigationBar|NavigationBar|CircularProgressIndicator|LinearProgressIndicator)\('
hits=$(grep -rnE "$pattern" lib | grep -v "^lib/app/miuix_root.dart:" | grep -vE "Miuix[A-Za-z]*\(" || true)
if [ -n "$hits" ]; then
  echo "发现 Material 控件，请换成对应的 Miuix 组件："
  echo "$hits"
  fail=1
fi

if grep -rn "Icons\." lib | grep -v "MiuixIcons\." >/dev/null; then
  echo "发现 Material 图标 Icons.*，请改用 MiuixIcons："
  grep -rn "Icons\." lib | grep -v "MiuixIcons\."
  fail=1
fi

if [ "$fail" -eq 0 ]; then echo "没有 Material 控件。"; fi
exit "$fail"
