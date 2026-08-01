import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import neo4j, { Driver } from 'neo4j-driver';
import { NEO4J_DRIVER } from './neo4j.constants';
import { Neo4jService } from './neo4j.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: NEO4J_DRIVER,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Driver =>
        neo4j.driver(
          configService.getOrThrow<string>('NEO4J_URI'),
          neo4j.auth.basic(
            configService.getOrThrow<string>('NEO4J_USERNAME'),
            configService.getOrThrow<string>('NEO4J_PASSWORD'),
          ),
        ),
    },
    Neo4jService,
  ],
  exports: [Neo4jService],
})
export class Neo4jModule {}
