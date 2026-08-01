const REQUIRED_NEO4J_VARIABLES = [
  'NEO4J_URI',
  'NEO4J_USERNAME',
  'NEO4J_PASSWORD',
  'NEO4J_DATABASE',
] as const;

const REQUIRED_AUTH_VARIABLES = ['JWT_SECRET', 'JWT_EXPIRES_IN'] as const;

const REQUIRED_APP_VARIABLES = ['FRONTEND_URL'] as const;

const REQUIRED_CLOUDINARY_VARIABLES = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
] as const;

export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  for (const variableName of REQUIRED_APP_VARIABLES) {
    const value = environment[variableName];

    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`Missing required environment variable: ${variableName}`);
    }
  }

  for (const variableName of REQUIRED_NEO4J_VARIABLES) {
    const value = environment[variableName];

    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`Missing required environment variable: ${variableName}`);
    }
  }

  for (const variableName of REQUIRED_AUTH_VARIABLES) {
    const value = environment[variableName];

    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`Missing required environment variable: ${variableName}`);
    }
  }

  for (const variableName of REQUIRED_CLOUDINARY_VARIABLES) {
    const value = environment[variableName];

    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`Missing required environment variable: ${variableName}`);
    }
  }

  if ((environment.JWT_SECRET as string).length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters');
  }

  const uri = environment.NEO4J_URI as string;
  if (!/^neo4j\+s:\/\//i.test(uri)) {
    throw new Error('NEO4J_URI must use the neo4j+s:// AuraDB scheme');
  }

  const frontendUrl = environment.FRONTEND_URL as string;
  let frontendOrigin: string;
  try {
    const parsedFrontendUrl = new URL(frontendUrl);
    if (!['http:', 'https:'].includes(parsedFrontendUrl.protocol)) {
      throw new Error();
    }
    if (
      parsedFrontendUrl.username ||
      parsedFrontendUrl.password ||
      parsedFrontendUrl.pathname !== '/' ||
      parsedFrontendUrl.search ||
      parsedFrontendUrl.hash
    ) {
      throw new Error();
    }
    frontendOrigin = parsedFrontendUrl.origin;
  } catch {
    throw new Error('FRONTEND_URL must be an HTTP(S) origin without a path');
  }

  const rawPort = environment.PORT ?? 3001;
  const port =
    typeof rawPort === 'number'
      ? rawPort
      : typeof rawPort === 'string'
        ? Number(rawPort)
        : Number.NaN;

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  return {
    ...environment,
    PORT: port,
    FRONTEND_URL: frontendOrigin,
  };
}
