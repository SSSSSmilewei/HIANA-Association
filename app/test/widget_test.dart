// 热力图移植检查：结果要和网页端 src/shared/heatmap.ts 一致。
// 文件名沿用 widget_test.dart，这样 flutter create 不会再生成引用 MyApp 的示例测试。
import 'package:flutter_test/flutter_test.dart';
import 'package:hiana_app/core/heatmap.dart';

void main() {
  test('北京时间日期与周一开头', () {
    // 2026-10-21 16:30 UTC = 北京时间 10 月 22 日 00:30
    expect(cnDate(DateTime.utc(2026, 10, 21, 16, 30).millisecondsSinceEpoch), '2026-10-22');
    expect(weekdayMon0('2026-10-19'), 0); // 周一
    expect(weekdayMon0('2026-10-25'), 6); // 周日
    expect(addDays('2026-12-31', 1), '2027-01-01');
  });

  test('分档按自己的非零天数四分位', () {
    final scale = levelScale({'a': 1, 'b': 2, 'c': 3, 'd': 4, 'e': 10});
    expect(scale(0), 0);
    expect(scale(1), 1);
    expect(scale(10), 4); // 最活跃的那天总是最深
  });

  test('网格截止到今天，未来的格子不算', () {
    final g = buildGrid({'2026-10-20': 3, '2026-10-21': 1}, '2026-10-21', weeks: 2);
    expect(g.weeks.length, 2);
    expect(g.activeDays, 2);
    expect(g.total, 4);
    expect(g.weeks.last[3].inRange, false); // 周四在今天之后
  });

  test('总览取各来源当天最深的一档，失败的来源不算', () {
    final series = [
      const SourceSeries(source: 'github', label: 'GitHub', unit: '次提交', days: {'2026-10-21': 5}),
      const SourceSeries(source: 'leetcode', label: '力扣', unit: '题', days: {'2026-10-21': 1}, error: '接口超时'),
    ];
    final g = overview(series, '2026-10-21', weeks: 1);
    final today = g.weeks.single[2];
    expect(today.count, 1); // 只有 GitHub 计入
    expect(today.level, 4);
  });
}
