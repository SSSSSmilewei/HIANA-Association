// 接口数据解析：和后端 /api/auth/me、/api/notices 的返回对得上。
import 'package:flutter_test/flutter_test.dart';
import 'package:hiana_app/data/models.dart';

void main() {
  test('游客和成员', () {
    expect(Me.fromJson({'role': null}).isGuest, true);
    final me = Me.fromJson({
      'role': 'member',
      'isAdmin': true,
      'member': {'id': 'u1', 'studentNo': '254030411', 'name': '会长', 'displayName': '老会长', 'className': null},
    });
    expect(me.isMember, true);
    expect(me.isAdmin, true);
    expect(me.member!.name, '会长');
    expect(me.member!.displayName, '老会长');
    // 以前的会长会话（没有 member）当作游客
    expect(Me.fromJson({'role': 'admin', 'isAdmin': true}).isGuest, true);
  });

  test('游客看到的比赛：没有名单，只有人数', () {
    Map<String, dynamic> notice(Map<String, dynamic> extra) => {
          'id': 'n1',
          'kind': 'competition',
          'title': '蓝桥杯',
          'body': '',
          'tags': <String>[],
          'pinned': false,
          'createdAt': 0,
          'joined': false,
          ...extra,
        };
    final guest = Notice.fromJson(notice({'entries': <dynamic>[], 'entryCount': 3}));
    expect(guest.entries, isEmpty);
    expect(guest.entryCount, 3);
    // 旧后端没有 entryCount：按名单长度算
    final old = Notice.fromJson(notice({
      'entries': [
        {'name': '林同学', 'team': null, 'contact': null},
      ],
    }));
    expect(old.entryCount, 1);
  });

  test('课程：模块 → 条目，练手题数量和做对的题；只有介绍的课没有条目', () {
    final hosted = CourseDetail.fromJson({
      'course': {
        'slug': 'cs50x',
        'title': 'CS50x',
        'titleEn': "CS50's Introduction to Computer Science",
        'category': '编程入门',
        'provider': 'Harvard',
        'difficulty': 2,
        'license': 'CC BY-NC-SA 4.0',
        'links': [
          {'kind': 'video', 'label': 'YouTube', 'url': 'https://youtube.com/'},
        ],
        'modules': [
          {
            'id': 'week-1',
            'title': '第 1 周：C',
            'items': [
              {
                'id': 'w1-pset',
                'title': '习题集 1',
                'kind': 'assignment',
                'periods': 8,
                'pages': [
                  {'id': 'pset-1', 'title': '要做什么'},
                  {'id': 'pset-1-mario-less', 'title': 'Mario（简单版）'},
                ],
                'practice': 5,
              },
              {'id': 'w1-lab', 'title': '实验', 'kind': 'lab', 'periods': 2, 'pages': <dynamic>[], 'practice': 0},
            ],
          },
        ],
      },
      'enrollment': null,
      'done': {'w1-pset': 1},
      'solved': {
        'w1-pset': ['q1', 'q2'],
      },
      'peers': <dynamic>[],
    });
    expect(hosted.items.first.pages.length, 2);
    expect(hosted.items.first.kindLabel, '作业');
    expect(hosted.items.first.isTask, true);
    expect(hosted.items.first.practiceTotal, 5);
    expect(hosted.solved['w1-pset'], {'q1', 'q2'});
    // 没有页面的条目用条目 id 进入
    expect(hosted.next!.entry, 'w1-lab');
    expect(hosted.links.single.kind, 'video');

    final linked = CourseSummary.fromJson({
      'slug': 'cs61a',
      'title': 'CS61A',
      'category': '编程入门',
      'provider': 'UC Berkeley',
      'difficulty': 3,
      'itemCount': 0,
      'learners': 0,
      'enrollment': {'status': 'done'},
      'progress': {'doneItems': 0, 'items': 0, 'donePeriods': 0, 'totalPeriods': 0, 'ratio': 0},
    });
    expect(linked.hosted, false);
    expect(linked.enrollStatus, 'done');
    expect(linked.matches('berkeley'), true);
    expect(linked.matches('哈佛'), false);
    expect(stars(3), '★★★☆☆');
    expect(stars(0), '');
  });

  test('课程包：介绍、练手题（单选、多选、填空、代码）', () {
    final p = CoursePackage.fromJson({
      'slug': 'x',
      'intro': {
        'community': '中文介绍',
        'official': '官方介绍',
        'officialSource': {'kind': 'website', 'label': 'x.edu', 'url': 'https://x.edu/'},
      },
      'modules': [
        {
          'id': 'm',
          'title': 'm',
          'items': [
            {
              'id': 'a',
              'title': 'A',
              'kind': 'lecture',
              'pages': [
                {'id': 'a1', 'title': '讲义', 'body': '# 你好'},
              ],
              'practice': [
                {'id': 'q1', 'type': 'choice', 'prompt': '1+1', 'options': ['1', '2'], 'answer': 1},
                {'id': 'q2', 'type': 'choice', 'prompt': '偶数', 'options': ['1', '2', '4'], 'answer': [1, 2]},
                {'id': 'q3', 'type': 'text', 'prompt': '输出函数', 'answer': ['print', 'print()']},
                {'id': 'q4', 'type': 'code', 'lang': 'python', 'prompt': 'hello', 'tests': <dynamic>[]},
              ],
            },
            {'id': 'b', 'title': 'B', 'kind': 'lab'},
          ],
        },
      ],
    });
    expect(p.officialSource!.label, 'x.edu');
    final (item, page) = p.locate('a1')!;
    expect(item.id, 'a');
    expect(page!.body, '# 你好');
    expect(p.locate('b')!.$2, isNull);
    final qs = item.practice;
    expect(qs[0].choiceAnswer, {1});
    expect(qs[0].multi, false);
    expect(qs[1].multi, true);
    expect(qs[1].heading, '多选');
    expect(qs[2].checkText('  Print '), true);
    expect(qs[2].checkText('echo'), false);
    expect(qs[3].heading, 'Python');
  });
}
