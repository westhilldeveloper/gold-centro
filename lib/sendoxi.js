// lib/sendoxi.js

const SENDOXI_BASE = 'https://api.sendoxi.com/send/v1';

function getAuthHeaders() {
  const username = process.env.SENDOXI_USERNAME;
  const password = process.env.SENDOXI_PASSWORD;
  const apiKey = process.env.SENDOXI_API_KEY;

  if (!username || !password || !apiKey) {
    throw new Error(
      'Sendoxi credentials missing (SENDOXI_USERNAME / SENDOXI_PASSWORD / SENDOXI_API_KEY)'
    );
  }

  const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');

  return {
    Authorization: `Basic ${basicAuth}`,
    apiKey,
    'Content-Type': 'application/json',
  };
}

function parseSendoxiResponse(httpStatus, body) {
  const rr = body?.responseResult || {};
  const code = rr.responseCode ?? httpStatus;
  const description = rr.responseDescription || '';
  const fieldErrors = rr.fieldErrors || [];

  const ok = code === 200 && fieldErrors.length === 0;

  return {
    ok,
    code,
    message: description || (ok ? 'SUCCESS' : `HTTP ${httpStatus}`),
    fieldErrors,
    data: body?.data ?? null, // contains [{ msgID, MessageStatus }]
    raw: body,
  };
}

export async function verifyCredentials() {
  const res = await fetch(`${SENDOXI_BASE}/sms_status`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ messageId: ['TEST'] }),
  });

  const body = await res.json().catch(() => ({}));
  const parsed = parseSendoxiResponse(res.status, body);

  if (!parsed.ok) {
    throw new Error(`Auth failed: ${parsed.message}`);
  }

  return parsed;
}

/**
 * Send a single SMS OTP via Sendoxi.
 * Endpoint: POST /single_sms_post
 * Requires DLT-approved templateID and entityId.
 */
export async function sendOtpSms({ to, otp }) {
  // Build message content — MUST match your registered DLT template.
  // Replace `{otp}` in your template with the generated code below.

  const messageContent = `Dear Customer, Your OTP for Finovest GC is ${otp}. (Usable only once and valid for 5 mins.) DO NOT SHARE WITH ANY ONE. Finovest`;

  // Split phone into country code + 10-digit destination
  let phoneRaw = String(to).replace(/\D/g, '');
  let countryCode = '91';
  let destination = phoneRaw;

  if (phoneRaw.length === 12 && phoneRaw.startsWith('91')) {
    countryCode = '91';
    destination = phoneRaw.slice(2);
  } else if (phoneRaw.length === 11 && phoneRaw.startsWith('0')) {
    countryCode = '91';
    destination = phoneRaw.slice(1);
  } else if (phoneRaw.length === 10) {
    countryCode = '91';
    destination = phoneRaw;
  } else {
    throw new Error(`Invalid phone number format: ${to}`);
  }

  const payload = {
  messageContent: String(messageContent).trim(),
  senderID: String(process.env.SENDOXI_SENDER_ID || '').trim(),
  templateID: String(process.env.SENDOXI_TEMPLATE_ID || '').trim(),
  destination: String(destination).trim(),
  entityId: String(process.env.SENDOXI_ENTITY_ID || '').trim(),
  countryCode: String(countryCode).trim(),
};

if (!payload.senderID || !payload.templateID || !payload.entityId) {
  throw new Error(
    'Missing Sendoxi DLT config: SENDOXI_SENDER_ID / SENDOXI_TEMPLATE_ID / SENDOXI_ENTITY_ID'
  );
}

if (!/^\d{10,25}$/.test(payload.templateID)) {
  throw new Error(
    `Invalid SENDOXI_TEMPLATE_ID ("${payload.templateID}"): must be the numeric DLT Template ID`
  );
}

  console.log('[Sendoxi] POST /single_sms_post', payload);

  const res = await fetch(`${SENDOXI_BASE}/single_sms_post`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const rawText = await res.text();
  let resBody = {};
  try {
    resBody = JSON.parse(rawText);
  } catch {
    /* not JSON */
  }

  console.log('[Sendoxi] Response', res.status, rawText);

  const parsed = parseSendoxiResponse(res.status, resBody);

  if (!parsed.ok) {
    throw new Error(
      `Sendoxi error: ${parsed.message}${
        parsed.fieldErrors.length
          ? ' — ' + JSON.stringify(parsed.fieldErrors)
          : ''
      }`
    );
  }

  return parsed;
}