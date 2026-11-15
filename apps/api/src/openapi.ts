const success = { description: 'Successful response' };
const json = (schema: Record<string, unknown>) => ({
  required: true,
  content: { 'application/json': { schema } },
});
const bearer = [{ bearer: [] }];
export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'APEX Studio API',
    version: '1.0.0',
    description: 'Concept / demo project. Amounts are integer PLN grosz. All times Europe/Warsaw.',
  },
  servers: [{ url: 'http://localhost:4000' }],
  components: {
    securitySchemes: { bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
  },
  paths: {
    '/health': { get: { summary: 'Database-backed health check', responses: { 200: success } } },
    '/auth/register': {
      post: {
        summary: 'Register customer',
        requestBody: json({
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 12 },
          },
        }),
        responses: {
          201: success,
          400: { description: 'Invalid input' },
          409: { description: 'Email already registered' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Get access token and HttpOnly refresh cookie',
        requestBody: json({
          type: 'object',
          required: ['email', 'password'],
          properties: { email: { type: 'string' }, password: { type: 'string' } },
        }),
        responses: { 200: success, 401: { description: 'Invalid credentials' } },
      },
    },
    '/auth/refresh': {
      post: {
        summary: 'Rotate refresh cookie',
        responses: { 200: success, 401: { description: 'Session expired' } },
      },
    },
    '/auth/logout': { post: { summary: 'Revoke refresh session', responses: { 200: success } } },
    '/auth/me': { get: { security: bearer, summary: 'Current user', responses: { 200: success } } },
    '/estimate': {
      post: {
        summary: 'Versioned service estimate, Python with local fallback',
        requestBody: json({
          type: 'object',
          required: ['service', 'size'],
          properties: {
            service: { enum: ['detail', 'ceramic', 'ppf'] },
            size: { enum: ['coupe', 'sedan', 'suv'] },
            extra: { type: 'boolean' },
          },
        }),
        responses: { 200: success },
      },
    },
    '/slots': {
      get: {
        summary: 'Available future slots',
        parameters: [
          { in: 'query', name: 'date', required: true, schema: { type: 'string', format: 'date' } },
        ],
        responses: { 200: success },
      },
    },
    '/bookings': {
      get: { security: bearer, summary: 'Own booking history', responses: { 200: success } },
      post: {
        security: bearer,
        summary: 'Create booking; UUID Idempotency-Key required',
        parameters: [
          {
            in: 'header',
            name: 'Idempotency-Key',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: json({
          type: 'object',
          description:
            'BookingInput schema in packages/types; service,size,extra,name,email,date,time,config,consent=true',
        }),
        responses: {
          201: success,
          400: { description: 'Invalid date/input' },
          409: { description: 'Slot conflict' },
        },
      },
    },
    '/bookings/{id}/pdf': {
      get: {
        security: bearer,
        summary: 'Owner/staff PDF estimate',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'PDF document' } },
      },
    },
    '/products': { get: { summary: 'Demo catalog', responses: { 200: success } } },
    '/checkout': {
      post: {
        security: bearer,
        summary: 'Create Stripe test checkout; prices are server-owned',
        requestBody: json({
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  quantity: { type: 'integer', minimum: 1, maximum: 20 },
                },
              },
            },
          },
        }),
        responses: { 200: success, 503: { description: 'Test keys not configured' } },
      },
    },
    '/orders': {
      get: { security: bearer, summary: 'Own order history', responses: { 200: success } },
    },
    '/admin/bookings': {
      get: {
        security: bearer,
        summary: 'Staff bookings',
        responses: { 200: success, 403: { description: 'Staff only' } },
      },
    },
    '/admin/bookings/{id}': {
      patch: {
        security: bearer,
        summary: 'Staff status or slot update',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: json({
          type: 'object',
          properties: {
            status: { enum: ['confirmed', 'in_progress', 'completed', 'cancelled'] },
            date: { type: 'string', format: 'date' },
            time: { enum: ['10:00', '12:00', '14:00'] },
          },
        }),
        responses: { 200: success, 409: { description: 'Slot conflict' } },
      },
    },
    '/admin/clients': {
      get: {
        security: bearer,
        summary: 'Paged, searchable customers',
        responses: { 200: success },
      },
    },
    '/admin/reports': {
      get: {
        security: bearer,
        summary: 'SQL JOIN, aggregate and cumulative window report',
        responses: { 200: success },
      },
    },
    '/admin/export': {
      get: { security: bearer, summary: 'Staff XLSX report', responses: { 200: success } },
    },
    '/faq': {
      post: {
        summary: 'Rules-based FAQ, no API key required',
        requestBody: json({
          type: 'object',
          properties: { message: { type: 'string' }, locale: { enum: ['pl', 'en', 'ua'] } },
        }),
        responses: { 200: success },
      },
    },
    '/webhooks/stripe': {
      post: {
        summary: 'Signed test events; no live events accepted',
        responses: { 200: success, 400: { description: 'Invalid signature' } },
      },
    },
  },
};
