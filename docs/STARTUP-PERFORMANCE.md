# Startup loading verification — 26 October 2026

The signed-in Chrome session remained on “Loading your tournaments…” while `/api/db/bootstrap` continued downloading for more than 1 minute. The document loaded in 1.15 seconds and authentication completed in 449 ms; the bootstrap body was still downloading at roughly 899 KB after 1.1 minutes. These are browser observations, not a completed baseline duration.

Changes:
- Bound authentication, bootstrap and pending-save requests to 20 seconds, including body download. Failed saves remain pending.
- Compress responses at the application server.
- Exclude embedded player photos and receipts from the bootstrap SQL projection; return authenticated media URLs instead. Existing images are preserved when those URLs are submitted during edits.
- Ignore stale bootstrap results after account changes.

Validation: production frontend build passed; 43 Node tests passed, including timeout during body download, media ownership checks, image preservation, and response compression. No production load test or capacity claim is made.

## Live result

Deployed commits: `05cd142` (request bounds/compression), `ebb8759` (separate player media).

Signed-in Chrome reload, warm asset cache, no throttling:
- Bootstrap: 1.89 seconds; 111 KB transferred, 321 KB decoded.
- Authentication: 326 ms.
- All startup requests finished: 3.84 seconds.
- Super Admin dashboard rendered with 3 tournaments and 56 players.
- Health endpoint returned HTTP 200.

The earlier bootstrap was still downloading after 2.9 minutes (about 2 MB transferred). This is one observed comparison, not an SLA or a cold/mobile-network guarantee.
