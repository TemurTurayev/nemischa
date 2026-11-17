import { defineConfig, devices } from '@playwright/test';

const PORT = 4322;
const LOCAL_URL = `http://localhost:${PORT}/nemischa/`;

// Set E2E_BASE_URL to run the same tests against a deployed site, e.g.
//   E2E_BASE_URL=https://temurturayev.github.io/nemischa/ npx playwright test
const deployedUrl = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: deployedUrl ?? LOCAL_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: deployedUrl
    ? undefined
    : {
        command: `npm run preview -- --port ${PORT}`,
        url: LOCAL_URL,
        reuseExistingServer: !process.env.CI,
      },
});
