# App and database performance audit — 26 October 2026

## Scope and production baseline

Production read-only diagnostics: 4 tournaments, 2 teams, 56 players; PostgreSQL database approximately 167 MB. Average stored player JSON was approximately 639,346 bytes; maximum 2,174,826 bytes. Player photos, receipts and uploaded answers lived inside JSON records. No production auctions, balances, accounts or registrations were changed for testing.

The earlier startup fix reduced one warm signed-in startup to 3.84 seconds, with a 1.89-second bootstrap. This audit also found that snapshots, auction commands and form responses could reintroduce embedded images, and that single-record edits re-saved full collections. Public registration depended on an unstable fallback tournament object, allowing repeat form-loading requests.

## Implemented changes

- Shared database projections remove player photos, receipts, uploaded custom answers, team logos and tournament logos/payment QR images from routine JSON responses. Permission-checked endpoints fetch uploads when needed. Saves resolve these references back to original bytes.
- Auction reads and responses use compact records. SOLD/UNSOLD update domain fields while retaining images. RESET and ACCELERATE update batches rather than one network round trip per player. Tournament row locks and exact purse/reserve checks remain in place.
- Changed-record saving replaces full-collection saves. Pending upserts merge by tournament and record ID, including singleton edits and retries, preserving newer edits and unsent records.
- Form responses use server-side search and pages of 25. Public directory uses server-side search/role filtering and pages of 48 with exact aggregate counts. Player cards initially render 48 records, with more on demand.
- Conditional polling returns 304 when current data is unchanged; access is still checked on every request. Validators stay within each mounted page/account scope. Hidden pages pause relevant polling. Cancelled requests cannot populate a different page/filter.
- Public registration requests depend on stable IDs and are cancelled when navigation changes. Player directory stays unloaded until opened; its requests stop while inactive.
- Player home, profile and directory queries exclude image bytes. Offscreen list images load/decode lazily. Large existing uploaded images are compressed on delivery.
- Excel and photo ZIP exports retrieve deferred media only at export time. Report libraries remain loaded on demand.
- Database connection acquisition and statements have time limits. Startup backfill reads only profiles that are missing or need mobile normalization, and identical profile writes are skipped. Existing primary/mobile indexes cover the inspected lookup paths; no speculative production index was added.

## Page coverage

| Area | Verification |
|---|---|
| Landing, organizer/admin sign-in | Local browser login and authenticated API checks |
| Admin overview/users/tournaments | Dashboard and exact aggregate counts rendered |
| Tournament list and hub | Local browser navigation with 120 players / 4 teams |
| Stage, auctioneer desk, team paddle | Browser render; local bid and SOLD; actual PostgreSQL concurrency/reserve/settlement tests |
| Players and Recycle Bin | Catalog render, bounded cards; correction/restore tests; read-on-open Recycle Bin reviewed |
| Registration settings and form responses | Browser render; responses page 1 → page 2; exact total 120 |
| Franchises, squads and rules | Browser navigation; media/purse persistence checks |
| Public registration | Browser render; cancelled/stable-ID request implementation reviewed |
| Public directory | Page changes and role filter, total 120, 30 batters, server-bounded reads |
| Public spectator and OBS | Browser render; local SOLD reflected with correct purse and next lot |
| Organizer profile and user portal | Browser render and navigation |
| Player login/home/directory/profile/history/live | Browser and API checks; 390-pixel mobile width without horizontal overflow |
| Simulator, Fortune Wheel, backup modal | Browser open/close checks; report modules loaded on demand |
| Excel and image ZIP | Actual local downloads, 240 images in each export for 120 players |

## Measured local PostgreSQL comparison

A disposable PostgreSQL instance was populated with 1,000 players, two teams and embedded uploads. The optimized routes were exercised against the real database, including concurrent bids, duplicate settlement attempts, SOLD, UNSOLD, accelerated recall and reset. Images and receipts were compared after writes; custom uploaded answers were retained. Registration pages were checked for exact counts, no overlap, search and authorization. ETag/304 and owner-only media paths were checked.

The original full player JSON was approximately 53.5 MB. The optimized initial snapshot was approximately 0.28 MB (over 99% smaller). Local snapshot reads were around 0.1 seconds; bid requests were tens of milliseconds. These are single-machine lab measurements, not production latency or concurrent-user capacity claims. The test logs contain exact run values.

Validation commands:

```sh
npm run build
npm test
PERF_TEST_DATABASE_URL=postgresql://127.0.0.1:55439/postgres npm run test:performance
```

`PERF_TEST_DATABASE_URL` must reference a disposable local test database. The performance test uses a temporary schema and removes its own synthetic data. It is skipped without that variable. No production load or destructive database maintenance was performed.

## Limits and follow-up

No claim is made that all possible datasets/devices or thousands of simultaneous users were tested. Routine organizer bootstrap and exact auction calculations still use compact metadata collections; very large deployments may need further per-tournament metadata loading. Production database query plans and server resource saturation were not captured. Complete JSON backups intentionally include all original image bytes and remain larger than regular page loads.

Final local run (all 50 tests together): 53,560,628-byte original roster versus 278,408-byte optimized snapshot; 150 ms snapshot, 63 ms median bid, 74 ms slowest of ten sequential bid samples. SQL metadata lookup used a Bitmap Heap Scan and took 0.188 ms. Running all tests together adds machine contention; these values supersede any earlier isolated run for reporting. Production build and all 50 tests passed.
