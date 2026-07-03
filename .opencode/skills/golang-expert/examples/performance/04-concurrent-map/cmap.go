// concurrent-map — compares concurrent map strategies with benchmarks.
//
// Run: go test -bench=. -benchmem -cpu=1,4,8
//
// Strategies compared:
//   1. sync.RWMutex + map (simple, works for most cases)
//   2. sync.Map (good for read-heavy, append-only keys)
//   3. Sharded map (best under high write contention)
//
// DON'T reach for sharding or sync.Map until plain mutex
// is proven insufficient via benchmarks.

package cmap

import (
	"hash/fnv"
	"sync"
)

// --- Strategy 1: RWMutex + map (default choice) ---

type MutexMap struct {
	mu sync.RWMutex
	m  map[string]int
}

func NewMutexMap() *MutexMap {
	return &MutexMap{m: make(map[string]int)}
}

func (m *MutexMap) Get(key string) (int, bool) {
	m.mu.RLock()
	v, ok := m.m[key]
	m.mu.RUnlock()
	return v, ok
}

func (m *MutexMap) Set(key string, val int) {
	m.mu.Lock()
	m.m[key] = val
	m.mu.Unlock()
}

// --- Strategy 2: sync.Map (append-only or disjoint keys) ---

type SyncMap struct {
	m sync.Map
}

func NewSyncMap() *SyncMap {
	return &SyncMap{}
}

func (m *SyncMap) Get(key string) (int, bool) {
	v, ok := m.m.Load(key)
	if !ok {
		return 0, false
	}
	return v.(int), true
}

func (m *SyncMap) Set(key string, val int) {
	m.m.Store(key, val)
}

// --- Strategy 3: Sharded map (high contention) ---

const numShards = 32

type ShardedMap struct {
	shards [numShards]shard
}

type shard struct {
	mu sync.RWMutex
	m  map[string]int
}

func NewShardedMap() *ShardedMap {
	sm := &ShardedMap{}
	for i := range sm.shards {
		sm.shards[i].m = make(map[string]int)
	}
	return sm
}

func (sm *ShardedMap) getShard(key string) *shard {
	h := fnv.New32a()
	h.Write([]byte(key))
	return &sm.shards[h.Sum32()%numShards]
}

func (sm *ShardedMap) Get(key string) (int, bool) {
	s := sm.getShard(key)
	s.mu.RLock()
	v, ok := s.m[key]
	s.mu.RUnlock()
	return v, ok
}

func (sm *ShardedMap) Set(key string, val int) {
	s := sm.getShard(key)
	s.mu.Lock()
	s.m[key] = val
	s.mu.Unlock()
}
