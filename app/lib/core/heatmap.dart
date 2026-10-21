/// 统一热力图：移植自网页端 src/shared/heatmap.ts，两边的日期和分档规则必须一致。
///
/// 约定（和网页端相同）：
///  - 日期一律用北京时间（UTC+8）的 "YYYY-MM-DD"。
///  - 每个来源各自算颜色深浅（提交数和做题数单位不同，不能直接相加）。
///  - 总览那一行取“当天各来源里最深的一档”，并记下当天有几个来源有活动。
library;

typedef Daily = Map<String, int>;

class SourceSeries {
  const SourceSeries({
    required this.source,
    required this.label,
    required this.unit,
    required this.days,
    this.error,
    this.syncedAt,
  });

  final String source; // provider id，例如 "github"；站内记录是 "site"
  final String label;
  final String unit;
  final Daily days;
  final String? error; // 同步失败时的原因；失败不影响其他来源
  final int? syncedAt;

  factory SourceSeries.fromJson(Map<String, dynamic> j) => SourceSeries(
        source: j['source'] as String,
        label: j['label'] as String,
        unit: j['unit'] as String? ?? '',
        days: (j['days'] as Map<String, dynamic>? ?? const {})
            .map((k, v) => MapEntry(k, (v as num).toInt())),
        error: j['error'] as String?,
        syncedAt: (j['syncedAt'] as num?)?.toInt(),
      );
}

const _cnOffset = Duration(hours: 8);

String _ymd(DateTime utc) => utc.toIso8601String().substring(0, 10);

/// Unix 毫秒 → 北京时间日期字符串。
String cnDate(int ms) =>
    _ymd(DateTime.fromMillisecondsSinceEpoch(ms, isUtc: true).add(_cnOffset));

/// 日期字符串加减天数。
String addDays(String date, int n) =>
    _ymd(DateTime.parse('${date}T00:00:00Z').add(Duration(days: n)));

/// 星期几，周一 = 0 … 周日 = 6（国内习惯周一开头）。
int weekdayMon0(String date) => DateTime.parse('${date}T00:00:00Z').weekday - 1;

/// 只保留 [from, to] 之间的日期（含两端）。
Daily clip(Daily days, String from, String to) => {
      for (final e in days.entries)
        if (e.key.compareTo(from) >= 0 && e.key.compareTo(to) <= 0 && e.value > 0)
          e.key: e.value,
    };

/// 颜色分档：0 是没有活动；其余按这个来源自己的非零天数的四分位分成 1–4 档，
/// 和 GitHub 的做法一致。这样一个月只提交几次的人也能看到深浅变化。
int Function(int count) levelScale(Daily days) {
  final values = days.values.where((v) => v > 0).toList()..sort();
  if (values.isEmpty) return (_) => 0;
  int q(double p) => values[(p * (values.length - 1)).floor()];
  final q1 = q(0.25), q2 = q(0.5), q3 = q(0.75);
  final max = values.last;
  return (count) {
    if (count <= 0) return 0;
    if (count >= max) return 4; // 这个来源最活跃的那几天总是最深
    if (count <= q1) return 1;
    if (count <= q2) return 2;
    if (count <= q3) return 3;
    return 4;
  };
}

class Cell {
  const Cell({required this.date, required this.count, required this.level, required this.inRange});
  final String date;
  final int count; // 单个来源：次数；总览：有活动的来源个数
  final int level; // 0–4
  final bool inRange; // 第一列 / 最后一列里落在范围外的格子
}

class MonthLabel {
  const MonthLabel(this.week, this.label);
  final int week;
  final String label;
}

class Grid {
  const Grid({
    required this.from,
    required this.to,
    required this.weeks,
    required this.monthLabels,
    required this.activeDays,
    required this.total,
  });
  final String from;
  final String to;
  final List<List<Cell>> weeks; // 每列一周，周一在上
  final List<MonthLabel> monthLabels;
  final int activeDays;
  final int total;
}

const _months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

/// 截止到 [to]（含）往前 [weeks] 周的网格。
Grid buildGrid(Daily days, String to, {int weeks = 53, int Function(String date, int count)? levelOf}) {
  final lastMonday = addDays(to, -weekdayMon0(to));
  final firstMonday = addDays(lastMonday, -(weeks - 1) * 7);
  final scale = levelScale(clip(days, firstMonday, to));
  final lv = levelOf ?? (String _, int c) => scale(c);
  final cols = <List<Cell>>[];
  final monthLabels = <MonthLabel>[];
  var activeDays = 0;
  var total = 0;
  var lastMonth = -1;
  for (var w = 0; w < weeks; w++) {
    final col = <Cell>[];
    for (var d = 0; d < 7; d++) {
      final date = addDays(firstMonday, w * 7 + d);
      final inRange = date.compareTo(to) <= 0;
      final count = inRange ? (days[date] ?? 0) : 0;
      if (inRange && count > 0) {
        activeDays++;
        total += count;
      }
      col.add(Cell(date: date, count: count, level: inRange ? lv(date, count) : 0, inRange: inRange));
    }
    final month = int.parse(col.first.date.substring(5, 7)) - 1;
    if (month != lastMonth) {
      // 太靠近上一个标签就不标，免得挤在一起
      if (monthLabels.isEmpty || w - monthLabels.last.week >= 3) monthLabels.add(MonthLabel(w, _months[month]));
      lastMonth = month;
    }
    cols.add(col);
  }
  return Grid(from: firstMonday, to: to, weeks: cols, monthLabels: monthLabels, activeDays: activeDays, total: total);
}

/// 总览：每天取各来源里最深的一档；count 记有活动的来源个数。失败的来源（有 error）不参与。
Grid overview(List<SourceSeries> series, String to, {int weeks = 53}) {
  final ok = series.where((s) => s.error == null);
  final sources = <String, int>{};
  final best = <String, int>{};
  for (final s in ok) {
    final g = buildGrid(s.days, to, weeks: weeks);
    for (final col in g.weeks) {
      for (final c in col) {
        if (!c.inRange || c.count == 0) continue;
        sources[c.date] = (sources[c.date] ?? 0) + 1;
        final prev = best[c.date] ?? 0;
        if (c.level > prev) best[c.date] = c.level;
      }
    }
  }
  return buildGrid(sources, to, weeks: weeks, levelOf: (date, _) => best[date] ?? 0);
}
