import { NestFactory } from '@nestjs/core';
import * as argon2 from 'argon2';
import neo4j, { Integer } from 'neo4j-driver';
import { AppModule } from '../app.module';
import { Neo4jService } from '../neo4j/neo4j.service';
import { SCHEMA_STATEMENTS } from '../neo4j/schema.statements';

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

const additionalPeople = [
  [
    'bao.anh',
    'Bảo Anh',
    'Thích minh họa, sách tranh và những quán cà phê yên tĩnh.',
    false,
  ],
  [
    'chau.nguyen',
    'Châu Nguyễn',
    'Làm sản phẩm số và luôn tò mò về hành vi người dùng.',
    false,
  ],
  [
    'duc.anh',
    'Đức Anh',
    'Backend developer, mê hệ thống phân tán và chạy bộ.',
    false,
  ],
  [
    'gia.han',
    'Gia Hân',
    'Viết về cuộc sống, du lịch và những điều nhỏ bé.',
    true,
  ],
  [
    'hai.dang',
    'Hải Đăng',
    'Nhiếp ảnh, xe đạp và những cung đường ven biển.',
    false,
  ],
  [
    'hoai.an',
    'Hoài An',
    'Giáo viên, yêu sách và thích chia sẻ kiến thức.',
    false,
  ],
  [
    'huy.hoang',
    'Huy Hoàng',
    'Làm dữ liệu và kể chuyện bằng những con số.',
    false,
  ],
  [
    'khanh.linh',
    'Khánh Linh',
    'Thiết kế trải nghiệm và chăm sóc cây xanh.',
    true,
  ],
  [
    'lam.phuong',
    'Lâm Phương',
    'Yêu âm nhạc indie, phim ảnh và những đêm thành phố.',
    false,
  ],
  [
    'mai.anh',
    'Mai Anh',
    'Nấu ăn, làm bánh và lưu giữ công thức gia đình.',
    false,
  ],
  [
    'minh.chau',
    'Minh Châu',
    'Product designer, thích quan sát và đặt câu hỏi.',
    false,
  ],
  [
    'nam.khanh',
    'Nam Khánh',
    'Mobile developer, bóng đá và cà phê sáng.',
    false,
  ],
  ['nhat.ha', 'Nhật Hạ', 'Đọc sách, viết nhật ký và học cách sống chậm.', true],
  [
    'phuong.anh',
    'Phương Anh',
    'Truyền thông, sáng tạo nội dung và hoạt động cộng đồng.',
    false,
  ],
  [
    'quang.huy',
    'Quang Huy',
    'DevOps, mã nguồn mở và những chuyến trekking.',
    false,
  ],
  [
    'quynh.mai',
    'Quỳnh Mai',
    'Tâm lý học, giáo dục và những cuộc trò chuyện sâu.',
    false,
  ],
  [
    'son.tung',
    'Sơn Tùng',
    'Kiến trúc, ký họa và khám phá không gian đô thị.',
    false,
  ],
  ['thanh.ha', 'Thanh Hà', 'Chăm sóc sức khỏe, yoga và sống cân bằng.', true],
  [
    'thien.an',
    'Thiên An',
    'Lập trình frontend và yêu những giao diện tối giản.',
    false,
  ],
  [
    'thu.trang',
    'Thu Trang',
    'Thời trang bền vững, nhiếp ảnh và du lịch.',
    false,
  ],
  [
    'tuan.kiet',
    'Tuấn Kiệt',
    'An toàn thông tin, game và khoa học viễn tưởng.',
    false,
  ],
  [
    'uyen.nhi',
    'Uyên Nhi',
    'Làm phim, kể chuyện và ghi lại ký ức bằng hình ảnh.',
    false,
  ],
  [
    'viet.anh',
    'Việt Anh',
    'Kinh doanh nhỏ, công nghệ và trải nghiệm khách hàng.',
    false,
  ],
  [
    'xuan.bach',
    'Xuân Bách',
    'Thích bóng rổ, podcast và học điều mới mỗi ngày.',
    false,
  ],
  ['yen.nhi', 'Yến Nhi', 'Hoa, thủ công và những món quà làm bằng tay.', true],
  [
    'anh.khoa',
    'Anh Khoa',
    'Machine learning, dữ liệu mở và cà phê rang sáng.',
    false,
  ],
  [
    'bich.ngoc',
    'Bích Ngọc',
    'Biên tập viên, yêu tiếng Việt và những câu chuyện tử tế.',
    false,
  ],
  [
    'cong.minh',
    'Công Minh',
    'Kỹ sư phần cứng, IoT và thích tự làm mọi thứ.',
    false,
  ],
  [
    'diep.chi',
    'Diệp Chi',
    'Du lịch có trách nhiệm và khám phá văn hóa địa phương.',
    false,
  ],
  [
    'duy.khanh',
    'Duy Khánh',
    'Âm thanh, podcast và những cuộc trò chuyện chân thành.',
    false,
  ],
] as const;

const allPeople = [...people, ...additionalPeople] as const;

const locations = [
  'TP. Hồ Chí Minh',
  'Hà Nội',
  'Đà Nẵng',
  'TP. Hồ Chí Minh',
  'Hà Nội',
  'Cần Thơ',
  'Đà Nẵng',
  'Huế',
  'Hà Nội',
  'Đà Lạt',
  'TP. Hồ Chí Minh',
  'Hải Phòng',
] as const;

const interestSets = [
  ['Thiết kế', 'Cà phê', 'Du lịch'],
  ['Công nghệ', 'Đọc sách', 'Game'],
  ['Nhiếp ảnh', 'Du lịch', 'Điện ảnh'],
  ['Thể thao', 'Đọc sách', 'Sức khỏe'],
  ['Âm nhạc', 'Kinh doanh', 'Tình nguyện'],
  ['Đọc sách', 'Giáo dục', 'Công nghệ'],
  ['Công nghệ', 'Thiết kế', 'Typography'],
  ['Ẩm thực', 'Làm vườn', 'Du lịch'],
  ['Công nghệ', 'Dữ liệu', 'Đọc sách'],
  ['Đọc sách', 'Viết lách', 'Thiền'],
  ['Điện ảnh', 'Nhiếp ảnh', 'Du lịch'],
  ['Kinh doanh', 'Thiết kế', 'Tâm lý học'],
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

const additionalPostContents = [
  'Một bản phác thảo nhỏ hôm nay có thể là khởi đầu cho ý tưởng lớn ngày mai.',
  'Sản phẩm tốt bắt đầu từ việc lắng nghe đúng vấn đề của người dùng.',
  'Tối ưu được một truy vấn chậm, cảm giác nhẹ cả hệ thống lẫn đầu óc.',
  'Mỗi chuyến đi đều để lại một câu chuyện mà ảnh chụp chưa kể hết.',
  'Đạp xe ven biển sáng sớm là cách mình nạp lại năng lượng cho cả tuần.',
  'Một lớp học vui là nơi mọi người không ngại đặt những câu hỏi chưa hoàn chỉnh.',
  'Dữ liệu chỉ thật sự có ý nghĩa khi giúp chúng ta đưa ra quyết định tốt hơn.',
  'Góc làm việc có thêm một chậu cây, tự nhiên ngày dài cũng dịu lại.',
  'Có bài hát nghe lần đầu đã thấy như từng quen từ rất lâu.',
  'Mùi bánh mới ra lò luôn khiến căn bếp trở thành nơi ấm áp nhất nhà.',
  'Thiết kế hôm nay bớt đi ba chi tiết nhưng lại rõ ràng hơn rất nhiều.',
  'Một buổi đá bóng vui đôi khi hiệu quả hơn cả tuần nhắn tin trong nhóm.',
  'Đọc chậm một chương sách và ghi lại điều mình nghĩ là thói quen đáng giữ.',
  'Nội dung chân thành không cần quá cầu kỳ, chỉ cần đúng điều muốn nói.',
  'Tự động hóa một việc lặp lại nhỏ có thể tiết kiệm rất nhiều thời gian về sau.',
  'Lắng nghe không phải để trả lời ngay, mà để hiểu người đối diện rõ hơn.',
  'Thành phố nhìn từ một góc khác luôn có thêm những đường nét thú vị.',
  'Mười phút thở chậm giữa ngày giúp mình trở lại với công việc nhẹ nhàng hơn.',
  'Một trạng thái tải tốt cũng là cách giao diện nói rằng người dùng đang được quan tâm.',
  'Món đồ bền nhất thường là món mình hiểu rõ nguồn gốc và dùng thật lâu.',
  'Bảo mật tốt nên được xây từ đầu, không phải đợi có sự cố mới bổ sung.',
  'Đoạn phim ngắn hôm nay giữ lại đúng khoảnh khắc mọi người cùng bật cười.',
  'Khách hàng nhớ cảm giác được thấu hiểu lâu hơn những lời quảng cáo hoa mỹ.',
  'Podcast sáng nay nhắc mình rằng tiến bộ nhỏ vẫn là tiến bộ.',
  'Một bó hoa tự cắm không hoàn hảo nhưng chứa rất nhiều sự quan tâm.',
  'Mô hình đơn giản, dữ liệu sạch và mục tiêu rõ ràng thường là điểm bắt đầu tốt.',
  'Chọn đúng một từ đôi khi mất lâu hơn viết cả một đoạn văn.',
  'Cảm biến nhỏ vừa hoạt động ổn định, thêm một cuối tuần mày mò thật đáng giá.',
  'Đi chậm và tôn trọng văn hóa địa phương giúp mỗi chuyến đi ý nghĩa hơn.',
  'Một cuộc trò chuyện hay luôn bắt đầu bằng sự tò mò thật lòng.',
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
    const personRows = allPeople.map(
      ([username, fullName, bio, isPrivate], index) => ({
        personId: `DEMO-P${String(index + 1).padStart(3, '0')}`,
        username: `demo.${username}`,
        email: `demo.${username}@misonet.local`,
        passwordHash,
        fullName,
        bio,
        isPrivate,
        avatarUrl:
          index < people.length
            ? null
            : `https://i.pravatar.cc/150?img=${((index - people.length) % 20) + 1}`,
        location: locations[index % locations.length],
        interests: [...interestSets[index % interestSets.length]],
        role: index === 0 ? 'ADMIN' : 'USER',
        accountStatus: 'ACTIVE',
        createdAt: iso(1 + (index % 28), 8),
      }),
    );

    for (const statement of SCHEMA_STATEMENTS) {
      await database.executeWrite(statement);
    }

    await database.executeWrite(
      `UNWIND $people AS item
       MERGE (person:Person {personId: item.personId})
       SET person.username = item.username,
           person.email = item.email,
           person.passwordHash = item.passwordHash,
           person.fullName = item.fullName,
           person.bio = item.bio,
           person.avatarUrl = item.avatarUrl,
           person.isPrivate = item.isPrivate,
           person.location = item.location,
           person.interests = item.interests,
           person.role = item.role,
           person.accountStatus = item.accountStatus,
           person.suspendedUntil = null,
           person.moderationReason = '',
           person.createdAt = datetime(item.createdAt),
           person.updatedAt = datetime()`,
      { people: personRows },
    );

    const followPairs = new Set<string>();
    for (let index = 0; index < allPeople.length; index += 1) {
      for (const offset of [1, 2]) {
        const target = (index + offset) % allPeople.length;
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

    const basePosts = postContents.map((content, index) => ({
      postId: `DEMO-POST-${String(index + 1).padStart(3, '0')}`,
      authorId: personRows[index % people.length].personId,
      content,
      privacy:
        index % 11 === 0 ? 'PRIVATE' : index % 5 === 0 ? 'FRIENDS' : 'PUBLIC',
      createdAt: iso(8 + (index % 18), 7 + (index % 12)),
    }));
    const additionalPosts = additionalPostContents.map((content, index) => ({
      postId: `DEMO-POST-${String(postContents.length + index + 1).padStart(3, '0')}`,
      authorId: personRows[people.length + index].personId,
      content,
      privacy:
        index % 13 === 0 ? 'PRIVATE' : index % 6 === 0 ? 'FRIENDS' : 'PUBLIC',
      createdAt: iso(8 + (index % 18), 7 + (index % 12)),
    }));
    const posts = [...basePosts, ...additionalPosts];
    await database.executeWrite(
      `UNWIND $posts AS item
       MATCH (author:Person {personId: item.authorId})
       MERGE (post:Post {postId: item.postId})
       SET post.content = item.content,
           post.imageUrl = null,
           post.privacy = item.privacy,
           post.moderationStatus = 'VISIBLE',
           post.moderationReason = '',
           post.createdAt = datetime(item.createdAt),
           post.updatedAt = datetime(item.createdAt)
       MERGE (author)-[posted:POSTED]->(post)
       SET posted.postedAt = datetime(item.createdAt)`,
      { posts },
    );

    const publicPosts = posts.filter((post) => post.privacy === 'PUBLIC');
    const likes = publicPosts.flatMap((post, postIndex) =>
      [1, 3, 5, 8].map((offset) => ({
        personId: personRows[(postIndex + offset) % allPeople.length].personId,
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
        personId:
          personRows[(postIndex + offset + 2) % allPeople.length].personId,
        postId: post.postId,
        parentCommentId:
          offset === 2
            ? `DEMO-COMMENT-${String(postIndex * 2 + 1).padStart(3, '0')}`
            : null,
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
           comment.moderationStatus = 'VISIBLE',
           comment.moderationReason = '',
           comment.createdAt = datetime(item.createdAt),
           comment.updatedAt = datetime(item.createdAt)
       MERGE (author)-[commented:COMMENTED]->(comment)
       SET commented.commentedAt = datetime(item.createdAt)
       MERGE (comment)-[:ON_POST]->(post)
       WITH comment, item
       OPTIONAL MATCH (parent:Comment {commentId: item.parentCommentId})
       FOREACH (_ IN CASE WHEN parent IS NULL THEN [] ELSE [1] END |
         MERGE (comment)-[:REPLY_TO]->(parent)
       )`,
      { comments },
    );

    const reposts = publicPosts
      .filter((_, index) => index % 2 === 0)
      .map((post, index) => ({
        personId: personRows[(index + 4) % allPeople.length].personId,
        sourcePostId: post.postId,
        repostPostId: `DEMO-REPOST-${String(index + 1).padStart(3, '0')}`,
        repostKey: `${personRows[(index + 4) % allPeople.length].personId}:${post.postId}`,
        at: iso(15 + (index % 10), 16),
      }));
    await database.executeWrite(
      `UNWIND $reposts AS item
       MATCH (person:Person {personId: item.personId})
       MATCH (source:Post {postId: item.sourcePostId})
       MERGE (repost:Post {postId: item.repostPostId})
       SET repost.repostKey = item.repostKey,
           repost.content = '',
           repost.imageUrl = null,
           repost.privacy = 'PUBLIC',
           repost.moderationStatus = 'VISIBLE',
           repost.moderationReason = '',
           repost.createdAt = datetime(item.at),
           repost.updatedAt = datetime(item.at)
       MERGE (person)-[posted:POSTED]->(repost)
       SET posted.postedAt = datetime(item.at)
       MERGE (repost)-[relation:REPOST_OF]->(source)
       SET relation.repostedAt = datetime(item.at)`,
      { reposts },
    );

    await database.executeWrite(
      `MATCH (actor:Person)-[follow:FOLLOW]->(recipient:Person)
       WHERE actor.personId STARTS WITH $prefix
         AND recipient.personId STARTS WITH $prefix
         AND actor <> recipient
       MERGE (notification:Notification {
         notificationKey: 'FOLLOW:' + actor.personId + ':' + recipient.personId
       })
       ON CREATE SET notification.notificationId = randomUUID()
       SET notification.type = 'FOLLOW',
           notification.createdAt = follow.followedAt,
           notification.readAt = null
       MERGE (actor)-[:TRIGGERED]->(notification)
       MERGE (notification)-[:FOR]->(recipient)`,
      { prefix: 'DEMO-' },
    );

    await database.executeWrite(
      `MATCH (first:Person)-[:FRIEND]->(second:Person)
       WHERE first.personId STARTS WITH $prefix
         AND second.personId STARTS WITH $prefix
       UNWIND [
         {actor: first, recipient: second},
         {actor: second, recipient: first}
       ] AS item
       WITH item.actor AS actor, item.recipient AS recipient
       MERGE (notification:Notification {
         notificationKey: 'FRIEND:' + actor.personId + ':' + recipient.personId
       })
       ON CREATE SET notification.notificationId = randomUUID()
       SET notification.type = 'FRIEND',
           notification.createdAt = datetime(),
           notification.readAt = null
       MERGE (actor)-[:TRIGGERED]->(notification)
       MERGE (notification)-[:FOR]->(recipient)`,
      { prefix: 'DEMO-' },
    );

    await database.executeWrite(
      `MATCH (actor:Person)-[like:LIKES]->(post:Post)<-[:POSTED]-(recipient:Person)
       WHERE actor.personId STARTS WITH $prefix AND actor <> recipient
       MERGE (notification:Notification {
         notificationKey: 'LIKE:' + actor.personId + ':' + post.postId
       })
       ON CREATE SET notification.notificationId = randomUUID()
       SET notification.type = 'LIKE',
           notification.createdAt = like.likedAt,
           notification.readAt = null
       MERGE (actor)-[:TRIGGERED]->(notification)
       MERGE (notification)-[:FOR]->(recipient)
       MERGE (notification)-[:ABOUT_POST]->(post)`,
      { prefix: 'DEMO-' },
    );

    await database.executeWrite(
      `MATCH (actor:Person)-[:COMMENTED]->(comment:Comment)-[:ON_POST]->(post:Post)
       OPTIONAL MATCH (comment)-[:REPLY_TO]->(parent:Comment)<-[:COMMENTED]-(parentAuthor:Person)
       MATCH (postAuthor:Person)-[:POSTED]->(post)
       WITH actor, comment, post, parent,
            coalesce(parentAuthor, postAuthor) AS recipient
       WHERE comment.commentId STARTS WITH $prefix AND actor <> recipient
       MERGE (notification:Notification {
         notificationKey: 'COMMENT:' + comment.commentId
       })
       ON CREATE SET notification.notificationId = randomUUID()
       SET notification.type = CASE WHEN parent IS NULL THEN 'COMMENT' ELSE 'REPLY' END,
           notification.createdAt = comment.createdAt,
           notification.readAt = null
       MERGE (actor)-[:TRIGGERED]->(notification)
       MERGE (notification)-[:FOR]->(recipient)
       MERGE (notification)-[:ABOUT_POST]->(post)
       MERGE (notification)-[:ABOUT_COMMENT]->(comment)`,
      { prefix: 'DEMO-' },
    );

    await database.executeWrite(
      `MATCH (actor:Person)-[:POSTED]->(repost:Post)-[relation:REPOST_OF]->
             (source:Post)<-[:POSTED]-(recipient:Person)
       WHERE repost.postId STARTS WITH $prefix AND actor <> recipient
       MERGE (notification:Notification {
         notificationKey: 'REPOST:' + actor.personId + ':' + source.postId
       })
       ON CREATE SET notification.notificationId = randomUUID()
       SET notification.type = 'REPOST',
           notification.createdAt = relation.repostedAt,
           notification.readAt = null
       MERGE (actor)-[:TRIGGERED]->(notification)
       MERGE (notification)-[:FOR]->(recipient)
       MERGE (notification)-[:ABOUT_POST]->(source)`,
      { prefix: 'DEMO-' },
    );

    const result = await database.executeRead<{
      people: Integer | number;
      posts: Integer | number;
      comments: Integer | number;
      follows: Integer | number;
      friends: Integer | number;
      likes: Integer | number;
      reposts: Integer | number;
    }>(
      `MATCH (person:Person) WHERE person.personId STARTS WITH $prefix
       OPTIONAL MATCH (person)-[relationship]->(target)
       WITH count(DISTINCT person) AS people,
            count(DISTINCT CASE WHEN type(relationship) = 'FOLLOW' THEN relationship END) AS follows,
            count(DISTINCT CASE WHEN type(relationship) = 'FRIEND' THEN relationship END) AS friends,
            count(DISTINCT CASE WHEN type(relationship) = 'LIKES' THEN relationship END) AS likes
       OPTIONAL MATCH (repost:Post)-[:REPOST_OF]->(:Post)
       WHERE repost.postId STARTS WITH $prefix
       WITH people, follows, friends, likes,
            count(DISTINCT repost) AS reposts
       MATCH (post:Post) WHERE post.postId STARTS WITH $prefix
       OPTIONAL MATCH (comment:Comment)-[:ON_POST]->(post)
       RETURN people, count(DISTINCT post) AS posts,
              count(DISTINCT comment) AS comments,
              follows, friends, likes, reposts`,
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
