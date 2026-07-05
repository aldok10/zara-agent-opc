---
type: fact
title: "Swoole Version Matrix & Evolution (4.x to 6.2)"
---

# Swoole Version Matrix & Evolution

## Swoole 4.x (Legacy - EOL)
- **PHP Support**: 7.2 - 8.1
- **Model**: Multi-process only (Master -> Manager -> Workers)
- **Key Features**: Coroutines introduced, runtime hooks (`SWOOLE_HOOK_ALL`), Channel, WaitGroup
- **Clients**: `Swoole\Coroutine\MySQL`, `Swoole\Coroutine\Redis`, `Swoole\Coroutine\PostgreSQL`
- **Notable**: v4.6 native CURL hook, v4.7 async DNS
- **Migration note**: Custom coroutine clients deprecated in v5+, use PDO/Redis extension hooks instead

## Swoole 5.x (Stable LTS)
- **PHP Support**: 8.1+ (dropped PHP 7.x and 8.0)
- **Model**: Multi-process (thread mode experimental in 5.1)
- **Breaking changes from v4**:
  - Removed `Swoole\Coroutine\MySQL` - use PDO with hooks
  - Removed `Swoole\Coroutine\Redis` - use phpredis with hooks
  - Removed `Swoole\Coroutine\PostgreSQL` - use pdo_pgsql with hooks
  - Removed `Swoole\Coroutine\System::fread/fwrite/fgets`
- **Key additions**: v5.1 pdo_pgsql/sqlite/oci coroutine support
- **Philosophy**: Use PHP's native extensions + runtime hooks. No more Swoole-specific clients.

## Swoole 6.0 (Current Major)
- **PHP Support**: 8.1+ (6.2 dropped 8.1, requires 8.2+)
- **Model**: Multi-process AND Multi-thread (`SWOOLE_THREAD` mode)
- **Landmark features**:
  - Native Thread Support (`--enable-swoole-thread`, requires PHP ZTS)
  - io_uring for file async operations (`--enable-iouring`)
  - Zstd compression (`--enable-zstd`)
  - Coroutine Lock (non-blocking, reentrant)
  - Async Client (`Swoole\Async\Client`)
  - Thread-safe containers: Map, ArrayList, Queue, Atomic, Barrier
- **Thread management** (v6.0.2+): `Thread::yield()`, `activeCount()`, `isAlive()`, `setName()`, `setAffinity()`

## Swoole 6.1 (Current Minor)
- **Major additions**:
  - Standard Library Extensions (stdext) - OOP on basic types
  - Typed Arrays - type-constrained Map/ArrayList
  - llhttp default parser (replaces http_parser)
  - Lock API simplification - only `__construct`, `lock`, `unlock`
  - Coroutine cancellation with `$throw_exception` parameter
  - WebSocket fragmented messages support
  - macOS defaults to `poll` (kqueue doesn't support cross-process pipes)

## Swoole 6.2 (Latest)
- **PHP Support**: 8.2+ (dropped PHP 8.1)
- **New features**:
  - Coroutine FTP client (`--enable-swoole-ftp`)
  - Coroutine SSH client (`--with-swoole-ssh2`)
  - io_uring for HTTP coroutine server (`--enable-uring_socket`)
  - `Swoole\RemoteObject\Server` - transparent MongoDB coroutine
  - `Swoole\Coroutine::setTimeLimit()` - execution timeout
  - `pdo_firebird` coroutine support
  - PHP 8.5 support
  - OpenSSL included by default
  - liburing minimum version: 2.8

## Migration Guide Summary

### v4 -> v5
1. Replace `Swoole\Coroutine\MySQL` with PDO + `SWOOLE_HOOK_ALL`
2. Replace `Swoole\Coroutine\Redis` with phpredis + hooks
3. Replace `Swoole\Coroutine\PostgreSQL` with pdo_pgsql + hooks
4. Ensure PHP >= 8.1

### v5 -> v6
1. Choose: process mode (default) or thread mode (ZTS required)
2. Consider io_uring for file-heavy workloads (Linux, liburing >= 2.8)
3. Replace old lock patterns with simplified `Swoole\Coroutine\Lock`
4. Upgrade to PHP 8.2+ for v6.2

### v6.0 -> v6.1
1. Lock API changed: only `__construct`, `lock`, `unlock` remain
2. macOS defaults to `poll` - enable kqueue manually if needed
3. Runtime hooks in thread mode: set in main thread only
