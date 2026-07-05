-- Sliding Window Rate Limiter
-- Algorithm: sorted set with timestamp scores, count entries in window
-- KEYS[1] = rate limit key (e.g., "ratelimit:{user}:123:api")
-- ARGV[1] = window size in milliseconds
-- ARGV[2] = max requests allowed in window
-- ARGV[3] = current timestamp in milliseconds
-- ARGV[4] = unique request ID (e.g., UUID or timestamp+random)
-- Returns: {allowed (0/1), remaining, retry_after_ms}

local key = KEYS[1]
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local request_id = ARGV[4]

local window_start = now - window

-- Remove expired entries outside the window
redis.call('ZREMRANGEBYSCORE', key, 0, window_start)

-- Count current requests in window
local current = redis.call('ZCARD', key)

if current < limit then
    -- Under limit: add this request and allow
    redis.call('ZADD', key, now, request_id)
    redis.call('PEXPIRE', key, window)
    return {1, limit - current - 1, 0}
else
    -- Over limit: calculate retry time from oldest entry
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local retry_after = 0
    if #oldest > 0 then
        retry_after = tonumber(oldest[2]) + window - now
        if retry_after < 0 then retry_after = 0 end
    end
    return {0, 0, retry_after}
end

-- Usage (from application):
-- EVALSHA <sha> 1 "ratelimit:{user}:123:api" 60000 100 <now_ms> <uuid>
--
-- Register script:
-- SCRIPT LOAD <script_content> → returns SHA
-- Call via EVALSHA (avoids sending script body every time)
--
-- Advantages over fixed window:
-- - No boundary burst problem (rolling window, not fixed intervals)
-- - Self-cleaning (ZREMRANGEBYSCORE removes old entries)
-- - Precise count within any sliding window
--
-- Production notes:
-- - Key auto-expires via PEXPIRE (memory safety)
-- - Use hash tags for multi-key rate limits: "ratelimit:{user}:123"
-- - Monitor ZCARD growth if window is large + high request rate
