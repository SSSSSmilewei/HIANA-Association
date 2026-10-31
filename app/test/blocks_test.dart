import 'package:flutter_test/flutter_test.dart';
import 'package:hiana_app/data/blocks.dart';

void main() {
  final block = Block.fromJson({
    'slug': 'x',
    'title': '测试知识块',
    'nodes': [
      {'course': 'a', 'periods': 10},
      {
        'title': '选一门',
        'pick': 1,
        'children': [
          {'course': 'b', 'periods': 30},
          {'course': 'c', 'periods': 20},
        ],
      },
      {
        'title': '选学',
        'optional': true,
        'children': [
          {'course': 'd', 'periods': 99},
        ],
      },
      {
        'link': {'label': '网站', 'url': 'https://example.com'},
      },
    ],
  });

  double Function(String) p(Map<String, double> m) => (s) => m[s] ?? 0;

  test('课时：pick 只算最少的，选学不算', () {
    expect(block.periods, 30);
    expect(block.nodes[3].kind, BlockNodeKind.link);
  });

  test('下一步和完成度', () {
    expect(block.nextCourse(p({}))?.course, 'a');
    expect(block.nextCourse(p({'a': 1}))?.course, 'b');
    expect(block.nextCourse(p({'a': 1, 'c': 0.5}))?.course, 'c');
    expect(block.nextCourse(p({'a': 1, 'c': 1})), isNull);
    expect(block.ratio(p({'a': 1, 'c': 1})), 1);
    expect(block.nodes[1].ratio(p({'b': 0.5})), 0.5);
  });
}
