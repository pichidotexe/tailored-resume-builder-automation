import { spawn } from 'node:child_process';
import http from 'node:http';

const CHROME = 'EXECUTABLE PATH';

const PROFILE = 'CHROME PROFILE';

const CDP_URL = 'http://127.0.0.1:9222/json/version';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function checkCDP() {
  return new Promise((resolve) => {
    const req = http.get(CDP_URL, (res) => {
      res.resume();

      resolve(res.statusCode === 200);
    });

    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });

    req.on('error', () => {
      resolve(false);
    });
  });
}

try {
  // ------------------------------------------------------------
  // Already running?
  // ------------------------------------------------------------

  if (await checkCDP()) {
    console.log('Chrome CDP already running.');
    process.exit(0);
  }

  // ------------------------------------------------------------
  // Start Chrome DETACHED
  // ------------------------------------------------------------

  console.log('Starting debug Chrome...');

  const chrome = spawn(
    CHROME,
    ['--remote-debugging-port=9222', `--user-data-dir=${PROFILE}`],
    {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    },
  );

  chrome.unref();

  // ------------------------------------------------------------
  // Wait until CDP is actually ready
  // ------------------------------------------------------------

  for (let i = 1; i <= 30; i++) {
    await sleep(1000);

    if (await checkCDP()) {
      console.log(`Chrome CDP ready after ${i} second(s).`);

      process.exit(0);
    }
  }

  throw new Error(
    'Chrome started but CDP did not become available within 30 seconds.',
  );
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
