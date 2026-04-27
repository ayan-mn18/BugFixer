import config from '../config';

const POSTGRES_PROTOCOL_REGEX = /^postgres(?:ql)?:\/\//i;
const JDBC_PREFIX = 'jdbc:';

const encodeConnectionPart = (value: string) => encodeURIComponent(value);

const buildPostgresUrl = (hostPort: string, databaseName: string, search = '') => {
  const auth = `${encodeConnectionPart(config.database.user)}:${encodeConnectionPart(config.database.password)}@`;
  const normalizedHostPort = hostPort.trim() || `${config.database.host}:${config.database.port}`;
  const normalizedDatabaseName = databaseName.trim() || config.database.name;
  const query = search ? `?${search}` : '';

  return `postgresql://${auth}${normalizedHostPort}/${normalizedDatabaseName}${query}`;
};

const normalizeJdbcUrl = (rawUrl: string) => {
  const jdbcPayload = rawUrl.slice(JDBC_PREFIX.length).trim();

  if (POSTGRES_PROTOCOL_REGEX.test(jdbcPayload)) {
    return jdbcPayload;
  }

  const sanitizedPayload = jdbcPayload.replace(/^\/\//, '');
  const [target, search = ''] = sanitizedPayload.split('?', 2);
  const slashIndex = target.indexOf('/');
  const hostPort = slashIndex >= 0 ? target.slice(0, slashIndex) : target;
  const databaseName = slashIndex >= 0 ? target.slice(slashIndex + 1) : config.database.name;

  return buildPostgresUrl(hostPort, databaseName, search);
};

export const resolveDatabaseUrl = () => {
  const rawUrl = config.database.url.trim();

  if (!rawUrl) {
    return buildPostgresUrl(`${config.database.host}:${config.database.port}`, config.database.name);
  }

  if (POSTGRES_PROTOCOL_REGEX.test(rawUrl)) {
    return rawUrl;
  }

  if (rawUrl.startsWith(JDBC_PREFIX)) {
    return normalizeJdbcUrl(rawUrl);
  }

  return buildPostgresUrl(rawUrl, config.database.name);
};

export const shouldUseSsl = (databaseUrl: string) => {
  return (
    config.nodeEnv === 'production' ||
    /sslmode=require/i.test(databaseUrl) ||
    /rds\.amazonaws\.com/i.test(databaseUrl)
  );
};
