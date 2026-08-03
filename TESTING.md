# Misonet test matrix

Mỗi nhóm chức năng chính có ít nhất 5 test case tự động. Các case bao phủ luồng thành công, dữ liệu biên, validation, phân quyền và lỗi dịch vụ ngoài.

| Nhóm chức năng | Số case | Phạm vi chính |
| --- | ---: | --- |
| Authentication | 6 | đăng ký, hash mật khẩu, username/email trùng, sai thông tin, login thành công, tài khoản tạm ngưng |
| User/profile | 5 | uniqueness race, profile rỗng, whitelist cập nhật, tìm kiếm, profile không tồn tại |
| Follow/friend | 5 | self-follow, follow idempotent, unfollow, quyền riêng tư, chủ tài khoản xem kết nối |
| Post/repost/like/media | 6 | update validation, ownership, like, media, xóa asset, repost idempotent |
| Comment/reply | 5 | tạo comment, reply, ownership, pagination/moderation, admin delete không tồn tại |
| Notification | 6 | pagination, mark all, constraints, unread count, ownership khi mark read, lỗi database |
| Recommendation | 5 | Cypher scoring, mapping, empty state, count không an toàn, lỗi database |
| Report | 5 | tạo report, chống trùng, quyền xem post, chống tự report, moderation comment/post cha |
| Upload | 12 | MIME allowlist, file bắt buộc, giới hạn ảnh/video, Cloudinary mapping, avatar, delete asset |
| Admin service/security/Cypher | 17 | overview, pagination, self-protection, moderation, report detail, DB failure, query/index, guard |
| Health | 5 | connectivity, outage, graph count, thiếu record, số vượt safe integer |
| Neo4j adapter | 5 | connectivity, read/write session, đóng session khi lỗi, shutdown driver |
| Environment validation | 6 | port, frontend origin, AuraDB URI, JWT secret và biến bắt buộc |
| E2E API | 10 | root, health, graph stats, validation, mật khẩu bàn phím tiếng Anh, login, JWT, protected feed, admin overview |

## Lệnh kiểm tra

Chạy trong `apps/api`:

```bash
pnpm test --runInBand
pnpm test:e2e --runInBand
pnpm test:cov --runInBand
pnpm cypher:validate-admin
pnpm lint
pnpm build
```

Chạy trong `apps/web`:

```bash
pnpm lint
pnpm build
```

Ngoài test tự động, UI local được smoke test cho validation đăng ký/đăng nhập, login thành công, feed, nút chia sẻ không có count, dashboard admin, danh sách và chi tiết report.
