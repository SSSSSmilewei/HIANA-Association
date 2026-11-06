import 'package:flutter_test/flutter_test.dart';
import 'package:hiana_app/data/local_library.dart';
import 'package:hiana_app/widgets/markdown_view.dart';

void main() {
  group('标题锚点（与网页 headingId 一致）', () {
    test('保留中文，去掉标点，空格换成连字符', () {
      expect(headingId('梦开始的地方 —— CS61A'), '梦开始的地方-cs61a');
      expect(headingId('Visual Studio Code 与 chat.py'), 'visual-studio-code-与-chatpy');
      expect(headingId('？！'), 'section');
    });
  });

  group('公告预览文字', () {
    test('去掉单独成行的图片，其余原样保留', () {
      expect(
        plainText('本周四改到周五。\n![](https://x/y.png)\n地点不变。'),
        '本周四改到周五。\n地点不变。',
      );
    });
  });

  group('本机导入的课程包', () {
    test('格式正确时没有问题', () {
      expect(
        LocalLibrary.check({
          'format': 'hiana-course@1',
          'slug': 'my-course',
          'title': '我的课',
          'modules': [
            {'id': 'm', 'title': 'M', 'items': []},
          ],
        }),
        isEmpty,
      );
    });

    test('格式不对时列出问题', () {
      final errs = LocalLibrary.check({'slug': 'Bad Slug', 'modules': {}});
      expect(errs.length, 4);
      expect(LocalLibrary.check([1, 2]), ['课程包应该是一个 JSON 对象']);
    });

    test('local- 前缀', () {
      expect(isLocalSlug('local-x'), isTrue);
      expect(isLocalSlug('cs50x'), isFalse);
    });
  });
}
