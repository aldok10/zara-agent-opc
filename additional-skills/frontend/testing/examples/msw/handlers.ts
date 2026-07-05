import { http, HttpResponse, delay } from 'msw';

// --- Types ---
interface User {
  id: string;
  name: string;
  email: string;
}

interface SearchResult {
  items: string[];
  total: number;
}

// --- Data ---
const users: User[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com' },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com' },
  { id: '3', name: 'Charlie Brown', email: 'charlie@example.com' },
];

// --- REST Handlers ---
export const handlers = [
  // GET /api/users  -  list users
  http.get('/api/users', () => {
    return HttpResponse.json(users);
  }),

  // GET /api/users/:id  -  single user
  http.get('/api/users/:id', ({ params }) => {
    const user = users.find((u) => u.id === params.id);
    if (!user) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 });
    }
    return HttpResponse.json(user);
  }),

  // POST /api/users  -  create user
  http.post('/api/users', async ({ request }) => {
    const body = (await request.json()) as Omit<User, 'id'>;
    const newUser: User = { id: String(users.length + 1), ...body };
    return HttpResponse.json(newUser, { status: 201 });
  }),

  // DELETE /api/users/:id  -  delete user
  http.delete('/api/users/:id', ({ params }) => {
    const exists = users.some((u) => u.id === params.id);
    if (!exists) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 });
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /api/search  -  search with query
  http.get('/api/search', ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') ?? '';
    const items = users
      .filter((u) => u.name.toLowerCase().includes(q.toLowerCase()))
      .map((u) => u.name);
    const result: SearchResult = { items, total: items.length };
    return HttpResponse.json(result);
  }),

  // POST /api/login  -  auth
  http.post('/api/login', async ({ request }) => {
    const { email, password } = (await request.json()) as {
      email: string;
      password: string;
    };
    if (email === 'user@example.com' && password === 'validPassword123') {
      return HttpResponse.json({ token: 'mock-jwt-token', user: users[0] });
    }
    return HttpResponse.json(
      { message: 'Invalid email or password' },
      { status: 401 }
    );
  }),
];

// --- Error Scenario Handlers ---
// Use with server.use() for specific tests

export const errorHandlers = {
  serverError: http.get('/api/users', () => {
    return HttpResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }),

  networkError: http.get('/api/users', () => {
    return HttpResponse.error();
  }),

  slowResponse: http.get('/api/users', async () => {
    await delay(5000);
    return HttpResponse.json(users);
  }),

  rateLimited: http.get('/api/users', () => {
    return HttpResponse.json(
      { message: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }),

  unauthorized: http.get('/api/users', () => {
    return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }),
};
