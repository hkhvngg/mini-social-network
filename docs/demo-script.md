# Kịch bản demo Misonet

## Chuẩn bị

- API chạy ở `http://localhost:3001`, web chạy ở `http://localhost:3000`.
- `/health` và `/health/graph` đều trả trạng thái tốt.
- Tạo hai tài khoản A và B qua màn hình đăng ký; không dùng Person mẫu thiếu password để đăng nhập.
- Mở Aura Query trong một tab riêng để quan sát quan hệ.

## Luồng trình bày

1. Đăng nhập A, mở profile B và nhấn **Theo dõi**.
2. Chạy `MATCH (a:Person)-[r:FOLLOW|FRIEND]-(b:Person) RETURN a, r, b` và chỉ ra lúc này mới có `FOLLOW` A → B.
3. Đăng nhập B, follow lại A. Chạy lại query và chỉ ra hai cạnh `FOLLOW` cùng đúng một cạnh `FRIEND`.
4. B upload ảnh qua `/uploads/post-media`, dùng metadata trả về tạo một post `FRIENDS`; đăng nhập A để chứng minh post xuất hiện trên feed.
5. A like post, tải lại feed và kiểm tra like count vẫn là 1 nếu nhấn lại thao tác theo cùng trạng thái.
6. Mở profile, các danh sách friends/followers/following và kiểm tra link điều hướng.
7. Mở Suggestions, đối chiếu số và tên bạn chung. Với data mẫu P001: P004 = 2; P005 = 1; P006 = 1.
8. A unfollow B. Chạy query graph để chứng minh `FOLLOW` A → B và `FRIEND` bị xóa, còn `FOLLOW` B → A vẫn tồn tại.
9. Bật profile riêng tư cho A; đăng nhập B và chứng minh danh sách friends/followers/following của A bị khóa.
10. Mở Search, tìm A theo full name hoặc username và kiểm tra không lộ email.
11. Đăng xuất và xác nhận route được bảo vệ quay về `/login`.

## Smoke-test checklist

- [ ] Register hiển thị validation và chuyển tới feed khi thành công.
- [ ] Login sai hiển thị lỗi; login đúng mở feed.
- [ ] Tạo post có nội dung, URL ảnh tùy chọn và privacy.
- [ ] Upload JPG/PNG/WebP hoặc MP4/WebM/MOV đúng giới hạn và tạo `Media/HAS_MEDIA`.
- [ ] Xóa post có media cũng xóa asset tương ứng trên Cloudinary.
- [ ] Edit/delete chỉ xuất hiện và hoạt động với post của chính mình.
- [ ] Like/unlike cập nhật count và không tạo quan hệ trùng.
- [ ] PUBLIC/FRIENDS/PRIVATE hiển thị đúng người xem.
- [ ] Mutual follow hiện trạng thái Bạn bè; unfollow xóa trạng thái.
- [ ] Suggestions đúng thứ tự số bạn chung.
- [ ] Light/dark/system và layout desktop/mobile hoạt động.
- [ ] Logout xóa phiên phía client.
- [ ] Profile riêng tư chặn người khác xem ba danh sách connections.
- [ ] Search tìm được user theo tên/username và hiển thị đúng trạng thái follow.

## Query minh họa

```cypher
MATCH (a:Person)-[r:FOLLOW|FRIEND|POSTED|LIKES]-(b)
RETURN a, r, b
LIMIT 100
```

Không chụp hoặc trình chiếu `.env`, password hash, access token hay credentials AuraDB.
