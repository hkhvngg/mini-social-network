import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import neo4j, { Driver, QueryResult, RecordShape } from 'neo4j-driver';
import { NEO4J_DRIVER } from './neo4j.constants';

@Injectable()
export class Neo4jService implements OnApplicationShutdown {
  private readonly database: string;

  constructor(
    @Inject(NEO4J_DRIVER) private readonly driver: Driver,
    configService: ConfigService,
  ) {
    this.database = configService.getOrThrow<string>('NEO4J_DATABASE');
  }

  async verifyConnectivity(): Promise<void> {
    await this.driver.verifyConnectivity({ database: this.database });
  }

  async executeRead<T extends RecordShape = RecordShape>(
    cypher: string,
    parameters: Record<string, unknown> = {},
  ): Promise<QueryResult<T>> {
    const session = this.driver.session({
      database: this.database,
      defaultAccessMode: neo4j.session.READ,
    });

    try {
      return await session.executeRead((transaction) =>
        transaction.run<T>(cypher, parameters),
      );
    } finally {
      await session.close();
    }
  }

  async executeWrite<T extends RecordShape = RecordShape>(
    cypher: string,
    parameters: Record<string, unknown> = {},
  ): Promise<QueryResult<T>> {
    const session = this.driver.session({
      database: this.database,
      defaultAccessMode: neo4j.session.WRITE,
    });

    try {
      return await session.executeWrite((transaction) =>
        transaction.run<T>(cypher, parameters),
      );
    } finally {
      await session.close();
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.driver.close();
  }
}
