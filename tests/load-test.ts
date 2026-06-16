import { chromium, BrowserContext, Page } from 'playwright';
import fs from 'fs';

// Configuration
const NUM_USERS = 50;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@example.com'; // Replace with a known admin email
const TEST_USERS = Array.from({ length: NUM_USERS }, (_, i) => `user${i}@example.com`);

interface Metrics {
  latencies: number[];
  failedWebsockets: number;
  failedReferrals: number;
  failedUpdates: number;
}

const metrics: Metrics = {
  latencies: [],
  failedWebsockets: 0,
  failedReferrals: 0,
  failedUpdates: 0,
};

// Helper to calculate percentiles
function getPercentile(data: number[], percentile: number) {
  if (data.length === 0) return 0;
  const sorted = [...data].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}

async function runLoadTest() {
  console.log(`Starting Load Test with ${NUM_USERS} virtual users...`);
  const browser = await chromium.launch({ headless: true });
  
  const contexts: BrowserContext[] = [];
  const pages: Page[] = [];

  // Step 1: Create contexts and login
  console.log('Creating browser contexts and logging in...');
  for (let i = 0; i < NUM_USERS + 1; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const email = i === 0 ? ADMIN_EMAIL : TEST_USERS[i - 1];

    // MOCK LOGIN: 
    // Since NextAuth with Google is used, you MUST use a backdoor API route for load testing
    // to bypass Google's automated browser detection.
    // E.g. fetch('/api/test/login', { method: 'POST', body: { email } })
    // For this script, we assume the backdoor sets the appropriate NextAuth cookie.
    
    try {
      await page.goto(`${APP_URL}/api/test/login?email=${encodeURIComponent(email)}`);
      await page.waitForLoadState('networkidle');
      
      if (i === 0) {
        await page.goto(`${APP_URL}/admin`);
        await page.waitForSelector('text=Conclave Control', { timeout: 10000 });
      } else {
        await page.goto(`${APP_URL}/dashboard`);
        // We catch websocket failures by looking for the Waiting Area or UI load
        await page.waitForSelector('text=STATUS / STANDBY', { timeout: 10000 });
      }
      
      contexts.push(context);
      pages.push(page);
    } catch (e) {
      console.error(`Login failed for ${email}`, e);
      metrics.failedWebsockets++;
    }
  }

  const adminPage = pages[0];
  const userPages = pages.slice(1);

  console.log(`Successfully connected ${userPages.length} users and 1 admin.`);

  // Step 2: Measure Round Start Latency
  console.log('Testing: Round Start...');
  try {
    const startTriggerTime = Date.now();
    await adminPage.click('button:has-text("Start Conclave")');
    
    const startPromises = userPages.map(async (page) => {
      try {
        await page.waitForSelector('text=Round 1 is Live', { timeout: 15000 });
        metrics.latencies.push(Date.now() - startTriggerTime);
      } catch (e) {
        metrics.failedUpdates++;
      }
    });

    await Promise.all(startPromises);
    console.log('Round Start updates received by clients.');
  } catch (e) {
    console.error('Failed to trigger Round Start', e);
  }

  // Step 3: Simulate Referral Submissions
  console.log('Testing: Referral Submissions...');
  const referralPromises = userPages.map(async (page, index) => {
    // Delay slightly to prevent 50 instant simultaneous clicks, simulating real human delay
    await page.waitForTimeout(Math.random() * 5000); 
    try {
      // Find the first user card and submit a referral
      const input = page.locator('input[name="note"]').first();
      await input.fill(`Load test referral from user ${index}`);
      
      const sendBtn = page.locator('button:has-text("Send Referral")').first();
      await sendBtn.click();
      
      // Wait for the success checkmark animation
      await page.waitForSelector('text=Referral Sent!', { timeout: 8000 });
    } catch (e) {
      metrics.failedReferrals++;
    }
  });

  await Promise.all(referralPromises);
  console.log('Referral submissions completed.');

  // Step 4: Measure Pause Latency
  console.log('Testing: Pause Round...');
  try {
    const pauseTriggerTime = Date.now();
    await adminPage.click('button:has-text("Pause")');

    const pausePromises = userPages.map(async (page) => {
      try {
        // Look for the amber pulsing timer that indicates paused status
        await page.waitForSelector('.animate-pulse.text-amber-500', { timeout: 15000 });
        metrics.latencies.push(Date.now() - pauseTriggerTime);
      } catch (e) {
        metrics.failedUpdates++;
      }
    });

    await Promise.all(pausePromises);
    console.log('Pause updates received by clients.');
  } catch (e) {
    console.error('Failed to trigger Pause', e);
  }

  // Step 5: Measure Stop Round Latency
  console.log('Testing: Stop Round...');
  try {
    const stopTriggerTime = Date.now();
    await adminPage.click('button:has-text("Stop Round")');

    const stopPromises = userPages.map(async (page) => {
      try {
        // Ensure UI reverts to Waiting Area
        await page.waitForSelector('text=Waiting Area', { timeout: 15000 });
        metrics.latencies.push(Date.now() - stopTriggerTime);
      } catch (e) {
        metrics.failedUpdates++;
      }
    });

    await Promise.all(stopPromises);
    console.log('Stop updates received by clients.');
  } catch (e) {
    console.error('Failed to trigger Stop', e);
  }

  await browser.close();

  // Output Metrics
  console.log('\n==================================================');
  console.log('LOAD TEST RESULTS');
  console.log('==================================================');
  console.log(`P50 Latency: ${getPercentile(metrics.latencies, 50)}ms`);
  console.log(`P95 Latency: ${getPercentile(metrics.latencies, 95)}ms`);
  console.log(`P99 Latency: ${getPercentile(metrics.latencies, 99)}ms`);
  console.log('--------------------------------------------------');
  console.log(`Failed Websocket Connections: ${metrics.failedWebsockets} / ${NUM_USERS}`);
  console.log(`Failed Referrals: ${metrics.failedReferrals} / ${NUM_USERS}`);
  console.log(`Failed Realtime Updates: ${metrics.failedUpdates} / ${NUM_USERS * 3}`); // 3 global state changes tested
  console.log('==================================================\n');
}

runLoadTest().catch(console.error);
