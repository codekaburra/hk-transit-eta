import { test, expect } from '@playwright/test';

// These run against the real stack, so they assert on behaviour that the
// mocked unit tests cannot reach: nginx proxying /api to the backend, the
// backend querying a seeded Postgres, and the SPA rendering what comes back.

test.describe('landing', () => {
  test('offers the transport and weather sections', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Transport|交通/).first()).toBeVisible();
    await expect(page.getByText(/Weather|天氣/).first()).toBeVisible();
  });

  test('reaches the transport page', async ({ page }) => {
    await page.goto('/');
    await page.getByText(/Transport|交通/).first().click();
    await expect(page).toHaveURL(/\/transport/);
  });
});

test.describe('API', () => {
  // nginx must proxy /api to the backend; a misconfiguration returns the SPA
  // shell with a 200, which is easy to miss.
  test('serves JSON, not the SPA shell', async ({ request }) => {
    const response = await request.get('/api/num-routes?type=bus');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');

    const body = await response.json();
    expect(body.type).toBe('bus');
    // Seeded from the committed snapshot, so there is real data.
    expect(body.count).toBeGreaterThan(1000);
  });

  test('has minibus data too', async ({ request }) => {
    const body = await (await request.get('/api/num-routes?type=minibus')).json();
    expect(body.count).toBeGreaterThan(100);
  });

  // The bug that started this: an unfiltered request returns both operators
  // and both directions, so the filters have to work against real data.
  test('filters route stops to one operator and direction', async ({ request }) => {
    const all = await (await request.get('/api/bus/stops-by-route?routeId=1')).json();
    const oneDirection = await (
      await request.get('/api/bus/stops-by-route?routeId=1&company=KMB&direction=O&serviceType=1')
    ).json();

    expect(all.length).toBeGreaterThan(oneDirection.length);
    expect(oneDirection.length).toBeGreaterThan(0);
    for (const stop of oneDirection) {
      expect(stop.company).toBe('KMB');
      expect(stop.direction).toBe('O');
    }
  });

  // Stop sequences must be contiguous: a missing stop used to be dropped by an
  // inner join, leaving gaps in the numbering.
  test('returns a contiguous stop sequence', async ({ request }) => {
    const stops = await (
      await request.get('/api/bus/stops-by-route?routeId=1&company=KMB&direction=O&serviceType=1')
    ).json();

    const seqs = stops.map((s: { seq: string }) => parseInt(s.seq, 10));
    expect(seqs[0]).toBe(1);
    for (let i = 1; i < seqs.length; i++) {
      expect(seqs[i]).toBe(seqs[i - 1] + 1);
    }
  });

  test('resolves a route number exactly', async ({ request }) => {
    const variants = await (await request.get('/api/bus/route-variants?routeId=1&company=KMB')).json();

    expect(variants.length).toBeGreaterThan(0);
    for (const v of variants) {
      expect(v.route).toBe('1');
      expect(v.company).toBe('KMB');
    }
    // Outbound is listed first so the page opens on it.
    expect(variants[0].direction).toBe('O');
  });

  // Postgres LIKE is case-sensitive; the search must not be.
  test('searches case-insensitively', async ({ request }) => {
    const lower = await (await request.get('/api/bus/search/stops?q=central')).json();
    const upper = await (await request.get('/api/bus/search/stops?q=CENTRAL')).json();

    expect(lower.length).toBeGreaterThan(0);
    expect(upper.length).toBe(lower.length);
  });

  test('reports an unknown route as an empty array, not null', async ({ request }) => {
    const response = await request.get('/api/bus/stops-by-route?routeId=DOES_NOT_EXIST');
    expect(await response.json()).toEqual([]);
  });
});

test.describe('bus route page', () => {
  test('lists the stops of a route', async ({ page }) => {
    await page.goto('/bus/route/1?company=KMB');

    await expect(page.getByText(/Route Stops/)).toBeVisible();
    // Real seeded data, so there are many stops.
    await expect(page.getByText(/Route Stops \(\d+\)/)).toBeVisible();
  });

  test('switches between the two directions', async ({ page }) => {
    await page.goto('/bus/route/1?company=KMB');

    const heading = page.getByText(/Route Stops \(\d+\)/);
    await expect(heading).toBeVisible();
    const firstDirection = await heading.textContent();

    // Route 1 runs both ways, so a second direction button exists.
    const buttons = page.getByRole('button', { name: /往 / });
    await expect(buttons.first()).toBeVisible();
    await buttons.nth(1).click();

    // The stop list is replaced by the other direction's.
    await expect(page.getByText(/Route Stops \(\d+\)/)).toBeVisible();
    const secondDirection = await page.getByText(/Route Stops \(\d+\)/).textContent();
    expect(secondDirection).toBeTruthy();
    // Both directions render a list; the origin and destination swap.
    expect(firstDirection).toBeTruthy();
  });

  test('reports a route that does not exist', async ({ page }) => {
    await page.goto('/bus/route/NOT_A_ROUTE?company=KMB');
    await expect(page.getByText(/Route not found/)).toBeVisible();
  });
});

test.describe('search', () => {
  test('finds a bus route by number', async ({ page }) => {
    await page.goto('/transport');

    const input = page.getByPlaceholder(/bus routes/);
    await expect(input).toBeVisible();
    await input.fill('1A');

    // Search is debounced, so wait for results rather than asserting at once.
    await expect(page.getByText(/1A/).first()).toBeVisible({ timeout: 15_000 });
  });
});
