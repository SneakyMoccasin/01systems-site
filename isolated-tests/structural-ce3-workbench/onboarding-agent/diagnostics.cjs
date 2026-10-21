'use strict';
// Safe projection of an existing receipt. Never return API error.message,
// arbitrary error codes/parameters, headers, request body or credential echoes.
// This also works for receipts written before structured diagnostics existed.
function diagnosticForAttempt(attempt) {
  if (!attempt?.error && attempt?.state !== 'uncertain') return null;
  const value = attempt.response?.status;
  const status = Number.isInteger(value) && value >= 100 && value <= 599 ? value : null;
  let data;
  try { data = JSON.parse(attempt.response?.body ?? ''); } catch {}
  const allowed = ['invalid_api_key', 'insufficient_quota', 'rate_limit_exceeded', 'model_not_found', 'invalid_json_schema', 'unsupported_parameter'];
  const code = allowed.includes(data?.error?.code) ? data.error.code : null;
  let message, next_step;
  if (status === 401) {
    message = code === 'invalid_api_key'
      ? 'OpenAI avvisade API-nyckeln (HTTP 401, invalid_api_key). Inget modellutkast kunde hämtas.'
      : 'OpenAI avvisade autentiseringen (HTTP 401). Inget modellutkast kunde hämtas.';
    next_step = 'Kontrollera eller ersätt projektnyckeln lokalt och läs in den på nytt vid serverstart. Nyckeln ska inte klistras in i chatten. Provet förblir stoppat tills fortsatt körning uttryckligen har beslutats; omstart återställer inte räknaren.';
  } else if (status === 403) {
    message = 'OpenAI nekade åtkomst (HTTP 403).';
    next_step = 'Kontrollera projektets och nyckelns behörigheter. Inget automatiskt omförsök görs.';
  } else if (status === 429) {
    message = code === 'insufficient_quota'
      ? 'OpenAI avvisade anropet eftersom API-kvoten inte räcker (HTTP 429, insufficient_quota).'
      : 'OpenAI avvisade anropet på grund av en kvot- eller hastighetsgräns (HTTP 429).';
    next_step = 'Kontrollera projektets kvot och API-fakturering. Provet förblir stoppat.';
  } else if (status === 400 || status === 404 || status === 422) {
    message = `OpenAI avvisade begäran (HTTP ${status}${code ? ', ' + code : ''}).`;
    next_step = 'Kontrollera modellåtkomst och anropsformat mot det sparade kvittot. Provet förblir stoppat.';
  } else if (status !== null && status >= 500) {
    message = `OpenAI svarade med ett serverfel (HTTP ${status}).`;
    next_step = 'Inget automatiskt omförsök görs. Reservationen och anropsräknaren bevaras.';
  } else if (status === null) {
    message = 'Inget fullständigt HTTP-svar finns sparat. Anropets utfall är osäkert efter nätverksfel, timeout eller avbrott.';
    next_step = 'Reservationen och anropsräknaren bevaras. Provet förblir stoppat utan automatisk omsändning.';
  } else {
    message = `Ett HTTP-svar finns (HTTP ${status}), men modellsvaret kunde inte godtas.`;
    next_step = 'Kontrollera det sparade kvittot och kontraktsfelet innan fortsatt körning. Provet förblir stoppat.';
  }
  return { http_status: status, api_code: code, message, next_step };
}
module.exports = { diagnosticForAttempt };
