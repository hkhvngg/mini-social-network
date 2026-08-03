import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Neo4jService } from '../neo4j/neo4j.service';

async function promoteAdmin(): Promise<void> {
  const username = process.argv
    .slice(2)
    .find((argument) => argument !== '--')
    ?.trim()
    .toLowerCase();
  if (!username) {
    throw new Error('Usage: pnpm admin:promote -- <username>');
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });
  try {
    const database = app.get(Neo4jService);
    const result = await database.executeWrite<{ username: string }>(
      `MATCH (person:Person {username: $username})
       SET person.role = 'ADMIN',
           person.accountStatus = 'ACTIVE',
           person.updatedAt = datetime()
       RETURN person.username AS username`,
      { username },
    );
    if (!result.records[0]) throw new Error(`User not found: ${username}`);
    console.log(`Promoted @${username} to ADMIN`);
  } finally {
    await app.close();
  }
}

void promoteAdmin().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
