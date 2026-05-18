# Implementation Plan — Space Invaders

> **Implementation Status: ✅ COMPLETE** *(verified 2026-05-18)*

All features from `specs/space-invaders.md` are implemented, tested, and passing.

## Scope

- **Gameplay source file:** `frontend/src/islands/space-invaders/SpaceInvadersIsland.tsx`
- **Unit/component tests:** `frontend/tests/islands/space-invaders/SpaceInvadersIsland.test.tsx`
- **E2E smoke test:** `e2e/space-invaders.spec.ts`

---

## Completed ✅

All features implemented in a single commit (cc4322a):

| Feature | Details |
|---|---|
| Game state machine | `idle` / `running` / `paused` / `won` / `lost` |
| Board + dimensions | 360×420 board |
| Enemy grid | 4×8 = 32 enemies, `Enemy` has `row` field |
| Player movement | Keyboard + touch/button controls |
| Player shooting | Upward bullets, 220 ms rate limit |
| Enemy movement | Horizontal + wall-bounce + drop |
| Speed scaling | `max(1, floor(count/4))` ticks between moves |
| Row-based scoring | row 0→40, row 1→30, row 2→20, row 3→10 |
| Enemy bullets | `ENEMY_FIRE_CHANCE=0.015`, `MAX_ENEMY_BULLETS=3`, `ENEMY_BULLET_STEP=7`, orange colour |
| Player hit by enemy bullet | AABB → life lost → shared reset path |
| Life-lost reset | Recenters player, resets direction, clears all bullets, resets tick counter |
| Shields | 4 bunkers × 15 teal blocks; AABB vs both bullet types; persist on life lost, reset on Reset |
| High score | `localStorage` key `si_high_score`; `High: N` in HUD |
| Win condition | All enemies destroyed → `won` |
| Lose condition | Lives reach 0 → `lost` |
| HUD | Score / High / Lives / Enemies + status label |
| Touch controls | Left / Shoot / Right |
| Unit tests | 29 Vitest tests covering all mechanics |
| E2E smoke test | 6 Playwright tests |

---

## Acceptance Criteria — All Passing ✅

- [x] Enemy bullets fire from random enemies during gameplay and move downward.
- [x] Enemy bullet speed: `ENEMY_BULLET_STEP = 7` px/tick, visually orange.
- [x] Max 3 enemy bullets in flight simultaneously.
- [x] Player loses a life when hit by an enemy bullet.
- [x] Enemy movement speed increases as enemies are killed.
- [x] Speed formula: `max(1, floor(remainingCount / 4))`.
- [x] Each enemy's point value determined by original row (10 / 20 / 30 / 40).
- [x] 4 shields rendered between player and enemies; each degrades block-by-block.
- [x] Shields block both player and enemy bullets.
- [x] Shields persist across lives but reset on full game Reset.
- [x] High score read from `localStorage` on mount; displayed as `High: N`.
- [x] High score written to `localStorage` whenever current score exceeds it.
- [x] All 29 Vitest tests pass (`script/test` green).
- [x] `script/typecheck` passes.
- [x] `script/lint` passes.
- [x] E2E smoke test in `e2e/space-invaders.spec.ts` passes.

---

## Known Issues / Remaining Work

- UFO/mystery ship (optional enhancement from spec) — not implemented, not required.
- E2E tests require dev server to be running (`script/server`); they are smoke-level only.

---

## Architecture Notes

- `playerXRef`, `shieldsRef`, `enemiesRef` refs prevent stale closures in `setInterval`.
- Life-loss logic centralized — both "enemy reaches player row" and "enemy bullet hits player" use the same reset path.
- Speed scaling computed inside `setEnemies` functional update to get fresh enemy count.
- Shield collision processed each tick before bullet offscreen removal.
- `from __future__ import annotations` + `FlaskClient[Any]` alias used in `tests/test_hello.py` to satisfy strict mypy.
