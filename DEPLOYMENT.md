# Deploy Misonet

Kiến trúc production:

```text
Browser -> Vercel (apps/web) -> Railway (apps/api)
                                  |-> Neo4j AuraDB
                                  `-> Cloudinary
GitHub Actions -> lint/test/build -> Railway + Vercel
```

Không commit `.env`, `.env.local`, token hoặc credentials. Các biến `NEXT_PUBLIC_*` được nhúng vào JavaScript ở build time nên chỉ được chứa URL/cấu hình công khai, không chứa secret.

## 1. Điều kiện trước khi deploy

- Repository phải được commit và push lên GitHub bởi chủ dự án. Codex không tự commit hoặc push.
- Node.js 22 và pnpm 11.18.0 được dùng trong CI.
- AuraDB đã tồn tại và URI dùng `neo4j+s://`.
- Cloudinary đã có cloud name, API key và API secret.
- Tạo project Vercel trước để biết production domain; dùng domain đó cho `FRONTEND_URL` của Railway.

Repository này hiện là hai project pnpm độc lập, không dùng package chung ở root. Vì vậy Railway và Vercel đều phải đặt Root Directory riêng.

## 2. Railway — NestJS API

Tạo một Railway project/service trống hoặc liên kết GitHub repository, sau đó nhập chính xác trong service **Settings**:

| Setting | Giá trị |
| --- | --- |
| Service name | `misonet-api` |
| Root Directory | `/apps/api` |
| Config file path | `/apps/api/railway.toml` |
| Builder | `Railpack` |
| Build Command | `pnpm build` |
| Start Command | `pnpm start:prod` |
| Healthcheck Path | `/health` |
| Healthcheck Timeout | `120` giây |
| Restart Policy | `On Failure`, tối đa 5 lần |
| Watch Paths | `/apps/api/**` |

`railway.toml` là nguồn cấu hình ưu tiên và đã chứa build/start/healthcheck. Railway tự cấp `PORT`; không tạo thủ công biến này trên dashboard. Backend đọc `PORT` và bind `0.0.0.0`.

Thêm các biến sau tại **Service -> Variables**. Bảng chỉ liệt kê tên, không phải giá trị:

```text
FRONTEND_URL
NEO4J_URI
NEO4J_USERNAME
NEO4J_PASSWORD
NEO4J_DATABASE
JWT_SECRET
JWT_EXPIRES_IN
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

Yêu cầu:

- `FRONTEND_URL`: origin production Vercel đầy đủ, không có path, ví dụ dạng `https://<project>.vercel.app`.
- `NEO4J_URI`: bắt buộc dạng `neo4j+s://<instance>.databases.neo4j.io`.
- `JWT_SECRET`: chuỗi ngẫu nhiên tối thiểu 32 ký tự.
- Không đặt Cloudinary API secret hoặc Neo4j password trên Vercel.

Trong **Settings -> Networking**, chọn **Generate Domain**. Lưu URL HTTPS này để nhập vào `NEXT_PUBLIC_API_URL` trên Vercel.

Tài liệu chính thức: [Railway monorepo](https://docs.railway.com/deployments/monorepo), [config as code](https://docs.railway.com/config-as-code/reference), [start command](https://docs.railway.com/deployments/start-command).

## 3. Vercel — Next.js web

Tại **Add New -> Project**, chọn GitHub repository rồi nhập:

| Setting | Giá trị |
| --- | --- |
| Project name | `misonet-web` |
| Framework Preset | `Next.js` |
| Root Directory | `apps/web` |
| Install Command | `pnpm install --frozen-lockfile` |
| Build Command | `pnpm build` |
| Output Directory | để trống, dùng mặc định Next.js |
| Node.js Version | `22.x` |

Thêm tại **Settings -> Environment Variables** cho Production (và Preview nếu muốn preview hoạt động):

```text
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_SITE_URL
```

- `NEXT_PUBLIC_API_URL`: domain HTTPS của Railway, không có path `/api` vì backend hiện phục vụ route từ `/`.
- `NEXT_PUBLIC_SITE_URL`: production domain của Vercel.
- Sau khi đổi một biến `NEXT_PUBLIC_*`, phải redeploy vì giá trị được đóng vào bundle lúc build.

File `apps/web/vercel.json` đã cố định framework, install command và build command. Không đặt credentials backend vào Vercel.

Tài liệu chính thức: [Vercel monorepo](https://vercel.com/docs/monorepos), [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [environment variables](https://vercel.com/docs/environment-variables).

## 4. GitHub Actions CI/CD

Workflow nằm tại `.github/workflows/ci-cd.yml`:

- Pull request: lint/test/build API và lint/build web; không deploy.
- Push `main`/`master` hoặc chạy thủ công: chỉ deploy sau khi cả hai job CI đạt. Repository local hiện dùng `master`; chỉ chọn một trong hai làm production branch trên GitHub/Vercel.
- Railway nhận duy nhất `apps/api` qua `--path-as-root`.
- Vercel build và deploy output prebuilt của `apps/web`.

Tạo GitHub environment tên `production`, bật required reviewers nếu cần, rồi thêm các **Actions secrets**:

```text
RAILWAY_TOKEN
RAILWAY_PROJECT_ID
RAILWAY_SERVICE_ID
RAILWAY_ENVIRONMENT_ID
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

Lấy Vercel Organization/Project ID từ project settings hoặc `.vercel/project.json` sau khi chạy `vercel link`; không commit thư mục `.vercel`. Với Railway, ưu tiên Project Token giới hạn ở production environment.

Nếu dùng workflow này để deploy, tắt native auto-deploy trên Railway/Vercel để tránh một push tạo hai deployment. Nếu muốn dùng native Git integration thay cho GitHub Actions deploy, xóa hai job `deploy-*` nhưng giữ hai job CI.

## 5. Kiểm tra trước deploy

```powershell
Set-Location apps/api
pnpm install --frozen-lockfile
pnpm lint
pnpm test --runInBand
pnpm build

Set-Location ../web
pnpm install --frozen-lockfile
pnpm lint
pnpm build
```

`GET /health` kiểm tra kết nối AuraDB, không chỉ kiểm tra tiến trình HTTP. `GET /health/graph` kiểm tra truy vấn Cypher đọc graph.

## 6. Smoke test sau deploy

Chỉ chạy sau khi cả hai domain production hoạt động:

```powershell
$env:SMOKE_API_URL='https://YOUR_RAILWAY_DOMAIN'
$env:SMOKE_WEB_URL='https://YOUR_VERCEL_DOMAIN'
$env:SMOKE_PASSWORD='A_TEMPORARY_STRONG_PASSWORD'
node scripts/smoke-deployment.mjs
Remove-Item Env:SMOKE_API_URL,Env:SMOKE_WEB_URL,Env:SMOKE_PASSWORD
```

Script xác minh tuần tự:

1. Web trả HTTP thành công và API `/health` kết nối AuraDB.
2. Đăng ký ba tài khoản tạm và nhận JWT.
3. Cập nhật profile.
4. Mutual follow A/B và B/C tạo `FRIEND`.
5. Recommendation của A chứa C qua bạn chung B.
6. Tạo post, B like post.
7. Upload PNG qua `POST /uploads/post-media`, tạo `Media/HAS_MEDIA`.
8. Xóa media post để backend xóa asset Cloudinary, sau đó xóa post còn lại và các follow thử nghiệm.

Smoke test không in access token hoặc secret. Do hệ thống chưa có API xóa tài khoản, ba `Person` có username tiền tố `smoke.` vẫn còn nhưng không còn post hoặc quan hệ follow/friend. Nên chạy script trên staging trước; nếu chạy production, xóa các tài khoản smoke trong AuraDB sau khi xác nhận đúng phạm vi.

## 7. Thứ tự phát hành

1. Commit rồi push repository lên GitHub bằng production branch (`master` hiện tại hoặc đổi thống nhất sang `main`) và để CI chạy.
2. Tạo Vercel project để chốt domain.
3. Tạo Railway service, nhập variables và domain Vercel vào `FRONTEND_URL`.
4. Deploy Railway, xác nhận `/health` và `/api-docs`.
5. Nhập Railway domain vào Vercel rồi deploy/redeploy web.
6. Chạy smoke test bằng domain thật.
7. Xem log Railway, Vercel và Cloudinary; xác nhận không có secret trong log.
