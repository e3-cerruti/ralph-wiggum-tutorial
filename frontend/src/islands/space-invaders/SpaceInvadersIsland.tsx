import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type GameStatus = 'idle' | 'running' | 'paused' | 'won' | 'lost'

interface Enemy {
  id: number
  x: number
  y: number
  row: number
}

interface Bullet {
  id: number
  x: number
  y: number
}

interface ShieldBlock {
  id: number
  x: number
  y: number
}

const GAME_WIDTH = 360
const GAME_HEIGHT = 420
const PLAYER_WIDTH = 42
const PLAYER_Y = GAME_HEIGHT - 36
const PLAYER_HEIGHT = 22
const ENEMY_WIDTH = 28
const ENEMY_HEIGHT = 20
const BULLET_WIDTH = 4
const BULLET_HEIGHT = 12
const PLAYER_STEP = 12
const BULLET_STEP = 14
const ENEMY_STEP = 3
const ENEMY_DROP = 16
const ENEMY_ROWS = 4
const ENEMY_COLS = 8
const ENEMY_START_X = 22
const ENEMY_START_Y = 26
const ENEMY_X_GAP = 38
const ENEMY_Y_GAP = 30
const TICK_MS = 60
const ENEMY_FIRE_CHANCE = 0.015
const MAX_ENEMY_BULLETS = 3
const ENEMY_BULLET_STEP = 7
const SHIELD_BLOCK_W = 12
const SHIELD_BLOCK_H = 8
const SHIELD_COLS = 5
const SHIELD_ROWS = 3
const SHIELD_Y = PLAYER_Y - 70
const SHIELD_COUNT = 4
const ROW_SCORE = [40, 30, 20, 10] as const

function buildEnemies(): Enemy[] {
  const enemies: Enemy[] = []
  let id = 1

  for (let row = 0; row < ENEMY_ROWS; row += 1) {
    for (let col = 0; col < ENEMY_COLS; col += 1) {
      enemies.push({
        id,
        x: ENEMY_START_X + col * ENEMY_X_GAP,
        y: ENEMY_START_Y + row * ENEMY_Y_GAP,
        row,
      })
      id += 1
    }
  }

  return enemies
}

function buildShields(): ShieldBlock[] {
  const blocks: ShieldBlock[] = []
  const shieldW = SHIELD_COLS * SHIELD_BLOCK_W
  const gap = (GAME_WIDTH - SHIELD_COUNT * shieldW) / (SHIELD_COUNT + 1)
  let id = 1

  for (let si = 0; si < SHIELD_COUNT; si += 1) {
    const sx = gap + si * (shieldW + gap)
    for (let r = 0; r < SHIELD_ROWS; r += 1) {
      for (let c = 0; c < SHIELD_COLS; c += 1) {
        blocks.push({
          id: id++,
          x: Math.round(sx + c * SHIELD_BLOCK_W),
          y: SHIELD_Y + r * SHIELD_BLOCK_H,
        })
      }
    }
  }

  return blocks
}

function aabb(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

export function SpaceInvadersIsland() {
  const [status, setStatus] = useState<GameStatus>('idle')
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('si_high_score') ?? '0', 10) || 0
    } catch {
      return 0
    }
  })
  const [lives, setLives] = useState(3)
  const [playerX, setPlayerX] = useState((GAME_WIDTH - PLAYER_WIDTH) / 2)
  const [enemies, setEnemies] = useState<Enemy[]>(() => buildEnemies())
  const [bullets, setBullets] = useState<Bullet[]>([])
  const [enemyBullets, setEnemyBullets] = useState<Bullet[]>([])
  const [shields, setShields] = useState<ShieldBlock[]>(() => buildShields())
  const [moveDirection, setMoveDirection] = useState<-1 | 0 | 1>(0)
  const [enemyDirection, setEnemyDirection] = useState<-1 | 1>(1)

  const bulletIdRef = useRef(1)
  const lastShotRef = useRef(0)
  const tickCountRef = useRef(0)
  const enemyBulletIdRef = useRef(10000)

  // Refs for reading current values inside setInterval without stale closures
  const playerXRef = useRef(playerX)
  const shieldsRef = useRef<ShieldBlock[]>(shields)
  const enemiesRef = useRef<Enemy[]>(enemies)

  useEffect(() => { playerXRef.current = playerX }, [playerX])
  useEffect(() => { shieldsRef.current = shields }, [shields])
  useEffect(() => { enemiesRef.current = enemies }, [enemies])

  const isRunning = status === 'running'

  const statusLabel = useMemo(() => {
    if (status === 'idle') return 'Press Start to begin'
    if (status === 'running') return 'Running'
    if (status === 'paused') return 'Paused'
    if (status === 'won') return 'You cleared the fleet!'
    return 'Game over'
  }, [status])

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score)
      try {
        localStorage.setItem('si_high_score', String(score))
      } catch {
        // localStorage unavailable
      }
    }
  }, [score, highScore])

  const resetGame = useCallback(() => {
    const centeredX = (GAME_WIDTH - PLAYER_WIDTH) / 2
    const freshShields = buildShields()
    setStatus('idle')
    setScore(0)
    setLives(3)
    setPlayerX(centeredX)
    playerXRef.current = centeredX
    setEnemies(buildEnemies())
    setBullets([])
    setEnemyBullets([])
    setShields(freshShields)
    shieldsRef.current = freshShields
    setMoveDirection(0)
    setEnemyDirection(1)
    bulletIdRef.current = 1
    lastShotRef.current = 0
    tickCountRef.current = 0
    enemyBulletIdRef.current = 10000
  }, [])

  const shoot = useCallback(() => {
    if (!isRunning) return

    const now = Date.now()
    if (now - lastShotRef.current < 220) return

    lastShotRef.current = now
    setBullets((prev) => [
      ...prev,
      {
        id: bulletIdRef.current++,
        x: playerXRef.current + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
        y: PLAYER_Y - BULLET_HEIGHT,
      },
    ])
  }, [isRunning])

  const startGame = useCallback(() => {
    if (status === 'idle' || status === 'paused') {
      setStatus('running')
    }
  }, [status])

  const pauseGame = useCallback(() => {
    if (status === 'running') {
      setStatus('paused')
    }
  }, [status])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        setMoveDirection(-1)
      }

      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        setMoveDirection(1)
      }

      if (event.key === ' ') {
        event.preventDefault()
        shoot()
      }

      if (event.key.toLowerCase() === 'p') {
        if (status === 'running') pauseGame()
        if (status === 'paused') startGame()
      }
    }

    function onKeyUp(event: KeyboardEvent) {
      if (
        event.key === 'ArrowLeft' ||
        event.key.toLowerCase() === 'a' ||
        event.key === 'ArrowRight' ||
        event.key.toLowerCase() === 'd'
      ) {
        setMoveDirection(0)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [pauseGame, shoot, startGame, status])

  useEffect(() => {
    if (!isRunning) return

    const timer = window.setInterval(() => {
      tickCountRef.current += 1

      // ── Player movement ──────────────────────────────────────────────
      if (moveDirection !== 0) {
        setPlayerX((currentX) => {
          const next = Math.max(0, Math.min(GAME_WIDTH - PLAYER_WIDTH, currentX + moveDirection * PLAYER_STEP))
          playerXRef.current = next
          return next
        })
      }

      // ── Player bullets: move + shield collision ───────────────────────
      setBullets((currentBullets) => {
        if (currentBullets.length === 0) return currentBullets

        const moved = currentBullets
          .map((b) => ({ ...b, y: b.y - BULLET_STEP }))
          .filter((b) => b.y >= -BULLET_HEIGHT)

        const hitBulletIds = new Set<number>()
        const hitShieldIds = new Set<number>()

        for (const bullet of moved) {
          for (const block of shieldsRef.current) {
            if (!hitShieldIds.has(block.id) && aabb(bullet.x, bullet.y, BULLET_WIDTH, BULLET_HEIGHT, block.x, block.y, SHIELD_BLOCK_W, SHIELD_BLOCK_H)) {
              hitBulletIds.add(bullet.id)
              hitShieldIds.add(block.id)
              break
            }
          }
        }

        if (hitShieldIds.size > 0) {
          shieldsRef.current = shieldsRef.current.filter((b) => !hitShieldIds.has(b.id))
          setShields([...shieldsRef.current])
        }

        return hitBulletIds.size > 0 ? moved.filter((b) => !hitBulletIds.has(b.id)) : moved
      })

      // ── Enemy bullets: move + shield + player collision ───────────────
      setEnemyBullets((currentEB) => {
        const moved = currentEB
          .map((b) => ({ ...b, y: b.y + ENEMY_BULLET_STEP }))
          .filter((b) => b.y <= GAME_HEIGHT)

        if (moved.length === 0) return moved

        const hitBulletIds = new Set<number>()
        const hitShieldIds = new Set<number>()

        for (const bullet of moved) {
          for (const block of shieldsRef.current) {
            if (!hitShieldIds.has(block.id) && aabb(bullet.x, bullet.y, BULLET_WIDTH, BULLET_HEIGHT, block.x, block.y, SHIELD_BLOCK_W, SHIELD_BLOCK_H)) {
              hitBulletIds.add(bullet.id)
              hitShieldIds.add(block.id)
              break
            }
          }
        }

        if (hitShieldIds.size > 0) {
          shieldsRef.current = shieldsRef.current.filter((b) => !hitShieldIds.has(b.id))
          setShields([...shieldsRef.current])
        }

        const afterShields = moved.filter((b) => !hitBulletIds.has(b.id))

        const px = playerXRef.current
        const playerHit = afterShields.some((b) =>
          aabb(b.x, b.y, BULLET_WIDTH, BULLET_HEIGHT, px, PLAYER_Y, PLAYER_WIDTH, PLAYER_HEIGHT),
        )

        if (playerHit) {
          setLives((prev) => {
            const next = prev - 1
            if (next <= 0) {
              setStatus('lost')
              return 0
            }
            const cx = (GAME_WIDTH - PLAYER_WIDTH) / 2
            setPlayerX(cx)
            playerXRef.current = cx
            setEnemyDirection(1)
            setEnemies(buildEnemies())
            setBullets([])
            tickCountRef.current = 0
            return next
          })
          return []
        }

        return afterShields
      })

      // ── Enemy movement (speed scales with fleet size) ─────────────────
      setEnemies((currentEnemies) => {
        if (currentEnemies.length === 0) return currentEnemies

        const speedDivisor = Math.max(1, Math.floor(currentEnemies.length / 4))
        if (tickCountRef.current % speedDivisor !== 0) return currentEnemies

        const leftEdge = Math.min(...currentEnemies.map((e) => e.x))
        const rightEdge = Math.max(...currentEnemies.map((e) => e.x + ENEMY_WIDTH))
        const hitBoundary = leftEdge <= 0 || rightEdge >= GAME_WIDTH

        let nextEnemies: Enemy[]
        if (hitBoundary) {
          setEnemyDirection((dir) => (dir === 1 ? -1 : 1))
          nextEnemies = currentEnemies.map((e) => ({ ...e, y: e.y + ENEMY_DROP }))
        } else {
          nextEnemies = currentEnemies.map((e) => ({ ...e, x: e.x + enemyDirection * ENEMY_STEP }))
        }

        enemiesRef.current = nextEnemies
        return nextEnemies
      })

      // ── Enemy firing ──────────────────────────────────────────────────
      setEnemyBullets((currentEB) => {
        if (currentEB.length >= MAX_ENEMY_BULLETS || enemiesRef.current.length === 0) return currentEB
        if (Math.random() >= ENEMY_FIRE_CHANCE) return currentEB
        const shooter = enemiesRef.current[Math.floor(Math.random() * enemiesRef.current.length)]
        return [
          ...currentEB,
          {
            id: enemyBulletIdRef.current++,
            x: shooter.x + ENEMY_WIDTH / 2 - BULLET_WIDTH / 2,
            y: shooter.y + ENEMY_HEIGHT,
          },
        ]
      })

      // ── Enemies reached player row ────────────────────────────────────
      setEnemies((currentEnemies) => {
        if (!currentEnemies.some((e) => e.y + ENEMY_HEIGHT >= PLAYER_Y)) return currentEnemies

        setLives((prev) => {
          const next = prev - 1
          if (next <= 0) {
            setStatus('lost')
            return 0
          }
          const cx = (GAME_WIDTH - PLAYER_WIDTH) / 2
          setPlayerX(cx)
          playerXRef.current = cx
          setEnemyDirection(1)
          setBullets([])
          setEnemyBullets([])
          tickCountRef.current = 0
          return next
        })

        const fresh = buildEnemies()
        enemiesRef.current = fresh
        return fresh
      })
    }, TICK_MS)

    return () => window.clearInterval(timer)
  }, [enemyDirection, isRunning, moveDirection])

  // ── Player bullet ✕ enemy collision ────────────────────────────────────
  useEffect(() => {
    if (!isRunning) return

    setBullets((currentBullets) => {
      if (currentBullets.length === 0 || enemies.length === 0) return currentBullets

      const hitEnemyIds = new Set<number>()
      const hitBulletIds = new Set<number>()
      let scoreGained = 0

      for (const bullet of currentBullets) {
        for (const enemy of enemies) {
          if (aabb(bullet.x, bullet.y, BULLET_WIDTH, BULLET_HEIGHT, enemy.x, enemy.y, ENEMY_WIDTH, ENEMY_HEIGHT)) {
            hitEnemyIds.add(enemy.id)
            hitBulletIds.add(bullet.id)
            scoreGained += ROW_SCORE[enemy.row] ?? 10
            break
          }
        }
      }

      if (hitEnemyIds.size > 0) {
        setEnemies((curr) => curr.filter((e) => !hitEnemyIds.has(e.id)))
        setScore((s) => s + scoreGained)
      }

      return currentBullets.filter((b) => !hitBulletIds.has(b.id))
    })
  }, [enemies, isRunning])

  useEffect(() => {
    if (isRunning && enemies.length === 0) {
      setStatus('won')
    }
  }, [enemies, isRunning])

  const releaseMove = useCallback(() => setMoveDirection(0), [])

  return (
    <section className="rounded-xl border border-sky-200 bg-gradient-to-b from-sky-50 via-white to-blue-100 p-5 shadow-lg">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold text-slate-800">Space Invaders</h2>
        <p aria-live="polite" className="text-sm font-medium text-slate-700">{statusLabel}</p>
      </header>

      <div className="mb-4 flex flex-wrap gap-3 text-sm font-semibold text-slate-700">
        <span>Score: {score}</span>
        <span>High: {highScore}</span>
        <span>Lives: {lives}</span>
        <span>Enemies: {enemies.length}</span>
      </div>

      <div
        role="application"
        aria-label="Space Invaders game board"
        className="relative mx-auto mb-4 overflow-hidden rounded-lg border-2 border-slate-700 bg-slate-900"
        style={{ width: `${GAME_WIDTH}px`, height: `${GAME_HEIGHT}px` }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 20%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 30%, #fff 1px, transparent 1px), radial-gradient(circle at 40% 70%, #fff 1px, transparent 1px)',
            backgroundSize: '120px 120px',
          }}
        />

        {enemies.map((enemy) => (
          <div
            key={enemy.id}
            aria-hidden="true"
            className="absolute rounded bg-emerald-400"
            style={{ left: `${enemy.x}px`, top: `${enemy.y}px`, width: `${ENEMY_WIDTH}px`, height: `${ENEMY_HEIGHT}px` }}
          />
        ))}

        {bullets.map((bullet) => (
          <div
            key={bullet.id}
            aria-hidden="true"
            className="absolute rounded bg-yellow-300"
            style={{ left: `${bullet.x}px`, top: `${bullet.y}px`, width: `${BULLET_WIDTH}px`, height: `${BULLET_HEIGHT}px` }}
          />
        ))}

        {enemyBullets.map((bullet) => (
          <div
            key={bullet.id}
            aria-hidden="true"
            className="absolute rounded bg-orange-500"
            style={{ left: `${bullet.x}px`, top: `${bullet.y}px`, width: `${BULLET_WIDTH}px`, height: `${BULLET_HEIGHT}px` }}
          />
        ))}

        {shields.map((block) => (
          <div
            key={block.id}
            aria-hidden="true"
            className="absolute rounded bg-teal-400"
            style={{ left: `${block.x}px`, top: `${block.y}px`, width: `${SHIELD_BLOCK_W}px`, height: `${SHIELD_BLOCK_H}px` }}
          />
        ))}

        <div
          aria-hidden="true"
          className="absolute rounded-t-lg bg-cyan-300"
          style={{ left: `${playerX}px`, top: `${PLAYER_Y}px`, width: `${PLAYER_WIDTH}px`, height: `${PLAYER_HEIGHT}px` }}
        />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={startGame}
          className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          Start
        </button>
        <button
          type="button"
          onClick={pauseGame}
          className="rounded bg-amber-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          Pause
        </button>
        <button
          type="button"
          onClick={shoot}
          className="rounded bg-fuchsia-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-700"
        >
          Fire
        </button>
        <button
          type="button"
          onClick={resetGame}
          className="rounded bg-slate-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Reset
        </button>
      </div>

      <div className="grid max-w-[360px] grid-cols-3 gap-2">
        <button
          type="button"
          aria-label="Move left"
          onMouseDown={() => setMoveDirection(-1)}
          onMouseUp={releaseMove}
          onMouseLeave={releaseMove}
          onTouchStart={() => setMoveDirection(-1)}
          onTouchEnd={releaseMove}
          className="rounded bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-800"
        >
          Left
        </button>
        <button
          type="button"
          aria-label="Shoot"
          onClick={shoot}
          className="rounded bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-800"
        >
          Shoot
        </button>
        <button
          type="button"
          aria-label="Move right"
          onMouseDown={() => setMoveDirection(1)}
          onMouseUp={releaseMove}
          onMouseLeave={releaseMove}
          onTouchStart={() => setMoveDirection(1)}
          onTouchEnd={releaseMove}
          className="rounded bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-800"
        >
          Right
        </button>
      </div>

      <p className="mt-3 text-xs text-slate-600">Controls: Arrow keys or A/D to move, space to fire, P to pause.</p>
    </section>
  )
}
