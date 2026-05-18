import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, act } from '@testing-library/react'
import { SpaceInvadersIsland, type Enemy, type ShieldBlock } from '@/islands/space-invaders/SpaceInvadersIsland'

const TICK_MS = 60
const ENEMY_ROWS = 4
const ENEMY_COLS = 8
const SHIELD_COUNT = 4
const SHIELD_COLS = 5
const SHIELD_ROWS = 3

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    clear: () => {
      store = {}
    },
    removeItem: (key: string) => {
      delete store[key]
    },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true })

describe('SpaceInvadersIsland', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  describe('initial render', () => {
    it('renders the game shell', () => {
      render(<SpaceInvadersIsland />)
      expect(screen.getByRole('heading', { name: /space invaders/i })).toBeInTheDocument()
      expect(screen.getByRole('application', { name: /space invaders game board/i })).toBeInTheDocument()
    })

    it('shows HUD elements', () => {
      render(<SpaceInvadersIsland />)
      expect(screen.getByText(/score:/i)).toBeInTheDocument()
      expect(screen.getByText(/lives:/i)).toBeInTheDocument()
      expect(screen.getByText(/high:/i)).toBeInTheDocument()
      expect(screen.getByText(/enemies:/i)).toBeInTheDocument()
    })

    it('shows idle status label', () => {
      render(<SpaceInvadersIsland />)
      expect(screen.getByText(/press start to begin/i)).toBeInTheDocument()
    })

    it('renders the full enemy fleet', () => {
      render(<SpaceInvadersIsland />)
      const board = screen.getByRole('application')
      const enemyEls = board.querySelectorAll('.bg-emerald-400')
      expect(enemyEls.length).toBe(ENEMY_ROWS * ENEMY_COLS)
    })

    it('renders shield blocks', () => {
      render(<SpaceInvadersIsland />)
      const board = screen.getByRole('application')
      const shieldEls = board.querySelectorAll('.bg-teal-400')
      expect(shieldEls.length).toBe(SHIELD_COUNT * SHIELD_COLS * SHIELD_ROWS)
    })

    it('loads high score from localStorage on mount', () => {
      localStorageMock.setItem('si_high_score', '750')
      render(<SpaceInvadersIsland />)
      expect(screen.getByText(/high: 750/i)).toBeInTheDocument()
    })

    it('shows zero high score when localStorage is empty', () => {
      render(<SpaceInvadersIsland />)
      expect(screen.getByText(/high: 0/i)).toBeInTheDocument()
    })

    it('handles invalid localStorage value gracefully', () => {
      localStorageMock.setItem('si_high_score', 'not-a-number')
      render(<SpaceInvadersIsland />)
      expect(screen.getByText(/high: 0/i)).toBeInTheDocument()
    })
  })

  describe('game controls', () => {
    it('starts game on Start click', () => {
      render(<SpaceInvadersIsland />)
      fireEvent.click(screen.getByRole('button', { name: /^start$/i }))
      expect(screen.getByText('Running')).toBeInTheDocument()
    })

    it('pauses game on Pause click', () => {
      render(<SpaceInvadersIsland />)
      fireEvent.click(screen.getByRole('button', { name: /^start$/i }))
      fireEvent.click(screen.getByRole('button', { name: /^pause$/i }))
      expect(screen.getByText('Paused')).toBeInTheDocument()
    })

    it('resumes game from pause', () => {
      render(<SpaceInvadersIsland />)
      fireEvent.click(screen.getByRole('button', { name: /^start$/i }))
      fireEvent.click(screen.getByRole('button', { name: /^pause$/i }))
      fireEvent.click(screen.getByRole('button', { name: /^start$/i }))
      expect(screen.getByText('Running')).toBeInTheDocument()
    })

    it('resets game to idle', () => {
      render(<SpaceInvadersIsland />)
      fireEvent.click(screen.getByRole('button', { name: /^start$/i }))
      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      expect(screen.getByText(/press start to begin/i)).toBeInTheDocument()
    })

    it('reset restores full enemy fleet', () => {
      render(<SpaceInvadersIsland />)
      fireEvent.click(screen.getByRole('button', { name: /^start$/i }))
      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      const board = screen.getByRole('application')
      expect(board.querySelectorAll('.bg-emerald-400').length).toBe(ENEMY_ROWS * ENEMY_COLS)
    })

    it('reset restores full shield blocks', () => {
      render(<SpaceInvadersIsland />)
      fireEvent.click(screen.getByRole('button', { name: /^start$/i }))
      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      const board = screen.getByRole('application')
      expect(board.querySelectorAll('.bg-teal-400').length).toBe(SHIELD_COUNT * SHIELD_COLS * SHIELD_ROWS)
    })

    it('toggles pause/resume with P key', () => {
      render(<SpaceInvadersIsland />)
      fireEvent.click(screen.getByRole('button', { name: /^start$/i }))
      fireEvent.keyDown(window, { key: 'p' })
      expect(screen.getByText('Paused')).toBeInTheDocument()
      fireEvent.keyDown(window, { key: 'p' })
      expect(screen.getByText('Running')).toBeInTheDocument()
    })

    it('fires a bullet on Fire button click', () => {
      render(<SpaceInvadersIsland />)
      fireEvent.click(screen.getByRole('button', { name: /^start$/i }))
      fireEvent.click(screen.getByRole('button', { name: /^fire$/i }))
      const board = screen.getByRole('application')
      expect(board.querySelectorAll('.bg-yellow-300').length).toBeGreaterThan(0)
    })
  })

  describe('timer-based mechanics', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('game board remains visible after several ticks', () => {
      render(<SpaceInvadersIsland />)
      fireEvent.click(screen.getByRole('button', { name: /^start$/i }))
      act(() => {
        vi.advanceTimersByTime(TICK_MS * 5)
      })
      expect(screen.getByRole('application')).toBeInTheDocument()
    })

    it('paused game does not crash or change status over time', () => {
      render(<SpaceInvadersIsland />)
      fireEvent.click(screen.getByRole('button', { name: /^start$/i }))
      fireEvent.click(screen.getByRole('button', { name: /^pause$/i }))
      act(() => {
        vi.advanceTimersByTime(TICK_MS * 20)
      })
      expect(screen.getByText('Paused')).toBeInTheDocument()
    })

    it('fired bullet appears on the board when game is running', () => {
      render(<SpaceInvadersIsland />)
      fireEvent.click(screen.getByRole('button', { name: /^start$/i }))
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /shoot/i }))
      })
      const board = screen.getByRole('application')
      expect(board.querySelectorAll('.bg-yellow-300').length).toBeGreaterThan(0)
    })

    it('enemy fleet count matches HUD after game starts', () => {
      render(<SpaceInvadersIsland />)
      fireEvent.click(screen.getByRole('button', { name: /^start$/i }))
      act(() => {
        vi.advanceTimersByTime(TICK_MS * 3)
      })
      expect(screen.getByText(/enemies: 32/i)).toBeInTheDocument()
    })
  })

  describe('enemy bullets', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('enemy bullets appear when Math.random always fires', () => {
      // ENEMY_FIRE_CHANCE = 0.015; value 0.001 satisfies 0.001 < 0.015
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001)

      render(<SpaceInvadersIsland />)
      fireEvent.click(screen.getByRole('button', { name: /^start$/i }))
      act(() => {
        vi.advanceTimersByTime(TICK_MS * 5)
      })

      const board = screen.getByRole('application')
      expect(board.querySelectorAll('.bg-orange-500').length).toBeGreaterThan(0)

      randomSpy.mockRestore()
    })

    it('enemy bullets do not appear when Math.random never fires', () => {
      // 0.9 >= ENEMY_FIRE_CHANCE (0.015) → no firing
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9)

      render(<SpaceInvadersIsland />)
      fireEvent.click(screen.getByRole('button', { name: /^start$/i }))
      act(() => {
        vi.advanceTimersByTime(TICK_MS * 10)
      })

      const board = screen.getByRole('application')
      expect(board.querySelectorAll('.bg-orange-500').length).toBe(0)

      randomSpy.mockRestore()
    })

    it('caps enemy bullets at MAX_ENEMY_BULLETS (3)', () => {
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001)

      render(<SpaceInvadersIsland />)
      fireEvent.click(screen.getByRole('button', { name: /^start$/i }))
      // Advance many ticks; bullets move off-screen slowly (ENEMY_BULLET_STEP=7, GAME_HEIGHT=420)
      // so with max 3 bullets capped we should never exceed 3
      act(() => {
        vi.advanceTimersByTime(TICK_MS * 4)
      })

      const board = screen.getByRole('application')
      expect(board.querySelectorAll('.bg-orange-500').length).toBeLessThanOrEqual(3)

      randomSpy.mockRestore()
    })
  })

  describe('high score persistence', () => {
    it('displays pre-existing high score from localStorage', () => {
      localStorageMock.setItem('si_high_score', '1500')
      render(<SpaceInvadersIsland />)
      expect(screen.getByText(/high: 1500/i)).toBeInTheDocument()
    })

    it('high score persists after reset', () => {
      localStorageMock.setItem('si_high_score', '200')
      render(<SpaceInvadersIsland />)
      fireEvent.click(screen.getByRole('button', { name: /^start$/i }))
      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      expect(screen.getByText(/high: 200/i)).toBeInTheDocument()
    })
  })
})

// ─── Additional spec-required tests ──────────────────────────────────────────
//
// Constants mirrored from the component to keep tests self-contained.
// Enemy grid: 4 rows × 8 cols, ENEMY_START_X=22, ENEMY_X_GAP=38, ENEMY_START_Y=26, ENEMY_Y_GAP=30
// BULLET_STEP=14 (player, upward), ENEMY_BULLET_STEP=7 (downward)
// PLAYER_Y=384, PLAYER_WIDTH=42, centre bullet x = playerX(159) + 19 = 178
// GAME_HEIGHT=420, SHIELD_Y=314, ENEMY_HEIGHT=20
// speedDivisor = max(1, floor(count/4));  ROW_SCORE = [40,30,20,10]

// Helper: build a minimal Enemy object for injection via the initialEnemies prop.
function makeEnemy(id: number, x: number, y: number, row: number): Enemy {
  return { id, x, y, row }
}

// Helper: build a minimal ShieldBlock for injection.
function makeBlock(id: number, x: number, y: number): ShieldBlock {
  return { id, x, y }
}

describe('enemy bullet movement', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('enemy bullet moves downward each tick', () => {
    // Force tick-1 to fire from enemy[0] (col 0 row 0, x=22); subsequent calls suppress firing.
    const spy = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001) // fire-chance check  → fires  (0.001 < ENEMY_FIRE_CHANCE 0.015)
      .mockReturnValueOnce(0.001) // enemy selection   → floor(0.001*32)=0 → enemy[0] x=22
      .mockReturnValue(0.9)       // all later calls   → no firing

    render(<SpaceInvadersIsland />)
    fireEvent.click(screen.getByRole('button', { name: /^start$/i }))

    // After tick 1 the bullet spawns at y = enemy.y + ENEMY_HEIGHT = 26+20 = 46.
    act(() => { vi.advanceTimersByTime(TICK_MS) })
    const board = screen.getByRole('application')
    const b1 = board.querySelector<HTMLElement>('.bg-orange-500')
    expect(b1).not.toBeNull()
    const y1 = parseFloat(b1!.style.top)

    // After tick 2 the bullet has moved down by ENEMY_BULLET_STEP = 7.
    act(() => { vi.advanceTimersByTime(TICK_MS) })
    const b2 = board.querySelector<HTMLElement>('.bg-orange-500')
    expect(b2).not.toBeNull()
    const y2 = parseFloat(b2!.style.top)

    expect(y2).toBeGreaterThan(y1)
    spy.mockRestore()
  })

  it('enemy bullet is removed when it exits the bottom boundary', () => {
    // Force firing from enemy index 6 (col 6, row 0, x=250).
    // Bullet x = 250+14-2 = 262 — lies in the gap between shield-2 (192-252) and shield-3 (276-336)
    // and is right of the player (x=159..201), so it never hits shields or the player.
    // Bullet spawns at y=46; exits GAME_HEIGHT=420 after 55 ticks: 46+(55-1)*7 = 424 > 420.
    const spy = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001) // fire-chance → fires
      .mockReturnValueOnce(0.21)  // floor(0.21*32)=6 → enemy[6] col-6 row-0
      .mockReturnValue(0.9)       // no more firing

    render(<SpaceInvadersIsland />)
    fireEvent.click(screen.getByRole('button', { name: /^start$/i }))

    act(() => { vi.advanceTimersByTime(TICK_MS * 55) })

    const board = screen.getByRole('application')
    expect(board.querySelectorAll('.bg-orange-500').length).toBe(0)
    spy.mockRestore()
  })
})

describe('speed scaling', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('with 32 enemies the fleet moves every 8 ticks (speedDivisor = floor(32/4) = 8)', () => {
    // Suppress enemy firing so bullets don't complicate the enemy-position check.
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.9)

    render(<SpaceInvadersIsland />)
    fireEvent.click(screen.getByRole('button', { name: /^start$/i }))

    // After 7 ticks the grid must NOT have moved yet (tickCount=7, 7%8≠0).
    act(() => { vi.advanceTimersByTime(TICK_MS * 7) })
    const board = screen.getByRole('application')
    const before = (board.querySelector<HTMLElement>('.bg-emerald-400'))!.style.left

    // 8th tick: tickCount=8, 8%8=0 → grid moves right by ENEMY_STEP=3.
    act(() => { vi.advanceTimersByTime(TICK_MS) })
    const after = (board.querySelector<HTMLElement>('.bg-emerald-400'))!.style.left

    expect(after).not.toBe(before)
    spy.mockRestore()
  })

  it('with 4 enemies the fleet moves every 1 tick (speedDivisor = floor(4/4) = 1)', () => {
    const fourEnemies: Enemy[] = [
      makeEnemy(1, 22, 26, 0),
      makeEnemy(2, 60, 26, 0),
      makeEnemy(3, 98, 26, 0),
      makeEnemy(4, 136, 26, 0),
    ]
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.9)

    render(<SpaceInvadersIsland initialEnemies={fourEnemies} />)
    fireEvent.click(screen.getByRole('button', { name: /^start$/i }))

    // After just 1 tick: tickCount=1, 1%1=0 → grid moves immediately.
    act(() => { vi.advanceTimersByTime(TICK_MS) })
    const board = screen.getByRole('application')
    const el = board.querySelector<HTMLElement>('.bg-emerald-400')!
    // Enemy 1 started at x=22; after 1 move: x = 22 + ENEMY_STEP(3) = 25.
    expect(el.style.left).toBe('25px')
    spy.mockRestore()
  })
})

describe('shield collision', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  // Setup: move player right 2 ticks → playerX=183, bullet x=202.
  // Shield-2 col-0 is at (192, 330). After 3 bullet-movement ticks bullet.y = 330 → hits.
  // The bullet x=202..206 overlaps shield-2 col-0 x=192..204 and the block is at y=330..338.

  function setupShieldHit() {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.9)
    render(<SpaceInvadersIsland />)
    fireEvent.click(screen.getByRole('button', { name: /^start$/i }))

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    act(() => { vi.advanceTimersByTime(TICK_MS * 2) })   // ticks 1-2: player moves right twice → x=183
    fireEvent.keyUp(window, { key: 'ArrowRight' })

    fireEvent.click(screen.getByRole('button', { name: /^fire$/i }))  // bullet at (202, 372)
    act(() => { vi.advanceTimersByTime(TICK_MS * 3) })   // ticks 3-5: bullet reaches y=330 → hit
    return spy
  }

  it('player bullet removes a shield block on hit', () => {
    const spy = setupShieldHit()
    const board = screen.getByRole('application')
    expect(board.querySelectorAll('.bg-teal-400').length).toBe(SHIELD_COUNT * SHIELD_COLS * SHIELD_ROWS - 1)
    spy.mockRestore()
  })

  it('player bullet is consumed when it hits a shield block', () => {
    const spy = setupShieldHit()
    const board = screen.getByRole('application')
    expect(board.querySelectorAll('.bg-yellow-300').length).toBe(0)
    spy.mockRestore()
  })

  it('enemy bullet removes a shield block on hit', () => {
    // Enemy[0] (col 0 row 0, x=22) fires bullet at x=34.
    // x=34..38 is inside shield-0 x-range (24..84).
    // Shield-0 row-0 col-0 is at (24, 314). Bullet reaches it after 38 ticks:
    //   y = 46 + (38-1)*7 = 305; aabb with (24,314,12,8) → hit.
    const spy = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001) // fire-chance → fires
      .mockReturnValueOnce(0.001) // enemy selection → enemy[0]
      .mockReturnValue(0.9)

    render(<SpaceInvadersIsland />)
    fireEvent.click(screen.getByRole('button', { name: /^start$/i }))
    act(() => { vi.advanceTimersByTime(TICK_MS * 38) })

    const board = screen.getByRole('application')
    expect(board.querySelectorAll('.bg-teal-400').length).toBe(SHIELD_COUNT * SHIELD_COLS * SHIELD_ROWS - 1)
    spy.mockRestore()
  })

  it('bullet passes through without error when no shield blocks remain', () => {
    // Provide an empty shield array; fire a player bullet and advance several ticks.
    // The bullet should travel unobstructed (regression guard — no crash, bullet visible).
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const emptyShields: ShieldBlock[] = []

    render(<SpaceInvadersIsland initialShields={emptyShields} />)
    fireEvent.click(screen.getByRole('button', { name: /^start$/i }))
    fireEvent.click(screen.getByRole('button', { name: /^fire$/i }))
    act(() => { vi.advanceTimersByTime(TICK_MS * 5) })

    const board = screen.getByRole('application')
    // Bullet still visible — has not been destroyed by a (non-existent) shield.
    expect(board.querySelectorAll('.bg-yellow-300').length).toBeGreaterThan(0)
    // Board still rendered — no crash.
    expect(board).toBeInTheDocument()
    spy.mockRestore()
  })
})

describe('row-based scoring', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('shooting a bottom-row enemy (row 3) awards 10 points', () => {
    // One enemy at (x=126, y=116, row=3). speedDivisor=1 → collision checked every tick.
    // Bullet fired immediately (x=178). At tick 17: enemy x=126+17*3=177, bullet y=372-17*14=134.
    // aabb(178,134,4,12, 177,116,28,20) → hit. ROW_SCORE[3]=10.
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.9)
    render(<SpaceInvadersIsland initialEnemies={[makeEnemy(1, 126, 116, 3)]} />)
    fireEvent.click(screen.getByRole('button', { name: /^start$/i }))
    fireEvent.click(screen.getByRole('button', { name: /^fire$/i }))
    act(() => { vi.advanceTimersByTime(TICK_MS * 17) })

    expect(screen.getByText(/score: 10/i)).toBeInTheDocument()
    spy.mockRestore()
  })

  it('shooting a top-row enemy (row 0) awards 40 points', () => {
    // One enemy at (x=106, y=26, row=0). speedDivisor=1.
    // Bullet fired immediately (x=178). At tick 24: enemy x=106+24*3=178, bullet y=372-24*14=36.
    // aabb(178,36,4,12, 178,26,28,20) → hit. ROW_SCORE[0]=40.
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.9)
    render(<SpaceInvadersIsland initialEnemies={[makeEnemy(1, 106, 26, 0)]} />)
    fireEvent.click(screen.getByRole('button', { name: /^start$/i }))
    fireEvent.click(screen.getByRole('button', { name: /^fire$/i }))
    act(() => { vi.advanceTimersByTime(TICK_MS * 24) })

    expect(screen.getByText(/score: 40/i)).toBeInTheDocument()
    spy.mockRestore()
  })
})

describe('high score write path', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorageMock.clear()
  })
  afterEach(() => { vi.useRealTimers() })

  it('localStorage is updated when current score exceeds the stored high score', () => {
    // Reuse the row-0 enemy scenario (score=40 after tick 24) to verify the write path.
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.9)
    render(<SpaceInvadersIsland initialEnemies={[makeEnemy(1, 106, 26, 0)]} />)
    fireEvent.click(screen.getByRole('button', { name: /^start$/i }))
    fireEvent.click(screen.getByRole('button', { name: /^fire$/i }))
    act(() => { vi.advanceTimersByTime(TICK_MS * 24) })

    expect(localStorageMock.getItem('si_high_score')).toBe('40')
    spy.mockRestore()
  })
})

describe('player hit by enemy bullet', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  // Enemy[4] is col-4 row-0 (x=174). Its bullet x = 174+12 = 186.
  // Player centre span is x=159..201 → x=186 is inside the player's x range.
  // Bullet x=186 falls in the gap between shield-1 (108-168) and shield-2 (192-252),
  // so it never collides with a shield on the way down.
  // Bullet spawns at y=46 (tick 1); hits PLAYER_Y=384 at tick 48:
  //   y = 46 + (48-1)*7 = 375, which satisfies PLAYER_Y-12 < 375 < PLAYER_Y+22.

  function setupEnemyHit() {
    return vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001) // fire-chance → fires
      .mockReturnValueOnce(0.13)  // floor(0.13*32)=4 → enemy[4] (col-4 row-0, x=174)
      .mockReturnValue(0.9)       // no more firing
  }

  it('player loses a life when hit by an enemy bullet', () => {
    const spy = setupEnemyHit()
    render(<SpaceInvadersIsland />)
    fireEvent.click(screen.getByRole('button', { name: /^start$/i }))
    act(() => { vi.advanceTimersByTime(TICK_MS * 48) })

    expect(screen.getByText(/lives: 2/i)).toBeInTheDocument()
    spy.mockRestore()
  })

  it('game transitions to Game over when the last life is lost', () => {
    const spy = setupEnemyHit()
    render(<SpaceInvadersIsland initialLives={1} />)
    fireEvent.click(screen.getByRole('button', { name: /^start$/i }))
    act(() => { vi.advanceTimersByTime(TICK_MS * 48) })

    expect(screen.getByText(/game over/i)).toBeInTheDocument()
    spy.mockRestore()
  })
})
