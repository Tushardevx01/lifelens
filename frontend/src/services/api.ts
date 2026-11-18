/**
 * LifeLens API Service Facade
 *
 * This file serves as a backwards-compatible facade for the decomposed,
 * modular API architecture in `src/api/`.
 *
 * All domain-specific modules are organized cleanly:
 * - `src/api/client.ts`: Core HTTP transport, hardware-backed token storage & 401 interception
 * - `src/api/authApi.ts`: User authentication, session restore & secure logout
 * - `src/api/entriesApi.ts`: Daily logs CRUD, batch operations & CSV upload
 * - `src/api/analyticsApi.ts`: Intelligence engine, predictions, clusters & anomalies
 * - `src/api/telemetryApi.ts`: Financials, app usage, focus sessions, habits, sleep & workouts
 * - `src/api/experimentsApi.ts`: Behavioral A/B experiment lifecycle & check-ins
 * - `src/api/assistantApi.ts`: AI Assistant chat sessions, SSE streaming & voice synthesis
 * - `src/api/ingestionApi.ts`: Connector synchronization & raw telemetry pipelines
 * - `src/api/briefingsApi.ts`: Daily & weekly intelligence summaries & markdown exports
 * - `src/api/forecastsApi.ts`: Multi-horizon risk & behavioral forecasting
 * - `src/api/dashboardAggregator.ts`: SWR-cached dashboard data aggregator & health check
 */

export {
  // Storage & Client
  TOKEN_STORAGE_KEY,
  USER_ID_STORAGE_KEY,
  BASE_URL,
  REQUEST_TIMEOUT_MS,
  getBaseUrl,
  setBaseUrl,
  getCurrentUserId,
  setCurrentUserId,
  setAccessToken,
  getAccessToken,
  authHeaders,
  handleResponseError,
  fetchWithTimeout,
  apiGet,
  apiGetText,
  apiPost,
  apiPut,
  apiDelete,
  apiUpload,

  // Domain APIs
  authApi,
  entriesApi,
  analyticsApi,
  telemetryApi,
  experimentsApi,
  assistantApi,
  voiceApi,
  ingestionApi,
  briefingsApi,
  forecastsApi,
  systemApi,

  // Aggregators & Utilities
  emptyDashboardData,
  checkBackendHealth,
  getDashboardData,
  syncOfflineMutations,

  // Offline Sync Engine
  offlineSyncService,
} from '../api/index';

export type { AudioFileInput } from '../api/index';
export * from '../api/index';
