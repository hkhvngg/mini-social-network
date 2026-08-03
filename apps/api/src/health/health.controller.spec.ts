import { ServiceUnavailableException } from '@nestjs/common';
import neo4j from 'neo4j-driver';
import { Neo4jService } from '../neo4j/neo4j.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports connected when Neo4j connectivity succeeds', async () => {
    const verifyConnectivity = jest.fn().mockResolvedValue(undefined);
    const controller = new HealthController({
      verifyConnectivity,
    } as unknown as Neo4jService);

    await expect(controller.checkHealth()).resolves.toEqual({
      status: 'ok',
      neo4j: 'connected',
    });
    expect(verifyConnectivity).toHaveBeenCalledTimes(1);
  });

  it('returns service unavailable when connectivity fails', async () => {
    const controller = new HealthController({
      verifyConnectivity: jest.fn().mockRejectedValue(new Error('offline')),
    } as unknown as Neo4jService);

    await expect(controller.checkHealth()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('maps graph statistics from Neo4j integers', async () => {
    const values = {
      persons: neo4j.int(12),
      posts: neo4j.int(24),
      relationships: neo4j.int(80),
    };
    const controller = new HealthController({
      executeRead: jest.fn().mockResolvedValue({
        records: [{ get: (key: keyof typeof values) => values[key] }],
      }),
    } as unknown as Neo4jService);

    await expect(controller.getGraphStats()).resolves.toEqual({
      persons: 12,
      posts: 24,
      relationships: 80,
    });
  });

  it('returns service unavailable when graph statistics are missing', async () => {
    const controller = new HealthController({
      executeRead: jest.fn().mockResolvedValue({ records: [] }),
    } as unknown as Neo4jService);

    await expect(controller.getGraphStats()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('rejects graph counts outside the JavaScript safe integer range', async () => {
    const values = {
      persons: Number.MAX_SAFE_INTEGER + 1,
      posts: 1,
      relationships: 1,
    };
    const controller = new HealthController({
      executeRead: jest.fn().mockResolvedValue({
        records: [{ get: (key: keyof typeof values) => values[key] }],
      }),
    } as unknown as Neo4jService);

    await expect(controller.getGraphStats()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
