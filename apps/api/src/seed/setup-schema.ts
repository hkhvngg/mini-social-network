import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Neo4jService } from '../neo4j/neo4j.service';
import {
  MODERATION_DATA_MIGRATION,
  SCHEMA_STATEMENTS,
} from '../neo4j/schema.statements';

async function setupSchema(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });
  try {
    const database = app.get(Neo4jService);
    for (const statement of SCHEMA_STATEMENTS) {
      await database.executeWrite(statement);
    }
    await database.executeWrite(MODERATION_DATA_MIGRATION);
    console.log(
      `Applied ${SCHEMA_STATEMENTS.length} constraints/indexes and moderation defaults`,
    );
  } finally {
    await app.close();
  }
}

void setupSchema().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
