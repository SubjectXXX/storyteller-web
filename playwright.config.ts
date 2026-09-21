import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e', outputDir: 'test-results', reporter: [['line']],
  use: { baseURL: 'http://127.0.0.1:4173', colorScheme: 'dark', reducedMotion: 'reduce', trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: false },
  projects: [
    { name: 'mobile-390', use: { viewport: { width: 390, height: 844 } } },
    { name: 'tablet-768', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'desktop-1440', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'wide-1920', use: { viewport: { width: 1920, height: 1080 } } },
  ],
});
