import { validateEnvironment } from './environment.validation';

const validEnvironment = {
  PORT: '8080',
  FRONTEND_URL: 'https://misonet.example',
  NEO4J_URI: 'neo4j+s://example.databases.neo4j.io',
  NEO4J_USERNAME: 'neo4j',
  NEO4J_PASSWORD: 'not-a-real-password',
  NEO4J_DATABASE: 'neo4j',
  JWT_SECRET: 'a-secure-test-secret-with-32-characters',
  JWT_EXPIRES_IN: '7d',
  CLOUDINARY_CLOUD_NAME: 'example',
  CLOUDINARY_API_KEY: 'example',
  CLOUDINARY_API_SECRET: 'not-a-real-secret',
};

describe('validateEnvironment', () => {
  it('normalizes Railway PORT and preserves the frontend origin', () => {
    expect(validateEnvironment(validEnvironment)).toMatchObject({
      PORT: 8080,
      FRONTEND_URL: 'https://misonet.example',
    });
  });

  it('requires an explicit frontend URL', () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, FRONTEND_URL: '' }),
    ).toThrow('Missing required environment variable: FRONTEND_URL');
  });

  it('requires the encrypted AuraDB scheme', () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, NEO4J_URI: 'neo4j://db' }),
    ).toThrow('NEO4J_URI must use the neo4j+s:// AuraDB scheme');
  });
});
