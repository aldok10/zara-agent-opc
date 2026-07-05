<?php

declare(strict_types=1);

use Swoole\Http\Request;
use Swoole\Http\Response;
use Swoole\Http\Server;

$server = new Server('0.0.0.0', 9501);

$server->set([
    'worker_num' => swoole_cpu_num(),
    'max_request' => 10000,
    'enable_coroutine' => true,
    'hook_flags' => SWOOLE_HOOK_ALL,
]);

$routes = [];

function route(string $method, string $path, callable $handler): void
{
    global $routes;
    $routes[strtoupper($method) . ':' . $path] = $handler;
}

function jsonResponse(Response $response, array $data, int $status = 200): void
{
    $response->status($status);
    $response->header('Content-Type', 'application/json');
    $response->end(json_encode($data, JSON_THROW_ON_ERROR));
}

route('GET', '/health', function (Request $request, Response $response): void {
    jsonResponse($response, ['status' => 'ok', 'workers' => swoole_cpu_num()]);
});

route('GET', '/users', function (Request $request, Response $response): void {
    $pdo = new PDO(
        'pgsql:host=localhost;dbname=app',
        'app',
        'secret',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $page = max(1, (int) ($request->get['page'] ?? 1));
    $limit = min(100, max(1, (int) ($request->get['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;

    $stmt = $pdo->prepare('SELECT id, name, email, created_at FROM users ORDER BY created_at DESC LIMIT :limit OFFSET :offset');
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $countStmt = $pdo->query('SELECT COUNT(*) FROM users');
    $total = (int) $countStmt->fetchColumn();

    jsonResponse($response, [
        'data' => $users,
        'meta' => ['page' => $page, 'limit' => $limit, 'total' => $total],
    ]);
});

$server->on('request', function (Request $request, Response $response) use (&$routes): void {
    $key = strtoupper($request->server['request_method']) . ':' . $request->server['request_uri'];

    if (isset($routes[$key])) {
        try {
            $routes[$key]($request, $response);
        } catch (\Throwable $e) {
            jsonResponse($response, ['error' => 'Internal server error'], 500);
        }
    } else {
        jsonResponse($response, ['error' => 'Not found'], 404);
    }
});

$server->start();
