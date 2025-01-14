import { parse } from 'node-html-parser';

export const handler = async (event: any) => {
  const domainName = event.domainName || 'test-domain';
  const password = event.password || 'test-password';
  log({
    message: 'Login in',
    event,
  });

  let htmlContent: string = '';
  try {
    if (!domainName || !password) {
      throw new Error('Domain name and password are required');
    }

    const url = domainName.startsWith('http') ? domainName : `https://${domainName}`;

    // No logs due to error 'Response object is too long'
    // https://github.com/aws/aws-cdk/issues/24490
    // log({ message: 'Fetching document', url })
    const response = await fetch(url);
    // log({ message: 'Got response' })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    htmlContent = await response.text();
    // log({ message: 'Got HTML content' })

    // log({ message: 'Parsing HTML' })
    const root = parse(htmlContent);

    // log({ message: 'Querying document' })
    const centerContainer = root.querySelector('.center-container');

    if (!centerContainer) {
      error({
        message: 'Center container NOT found. See retrieved htmlContent',
        htmlContent,
      });
      return 'NOK';
    }

    log({ message: 'Found center container. TADA' });
    return 'OK';
  } catch (err) {
    error({
      message: 'Error fetching or processing document',
      err,
      htmlContent,
    });
    return 'NOK';
  }
};

function log(msg: any) {
  console.log(JSON.stringify(msg));
}

function error(msg: any) {
  console.error(JSON.stringify(msg));
}
