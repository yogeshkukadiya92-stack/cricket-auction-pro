# FPL 7 pre-auction audit — 21 October 2026

## Readiness

**NOT READY for an unconditional live-auction sign-off.** The confirmed fixes below pass local checks but require deployment. Only the authorized Karma 11 franchise has been configured; add the other participating teams before a competitive auction. Venue network, simultaneous real devices, actual projector/audio and production PostgreSQL execution of the new snapshot query remain unverified.

Production financial results were not changed. Karma 11 was created with user authorization, verified after the saving indicator cleared, and independently verified in the public summary API. Its owner label is “Karma 11” because an individual owner name was not supplied.

## Environment and observed FPL 7 data

- Live organizer: signed-in administrator in native Google Chrome on macOS.
- Live public view: in-app browser, no organizer session.
- Local UI rehearsal: actual React AuctioneerConsole and PublicSpectatorView, disposable sample data; no live mutations.
- Automated rehearsal: Express route tests with a simulated transactional database, plus existing application tests. This does not constitute a real PostgreSQL/concurrency/load test.
- Initial snapshot: 41 approved/available players, zero franchises, no bid. Later public browser view: 42 players as new registrations arrived.
- After authorized creation: Karma 11, shortcode K11, total/remaining purse ₹100 crore, spent ₹0.
- Confirmed rules: ₹1 crore opening/base price for observed players; fixed bid increment ₹1 crore; minimum squad 11; maximum squad 15; reserve ₹1 crore per remaining minimum slot; timer 15 seconds.
- Maximum initial bid for Karma 11: ₹90 crore, retaining ₹10 crore for ten more required players. Verified in Auctioneer Desk, Paddle and public leaderboard.
- Sampled player snapshot: zero duplicate IDs and zero invalid base prices. Duplicate names are not sufficient evidence of duplicate registrations.

## Findings and fixes

| ID | Severity/category | Confirmed issue and evidence | Change | Retest |
|---|---|---|---|---|
| QA-01 | P1 BUSINESS LOGIC | SELECT cleared accepted bids, including when selecting the same lot; ACCELERATE could replace a lot with accepted bids. Source reset state unconditionally. | Same-lot selection preserves bids; other selection/round change is rejected while bids exist. | PASS: local route rehearsal, including rejected change and preserved ₹100 sample bid. |
| QA-02 | P2 PERFORMANCE | Every bid returned the complete player/photo collection; each organizer poll fetched unchanged photo collections. | Ordinary BID/UNDO/SELECT responses omit unchanged collections. Snapshot polls compare player/team MVCC version hashes and return only changed collections. | PASS: integration test proves unchanged polls make no additional full collection reads and deletions return an explicit empty array. PostgreSQL query and production latency still need post-deploy verification. |
| QA-03 | P2 DATA CONSISTENCY | A poll already in flight could overwrite the result of a newer auction command. | Auction commands advance the same revision guard used by correction actions, rejecting older poll responses. | Source reviewed; browser race simulation NOT TESTED. |
| QA-04 | P3 UI | Public “Current Highest Bid” displayed the base price before any bid, contradicting “Waiting for opening bid”. Observed live. | Display “No bids yet” until an accepted bid exists. | PASS: rendered local public view after opening-bid/undo rehearsal. |
| QA-05 | P3 UX | Custom bid defaulted to ₹10,000 against FPL 7's ₹1 crore base; Undo was available before any bids. Observed live. | Initialize custom amount from player base; disable invalid custom amounts and empty Undo. | PASS: rendered local console, opening bid, invalid unchanged custom amount, undo, return to zero-bid state. |
| QA-06 | P3 UX | Public view retained Pending Approval and Rejected cards after automatic approval was introduced. Observed live. | Remove the two obsolete cards. | PASS: local rendered public view shows total/approved counts without manual-review cards. |
| QA-07 | P3 ERROR HANDLING | Auction command failures used the persistence banner's “Retry save”, which could not retry the auction command. | Separate auction alert with Dismiss from database save/retry state. | Source reviewed/build passed; injected browser failure NOT TESTED. |

## Coverage ledger

Statuses describe the specific interaction listed, not every function on the screen.

| Surface/workflow | Status | Evidence / limits |
|---|---|---|
| FPL 7 identity, current lot, Stage View | PASS | Live Chrome renders FPL 7/Yogesh Kukadiya, zero bids, 15-second timer. Timer countdown/projector/audio not exercised. |
| Franchises — create Karma 11 | PASS | Actual authorized creation, saving indicator cleared, public API independently confirms persisted purse. Edit/delete not exercised. |
| Auctioneer Desk | PASS | Live navigation, displayed controls, team/reserve checks; actual bidding exercised locally only. |
| Team Paddle | PASS | Live selected Karma 11, purse, squad count and next opening bid. Production bid button not clicked. |
| Squads | PASS | Live Karma 11 roster empty, spent ₹0, remaining ₹100 crore. Print/CSV buttons not exercised. |
| Rules | PASS | Live read-only inspection of purse, min/max squad, timer, increment, reserve. No rule/reset mutation. |
| Public summary and automatic refresh | PASS | Live no-login rendering; newly registered players and newly created Karma 11 appear. Corrected UI also verified locally. |
| Public total-player drilldown | PASS | Actual live modal lists players and close/search controls; search typing not exercised in this audit. |
| BID/UNDO/SOLD/UNSOLD/recall/RESET | PASS | Disposable route rehearsal verifies purse, reserve rejection, repeated sale rejection, preserved photo and reset refund. Production outcomes not exercised. |
| Recycle Bin remove/restore | PASS | Existing integration suite verifies original details, refund once, duplicate-mobile restore rejection and ownership; prior UI rehearsal retained. No production deletion here. |
| Duplicate mobile check | PASS | Existing suite verifies formatting, tournament isolation, archived registration and public notice payload. No production form submitted. |
| Image compression | PASS | Existing suite: JPEG/PNG size cap, alpha, corruption handling and preserved payment fields. |
| Public profile/privacy/registration access | PASS | Existing automated privacy and access regression tests. |
| Organizer Tournament Hub, tournament switching/create/edit | NOT TESTED | No tournament lifecycle changes in this audit. |
| Players filters, full responses, registration builder | NOT TESTED | Current audit did not submit forms or edit registrations. Existing tests cover selected server contracts only. |
| Fortune Wheel, simulator, OBS-specific overlay | NOT TESTED | No interactive/rendered inspection in this audit. |
| Organizer profile, Admin Panel, player sign-in/directory | NOT TESTED | No account/permission changes. Existing automated tests cover selected contracts only. |
| Excel/ZIP/CSV export and backup/import | NOT TESTED | No production data export/restore performed. |
| Actual payment/WhatsApp sharing | NOT TESTED | No external payments or messages sent. |
| Narrow/mobile viewport, keyboard-only and screen reader | NOT TESTED | Desktop browser inspection only. |
| Browser console traces, slow/offline network, venue load | NOT TESTED | No fault injection or stress traffic against production. |
| Multi-device simultaneous bids / real PostgreSQL transactions | NOT TESTED | Row locking inspected; local simulated-DB rehearsal is not proof of real concurrent transactions. |

## Release checks and next steps

- Production build passes. Full automated suite: 38 tests pass.
- Working changes include auction safety, smaller polling/bid responses and the listed UI corrections.
- Deploy the committed version, reload stage/paddle/auctioneer browsers, verify Karma 11 still has ₹100 crore and zero purchases, and add the remaining actual franchises.
- Do not use Reset Auction Progress against a running event as a test.
- Run a separate disposable tournament on the actual devices/network for a simultaneous-bid and projector/audio rehearsal before relying on the setup at the venue.
