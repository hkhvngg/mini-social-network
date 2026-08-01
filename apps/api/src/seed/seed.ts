import { NestFactory } from '@nestjs/core';
import * as argon2 from 'argon2';
import neo4j, { Integer } from 'neo4j-driver';
import { AppModule } from '../app.module';
import { Neo4jService } from '../neo4j/neo4j.service';

const DEMO_PASSWORD = 'MisonetDemo@2026';

const people = [
  [
    'an.nguyen',
    'An Nguyễn',
    'Thiết kế sản phẩm, cà phê và những chuyến đi ngắn.',
    false,
  ],
  [
    'binh.tran',
    'Bình Trần',
    'Kỹ sư phần mềm, thích xây sản phẩm có ích.',
    false,
  ],
  [
    'chi.le',
    'Chi Lê',
    'Nhiếp ảnh đường phố và những câu chuyện đời thường.',
    false,
  ],
  ['dung.pham', 'Dũng Phạm', 'Chạy bộ mỗi sáng, đọc sách mỗi tối.', false],
  ['giang.vo', 'Giang Võ', 'Marketing, âm nhạc và cộng đồng sáng tạo.', false],
  ['han.ngo', 'Hân Ngô', 'Học mỗi ngày và chia sẻ điều hữu ích.', true],
  ['khoa.do', 'Khoa Đỗ', 'Frontend developer, mê typography.', false],
  ['lan.bui', 'Lan Bùi', 'Ẩm thực Việt và những khu vườn nhỏ.', false],
  ['minh.hoang', 'Minh Hoàng', 'Data, graph và các bài toán kết nối.', false],
  ['ngoc.dang', 'Ngọc Đặng', 'Đọc, viết và sống chậm hơn một chút.', true],
  ['phuc.ly', 'Phúc Lý', 'Video creator và người kể chuyện.', false],
  ['thao.mai', 'Thảo Mai', 'Product manager, luôn tò mò về con người.', false],
] as const;

const postContents = [
  'Sáng nay thành phố dịu hơn sau cơn mưa. Chúc mọi người một ngày nhiều năng lượng!',
  'Vừa hoàn thành một tính năng nhỏ nhưng giải quyết đúng nỗi đau của người dùng. Cảm giác thật tuyệt.',
  'Một bức ảnh đẹp không nhất thiết phải hoàn hảo, chỉ cần giữ được cảm xúc thật.',
  '5 km đầu tuần. Không nhanh, nhưng đều đặn luôn quan trọng hơn bứt tốc.',
  'Ý tưởng tốt thường xuất hiện khi chúng ta chịu khó lắng nghe thêm một câu chuyện.',
  'Hôm nay học được cách đặt câu hỏi tốt hơn. Đôi khi câu hỏi đúng quý hơn câu trả lời nhanh.',
  'Khoảng trắng cũng là một thành phần của thiết kế, không phải phần còn thừa.',
  'Bữa cơm nhà đơn giản nhưng luôn là nơi mình muốn quay về.',
  'Graph database làm những mối quan hệ phức tạp trở nên rất trực quan.',
  'Đang đọc lại một cuốn sách cũ và phát hiện mình đã là một người đọc khác.',
  'Kể chuyện bằng video là nghệ thuật lựa chọn điều gì nên giữ lại trong từng khung hình.',
  'Một roadmap tốt phải để lại đủ chỗ cho những điều đội ngũ chưa biết.',
  'Cuối tuần này mọi người có địa điểm nào yên tĩnh để đọc sách không?',
  'Code review tốt không chỉ tìm lỗi, mà còn chia sẻ bối cảnh và nâng chất lượng chung.',
  'Ánh sáng cuối ngày luôn biến những góc phố quen thành một câu chuyện khác.',
  'Tiến bộ hôm nay: thêm 500 mét và vẫn giữ được nhịp thở ổn định.',
  'Cộng đồng mạnh được xây từ những cuộc trò chuyện chân thành và đều đặn.',
  'Ghi chú nhỏ: hãy dành thời gian tổng kết điều đã học trước khi bắt đầu chủ đề mới.',
  'Một giao diện tốt nên khiến người dùng tập trung vào nội dung, không phải cách dùng giao diện.',
  'Mẻ bánh đầu tiên chưa đẹp nhưng cả nhà đã ăn hết trong vài phút.',
  'Dữ liệu có cấu trúc tốt giúp đội sản phẩm trả lời được những câu hỏi tốt hơn.',
  'Có những ngày chỉ cần viết được một đoạn thật lòng cũng đã là đủ.',
  'Video mới đã dựng xong. Phần khó nhất vẫn là cắt bỏ những cảnh mình yêu thích.',
  'Thử nghiệm nhỏ, đo lường rõ ràng, học nhanh rồi mới mở rộng.',
] as const;

const iso = (day: number, hour: number) =>
  `2026-07-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00Z`;

async function seed(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });
  const database = app.get(Neo4jService);

  try {
    const passwordHash = await argon2.hash(DEMO_PASSWORD, {
      type: argon2.argon2id,
    });
    const personRows = people.map(
      ([username, fullName, bio, isPrivate], index) => ({
        personId: `DEMO-P${String(index + 1).padStart(3, '0')}`,
        username: `demo.${username}`,
        email: `demo.${username}@misonet.local`,
        passwordHash,
        fullName,
        bio,
        isPrivate,
        createdAt: iso(1 + index, 8),
      }),
    );

    const constraints = [
      'CREATE CONSTRAINT person_id_unique IF NOT EXISTS FOR (person:Person) REQUIRE person.personId IS UNIQUE',
      'CREATE CONSTRAINT person_username_unique IF NOT EXISTS FOR (person:Person) REQUIRE person.username IS UNIQUE',
      'CREATE CONSTRAINT person_email_unique IF NOT EXISTS FOR (person:Person) REQUIRE person.email IS UNIQUE',
      'CREATE CONSTRAINT post_id_unique IF NOT EXISTS FOR (post:Post) REQUIRE post.postId IS UNIQUE',
      'CREATE CONSTRAINT comment_id_unique IF NOT EXISTS FOR (comment:Comment) REQUIRE comment.commentId IS UNIQUE',
    ];
    for (const statement of constraints) await database.executeWrite(statement);

    await database.executeWrite(
      `UNWIND $people AS item
       MERGE (person:Person {personId: item.personId})
       SET person.username = item.username,
           person.email = item.email,
           person.passwordHash = item.passwordHash,
           person.fullName = item.fullName,
           person.bio = item.bio,
           person.avatarUrl = null,
           person.isPrivate = item.isPrivate,
           person.createdAt = datetime(item.createdAt),
           person.updatedAt = datetime()`,
      { people: personRows },
    );

    const followPairs = new Set<string>();
    for (let index = 0; index < people.length; index += 1) {
      for (const offset of [1, 2]) {
        const target = (index + offset) % people.length;
        followPairs.add(`${index}:${target}`);
        if (offset === 1 || index % 3 === 0)
          followPairs.add(`${target}:${index}`);
      }
    }
    const follows = [...followPairs].map((pair, index) => {
      const [from, to] = pair.split(':').map(Number);
      return {
        fromId: personRows[from].personId,
        toId: personRows[to].personId,
        followedAt: iso(8 + (index % 15), 9 + (index % 8)),
      };
    });
    await database.executeWrite(
      `UNWIND $follows AS item
       MATCH (from:Person {personId: item.fromId})
       MATCH (to:Person {personId: item.toId})
       MERGE (from)-[follow:FOLLOW]->(to)
       SET follow.followedAt = datetime(item.followedAt)`,
      { follows },
    );
    await database.executeWrite(
      `MATCH (left:Person)-[first:FOLLOW]->(right:Person)-[second:FOLLOW]->(left)
       WHERE left.personId STARTS WITH $prefix
         AND right.personId STARTS WITH $prefix
         AND left.personId < right.personId
       MERGE (left)-[friend:FRIEND]->(right)
       SET friend.since = CASE
             WHEN first.followedAt > second.followedAt THEN first.followedAt
             ELSE second.followedAt END,
           friend.source = 'MUTUAL_FOLLOW'`,
      { prefix: 'DEMO-' },
    );

    const posts = postContents.map((content, index) => ({
      postId: `DEMO-POST-${String(index + 1).padStart(3, '0')}`,
      authorId: personRows[index % people.length].personId,
      content,
      privacy:
        index % 11 === 0 ? 'PRIVATE' : index % 5 === 0 ? 'FRIENDS' : 'PUBLIC',
      createdAt: iso(8 + (index % 18), 7 + (index % 12)),
    }));
    await database.executeWrite(
      `UNWIND $posts AS item
       MATCH (author:Person {personId: item.authorId})
       MERGE (post:Post {postId: item.postId})
       SET post.content = item.content,
           post.imageUrl = null,
           post.privacy = item.privacy,
           post.createdAt = datetime(item.createdAt),
           post.updatedAt = datetime(item.createdAt)
       MERGE (author)-[posted:POSTED]->(post)
       SET posted.postedAt = datetime(item.createdAt)`,
      { posts },
    );

    const publicPosts = posts.filter((post) => post.privacy === 'PUBLIC');
    const likes = publicPosts.flatMap((post, postIndex) =>
      [1, 3, 5, 8].map((offset) => ({
        personId: personRows[(postIndex + offset) % people.length].personId,
        postId: post.postId,
        likedAt: iso(10 + (postIndex % 16), 10 + (offset % 8)),
      })),
    );
    await database.executeWrite(
      `UNWIND $likes AS item
       MATCH (person:Person {personId: item.personId})
       MATCH (post:Post {postId: item.postId})
       MERGE (person)-[like:LIKES]->(post)
       SET like.likedAt = datetime(item.likedAt), like.reaction = 'LIKE'`,
      { likes },
    );

    const comments = publicPosts.flatMap((post, postIndex) =>
      [1, 2].map((offset) => ({
        commentId: `DEMO-COMMENT-${String(postIndex * 2 + offset).padStart(3, '0')}`,
        personId: personRows[(postIndex + offset + 2) % people.length].personId,
        postId: post.postId,
        content:
          offset === 1
            ? 'Mình rất đồng cảm với chia sẻ này. Cảm ơn bạn!'
            : 'Góc nhìn thú vị, mong được đọc thêm những bài tiếp theo.',
        createdAt: iso(12 + (postIndex % 14), 12 + offset),
      })),
    );
    await database.executeWrite(
      `UNWIND $comments AS item
       MATCH (author:Person {personId: item.personId})
       MATCH (post:Post {postId: item.postId})
       MERGE (comment:Comment {commentId: item.commentId})
       SET comment.content = item.content,
           comment.createdAt = datetime(item.createdAt),
           comment.updatedAt = datetime(item.createdAt)
       MERGE (author)-[commented:COMMENTED]->(comment)
       SET commented.commentedAt = datetime(item.createdAt)
       MERGE (comment)-[:ON_POST]->(post)`,
      { comments },
    );

    const reposts = publicPosts
      .filter((_, index) => index % 2 === 0)
      .map((post, index) => ({
        personId: personRows[(index + 4) % people.length].personId,
        postId: post.postId,
        at: iso(15 + (index % 10), 16),
      }));
    await database.executeWrite(
      `UNWIND $reposts AS item
       MATCH (person:Person {personId: item.personId})
       MATCH (post:Post {postId: item.postId})
       MERGE (person)-[repost:REPOSTED]->(post)
       SET repost.repostedAt = datetime(item.at)`,
      { reposts },
    );

    const shares = publicPosts.map((post, index) => ({
      personId: personRows[(index + 6) % people.length].personId,
      postId: post.postId,
      channel: index % 3 === 0 ? 'NATIVE' : 'COPY',
      at: iso(16 + (index % 9), 18),
    }));
    await database.executeWrite(
      `UNWIND $shares AS item
       MATCH (person:Person {personId: item.personId})
       MATCH (post:Post {postId: item.postId})
       MERGE (person)-[share:SHARED]->(post)
       SET share.sharedAt = datetime(item.at), share.channel = item.channel`,
      { shares },
    );

    const result = await database.executeRead<{
      people: Integer | number;
      posts: Integer | number;
      comments: Integer | number;
      follows: Integer | number;
      friends: Integer | number;
      likes: Integer | number;
      reposts: Integer | number;
      shares: Integer | number;
    }>(
      `MATCH (person:Person) WHERE person.personId STARTS WITH $prefix
       OPTIONAL MATCH (person)-[relationship]->(target)
       WITH count(DISTINCT person) AS people,
            count(DISTINCT CASE WHEN type(relationship) = 'FOLLOW' THEN relationship END) AS follows,
            count(DISTINCT CASE WHEN type(relationship) = 'FRIEND' THEN relationship END) AS friends,
            count(DISTINCT CASE WHEN type(relationship) = 'LIKES' THEN relationship END) AS likes,
            count(DISTINCT CASE WHEN type(relationship) = 'REPOSTED' THEN relationship END) AS reposts,
            count(DISTINCT CASE WHEN type(relationship) = 'SHARED' THEN relationship END) AS shares
       MATCH (post:Post) WHERE post.postId STARTS WITH $prefix
       OPTIONAL MATCH (comment:Comment)-[:ON_POST]->(post)
       RETURN people, count(DISTINCT post) AS posts,
              count(DISTINCT comment) AS comments,
              follows, friends, likes, reposts, shares`,
      { prefix: 'DEMO-' },
    );
    const record = result.records[0];
    if (record) {
      const keys = [
        'people',
        'posts',
        'comments',
        'follows',
        'friends',
        'likes',
        'reposts',
        'shares',
      ] as const;
      const summary = Object.fromEntries(
        keys.map((key) => {
          const value = record.get(key);
          return [key, neo4j.isInt(value) ? value.toNumber() : value];
        }),
      );
      console.log('Misonet demo seed completed:', summary);
      console.log(`Demo login: demo.an.nguyen / ${DEMO_PASSWORD}`);
    }
  } finally {
    await app.close();
  }
}

void seed().catch((error: unknown) => {
  console.error(
    'Misonet demo seed failed:',
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
