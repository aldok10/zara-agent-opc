---
type: subskill
title: "Linux Storage"
---

# Linux Storage

LVM, filesystems, NVMe, io_uring, and storage benchmarking with fio.

## When to Load
- Designing storage layouts with LVM
- Choosing and tuning filesystems (XFS, ext4)
- Configuring NVMe or high-IOPS storage
- Benchmarking storage with fio
- Using io_uring for async I/O

## Key Concepts

**Storage stack:** Application -> VFS -> Filesystem -> Block Layer -> Device Driver -> Hardware.

**LVM:** Logical Volume Manager. Physical Volumes (PV) -> Volume Groups (VG) -> Logical Volumes (LV). Enables resizing, snapshots, thin provisioning.

**Filesystem choice:**
- XFS: best for large files, parallel I/O, default on RHEL. Cannot shrink.
- ext4: general purpose, mature, supports shrink. Max 1EB.

**I/O schedulers:** mq-deadline (default, good for HDDs), none/noop (NVMe, SSD -- no reordering needed), bfq (desktop fairness).

**io_uring:** modern async I/O interface. Shared ring buffers between kernel/userspace. Significantly lower syscall overhead than traditional AIO.

## Patterns

**LVM setup for database workload:**
```bash
# Create PVs, VG, LVs
pvcreate /dev/nvme0n1 /dev/nvme1n1
vgcreate data-vg /dev/nvme0n1 /dev/nvme1n1
lvcreate -L 500G -n db-lv data-vg
lvcreate -L 100G -n wal-lv data-vg

# Format with XFS (optimal for databases)
mkfs.xfs -f -d agcount=64 /dev/data-vg/db-lv
mkfs.xfs -f /dev/data-vg/wal-lv

# Mount with performance options
mount -o noatime,nodiratime,logbufs=8 /dev/data-vg/db-lv /var/lib/postgresql/data
mount -o noatime,nodiratime /dev/data-vg/wal-lv /var/lib/postgresql/wal
```

**fio benchmark (random read, simulating database):**
```ini
[global]
ioengine=io_uring
direct=1
bs=8k
iodepth=64
numjobs=4
runtime=60
time_based=1
group_reporting=1

[randread]
rw=randread
filename=/dev/data-vg/db-lv
size=100G
```

**fio benchmark (mixed workload):**
```bash
fio --name=mixed --ioengine=io_uring --direct=1 \
  --bs=4k --iodepth=32 --numjobs=8 \
  --rw=randrw --rwmixread=70 \
  --filename=/dev/nvme0n1 --size=50G \
  --runtime=120 --time_based --group_reporting
```

**NVMe optimization:**
```bash
# Verify NVMe scheduler is 'none'
cat /sys/block/nvme0n1/queue/scheduler

# Set read-ahead (lower for random, higher for sequential)
blockdev --setra 256 /dev/nvme0n1

# Check NVMe SMART data
nvme smart-log /dev/nvme0n1
```

## Gotchas
- `direct=1` in fio bypasses page cache -- necessary for true device benchmarking
- XFS cannot be shrunk, only grown -- plan initial size carefully
- LVM snapshots degrade write performance (copy-on-write overhead)
- ext4 journal on same device as data adds write amplification -- separate journal for high-write
- io_uring requires kernel 5.1+ (full features 5.6+)
- NVMe namespaces: some drives expose multiple namespaces, each is a separate block device
- `noatime` mount option gives 5-10% write improvement on metadata-heavy workloads

## Verification
- `iostat -xz 1` for device utilization, await, queue depth
- `blktrace` + `blkparse` for detailed I/O tracing
- `lvs -a` and `pvs` for LVM layout
- `xfs_info /mount` for XFS geometry
- `nvme list` for NVMe device enumeration
- `fio` output: focus on p99 latency, IOPS, bandwidth
