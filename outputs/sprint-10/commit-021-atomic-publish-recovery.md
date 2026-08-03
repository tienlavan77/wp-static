# Sprint 10 Commit 021 - Atomic Publish and Recovery

Status: PASS

Output Pipeline now writes to a Site-local staging snapshot. Incremental builds
copy the verified snapshot before overlaying changed artifacts; full builds
start clean. Only a completed staging snapshot is swapped into `public/dist`.
The previous snapshot is retained during the swap and restored if the final
rename fails. A later publish recovers an interrupted previous snapshot when
`dist` is absent.

Build Integration passes the immutable Build ID to Output Pipeline for unique
staging/backup paths. Output Pipeline remains the sole public filesystem writer.
