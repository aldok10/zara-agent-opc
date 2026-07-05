# Apache Arrow

Zero-copy data sharing, IPC format, Flight protocol, and columnar memory layout.

## When to Load

- Sharing data between systems without serialization overhead
- Building high-performance data APIs with Arrow Flight
- Understanding columnar memory format for optimization
- Integrating tools that use Arrow as their memory format

## Key Concepts

**What Arrow Provides**
- Columnar memory format: CPU-cache-friendly, SIMD-optimized
- Zero-copy: share data between processes/languages without copying
- IPC (Inter-Process Communication): serialize/deserialize columnar data
- Flight: gRPC-based protocol for high-throughput data transfer
- Language-agnostic: same memory layout in Python, Rust, C++, Java, Go

**Why Columnar Matters**
- Analytical queries touch few columns but many rows
- Columnar layout: adjacent values of same type in memory
- Benefits: better compression, SIMD vectorization, cache efficiency
- Row-oriented (pandas object dtype): pointer-chasing, cache misses

**Arrow Type System**
- Primitive: int8-64, uint8-64, float16-64, bool
- Variable-length: utf8, large_utf8, binary
- Nested: list, struct, map, union
- Temporal: date32, date64, timestamp, duration, interval
- Dictionary: categorical encoding (like pandas Categorical)
- Null bitmap: separate bit array tracking null values

**Zero-Copy Interop**
- Polars uses Arrow internally (`.to_arrow()` is zero-copy)
- DuckDB can query Arrow tables directly
- pandas ArrowDtype columns avoid conversion overhead
- PySpark Arrow-based UDFs (pandas UDFs) avoid serialization

## Patterns

```python
import pyarrow as pa
import pyarrow.parquet as pq
import pyarrow.flight as flight

# Create Arrow table
schema = pa.schema([
    ("user_id", pa.int64()),
    ("name", pa.utf8()),
    ("score", pa.float64()),
    ("tags", pa.list_(pa.utf8())),
])

table = pa.table({
    "user_id": [1, 2, 3],
    "name": ["alice", "bob", "carol"],
    "score": [0.95, 0.82, 0.91],
    "tags": [["vip", "active"], ["active"], ["vip"]],
}, schema=schema)

# Write Parquet with compression
pq.write_table(table, "users.parquet", compression="zstd")

# Read with column selection and row filtering
table = pq.read_table(
    "users.parquet",
    columns=["user_id", "score"],
    filters=[("score", ">", 0.9)],
)
```

```python
# Arrow Flight server for high-throughput data serving
class DataService(flight.FlightServerBase):
    def __init__(self, location, datasets):
        super().__init__(location)
        self.datasets = datasets

    def do_get(self, context, ticket):
        dataset_name = ticket.ticket.decode()
        table = self.datasets[dataset_name]
        return flight.RecordBatchStream(table)

    def list_flights(self, context, criteria):
        for name, table in self.datasets.items():
            descriptor = flight.FlightDescriptor.for_path(name)
            endpoint = flight.FlightEndpoint(
                flight.Ticket(name.encode()),
                [self.location],
            )
            yield flight.FlightInfo(
                table.schema, descriptor, [endpoint],
                table.num_rows, table.nbytes,
            )

# Client usage
client = flight.connect("grpc://localhost:8815")
reader = client.do_get(flight.Ticket(b"orders"))
table = reader.read_all()
```

**IPC for Inter-Process Communication**
```python
# Write Arrow IPC (zero-copy readable by other processes)
with pa.ipc.new_file("data.arrow", table.schema) as writer:
    writer.write_table(table)

# Memory-map for zero-copy reads
mmap = pa.memory_map("data.arrow")
reader = pa.ipc.open_file(mmap)
table = reader.read_all()  # zero-copy from disk
```

## Gotchas

- Zero-copy only works when both sides use Arrow memory layout
- Pandas `.to_arrow()` may copy if pandas uses numpy object dtype (not ArrowDtype)
- Arrow arrays are immutable -- modifications create new arrays
- Large string type (`large_utf8`) needed for strings > 2GB total per chunk
- Flight requires gRPC -- adds dependency and complexity
- Arrow IPC files are not human-readable -- use Parquet for interchange with non-Arrow tools

## Verification

- Zero-copy confirmed: memory address is same before and after conversion
- Round-trip: write Arrow IPC -> read back -> schema and data match exactly
- Flight server: client retrieves data matching expected schema and row count
- Parquet read with pushdown: only requested columns loaded (check memory usage)
- Cross-language: Arrow table created in Python readable in Rust/Java without conversion
