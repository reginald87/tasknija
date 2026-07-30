/**
 * Pino logger + pino-http request logger.
 *
 * - JSON in production.
 * - pino-pretty in development (only when NODE_ENV !== 'production').
 * - Redacts: authorization headers, cookies, password/token fields, query secrets.
 */

import pino from 'pino';
import pinoHttp from 'pino-http';

const isProd = process.env.NODE_ENV === 'production';

const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-paystack-signature"]',
  '*.password',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  'req.query.reference',
  'req.query.token',
];

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  redact: { paths: redactPaths, censor: '[REDACTED]' },
  base: { service: 'tasknija-server' },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isProd
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
        },
      }),
});

export const httpLogger = pinoHttp({
  logger,
  redact: { paths: redactPaths, censor: '[REDACTED]' },
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} -> ${res.statusCode}`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.url} -> ${err.message}`,
  serializers: {
    req(req) {
      return { method: req.method, url: req.url, id: req.id };
    },
    res(res) {
      return { statusCode: res.statusCode };
    },
  },
});

export default logger;
