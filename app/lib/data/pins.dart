/// 蓝色钉子：钉在讲义某一段上的问题（格式见网站 src/worker/api/pins.ts）。
/// App 里能看、回复、点“我也想问”、标已解决；在正文上精确钉位置在网页上做。
library;

class PinMessage {
  const PinMessage({
    required this.id,
    required this.author,
    required this.agent,
    required this.mine,
    required this.body,
    required this.createdAt,
  });
  final int id;
  final String author;
  final bool agent;
  final bool mine;
  final String body;
  final int createdAt;

  factory PinMessage.fromJson(Map<String, dynamic> j) => PinMessage(
    id: (j['id'] as num).toInt(),
    author: j['author'] as String? ?? '',
    agent: j['agent'] == true,
    mine: j['mine'] == true,
    body: j['body'] as String? ?? '',
    createdAt: (j['createdAt'] as num? ?? 0).toInt(),
  );
}

class Pin {
  const Pin({
    required this.id,
    required this.anchorLabel,
    required this.status,
    required this.createdAt,
    required this.author,
    required this.mine,
    required this.answered,
    required this.votes,
    required this.voted,
    required this.messages,
  });
  final String id;
  final String? anchorLabel;
  final String status; // open | resolved
  final int createdAt;
  final String author;
  final bool mine;
  final bool answered;
  final int votes;
  final bool voted;
  final List<PinMessage> messages;

  bool get resolved => status == 'resolved';

  factory Pin.fromJson(Map<String, dynamic> j) => Pin(
    id: j['id'] as String,
    anchorLabel: j['anchorLabel'] as String?,
    status: j['status'] as String? ?? 'open',
    createdAt: (j['createdAt'] as num? ?? 0).toInt(),
    author: j['author'] as String? ?? '',
    mine: j['mine'] == true,
    answered: j['answered'] == true,
    votes: (j['votes'] as num? ?? 0).toInt(),
    voted: j['voted'] == true,
    messages: (j['messages'] as List? ?? const [])
        .map((e) => PinMessage.fromJson(e as Map<String, dynamic>))
        .toList(),
  );
}
