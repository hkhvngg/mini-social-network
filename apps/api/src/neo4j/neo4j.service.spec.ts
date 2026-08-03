import { ConfigService } from '@nestjs/config';
import neo4j, { Driver } from 'neo4j-driver';
import { Neo4jService } from './neo4j.service';

describe('Neo4jService', () => {
  const config = {
    getOrThrow: jest.fn().mockReturnValue('neo4j'),
  } as unknown as ConfigService;

  it('verifies connectivity against the configured database', async () => {
    const verifyConnectivity = jest.fn().mockResolvedValue(undefined);
    const service = new Neo4jService(
      { verifyConnectivity } as unknown as Driver,
      config,
    );

    await service.verifyConnectivity();

    expect(verifyConnectivity).toHaveBeenCalledWith({ database: 'neo4j' });
  });

  it('runs read queries in a read session and always closes it', async () => {
    const run = jest.fn().mockResolvedValue({ records: [] });
    const close = jest.fn().mockResolvedValue(undefined);
    const executeRead = jest.fn(
      (work: (transaction: { run: typeof run }) => unknown) => work({ run }),
    );
    const session = jest.fn().mockReturnValue({ executeRead, close });
    const service = new Neo4jService({ session } as unknown as Driver, config);

    await expect(
      service.executeRead('RETURN $value', { value: 1 }),
    ).resolves.toEqual({ records: [] });
    expect(session).toHaveBeenCalledWith({
      database: 'neo4j',
      defaultAccessMode: neo4j.session.READ,
    });
    expect(run).toHaveBeenCalledWith('RETURN $value', { value: 1 });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('runs write queries in a write session', async () => {
    const run = jest.fn().mockResolvedValue({ records: [] });
    const close = jest.fn().mockResolvedValue(undefined);
    const executeWrite = jest.fn(
      (work: (transaction: { run: typeof run }) => unknown) => work({ run }),
    );
    const session = jest.fn().mockReturnValue({ executeWrite, close });
    const service = new Neo4jService({ session } as unknown as Driver, config);

    await service.executeWrite('CREATE (:Test)', {});

    expect(session).toHaveBeenCalledWith({
      database: 'neo4j',
      defaultAccessMode: neo4j.session.WRITE,
    });
    expect(run).toHaveBeenCalledWith('CREATE (:Test)', {});
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('closes the session when a transaction fails', async () => {
    const close = jest.fn().mockResolvedValue(undefined);
    const executeRead = jest.fn().mockRejectedValue(new Error('query failed'));
    const service = new Neo4jService(
      {
        session: jest.fn().mockReturnValue({ executeRead, close }),
      } as unknown as Driver,
      config,
    );

    await expect(service.executeRead('INVALID')).rejects.toThrow(
      'query failed',
    );
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('closes the driver during application shutdown', async () => {
    const close = jest.fn().mockResolvedValue(undefined);
    const service = new Neo4jService({ close } as unknown as Driver, config);

    await service.onApplicationShutdown();

    expect(close).toHaveBeenCalledTimes(1);
  });
});
