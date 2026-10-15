import { chromium } from 'playwright';

const JOB_URL = process.argv[2];

if (!JOB_URL) {
  console.error('Usage: node agent.mjs "https://example.com/job"');
  process.exit(1);
}

const CDP_URL = 'http://127.0.0.1:9222';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/*
|--------------------------------------------------------------------------
| URL helpers
|--------------------------------------------------------------------------
*/

function isBadUrl(url = '') {
  return (
    !url ||
    url.startsWith('chrome://') ||
    url.startsWith('devtools://') ||
    url.startsWith('about:blank') ||
    url.startsWith('chrome-search://') ||
    url.includes('doubleclick.net') ||
    url.includes('googleadservices.com')
  );
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);

    return {
      origin: u.origin,
      pathname: u.pathname.replace(/\/+$/, '') || '/',
    };
  } catch {
    return null;
  }
}

const requested = normalizeUrl(JOB_URL);

if (!requested) {
  console.error(`Invalid job URL: ${JOB_URL}`);
  process.exit(1);
}

function isJobPage(url = '') {
  if (isBadUrl(url)) return false;

  const current = normalizeUrl(url);

  if (!current) return false;

  return (
    current.origin === requested.origin &&
    current.pathname === requested.pathname
  );
}

try {
  // ============================================================
  // CONNECT TO EXISTING CHROME
  // ============================================================

  let browser = null;
  let lastError = null;

  for (let attempt = 1; attempt <= 30; attempt++) {
    try {
      browser = await chromium.connectOverCDP(CDP_URL);

      console.error(`Connected to Chrome CDP on attempt ${attempt}/30`);

      break;
    } catch (error) {
      lastError = error;

      console.error(`Waiting for Chrome CDP... ${attempt}/30`);

      await sleep(1000);
    }
  }

  if (!browser) {
    throw new Error(
      `Could not connect to Chrome CDP: ${lastError?.message || ''}`,
    );
  }

  // ============================================================
  // GET FIRST TAB ONLY
  //
  // ZERO-INDEXED TAB = FIRST TAB
  // ============================================================

  const contexts = browser.contexts();

  if (!contexts.length) {
    throw new Error('No Chrome context found.');
  }

  const context = contexts[0];

  const pages = context.pages();

  let page;

  if (pages.length > 0) {
    // ALWAYS use first tab.
    page = pages[0];

    console.error(`Using first Chrome tab [0]: ${page.url()}`);
  } else {
    page = await context.newPage();

    console.error('Chrome had no tabs, so one new tab was created.');
  }

  // ============================================================
  // OPEN APPLICATION LINK IN FIRST TAB
  // ============================================================

  const currentUrl = page.url();

  if (isJobPage(currentUrl)) {
    console.error(
      `First tab is already on the application page: ${currentUrl}`,
    );
  } else {
    console.error(`Opening application link in first tab: ${JOB_URL}`);

    // Schedule navigation after evaluate returns.
    // This prevents "Execution context was destroyed".
    await page.evaluate((url) => {
      setTimeout(() => {
        window.location.href = url;
      }, 0);
    }, JOB_URL);
  }

  // ============================================================
  // WAIT FOR URL TO REACH THE JOB PAGE
  // ============================================================

  let reachedJobPage = false;

  for (let attempt = 1; attempt <= 45; attempt++) {
    const currentUrl = page.url();

    console.error(`Navigation check ${attempt}/45: ${currentUrl}`);

    if (isJobPage(currentUrl)) {
      reachedJobPage = true;
      break;
    }

    await sleep(1000);
  }

  if (!reachedJobPage) {
    throw new Error(
      `Application page did not reach the expected URL within 45 seconds.\n` +
        `Requested: ${JOB_URL}\n` +
        `Current: ${page.url()}`,
    );
  }

  console.error(`Application page opened: ${page.url()}`);

  // ============================================================
  // WAIT FOR INITIAL RENDERING
  // ============================================================

  await sleep(5000);

  // ============================================================
  // MAKE SURE BODY EXISTS
  // ============================================================

  try {
    await page.waitForSelector('body', {
      timeout: 10000,
    });
  } catch {
    console.error('Body selector timeout; continuing with capture.');
  }

  // ============================================================
  // SCROLL TO TRIGGER LAZY LOADING
  // ============================================================

  try {
    await page.evaluate(async () => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      let previousHeight = 0;

      for (let round = 0; round < 10; round++) {
        const height = document.documentElement.scrollHeight;

        const step = Math.max(window.innerHeight * 0.8, 500);

        for (let y = 0; y < height; y += step) {
          window.scrollTo(0, y);
          await sleep(400);
        }

        await sleep(800);

        const newHeight = document.documentElement.scrollHeight;

        if (newHeight === previousHeight) {
          break;
        }

        previousHeight = newHeight;
      }

      window.scrollTo(0, 0);

      await sleep(1000);
    });
  } catch (error) {
    console.error(`Scroll failed; continuing: ${error.message}`);
  }

  // ============================================================
  // OPTIONAL GENERIC "MORE" BUTTONS
  //
  // IMPORTANT:
  // Do NOT click every "Show more".
  //
  // We first determine what section the button belongs to.
  //
  // Example:
  //
  // About the job
  //      ...
  //   Show more       -> CLICK
  //
  // About the company
  //      ...
  //   Show more       -> IGNORE
  //
  // More jobs
  //   Show more       -> IGNORE
  //
  // No site-specific IDs/classes are used.
  // ============================================================

  try {
    await page.evaluate(async () => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      const expandPatterns = [
        /^show more$/i,
        /^see more$/i,
        /^read more$/i,
        /^view more$/i,
        /^expand$/i,
      ];

      const jobSectionKeywords = [
        'about the job',
        'job description',
        'description',
        'responsibilities',
        'requirements',
        'qualifications',
        "what you'll do",
        'what you will do',
        "what we're looking for",
        'what we are looking for',
        'key responsibilities',
        'skills',
        'experience',
        'duties',
        'role overview',
        'position overview',
        'about this role',
        'the role',
        'your role',
      ];

      const nonJobSectionKeywords = [
        'about the company',
        'about us',
        'company overview',
        'our company',
        'more jobs',
        'similar jobs',
        'related jobs',
        'other jobs',
        'follow',
        'people you may know',
        'recommended jobs',
      ];

      const normalize = (text) =>
        String(text || '')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();

      /*
      --------------------------------------------------------------
      Find a meaningful heading associated with this element.
      --------------------------------------------------------------
      */

      function getNearbyHeading(element) {
        let node = element;

        for (let level = 0; level < 7 && node; level++) {
          /*
          Look for semantic headings inside the current container.
          */

          const headings = [
            ...node.querySelectorAll(
              'h1, h2, h3, h4, h5, h6, [role="heading"]',
            ),
          ];

          /*
          Prefer headings that appear near the beginning of
          the container rather than unrelated deep content.
          */

          for (const heading of headings) {
            const text = normalize(
              heading.innerText || heading.textContent || '',
            );

            if (text && text.length < 200) {
              return text;
            }
          }

          /*
          Also inspect the immediate previous siblings.
          */

          let sibling = node.previousElementSibling;

          for (let i = 0; i < 4 && sibling; i++) {
            const heading = sibling.matches(
              'h1, h2, h3, h4, h5, h6, [role="heading"]',
            )
              ? sibling
              : sibling.querySelector(
                  'h1, h2, h3, h4, h5, h6, [role="heading"]',
                );

            if (heading) {
              const text = normalize(
                heading.innerText || heading.textContent || '',
              );

              if (text && text.length < 200) {
                return text;
              }
            }

            sibling = sibling.previousElementSibling;
          }

          node = node.parentElement;
        }

        return '';
      }

      /*
      --------------------------------------------------------------
      Find a reasonable surrounding section.
      --------------------------------------------------------------
      */

      function getSectionContext(element) {
        let node = element;

        for (let level = 0; level < 7 && node; level++) {
          const text = normalize(node.innerText || '');

          if (text.length > 20 && text.length < 30000) {
            return text;
          }

          node = node.parentElement;
        }

        return '';
      }

      const elements = [
        ...document.querySelectorAll('button, [role="button"], a'),
      ];

      for (const element of elements) {
        const buttonText = normalize(
          element.innerText || element.textContent || '',
        );

        /*
        ------------------------------------------------------------
        Only inspect actual expansion-type controls.
        ------------------------------------------------------------
        */

        if (
          !buttonText ||
          !expandPatterns.some((pattern) => pattern.test(buttonText))
        ) {
          continue;
        }

        const heading = getNearbyHeading(element);

        const sectionText = getSectionContext(element);

        const headingIsJob = jobSectionKeywords.some((keyword) =>
          heading.includes(keyword),
        );

        const headingIsNonJob = nonJobSectionKeywords.some((keyword) =>
          heading.includes(keyword),
        );

        const contextIsJob = jobSectionKeywords.some((keyword) =>
          sectionText.includes(keyword),
        );

        const contextIsNonJob = nonJobSectionKeywords.some((keyword) =>
          sectionText.includes(keyword),
        );

        /*
        ------------------------------------------------------------
        HARD EXCLUSION:
        If the heading clearly says "About the company",
        "More jobs", etc., NEVER click.
        ------------------------------------------------------------
        */

        if (headingIsNonJob || (contextIsNonJob && !headingIsJob)) {
          console.error(
            `Ignoring non-job expansion button: "${buttonText}" - "${heading}"`,
          );

          continue;
        }

        /*
        ------------------------------------------------------------
        CLICK ONLY WHEN JOB CONTEXT IS IDENTIFIED.
        ------------------------------------------------------------
        */

        if (headingIsJob || (contextIsJob && !contextIsNonJob)) {
          try {
            console.error(
              `Clicking job-content expansion: "${buttonText}" - "${heading}"`,
            );

            element.click();

            await sleep(700);
          } catch {
            // Optional operation.
          }
        }
      }
    });
  } catch (error) {
    console.error(`Expand step failed; continuing: ${error.message}`);
  }

  // ============================================================
  // FINAL RENDER WAIT
  // ============================================================

  await sleep(2000);

  // ============================================================
  // CAPTURE HTML + VISIBLE TEXT
  // ============================================================

  const result = await page.evaluate(() => {
    const html = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;

    const visibleText = document.body?.innerText || '';

    return {
      url: location.href,
      title: document.title || '',
      htmlLength: html.length,
      textLength: visibleText.length,
      html,
      visibleText,
    };
  });

  // ============================================================
  // VALIDATION
  // ============================================================

  if (isBadUrl(result.url)) {
    throw new Error(`Bad page captured: ${result.url}`);
  }

  if (result.htmlLength < 5000) {
    throw new Error(`Page HTML is suspiciously small: ${result.htmlLength}`);
  }

  if (result.textLength < 50) {
    throw new Error(
      `Page visible text is suspiciously small: ${result.textLength}`,
    );
  }

  // ============================================================
  // OUTPUT
  //
  // Your Execute Command redirects stdout to:
  // C:\browser-agent\dummy-output.txt
  // ============================================================

  console.log(JSON.stringify(result));

  // ============================================================
  // DO NOT CLOSE CHROME
  // ============================================================

  process.exit(0);
} catch (error) {
  console.error(
    JSON.stringify({
      error: true,
      message: error.message,
      stack: error.stack,
    }),
  );

  process.exit(1);
}
