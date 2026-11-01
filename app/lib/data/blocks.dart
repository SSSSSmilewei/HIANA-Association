/// 知识块（hiana-block@1）：一个方向的路线图，把很多门课按阶段收在一起。
/// 格式和计算规则跟网站 src/shared/blocks.ts 一致：
/// 节点是分组（children，pick = 几门里选几门，optional = 选学）、课程（course）或链接（link）；
/// 课程节点的 courseTitle、periods 由网站构建时补上。
library;

class BlockSummary {
  const BlockSummary({
    required this.slug,
    required this.title,
    required this.summary,
    required this.audience,
    required this.courses,
    required this.periods,
  });
  final String slug;
  final String title;
  final String summary;
  final String audience;
  final List<String> courses;
  final int periods;

  factory BlockSummary.fromJson(Map<String, dynamic> j) => BlockSummary(
    slug: j['slug'] as String,
    title: j['title'] as String,
    summary: j['summary'] as String? ?? '',
    audience: j['audience'] as String? ?? '',
    courses: (j['courses'] as List? ?? const []).cast<String>(),
    periods: (j['periods'] as num? ?? 0).toInt(),
  );
}

enum BlockNodeKind { group, course, link }

class BlockNode {
  const BlockNode({
    this.title,
    this.note,
    this.course,
    this.courseTitle,
    this.itemTitles = const [],
    this.linkLabel,
    this.linkUrl,
    this.children = const [],
    this.pick,
    this.optional = false,
    this.periods = 0,
  });
  final String? title;
  final String? note;
  final String? course;
  final String? courseTitle;
  final List<String> itemTitles;
  final String? linkLabel;
  final String? linkUrl;
  final List<BlockNode> children;
  final int? pick;
  final bool optional;
  final int periods;

  BlockNodeKind get kind => course != null
      ? BlockNodeKind.course
      : linkUrl != null
      ? BlockNodeKind.link
      : BlockNodeKind.group;

  factory BlockNode.fromJson(Map<String, dynamic> j) {
    final link = j['link'] as Map<String, dynamic>?;
    return BlockNode(
      title: j['title'] as String?,
      note: j['note'] as String?,
      course: j['course'] as String?,
      courseTitle: j['courseTitle'] as String?,
      itemTitles: (j['itemTitles'] as List? ?? const []).cast<String>(),
      linkLabel: link?['label'] as String?,
      linkUrl: link?['url'] as String?,
      children: (j['children'] as List? ?? const [])
          .map((e) => BlockNode.fromJson(e as Map<String, dynamic>))
          .toList(),
      pick: (j['pick'] as num?)?.toInt(),
      optional: j['optional'] == true,
      periods: (j['periods'] as num? ?? 0).toInt(),
    );
  }

  /// 完成度 0–1；链接节点和没有必学内容的分组是 null。
  double? ratio(double Function(String slug) progress) {
    switch (kind) {
      case BlockNodeKind.course:
        return progress(course!);
      case BlockNodeKind.link:
        return null;
      case BlockNodeKind.group:
        final kids = children
            .where((c) => !c.optional)
            .map((c) => c.ratio(progress))
            .whereType<double>()
            .toList();
        if (kids.isEmpty) return null;
        if (pick != null) {
          kids.sort((a, b) => b.compareTo(a));
          final want = pick! < kids.length ? pick! : kids.length;
          return kids.take(want).fold<double>(0, (a, b) => a + b) / want;
        }
        return kids.fold<double>(0, (a, b) => a + b) / kids.length;
    }
  }

  /// 必学部分的课时：pick N 只算课时最少的 N 个，选学不算。
  int get requiredPeriods {
    if (optional) return 0;
    return _periods;
  }

  int get _periods {
    switch (kind) {
      case BlockNodeKind.course:
        return periods;
      case BlockNodeKind.link:
        return 0;
      case BlockNodeKind.group:
        final kids = children.where((c) => !c.optional).map((c) => c._periods);
        if (pick != null) {
          final sorted = kids.toList()..sort();
          return sorted.take(pick!).fold(0, (a, b) => a + b);
        }
        return kids.fold(0, (a, b) => a + b);
    }
  }
}

class Block {
  const Block({
    required this.slug,
    required this.title,
    required this.summary,
    required this.audience,
    required this.intro,
    required this.nodes,
    required this.next,
  });
  final String slug;
  final String title;
  final String summary;
  final String audience;
  final String intro;
  final List<BlockNode> nodes;
  final List<String> next;

  factory Block.fromJson(Map<String, dynamic> j) => Block(
    slug: j['slug'] as String,
    title: j['title'] as String,
    summary: j['summary'] as String? ?? '',
    audience: j['audience'] as String? ?? '',
    intro: j['intro'] as String? ?? '',
    nodes: (j['nodes'] as List? ?? const [])
        .map((e) => BlockNode.fromJson(e as Map<String, dynamic>))
        .toList(),
    next: (j['next'] as List? ?? const []).cast<String>(),
  );

  BlockNode get _root => BlockNode(children: nodes, title: title);

  int get periods => _root.requiredPeriods;

  double ratio(double Function(String slug) progress) =>
      _root.ratio(progress) ?? 0;

  /// 下一步：按顺序第一门没学完的必学课；pick 组里已经开始学的课优先。
  BlockNode? nextCourse(double Function(String slug) progress) {
    BlockNode? find(BlockNode n) {
      if (n.optional) return null;
      switch (n.kind) {
        case BlockNodeKind.course:
          return progress(n.course!) < 1 ? n : null;
        case BlockNodeKind.link:
          return null;
        case BlockNodeKind.group:
          var kids = n.children;
          if (n.pick != null) {
            if ((n.ratio(progress) ?? 0) >= 1) return null;
            final started = kids.where(
              (c) => !c.optional && (c.ratio(progress) ?? 0) > 0,
            );
            kids = [...started, ...kids];
          }
          for (final c in kids) {
            final x = find(c);
            if (x != null) return x;
          }
          return null;
      }
    }

    return find(_root);
  }
}

/// 课时 → “约 N 小时”（一节 45 分钟）
String blockHours(int periods) =>
    periods > 0 ? '约 ${(periods * 45 / 60).round()} 小时' : '';
