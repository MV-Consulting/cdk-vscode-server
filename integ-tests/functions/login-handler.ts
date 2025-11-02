import { parse } from 'node-html-parser';

/**
 * Login handler with retry logic for instance startup
 *
 * Retries up to 20 times with 15-second intervals (5 minutes total)
 * to allow time for EC2 instance startup and VS Code Server initialization
 */
export const handler = async (event: any) => {
  const domainName = event.domainName || 'test-domain';
  const password = event.password || 'test-password';
  log({
    message: 'Login in',
    event,
  });

  const maxRetries = 20;
  const retryDelayMs = 15000; // 15 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    log({ message: `Login attempt ${attempt}/${maxRetries}` });

    try {
      if (!domainName || !password) {
        throw new Error('Domain name and password are required');
      }

      const url = domainName.startsWith('http') ? domainName : `https://${domainName}`;

      const response = await fetch(url);

      if (!response.ok) {
        log({ message: `HTTP ${response.status}, retrying...` });
        if (attempt < maxRetries) {
          await sleep(retryDelayMs);
          continue;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const htmlContent = await response.text();
      const root = parse(htmlContent);
      const centerContainer = root.querySelector('.center-container');

      if (!centerContainer) {
        log({ message: 'Center container not found yet, retrying...' });
        if (attempt < maxRetries) {
          await sleep(retryDelayMs);
          continue;
        }
        error({
          message: 'Center container NOT found after all retries',
          htmlContent,
        });
        return 'NOK';
      }

      log({ message: `Found center container on attempt ${attempt}. TADA` });
      return 'OK';
    } catch (err) {
      log({
        message: `Attempt ${attempt} failed`,
        error: err instanceof Error ? err.message : String(err),
      });

      if (attempt < maxRetries) {
        await sleep(retryDelayMs);
        continue;
      }

      error({
        message: 'All retry attempts failed',
        err,
      });
      return 'NOK';
    }
  }

  return 'NOK';
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(msg: any) {
  console.log(JSON.stringify(msg));
}

function error(msg: any) {
  console.error(JSON.stringify(msg));
}
