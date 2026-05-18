# Implementation Plan — Space Invaders Gap Closure

> **Implementation Status: ~65% Complete** *(verified against source on 2026-05-18)*

This document is the working plan for bringing the React Island Space Invaders game up to the full spec in `specs/space-invaders.md`.

## Scope Constraints

- **Gameplay source file:** `frontend/src/islands/space-invaders/SpaceInvadersIsland.tsx`
- **Unit/component tests:** `frontend/tests/islands/space-invaders/SpaceInvadersIsland.test.tsx`
- **E2E smoke test:** `e2e/space-invaders.spec.ts`
- Do **not** create additional gameplay source files unless absolutely required by the spec (currently not required).

---

## Current Status (Source-Verified)

### What is already implemented

| Area | Status | Source-verified notes |
|---|---|---|
| Game state machine | ✅ Implemented | `GameStatus` supports `idle`, `running`, `paused`, `won`, `lost` |
| Board + dimensions | ✅ Implemented | 360×420 board and core sizing constants exist |
| Enemy grid | ✅ Partial | 4×8 grid renders and moves, but `Enemy` lacks `row` |
| Player movement | ✅ Implemented | Keyboard + touch/button movement exists |
| Player shooting | ✅ Implemented | Upward bullets, 220 ms rate limit, player bullet rendering |
| Enemy movement | ✅ Partial | Horizontal movement + drop implemented, but speed is hardcoded via `% 2` |
| Bullet/enemy collision | ✅ Partial | AABB collision exists, but score is flat `10` per enemy |
| Lives + lose condition | ✅ Partial | Lives decrement when enemies reach player row; enemy-bullet loss path missing |
| Win condition | ✅ Implemented | `enemies.length === 0` sets `won` |
| HUD | ✅ Partial | Shows Score/Lives/Enemies; no `High:` |
| Touch controls | ✅ Implemented | Left / Shoot / Right controls exist |
| Reset flow | ✅ Partial | Full reset works, but life-lost reset is incomplete |

### Confirmed gaps vs spec

| Spec requirement | Current status | Exact gap |
|---|---|---|
| Enemy bullets | ❌ Missing | No `enemyBullets` state, constants, movement, rendering, or player-hit handling |
| Life lost from enemy bullet | ❌ Missing | No enemy bullet → player AABB collision path |
| Speed scaling | ❌ Missing | Tick loop uses `tickCountRef.current % 2 === 0`, not `max(1, floor(count / 4))` |
| Row-based scoring | ❌ Missing | `Enemy` has no `row`; score is flat `10` |
| Shields | ❌ Missing | No `ShieldBlock`, shield builder, state, rendering, or bullet/shield collisions |
| High score persistence | ❌ Missing | No `highScore` state, no `localStorage`, no HUD display |
| Life-lost reset details | ❌ Bug | On life lost, code does **not** reset `playerX`, `enemyDirection`, or `tickCountRef.current` |
| E2E smoke test | ❌ Missing | `e2e/space-invaders.spec.ts` does not exist |
| Comprehensive unit tests | ❌ Incomplete | `frontend/tests/islands/space-invaders/SpaceInvadersIsland.test.tsx` exists, but only contains 3 smoke tests |
| UFO / mystery ship | ⏸️ Optional | Not implemented; spec marks as optional enhancement |

---

## Completed ✅

Keep this section accurate while implementing.

- React Island shell exists in `frontend/src/islands/space-invaders/SpaceInvadersIsland.tsx`
- `GameStatus` state machine is present and wired to Start / Pause / Reset UI
- Game board renders with accessible `role="application"` and status label
- 4×8 enemy fleet is created and rendered
- Player can move left/right by keyboard and on-screen controls
- Player can fire upward bullets with a 220 ms rate limit
- Player bullets move upward and are removed off-screen
- Enemy grid marches horizontally, reverses at walls, and drops downward
- Player bullet vs enemy AABB collision removes enemies
- Score, lives, and enemy count are displayed
- Win state (`won`) and loss state (`lost` when invaders reach player row) exist
- Basic Vitest coverage already exists in `frontend/tests/islands/space-invaders/SpaceInvadersIsland.test.tsx`:
  - renders game shell
  - start/pause transitions
  - reset returns to idle

---

## Implementation Order

Implement in this order so each change unlocks the next one cleanly:

1. **Fix life-lost reset path** and centralize life-loss handling.
2. **Add `row` to enemies** and switch scoring to row-based values.
3. **Replace hardcoded enemy movement cadence** with spec speed scaling.
4. **Add enemy bullets** using the centralized life-loss path.
5. **Add shields** and bullet/shield interactions.
6. **Add high score persistence + HUD display.**
7. **Expand Vitest coverage** for every mechanic above.
8. **Add Playwright smoke test.**
9. **Only after all required work is green:** optionally add UFO polish.

---

## Remaining Tasks (Prioritized)

### P0 — Critical bugs + core mechanics

#### 1) Fix the life-lost reset bug and create one shared life-loss path
- [ ] **File:** `frontend/src/islands/space-invaders/SpaceInvadersIsland.tsx`
- [ ] **Why:** The current “enemy reached player row” branch resets the wave incorrectly.
- [ ] **Required code changes:**
  - Keep the current behavior of decrementing lives and rebuilding the enemy wave.
  - When `nextLives > 0`, also perform all three required resets:
    - `setPlayerX((GAME_WIDTH - PLAYER_WIDTH) / 2)`
    - `setEnemyDirection(1)`
    - `tickCountRef.current = 0`
  - Clear all in-flight bullets on life lost:
    - existing player `bullets`
    - future `enemyBullets`
  - Prefer extracting the repeated life-loss behavior into a small in-component helper/callback (still inside the same TSX file) so both causes use the exact same reset logic:
    - enemy reaches `PLAYER_Y`
    - enemy bullet hits player
- [ ] **Acceptance check:** losing a life without hitting 0 restores a fresh wave, centered player, direction `1`, tick counter reset, bullets cleared, shields preserved.
- [ ] **Tests to add/update in** `frontend/tests/islands/space-invaders/SpaceInvadersIsland.test.tsx`:
  - enemy reaching the player row decrements lives by 1
  - after that event, status stays playable (not `lost`) when lives remain
  - player position resets to center
  - movement cadence resets to base speed on the next wave (assert via behavior, not private refs)
  - shields are **not** rebuilt on life lost once shields exist

#### 2) Add row metadata and row-based scoring
- [ ] **File:** `frontend/src/islands/space-invaders/SpaceInvadersIsland.tsx`
- [ ] **Required code changes:**
  - Extend `Enemy` to include `row: number`.
  - Update `buildEnemies()` so each enemy is created as `{ id, row, x, y }`.
  - Replace flat scoring (`hitEnemyIds.size * 10`) with per-enemy scoring based on original row:
    - row `0` → `40`
    - row `1` → `30`
    - row `2` → `20`
    - row `3` → `10`
  - Compute score from the actual hit enemies before removing them from state.
  - Preserve current AABB collision behavior; only change how score is derived.
- [ ] **Acceptance check:** top-row kills are worth more than bottom-row kills and score updates in real time.
- [ ] **Tests to add/update:**
  - top-row enemy hit adds `40`
  - second-row hit adds `30`
  - third-row hit adds `20`
  - bottom-row hit adds `10`
  - multi-hit situations in one tick add the sum of all killed enemies correctly

#### 3) Implement spec speed scaling for the enemy fleet
- [ ] **File:** `frontend/src/islands/space-invaders/SpaceInvadersIsland.tsx`
- [ ] **Required code changes:**
  - Replace the hardcoded `tickCountRef.current % 2 === 0` gate.
  - Compute the movement interval from the *current* enemy count using:
    - `Math.max(1, Math.floor(currentEnemies.length / 4))`
  - Apply the formula from the live fleet count used in the movement step, not from a stale outer closure.
  - Ensure a fresh wave after life lost returns to the base interval for 32 enemies.
- [ ] **Acceptance check:**
  - 32 enemies move every 8 ticks
  - 4 enemies move every 1 tick
  - 1 enemy also moves every 1 tick
- [ ] **Tests to add/update:**
  - movement cadence with full fleet (32)
  - movement cadence with 8 enemies
  - movement cadence with 4 enemies
  - cadence reset after life lost

#### 4) Add enemy bullets and enemy-bullet damage
- [ ] **File:** `frontend/src/islands/space-invaders/SpaceInvadersIsland.tsx`
- [ ] **Required code changes:**
  - Add constants near the other gameplay constants:
    - `ENEMY_FIRE_CHANCE = 0.015`
    - `MAX_ENEMY_BULLETS = 3`
    - `ENEMY_BULLET_STEP = 7`
  - Add `enemyBullets` state using the existing bullet shape unless a separate type is needed.
  - In the running tick loop:
    - if `enemyBullets.length < MAX_ENEMY_BULLETS`, choose one random living enemy
    - if `Math.random() < ENEMY_FIRE_CHANCE`, spawn a bullet from that enemy
    - spawn from the enemy body so the bullet visually exits downward from the invader
  - Move enemy bullets downward every tick and remove them after they pass the board bottom.
  - Render enemy bullets with a visually distinct red/orange class.
  - Add AABB collision between enemy bullets and the player sprite.
  - On collision, remove the bullet and route through the shared life-loss logic from task #1.
  - On full `resetGame()`, clear `enemyBullets`.
- [ ] **Acceptance check:** enemy bullets can exist simultaneously (up to 3), move downward, damage the player, and trigger `lost` at 0 lives.
- [ ] **Tests to add/update:**
  - with mocked/random-controlled fire chance, an enemy bullet spawns
  - enemy bullets move downward by `ENEMY_BULLET_STEP`
  - enemy bullets are removed at the bottom boundary
  - player hit by enemy bullet loses 1 life
  - player hit at 1 remaining life transitions to `lost`
  - no more than 3 enemy bullets exist at once

### P1 — Required completion work

#### 5) Add shields / bunkers and both bullet collision paths
- [ ] **File:** `frontend/src/islands/space-invaders/SpaceInvadersIsland.tsx`
- [ ] **Required code changes:**
  - Add a `ShieldBlock` interface in the same file.
  - Add constants for a 3×5 block layout and four shields total.
  - Add a `buildShields()` helper that creates 4 evenly spaced shields between invaders and player.
  - Add `shields` state initialized from `buildShields()`.
  - Render each shield block as a small grey/teal rectangle.
  - Add AABB bullet/shield handling for **both** bullet types:
    - player bullet vs shield → remove bullet + remove shield block
    - enemy bullet vs shield → remove bullet + remove shield block
  - Do **not** rebuild shields on life lost.
  - Do rebuild shields on full `resetGame()`.
- [ ] **Acceptance check:** shields degrade block-by-block, absorb both bullet types, survive life loss, and reset on Reset.
- [ ] **Tests to add/update:**
  - player bullet removes exactly one shield block and is consumed
  - enemy bullet removes exactly one shield block and is consumed
  - a destroyed shield block does not reappear until Reset
  - life lost does not recreate destroyed shield blocks
  - Reset recreates all shield blocks

#### 6) Add high score persistence and HUD display
- [ ] **File:** `frontend/src/islands/space-invaders/SpaceInvadersIsland.tsx`
- [ ] **Required code changes:**
  - Add `highScore` state initialized from `localStorage.getItem('si_high_score')`.
  - Default to `0` if storage is empty or invalid.
  - Add an effect that updates both state and `localStorage` whenever `score > highScore`.
  - Add `High: {highScore}` to the HUD beside Score/Lives/Enemies.
  - Keep this browser-safe; only read storage in a way compatible with the existing client-side island runtime.
- [ ] **Acceptance check:** saved high score appears on first render and increases when the player beats it.
- [ ] **Tests to add/update:**
  - existing stored score is rendered in `High:`
  - beating the stored high score calls `localStorage.setItem('si_high_score', ...)`
  - lower scores do not overwrite a larger stored score

#### 7) Expand unit/component test coverage to match the completed spec
- [ ] **File:** `frontend/tests/islands/space-invaders/SpaceInvadersIsland.test.tsx`
- [ ] **Required test structure work:**
  - Keep the existing 3 smoke tests passing.
  - Add deterministic timer-driven tests with fake timers for tick-based mechanics.
  - Mock or control randomness (`Math.random`) for enemy firing scenarios.
  - Mock `localStorage` cleanly per test.
  - Prefer user-visible assertions (HUD text, DOM elements, status label) over reaching into internals.
- [ ] **Minimum new coverage required:**
  - life-lost reset behavior
  - enemy bullets
  - enemy bullet damage / game over
  - speed scaling
  - row-based scoring
  - shield collisions for both bullet types
  - high score load + persist
- [ ] **Acceptance check:** this test file becomes the primary proof that the island matches the spec, not just that it renders.

#### 8) Add Playwright smoke coverage
- [ ] **File:** `e2e/space-invaders.spec.ts`
- [ ] **Required test cases:**
  - page loads and the Space Invaders heading is visible
  - game board renders
  - enemy fleet is visible on initial render
  - Start changes status text to `Running`
  - Pause changes status text to `Paused`
  - Reset returns status text to `Press Start to begin`
- [ ] **Acceptance check:** smoke coverage verifies the feature is wired into the page and basic controls work.

### P2 — Optional polish only after all required work is green

#### 9) Optional UFO / mystery ship enhancement
- [ ] **File:** `frontend/src/islands/space-invaders/SpaceInvadersIsland.tsx`
- [ ] **Notes:** The spec labels this as optional. Do **not** block completion on this.
- [ ] **Only implement after P0 + P1 are complete** and all tests/lint/typecheck are passing.
- [ ] **If implemented:**
  - spawn periodically across the top
  - move horizontally across the board
  - award random bonus score on player-bullet hit
  - despawn off-screen
  - add focused tests only if this feature is actually added

---

## Dependency Notes

- **Task 1** must land before enemy bullet damage so both loss causes share the same reset semantics.
- **Task 2** should land before score-related tests are rewritten.
- **Task 3** depends on task 1 because the tick counter reset is part of speed reset correctness.
- **Task 5** depends on task 4 for full two-way shield collision coverage.
- **Task 7** should be expanded incrementally as each mechanic lands, then finished with a full pass.
- **Task 8** can be added near the end once the visible UI strings are stable.

---

## Acceptance Criteria Checklist

The feature is only complete when **all** items below are true.

### Required gameplay behavior
- [ ] Enemy bullets fire from random living enemies during gameplay.
- [ ] Enemy bullets move downward and are visually distinct from player bullets.
- [ ] No more than 3 enemy bullets are in flight at once.
- [ ] Player loses a life when hit by an enemy bullet.
- [ ] Player loses a life when invaders reach the player row.
- [ ] On life lost with lives remaining: enemy wave resets, player recenters, bullets clear, direction resets to `1`, tick counter effectively resets to base cadence.
- [ ] Enemy fleet speed follows `max(1, floor(remainingEnemies / 4))` ticks between moves.
- [ ] Score values are row-based: 40 / 30 / 20 / 10 from top to bottom.
- [ ] Four shields are rendered and degrade block-by-block.
- [ ] Shields absorb both player bullets and enemy bullets.
- [ ] Shields persist across life loss but reset on full Reset.
- [ ] High score is read from `localStorage` key `si_high_score`.
- [ ] HUD shows `High: N`.
- [ ] High score is updated when the current score exceeds it.

### Required test coverage
- [ ] Existing 3 Vitest smoke tests still pass.
- [ ] New Vitest tests cover enemy bullets, life-loss reset, speed scaling, row scoring, shields, and high score.
- [ ] `e2e/space-invaders.spec.ts` exists and passes as a smoke test.

### Required validation
- [ ] `script/test` passes.
- [ ] `script/typecheck` passes.
- [ ] `script/lint` passes.

---

## Important Corrections to Prior Plan

These items were inaccurate in the earlier version of this document and are now corrected here:

- `frontend/tests/islands/space-invaders/SpaceInvadersIsland.test.tsx` **does exist**; it is not missing, just incomplete.
- The current tests are **component smoke tests**, not “shell-level” tests outside the frontend.
- `SpaceInvadersIsland.tsx` already contains a functioning shell with movement, bullets, collisions, score, lives, win/loss, and touch controls.
- The highest-priority source bug is the incomplete life-lost reset path, because multiple remaining mechanics depend on it.
