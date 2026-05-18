import { test, expect } from '@playwright/test'

test.describe('Space Invaders', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('page loads with Space Invaders heading visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /space invaders/i })).toBeVisible()
  })

  test('game board renders', async ({ page }) => {
    await expect(page.getByRole('application', { name: /space invaders game board/i })).toBeVisible()
  })

  test('enemy fleet is visible on initial render', async ({ page }) => {
    const board = page.getByRole('application', { name: /space invaders game board/i })
    await expect(board).toBeVisible()
    // 4 rows × 8 cols = 32 enemies rendered as .bg-emerald-400 divs
    const enemies = board.locator('.bg-emerald-400')
    await expect(enemies).toHaveCount(32)
  })

  test('shield blocks are visible on initial render', async ({ page }) => {
    const board = page.getByRole('application', { name: /space invaders game board/i })
    // 4 shields × 5 cols × 3 rows = 60 blocks
    const shieldBlocks = board.locator('.bg-teal-400')
    await expect(shieldBlocks).toHaveCount(60)
  })

  test('HUD shows Score, High, Lives, Enemies', async ({ page }) => {
    await expect(page.getByText(/score:/i)).toBeVisible()
    await expect(page.getByText(/high:/i)).toBeVisible()
    await expect(page.getByText(/lives:/i)).toBeVisible()
    await expect(page.getByText(/enemies:/i)).toBeVisible()
  })

  test('Start changes status to Running', async ({ page }) => {
    await page.getByRole('button', { name: /^start$/i }).click()
    await expect(page.getByText('Running')).toBeVisible()
  })

  test('Pause changes status to Paused', async ({ page }) => {
    await page.getByRole('button', { name: /^start$/i }).click()
    await page.getByRole('button', { name: /^pause$/i }).click()
    await expect(page.getByText('Paused')).toBeVisible()
  })

  test('Reset returns to idle', async ({ page }) => {
    await page.getByRole('button', { name: /^start$/i }).click()
    await page.getByRole('button', { name: /^reset$/i }).click()
    await expect(page.getByText('Press Start to begin')).toBeVisible()
  })
})
