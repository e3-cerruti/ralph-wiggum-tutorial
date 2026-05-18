import { test, expect } from '@playwright/test';

test.describe('Hello Page', () => {
  test.beforeEach(async ({ request }) => {
    // Clean up all existing greetings for test isolation
    const res = await request.get('/api/hello');
    const hellos = await res.json();
    for (const hello of hellos) {
      await request.delete(`/api/hello/${hello.id}`);
    }
  });

  test('loads and shows the greeting form', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Hello/i);

    const island = page.locator('[data-island="hello"]');
    await expect(island).toBeVisible();

    const input = page.getByPlaceholder('Enter a greeting');
    await expect(input).toBeVisible();

    const addButton = page.getByRole('button', { name: /add/i });
    await expect(addButton).toBeVisible();

    await expect(page.getByRole('heading', { name: /space invaders/i })).toBeVisible();
  });

  test('can start and pause space invaders', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /^start$/i }).click();
    await expect(page.getByText('Running')).toBeVisible();

    await page.getByRole('button', { name: /^pause$/i }).click();
    await expect(page.getByText('Paused')).toBeVisible();
  });

  test('can add a greeting', async ({ page }) => {
    await page.goto('/');

    const input = page.getByPlaceholder('Enter a greeting');
    const addButton = page.getByRole('button', { name: /add/i });

    await input.fill('Hello from Playwright!');
    await addButton.click();

    await expect(page.getByText('Hello from Playwright!', { exact: true })).toBeVisible();
  });

  test('can delete a greeting', async ({ page }) => {
    await page.goto('/');

    // Create a greeting first
    const input = page.getByPlaceholder('Enter a greeting');
    await input.fill('To be deleted');
    await page.getByRole('button', { name: /add/i }).click();
    await expect(page.getByText('To be deleted', { exact: true })).toBeVisible();

    // Find the row containing our text and click its Delete button
    const row = page.locator('div').filter({ hasText: 'To be deleted' }).filter({ has: page.getByRole('button', { name: /delete/i }) }).first();
    await row.getByRole('button', { name: /delete/i }).click();

    await expect(page.getByText('To be deleted', { exact: true })).not.toBeVisible();
  });

  test('shows validation error for empty message', async ({ page }) => {
    await page.goto('/');

    const addButton = page.getByRole('button', { name: /add/i });
    // Button should be disabled when input is empty
    await expect(addButton).toBeDisabled();
  });

  test('persists greetings across page reloads', async ({ page }) => {
    await page.goto('/');

    const input = page.getByPlaceholder('Enter a greeting');
    await input.fill('Persistent greeting');
    await page.getByRole('button', { name: /add/i }).click();
    await expect(page.getByText('Persistent greeting', { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByText('Persistent greeting', { exact: true })).toBeVisible();
  });
});

test.describe('Hello API', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.get('/api/hello');
    const hellos = await res.json();
    for (const hello of hellos) {
      await request.delete(`/api/hello/${hello.id}`);
    }
  });

  test('GET /api/hello returns JSON array', async ({ request }) => {
    const response = await request.get('/api/hello');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('POST /api/hello creates a greeting', async ({ request }) => {
    const response = await request.post('/api/hello', {
      data: { message: 'API test greeting' },
    });
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.message).toBe('API test greeting');
    expect(body.id).toBeDefined();
  });

  test('POST /api/hello rejects empty message', async ({ request }) => {
    const response = await request.post('/api/hello', {
      data: { message: '' },
    });
    expect(response.status()).toBe(400);
  });

  test('DELETE /api/hello/:id removes a greeting', async ({ request }) => {
    // Create first
    const createRes = await request.post('/api/hello', {
      data: { message: 'Delete me via API' },
    });
    const { id } = await createRes.json();

    // Delete
    const deleteRes = await request.delete(`/api/hello/${id}`);
    expect(deleteRes.status()).toBe(204);

    // Verify gone
    const getRes = await request.get(`/api/hello/${id}`);
    expect(getRes.status()).toBe(404);
  });
});
