import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';

type LoginBody = {
  accessToken: string;
  user: { username: string; role: string };
};
type ErrorBody = { message: string | string[] };
type GraphStatsBody = { persons: number; posts: number; relationships: number };
type AdminOverviewBody = { users: number; reports: number };

describe('Misonet API (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        stopAtFirstError: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    const login = await request(app.getHttpServer()).post('/auth/login').send({
      identifier: 'demo.an.nguyen',
      password: 'MisonetDemo@2026',
    });
    adminToken = (login.body as LoginBody).accessToken;
  });

  it('returns the API identity at GET /', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Misonet API');
  });

  it('reports Neo4j connectivity at GET /health', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);
    expect(response.body as { status: string; neo4j: string }).toEqual({
      status: 'ok',
      neo4j: 'connected',
    });
  });

  it('returns numeric graph statistics', async () => {
    const response = await request(app.getHttpServer())
      .get('/health/graph')
      .expect(200);
    const body = response.body as GraphStatsBody;
    expect(Number.isInteger(body.persons)).toBe(true);
    expect(Number.isInteger(body.posts)).toBe(true);
    expect(Number.isInteger(body.relationships)).toBe(true);
  });

  it('returns friendly validation messages for an empty login', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({})
      .expect(400);
    expect((response.body as ErrorBody).message).toEqual(
      expect.arrayContaining([
        'Hãy nhập email hoặc tên người dùng.',
        'Hãy nhập mật khẩu.',
      ]),
    );
  });

  it('does not reveal whether an identity or password is wrong', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: 'demo.an.nguyen', password: 'wrong-password' })
      .expect(401);
    expect((response.body as ErrorBody).message).toBe(
      'Tên đăng nhập hoặc mật khẩu chưa đúng. Bạn kiểm tra lại nhé.',
    );
  });

  it('rejects non-English keyboard characters in a login password', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: 'demo.an.nguyen', password: 'MậtKhẩu123!' })
      .expect(400);
    expect((response.body as ErrorBody).message).toContain(
      'Mật khẩu chỉ dùng chữ không dấu, số và ký tự trên bàn phím tiếng Anh.',
    );
  });

  it('rejects non-English keyboard characters in a registration password', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        username: 'keyboard.validation',
        email: 'keyboard.validation@misonet.local',
        password: 'MậtKhẩu123!',
        fullName: 'Keyboard Validation',
        location: 'TP. Hồ Chí Minh',
      })
      .expect(400);
    expect((response.body as ErrorBody).message).toContain(
      'Mật khẩu chỉ dùng chữ không dấu, số và ký tự trên bàn phím tiếng Anh.',
    );
  });

  it('authenticates the seeded administrator with a JWT', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: 'demo.an.nguyen', password: 'MisonetDemo@2026' })
      .expect(200);
    const body = response.body as LoginBody;
    expect(typeof body.accessToken).toBe('string');
    expect(body.user).toEqual(
      expect.objectContaining({ username: 'demo.an.nguyen', role: 'ADMIN' }),
    );
  });

  it('rejects a protected feed request without a JWT', () => {
    return request(app.getHttpServer()).get('/posts/feed').expect(401);
  });

  it('allows an administrator to read the admin overview', async () => {
    expect(adminToken).toEqual(expect.any(String));
    const response = await request(app.getHttpServer())
      .get('/admin/overview')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const body = response.body as AdminOverviewBody;
    expect(Number.isInteger(body.users)).toBe(true);
    expect(Number.isInteger(body.reports)).toBe(true);
  });

  afterAll(async () => {
    await app.close();
  });
});
