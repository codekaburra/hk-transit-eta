// Shared fetch helpers.
//
// Every API call used to repeat the same fetch / !ok / json / catch block, with
// small unexplained differences in what it returned on failure. The two helpers
// here keep that choice explicit at the call site: fetchJSON throws, so the
// caller can tell an outage apart from an empty result; fetchJSONOr swallows the
// failure and returns a fallback, for the callers that only render a list.

import { isDebugMode } from './utils';

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// HttpError carries the status so callers can special-case it — a 404 from a
// "get by id" endpoint means "no such record", not "the request failed".
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, detail: string) {
    super(`Request failed with status ${status}${detail ? `: ${detail}` : ''}`);
    this.name = 'HttpError';
    this.status = status;
  }
}

// fetchJSON throws HttpError on a non-2xx response and propagates network
// errors untouched.
export const fetchJSON = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    // The body often explains the failure, but it is not always readable — a
    // response may have no body, or be a test double without text().
    let detail = '';
    try {
      detail = (await response.text()).trim().slice(0, 200);
    } catch {
      // Nothing to add beyond the status.
    }
    throw new HttpError(response.status, detail);
  }
  return response.json();
};

export interface FetchOptions {
  // Delay the failed call by 5s before returning the fallback. Preserved from
  // the original per-function code, where it was applied to the search and ETA
  // endpoints.
  delayOnError?: boolean;
  // Return the fallback for a 404 without logging it, for endpoints where a
  // missing record is an expected answer rather than a fault.
  quietOn404?: boolean;
}

// fetchJSONOr returns fallback instead of throwing. `context` names the call in
// the error log.
export const fetchJSONOr = async <T>(
  url: string,
  fallback: T,
  context: string,
  options: FetchOptions = {}
): Promise<T> => {
  if (isDebugMode()) {
    console.log(`API ${context}:`, url);
  }
  try {
    return await fetchJSON<T>(url);
  } catch (error) {
    if (options.quietOn404 && error instanceof HttpError && error.status === 404) {
      return fallback;
    }
    console.error(`Error fetching ${context}:`, error);
    if (options.delayOnError) {
      await sleep(5000);
    }
    return fallback;
  }
};
