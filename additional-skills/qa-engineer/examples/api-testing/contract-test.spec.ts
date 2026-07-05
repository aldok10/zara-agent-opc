/**
 * Example: Pact consumer-driven contract test
 * Demonstrates: consumer expectations, provider states, matchers
 * Note: PactV4 is aliased as Pact in @pact-foundation/pact v13+
 */
import { Pact, Matchers } from '@pact-foundation/pact';
import { UserService } from '../src/services/user-service';

const { like, eachLike, string, integer, email } = Matchers;

const provider = new Pact({
  consumer: 'frontend-app',
  provider: 'user-service',
});

describe('User Service Contract', () => {
  it('returns user by ID', async () => {
    await provider
      .addInteraction()
      .given('user 123 exists')
      .uponReceiving('a request for user 123')
      .withRequest('GET', '/api/users/123', (builder) => {
        builder.headers({ Accept: 'application/json' });
      })
      .willRespondWith(200, (builder) => {
        builder
          .headers({ 'Content-Type': 'application/json' })
          .jsonBody({
            id: integer(123),
            name: string('John Doe'),
            email: email('john@example.com'),
            createdAt: like('2024-01-01T00:00:00Z'),
          });
      })
      .executeTest(async (mockServer) => {
        const client = new UserService(mockServer.url);
        const user = await client.getUser('123');

        expect(user.id).toBe(123);
        expect(user.name).toBeDefined();
        expect(user.email).toContain('@');
      });
  });

  it('returns 404 for non-existent user', async () => {
    await provider
      .addInteraction()
      .given('user 999 does not exist')
      .uponReceiving('a request for non-existent user')
      .withRequest('GET', '/api/users/999')
      .willRespondWith(404, (builder) => {
        builder.jsonBody({
          error: string('User not found'),
          code: string('USER_NOT_FOUND'),
        });
      })
      .executeTest(async (mockServer) => {
        const client = new UserService(mockServer.url);
        await expect(client.getUser('999')).rejects.toThrow('User not found');
      });
  });

  it('returns paginated user list', async () => {
    await provider
      .addInteraction()
      .given('users exist')
      .uponReceiving('a request for user list')
      .withRequest('GET', '/api/users', (builder) => {
        builder.query({ page: '1', limit: '10' });
      })
      .willRespondWith(200, (builder) => {
        builder.jsonBody({
          data: eachLike({
            id: integer(1),
            name: string('User'),
            email: email('user@example.com'),
          }),
          pagination: {
            page: integer(1),
            limit: integer(10),
            total: integer(42),
          },
        });
      })
      .executeTest(async (mockServer) => {
        const client = new UserService(mockServer.url);
        const result = await client.listUsers({ page: 1, limit: 10 });

        expect(result.data.length).toBeGreaterThan(0);
        expect(result.pagination.page).toBe(1);
      });
  });
});
