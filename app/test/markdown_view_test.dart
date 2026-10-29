// 讲义渲染：拿仓库里真实的讲义跑一遍，不能抛异常。
import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hiana_app/widgets/markdown_view.dart';

void main() {
  final dir = Directory('../content/courses');
  final samples = [
    'cs50x/notes-1.md',
    'cs50x/pset-1-mario-less.md',
    'cs50x/pset-7-movies.md',
    'missing-semester/course-shell.md',
    'missing-semester-2020/course-shell-solution.md',
    'csdiy/preface.md',
    'csdiy/git.md',
  ];
  for (final f in samples) {
    testWidgets('渲染 $f', (tester) async {
      final src = File('${dir.path}/$f').readAsStringSync();
      await tester.pumpWidget(
        MiuixSystemTheme(
          child: Directionality(
            textDirection: TextDirection.ltr,
            child: SingleChildScrollView(child: MarkdownView(source: src, onLink: (_) {})),
          ),
        ),
      );
      expect(tester.takeException(), isNull);
      expect(find.byType(RichText), findsWidgets);
    });
  }
}
