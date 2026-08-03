import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { validateEnvironment } from './config/environment.validation';
import { FollowsModule } from './follows/follows.module';
import { HealthModule } from './health/health.module';
import { Neo4jModule } from './neo4j/neo4j.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PostsModule } from './posts/posts.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { UploadsModule } from './uploads/uploads.module';
import { ReportsModule } from './reports/reports.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    Neo4jModule,
    HealthModule,
    AuthModule,
    FollowsModule,
    PostsModule,
    UploadsModule,
    RecommendationsModule,
    NotificationsModule,
    ReportsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
