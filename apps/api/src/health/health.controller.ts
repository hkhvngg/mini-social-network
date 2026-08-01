import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import neo4j, { Integer } from 'neo4j-driver';
import { Neo4jService } from '../neo4j/neo4j.service';

type GraphCountRecord = {
  persons: Integer | number;
  posts: Integer | number;
  relationships: Integer | number;
};

@Controller('health')
@ApiTags('Health')
export class HealthController {
  constructor(private readonly neo4jService: Neo4jService) {}

  @Get()
  async checkHealth(): Promise<{ status: 'ok'; neo4j: 'connected' }> {
    try {
      await this.neo4jService.verifyConnectivity();
      return { status: 'ok', neo4j: 'connected' };
    } catch {
      throw new ServiceUnavailableException('Neo4j is unavailable');
    }
  }

  @Get('graph')
  async getGraphStats(): Promise<{
    persons: number;
    posts: number;
    relationships: number;
  }> {
    try {
      const result = await this.neo4jService.executeRead<GraphCountRecord>(`
        CALL {
          MATCH (person:Person)
          RETURN count(person) AS persons
        }
        CALL {
          MATCH (post:Post)
          RETURN count(post) AS posts
        }
        CALL {
          MATCH ()-[relationship]->()
          RETURN count(relationship) AS relationships
        }
        RETURN persons, posts, relationships
      `);
      const record = result.records[0];

      if (!record) {
        throw new Error('Graph statistics query returned no records');
      }

      return {
        persons: this.toSafeNumber(record.get('persons')),
        posts: this.toSafeNumber(record.get('posts')),
        relationships: this.toSafeNumber(record.get('relationships')),
      };
    } catch {
      throw new ServiceUnavailableException('Neo4j is unavailable');
    }
  }

  private toSafeNumber(value: Integer | number): number {
    const convertedValue = neo4j.isInt(value) ? value.toNumber() : value;

    if (!Number.isSafeInteger(convertedValue)) {
      throw new Error('Neo4j count exceeds the JavaScript safe integer range');
    }

    return convertedValue;
  }
}
