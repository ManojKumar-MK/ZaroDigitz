async function sendViaNetlifyFunction({ order, invoiceNumber, pdfBase64 }) {
  const body = pdfBase64 ? { order, invoiceNumber, pdfBase64 } : { order, invoiceNumber };
  const isLocalDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const requestPath = isLocalDev ? '/api/send-invoice' : '/.netlify/functions/send-invoice';
  const requestUrl = new URL(requestPath, window.location.origin).toString();
  try {
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    let payload = null;
    try {
      payload = responseText ? JSON.parse(responseText) : null;
    } catch (error) {
      payload = null;
    }

    if (!response.ok) {
      return {
        ok: false,
        reason: payload?.reason || `function-http-${response.status}`,
        requestUrl,
        status: response.status,
        statusText: response.statusText,
        responseText,
        result: payload ?? responseText,
      };
    }

    return payload?.ok
      ? {
          ok: true,
          result: payload,
          requestUrl,
          status: response.status,
          statusText: response.statusText,
          responseText,
        }
      : {
          ok: false,
          reason: payload?.reason || 'function-failed',
          requestUrl,
          status: response.status,
          statusText: response.statusText,
          responseText,
          result: payload ?? responseText,
        };
  } catch (error) {
    return {
      ok: false,
      reason: error?.message || 'netlify-function-error',
      requestUrl,
      errorType: error?.name || 'Error',
      errorStack: error?.stack || String(error),
      result: {
        requestUrl,
        errorType: error?.name || 'Error',
        errorMessage: error?.message || String(error),
        errorStack: error?.stack || String(error),
      },
    };
  }
}

export async function sendInvoiceToTelegram({ order, invoiceNumber, pdfBase64 }) {
  const functionResult = await sendViaNetlifyFunction({ order, invoiceNumber, pdfBase64 });
  if (functionResult.ok) return functionResult;

  return {
    ok: false,
    reason: functionResult.reason || 'netlify-function-error',
    result: functionResult,
  };
}
