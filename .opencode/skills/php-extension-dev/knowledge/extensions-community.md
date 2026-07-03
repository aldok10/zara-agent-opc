# PECL/Community Extensions & Development Approaches

> Docs: https://pecl.php.net | PIE: https://github.com/php/pie | ext-php-rs: https://github.com/davidcole1340/ext-php-rs

## Popular PECL/Community Extensions (50+)

### Caching

| Extension | GitHub |
|-----------|--------|
| redis | [phpredis/phpredis](https://github.com/phpredis/phpredis) |
| apcu | [krakjoe/apcu](https://github.com/krakjoe/apcu) |
| memcached | [php-memcached-dev/php-memcached](https://github.com/php-memcached-dev/php-memcached) |
| relay | [cachewerk/relay](https://github.com/cachewerk/relay) |

### Async/Concurrency

| Extension | GitHub |
|-----------|--------|
| swoole | [swoole/swoole-src](https://github.com/swoole/swoole-src) |
| openswoole | [openswoole/swoole-src](https://github.com/openswoole/swoole-src) |
| parallel | [krakjoe/parallel](https://github.com/krakjoe/parallel) |
| ev | libev binding (PECL) |
| event | libevent binding (PECL) |
| uv | [amphp/ext-uv](https://github.com/amphp/ext-uv) |

### Debugging/Profiling

| Extension | GitHub |
|-----------|--------|
| xdebug | [xdebug/xdebug](https://github.com/xdebug/xdebug) |
| pcov | [krakjoe/pcov](https://github.com/krakjoe/pcov) |
| excimer | [wikimedia/mediawiki-php-excimer](https://github.com/wikimedia/mediawiki-php-excimer) |
| tideways | [tideways/php-xhprof-extension](https://github.com/tideways/php-xhprof-extension) |
| spx | [NoiseByNorthwest/php-spx](https://github.com/NoiseByNorthwest/php-spx) |

### Serialization

| Extension | GitHub |
|-----------|--------|
| igbinary | [igbinary/igbinary](https://github.com/igbinary/igbinary) |
| msgpack | [msgpack/msgpack-php](https://github.com/msgpack/msgpack-php) |
| protobuf | [protocolbuffers/protobuf](https://github.com/protocolbuffers/protobuf) (monorepo) |

### Database Drivers

| Extension | GitHub |
|-----------|--------|
| mongodb | [mongodb/mongo-php-driver](https://github.com/mongodb/mongo-php-driver) |
| sqlsrv | [microsoft/msphpsql](https://github.com/microsoft/msphpsql) |
| pdo_sqlsrv | [microsoft/msphpsql](https://github.com/microsoft/msphpsql) |
| cassandra | [datastax/php-driver](https://github.com/datastax/php-driver) |

### Image

| Extension | GitHub |
|-----------|--------|
| imagick | [Imagick/imagick](https://github.com/Imagick/imagick) |
| vips | [libvips/php-vips-ext](https://github.com/libvips/php-vips-ext) |

### Compression

| Extension | GitHub |
|-----------|--------|
| zstd | [kjdev/php-ext-zstd](https://github.com/kjdev/php-ext-zstd) |
| lz4 | [kjdev/php-ext-lz4](https://github.com/kjdev/php-ext-lz4) |
| brotli | [kjdev/php-ext-brotli](https://github.com/kjdev/php-ext-brotli) |
| snappy | [kjdev/php-ext-snappy](https://github.com/kjdev/php-ext-snappy) |

### gRPC/RPC

| Extension | GitHub |
|-----------|--------|
| grpc | [grpc/grpc](https://github.com/grpc/grpc) (src/php) |

### Message Queues

| Extension | GitHub |
|-----------|--------|
| amqp | [php-amqp/php-amqp](https://github.com/php-amqp/php-amqp) |
| rdkafka | [php-rdkafka/php-rdkafka](https://github.com/php-rdkafka/php-rdkafka) |
| mosquitto | [mgdm/Mosquitto-PHP](https://github.com/mgdm/Mosquitto-PHP) |

### Data Structures

| Extension | GitHub |
|-----------|--------|
| ds | [php-ds/ext-ds](https://github.com/php-ds/ext-ds) |
| decimal | [php-decimal/ext-decimal](https://github.com/php-decimal/ext-decimal) |

### AI/ML

| Extension | GitHub |
|-----------|--------|
| tensor | [RubixML/Tensor](https://github.com/RubixML/Tensor) |
| fann | [bukka/php-fann](https://github.com/bukka/php-fann) |

### Misc

| Extension | GitHub |
|-----------|--------|
| ast | [nikic/php-ast](https://github.com/nikic/php-ast) |
| uuid | [php/pecl-networking-uuid](https://github.com/php/pecl-networking-uuid) |
| yaml | [php/pecl-file_formats-yaml](https://github.com/php/pecl-file_formats-yaml) |
| ssh2 | [php/pecl-networking-ssh2](https://github.com/php/pecl-networking-ssh2) |
| inotify | [php/pecl-system-inotify](https://github.com/php/pecl-system-inotify) |

## Development Approaches

| Approach | Language | Platform | Reference |
|----------|----------|----------|-----------|
| **Zend API** | C | All (standard) | [phpinternalsbook.com](https://www.phpinternalsbook.com) |
| **Zend API (C++)** | C++ | All | Swoole, MongoDB driver |
| **PHP-CPP** | C++11 | Linux/macOS | [PHP-CPP](https://github.com/CopernicaMarketingSoftware/PHP-CPP) |
| **ext-php-rs** | Rust | All | [davidcole1340/ext-php-rs](https://github.com/davidcole1340/ext-php-rs) |
| **phper** | Rust | All | [phper-framework/phper](https://github.com/phper-framework/phper) |
| **FrankenPHP** | Go | FrankenPHP only | [frankenphp.dev/docs/extensions](https://frankenphp.dev/docs/extensions/) |
| **FFI** | PHP (calls C) | All (runtime) | [php.net/ffi](https://www.php.net/manual/en/book.ffi.php) |

## PIE (PHP Installer for Extensions)

PECL officially deprecated. PIE is the replacement.

| Item | URL |
|------|-----|
| Repo | [php/pie](https://github.com/php/pie) |
| RFC | [wiki.php.net/rfc/adopt_pie_deprecate_pecl](https://wiki.php.net/rfc/adopt_pie_deprecate_pecl) |
| Registry | Packagist (`"type": "php-ext"`) |
| Install | `pie install vendor/extension` |

## Study These First (Best Learning Examples)

| Extension | Why | Source |
|-----------|-----|--------|
| ext/skeleton | Official template | [ext/skeleton](https://github.com/php/php-src/tree/master/ext/skeleton) |
| ext/json | Clean, small, serialization | [ext/json](https://github.com/php/php-src/tree/master/ext/json) |
| ext/bcmath | Simple math + OOP (PHP 8.4) | [ext/bcmath](https://github.com/php/php-src/tree/master/ext/bcmath) |
| ext/random | Modern PHP 8.2+, clean OOP | [ext/random](https://github.com/php/php-src/tree/master/ext/random) |
| igbinary | Small PECL, good build system | [igbinary/igbinary](https://github.com/igbinary/igbinary) |
| ds | OOP with iterators/interfaces | [php-ds/ext-ds](https://github.com/php-ds/ext-ds) |
| pcov | Zend extension (engine hooks) | [krakjoe/pcov](https://github.com/krakjoe/pcov) |
| ast | Read-only AST access, minimal | [nikic/php-ast](https://github.com/nikic/php-ast) |
| ext/filter | INI settings, validation patterns | [ext/filter](https://github.com/php/php-src/tree/master/ext/filter) |
| ext/sockets | Resource/object wrapping | [ext/sockets](https://github.com/php/php-src/tree/master/ext/sockets) |
