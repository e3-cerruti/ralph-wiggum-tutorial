import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, act } from '@testing-library/react'
import { SpaceInvadersIsland } from '@/islands/space-invaders/SpaceInvadersIsland'

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
