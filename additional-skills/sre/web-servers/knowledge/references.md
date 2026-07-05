# References

## NGINX (8 refs)
- **NGINX Documentation** -- https://nginx.org/en/docs/ -- Complete reference for NGINX open-source
- **NGINX Directives Index** -- https://nginx.org/en/docs/dirindex.html -- All configuration directives
- **NGINX Admin Guide** -- https://docs.nginx.com/nginx/admin-guide/ -- Configuration, load balancing, security
- **NGINX Reverse Proxy** -- https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/ -- Proxying to upstream servers
- **NGINX SSL/TLS** -- https://nginx.org/en/docs/http/configuring_https_servers.html -- HTTPS configuration and optimization
- **NGINX Rate Limiting** -- https://docs.nginx.com/nginx/admin-guide/security-controls/controlling-access-proxied-http/ -- Request rate and connection limiting
- **NGINX Load Balancing** -- https://docs.nginx.com/nginx/admin-guide/load-balancer/ -- Upstream server groups and health checks
- **NGINX Variables** -- https://nginx.org/en/docs/varindex.html -- All available variables for configuration

## Caddy (6 refs)
- **Caddy Documentation** -- https://caddyserver.com/docs/ -- Modern web server with automatic HTTPS
- **Caddyfile** -- https://caddyserver.com/docs/caddyfile -- Human-readable configuration format
- **Caddy Reverse Proxy** -- https://caddyserver.com/docs/caddyfile/directives/reverse_proxy -- Proxy configuration with health checks
- **Caddy Automatic HTTPS** -- https://caddyserver.com/docs/automatic-https -- Zero-config TLS certificate management
- **Caddy JSON Config** -- https://caddyserver.com/docs/json/ -- Full programmatic configuration API
- **Caddy Modules** -- https://caddyserver.com/docs/modules/ -- Extending Caddy with plugins

## HAProxy (6 refs)
- **HAProxy Documentation** -- https://docs.haproxy.org/ -- Configuration manual for HAProxy
- **HAProxy Configuration** -- https://www.haproxy.com/documentation/haproxy-configuration-manual/ -- Complete configuration reference
- **HAProxy Load Balancing** -- https://www.haproxy.com/documentation/haproxy-configuration-tutorials/load-balancing/ -- Algorithms and health checking
- **HAProxy SSL** -- https://www.haproxy.com/documentation/haproxy-configuration-tutorials/ssl-tls/ -- TLS termination and passthrough
- **HAProxy Stats** -- https://www.haproxy.com/blog/exploring-the-haproxy-stats-page -- Monitoring and statistics interface
- **HAProxy ACLs** -- https://docs.haproxy.org/2.8/configuration.html#7 -- Access control lists for traffic routing

## Reverse Proxy Patterns (5 refs)
- **TLS Termination** -- https://docs.nginx.com/nginx/admin-guide/security-controls/terminating-ssl-http/ -- Offloading TLS at the proxy layer
- **HTTP/2 and HTTP/3** -- https://caddyserver.com/docs/caddyfile/options#protocols -- Modern protocol support at the edge
- **WebSocket Proxying** -- https://nginx.org/en/docs/http/websocket.html -- Upgrading connections for WebSocket
- **gRPC Proxying** -- https://nginx.org/en/docs/http/ngx_http_grpc_module.html -- Proxying gRPC traffic through NGINX
- **Proxy Protocol** -- https://www.haproxy.com/blog/use-the-proxy-protocol-to-preserve-a-clients-ip-address -- Preserving client IP through proxy chains

## Security & Headers (5 refs)
- **OWASP Secure Headers** -- https://owasp.org/www-project-secure-headers/ -- Recommended HTTP security headers
- **Mozilla SSL Configuration Generator** -- https://ssl-config.mozilla.org/ -- TLS settings for NGINX, Apache, HAProxy
- **ModSecurity** -- https://github.com/owasp-modsecurity/ModSecurity -- Open-source WAF engine
- **Coraza WAF** -- https://coraza.io/docs/ -- Next-gen WAF compatible with ModSecurity rules
- **Content Security Policy** -- https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP -- XSS mitigation via CSP headers

## Performance (5 refs)
- **NGINX Tuning** -- https://nginx.org/en/docs/http/ngx_http_core_module.html#worker_connections -- Connection and buffer optimization
- **Caching** -- https://docs.nginx.com/nginx/admin-guide/content-cache/content-caching/ -- Proxy cache configuration
- **Compression** -- https://nginx.org/en/docs/http/ngx_http_gzip_module.html -- gzip and Brotli compression
- **Connection Pooling** -- https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/#keepalive -- Upstream keepalive connections
- **Benchmarking** -- https://github.com/wg/wrk -- HTTP benchmarking tool for load testing

## Kubernetes Ingress (5 refs)
- **NGINX Ingress Controller** -- https://kubernetes.github.io/ingress-nginx/ -- Community NGINX-based Kubernetes ingress
- **Traefik** -- https://doc.traefik.io/traefik/ -- Cloud-native application proxy for Kubernetes
- **Envoy Proxy** -- https://www.envoyproxy.io/docs/ -- High-performance edge and service proxy
- **Contour** -- https://projectcontour.io/docs/ -- Envoy-based Kubernetes ingress controller
- **Gateway API** -- https://gateway-api.sigs.k8s.io/ -- Next-gen Kubernetes ingress specification

## Monitoring & Debugging (4 refs)
- **NGINX Amplify** -- https://docs.nginx.com/nginx-amplify/ -- SaaS monitoring for NGINX
- **HAProxy Prometheus Exporter** -- https://www.haproxy.com/blog/haproxy-exposes-a-prometheus-metrics-endpoint -- Metrics export for monitoring
- **access.log Analysis** -- https://goaccess.io/ -- Real-time web log analyzer
- **NGINX Debug Logging** -- https://docs.nginx.com/nginx/admin-guide/monitoring/debugging/ -- Troubleshooting with debug-level logs
