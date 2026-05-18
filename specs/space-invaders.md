# Space Invaders — Game Specification

## Overview

A browser-playable clone of the classic 1978 Space Invaders arcade game, implemented as a
self-contained React Island (`SpaceInvadersIsland.tsx`). The game runs entirely in the
browser with no backend involvement. All game logic lives in the island component file;
no additional source files are required unless extracted for testability.

---

## Game Objective

Destroy all enemy invaders before they reach the player's row. The player has 3 lives.
Each life lost resets the enemy grid. Lose all lives → game over. Clear all enemies → win.

---

## Player Mechanics

### Movement
- Moves left/right along the bottom of the game board.
- Keyboard: `ArrowLeft` / `A` (left), `ArrowRight` / `D` (right).
- Touch/mouse: on-screen Left / Right buttons (hold to move continuously).
- Constrained within game board horizontal bounds.

### Shooting
- Fires a single upward-moving bullet.
- Keyboard: `Space`.
- Buttons: Fire / Shoot on-screen button.
- Rate-limited: maximum one player bullet in flight per 220 ms.
- Only one player bullet on screen at a time (new shots suppressed while bullet is in flight,
  OR rate-limit ensures this — either implementation is acceptable).

### Lives
- Starts with 3 lives.
- Loses 1 life if any enemy bullet hits the player sprite (AABB collision).
- Loses 1 life if any enemy reaches the player's Y row.
- At 0 lives → game transitions to `lost` state.
- On life lost (but lives remain): enemy grid resets; player bullets cleared; player position
  resets to center.

---

## Enemy Mechanics

### Grid Layout
- 4 rows × 8 columns = 32 enemies total at game start.
- Enemies laid out at fixed spacing (38 px horizontal, 30 px vertical) starting near the
  top-left of the game board.

### Movement
- The entire grid moves horizontally as a unit.
- When the leftmost or rightmost enemy reaches the wall boundary, the grid reverses
  horizontal direction and drops down by `ENEMY_DROP` (16 px).
- Movement happens on every other game tick (every 2 × `TICK_MS` = 120 ms at base speed).

### Speed Scaling
- As enemies are destroyed the surviving grid accelerates.
- Movement tick interval decreases as enemy count drops.
- Reference formula (or equivalent): the grid moves every `max(1, floor(remainingEnemies / 4))`
  ticks, so with 32 enemies movement occurs every 8 ticks; with 4 enemies every 1 tick (maximum speed).
- Speed resets to base on life lost (new grid).

### Enemy Shooting
- A randomly chosen enemy fires a downward bullet at random intervals.
- Fire probability: each game tick, one random living enemy has a
  `ENEMY_FIRE_CHANCE` (e.g., 0.015 = 1.5%) chance of shooting.
- Multiple enemy bullets can be in flight simultaneously (up to `MAX_ENEMY_BULLETS = 3`).
- Enemy bullets travel downward at `ENEMY_BULLET_STEP` pixels per tick (e.g., 7 px).
- Enemy bullets that exit the bottom of the board are removed.
- Enemy bullets are visually distinct from player bullets (e.g., red / orange colour).

### Row-Based Scoring
- Bottom row (row 3): **10 points** per kill.
- Row 2: **20 points** per kill.
- Row 1: **30 points** per kill.
- Top row (row 0): **40 points** per kill.
- Score is displayed in real time.

---

## Shields / Bunkers

- 4 destructible barriers are rendered between the player and the enemy grid.
- Each shield is composed of a grid of small blocks (e.g., 3 rows × 5 columns = 15 blocks each).
- Shields absorb both player bullets and enemy bullets.
- A block is removed when any bullet (player or enemy) collides with it (AABB).
- A fully destroyed shield no longer provides cover.
- Shields reset at the start of each new game (Reset button) but **not** on life lost.

---

## High Score (localStorage)

- The all-time high score is persisted in `localStorage` under the key `"si_high_score"`.
- Displayed in the HUD alongside current score: `High: {highScore}`.
- Updated whenever the current score exceeds the stored high score (at game end or in real time).
- Initialises to `0` if no stored value exists.

---

## Mystery Ship (UFO) — Optional Enhancement

- Occasionally a bonus ship travels horizontally across the top of the board.
- Appears at a random interval (e.g., every 20–30 seconds of game time).
- Worth a bonus score (e.g., 100–300 points, randomly chosen on spawn).
- Destroyed by a single player bullet hit.
- Does not shoot back.
- Disappears when it exits the opposite edge of the board.

---

## Win / Lose Conditions

| Condition | Result |
|-----------|--------|
| All enemies destroyed | `won` — display "You cleared the fleet!" |
| Lives reach 0 (enemy bullet hits player OR enemies reach player row) | `lost` — display "Game over" |

---

## Game States

| State | Description |
|-------|-------------|
| `idle` | Initial state; game board rendered but frozen; "Press Start to begin" |
| `running` | Game loop active |
| `paused` | Game loop suspended; "Paused" |
| `won` | Victory screen; loop stopped |
| `lost` | Game over screen; loop stopped |

Transitions:
- `idle` → `running`: Start button or auto-start.
- `running` → `paused`: Pause button or `P` key.
- `paused` → `running`: Start button or `P` key.
- `running` / `paused` → `idle`: Reset button (full game reset).
- `running` → `won` / `lost`: game logic.

---

## UI / UX Requirements

### HUD (above game board)
- **Score** — current score.
- **High** — all-time high score (localStorage).
- **Lives** — remaining lives count.
- **Enemies** — remaining enemy count.
- **Status label** — `aria-live="polite"` region showing current game state text.

### Control Buttons
- Start, Pause, Fire, Reset — all present.
- Touch directional pad: Left, Shoot (centre), Right.

### Keyboard Shortcuts
- `ArrowLeft` / `A` — move left.
- `ArrowRight` / `D` — move right.
- `Space` — fire.
- `P` — toggle pause/resume.

### Visual
- Game board: `360 × 420 px`, dark background, starfield texture.
- Player sprite: cyan rectangle.
- Enemy sprites: green rectangles (visual distinction between rows optional enhancement).
- Player bullets: yellow.
- Enemy bullets: red/orange — visually distinct from player bullets.
- Shield blocks: grey/teal.
- Mystery UFO (if implemented): magenta / distinct colour.

### Accessibility
- `role="application"` on the game board with descriptive `aria-label`.
- All control buttons have accessible names.
- Status region uses `aria-live` so screen readers can announce state changes.

---

## Testing Requirements

### Unit / Component Tests (`frontend/tests/islands/space-invaders/SpaceInvadersIsland.test.tsx`)

#### Existing (must continue to pass)
- Renders game shell (heading, board, score, lives).
- Start/pause state transitions.
- Reset returns to idle.

#### New tests required

**Enemy shooting**
- After `N` ticks with `ENEMY_FIRE_CHANCE = 1` (forced), at least one enemy bullet is added to state.
- Enemy bullet moves downward each tick.
- Enemy bullet removed when it exits the bottom boundary.

**Speed scaling**
- With 32 enemies, movement occurs every 8 ticks (or configured base interval).
- With 4 enemies remaining, movement occurs every 1 tick (maximum speed).
- Speed formula: `max(1, floor(count / 4))`.

**Shield collision**
- Player bullet hitting a shield block removes that block.
- Enemy bullet hitting a shield block removes that block.
- Player bullet is removed upon hitting a shield block.
- Empty shield (all blocks gone) no longer affects bullets.

**Row-based scoring**
- Killing a bottom-row enemy (row 3) awards 10 points.
- Killing a top-row enemy (row 0) awards 40 points.

**High score**
- After a game where `score > 0`, localStorage `"si_high_score"` is updated.
- On mount with existing localStorage value, `High:` displays that value.

**Player hit by enemy bullet**
- AABB collision between enemy bullet and player sprite triggers life decrement.
- At 0 lives, game transitions to `lost`.

### E2E Tests (`e2e/space-invaders.spec.ts`)
- Game board renders with enemy grid visible.
- Start button transitions status label to "Running".
- Pause button transitions status label to "Paused".
- Reset returns to idle state.
- (Smoke-level only — deep mechanics tested in Vitest.)

---

## Acceptance Criteria

All of the following must be true for the Space Invaders feature to be considered **complete**:

- [ ] Enemy bullets fire from random enemies during gameplay and move downward.
- [ ] Enemy bullet speed: `ENEMY_BULLET_STEP` ≥ 5 px/tick, visually red/orange.
- [ ] Max 3 enemy bullets in flight simultaneously.
- [ ] Player loses a life when hit by an enemy bullet.
- [ ] Enemy movement speed increases as enemies are killed (fewer enemies = faster movement).
- [ ] Speed formula: `max(1, floor(remainingCount / 4))` ticks between steps (or equivalent).
- [ ] Each enemy's point value is determined by its original row (10 / 20 / 30 / 40).
- [ ] 4 shields rendered between player and enemies; each shield degrades block-by-block.
- [ ] Shields block both player and enemy bullets.
- [ ] Shields persist across lives but reset on full game Reset.
- [ ] High score is read from `localStorage` on mount and displayed as `High: N`.
- [ ] High score is written to `localStorage` whenever current score exceeds it.
- [ ] All new Vitest tests pass (`script/test` green).
- [ ] `script/typecheck` passes (no new TypeScript errors).
- [ ] `script/lint` passes (no new lint errors).
- [ ] E2E smoke test in `e2e/space-invaders.spec.ts` passes.
