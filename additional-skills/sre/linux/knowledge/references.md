# References

## systemd (7 refs)
- **systemd Documentation** -- https://www.freedesktop.org/software/systemd/man/latest/ -- Complete man pages for all systemd components
- **systemd.service** -- https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html -- Service unit configuration
- **systemd.timer** -- https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html -- Timer units replacing cron
- **journalctl** -- https://www.freedesktop.org/software/systemd/man/latest/journalctl.html -- Journal log querying
- **systemd-networkd** -- https://www.freedesktop.org/software/systemd/man/latest/systemd-networkd.html -- Network configuration manager
- **systemd Resource Control** -- https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html -- cgroup-based resource limits
- **systemd Security Sandboxing** -- https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html -- Process isolation directives

## eBPF (6 refs)
- **eBPF.io** -- https://ebpf.io/ -- Introduction and ecosystem overview for eBPF
- **BPF CO-RE** -- https://nakryiko.com/posts/bpf-core-reference-guide/ -- Compile Once, Run Everywhere for portable BPF programs
- **libbpf** -- https://libbpf.readthedocs.io/ -- C library for loading and interacting with BPF programs
- **bpftrace** -- https://github.com/bpftrace/bpftrace/blob/master/docs/reference_guide.md -- High-level tracing language for eBPF
- **Cilium BPF Guide** -- https://docs.cilium.io/en/stable/bpf/ -- In-depth eBPF and XDP reference
- **BCC Tools** -- https://github.com/iovisor/bcc -- BPF-based Linux performance analysis tools

## cgroups & Containers (5 refs)
- **cgroups v2** -- https://docs.kernel.org/admin-guide/cgroup-v2.html -- Unified cgroup hierarchy documentation
- **Namespaces** -- https://man7.org/linux/man-pages/man7/namespaces.7.html -- Linux namespace isolation mechanisms
- **OCI Runtime Spec** -- https://github.com/opencontainers/runtime-spec -- Container runtime interface specification
- **LXC/LXD** -- https://documentation.ubuntu.com/lxd/en/latest/ -- System container manager
- **seccomp** -- https://man7.org/linux/man-pages/man2/seccomp.2.html -- System call filtering for sandboxing

## Performance Analysis (8 refs)
- **Brendan Gregg's Blog** -- https://www.brendangregg.com/blog/ -- Performance engineering analysis and methodology
- **Linux Performance Tools** -- https://www.brendangregg.com/linuxperf.html -- Complete performance observability tooling map
- **perf** -- https://perf.wiki.kernel.org/index.php/Main_Page -- Linux profiling and tracing tool
- **USE Method** -- https://www.brendangregg.com/usemethod.html -- Utilization, Saturation, Errors methodology
- **Flame Graphs** -- https://www.brendangregg.com/flamegraphs.html -- Visualization for profiled stack traces
- **sysstat** -- https://github.com/sysstat/sysstat -- System performance monitoring tools (sar, iostat, mpstat)
- **stress-ng** -- https://github.com/ColinIanKing/stress-ng -- System stress testing and benchmarking
- **fio** -- https://fio.readthedocs.io/ -- Flexible I/O tester for storage benchmarking

## Hardening (6 refs)
- **CIS Benchmarks** -- https://www.cisecurity.org/cis-benchmarks -- Security configuration standards for Linux
- **Linux Audit** -- https://man7.org/linux/man-pages/man8/auditd.8.html -- System call auditing framework
- **AppArmor** -- https://apparmor.net/ -- Mandatory access control for programs
- **SELinux** -- https://selinuxproject.org/page/Main_Page -- Security-Enhanced Linux MAC framework
- **SSH Hardening** -- https://www.ssh.com/academy/ssh/config -- SSH configuration security practices
- **Lynis** -- https://cisofy.com/lynis/ -- Security auditing tool for Linux systems

## Kernel & Networking (5 refs)
- **Linux Kernel Documentation** -- https://docs.kernel.org/ -- Official kernel docs and admin guides
- **proc filesystem** -- https://man7.org/linux/man-pages/man5/proc.5.html -- Kernel and process information pseudo-filesystem
- **sysctl** -- https://docs.kernel.org/admin-guide/sysctl/ -- Runtime kernel parameter tuning
- **nftables** -- https://wiki.nftables.org/ -- Packet filtering and classification framework
- **iproute2** -- https://man7.org/linux/man-pages/man8/ip.8.html -- Network configuration and routing tools

## File Systems & Storage (5 refs)
- **LVM** -- https://man7.org/linux/man-pages/man8/lvm.8.html -- Logical Volume Manager for flexible storage
- **XFS** -- https://xfs.wiki.kernel.org/ -- High-performance journaling filesystem
- **Btrfs** -- https://btrfs.readthedocs.io/ -- Copy-on-write filesystem with snapshots
- **dm-crypt/LUKS** -- https://man7.org/linux/man-pages/man8/cryptsetup.8.html -- Disk encryption
- **mdadm** -- https://man7.org/linux/man-pages/man8/mdadm.8.html -- Software RAID management
