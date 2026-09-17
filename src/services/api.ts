import { DashboardData } from '@/src/features/dashboard/dashboard.types';
import { mockDashboardData } from '@/src/features/dashboard/dashboard.data';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const REQUEST_TIMEOUT_MS = 4000;

let authToken: string | null = null;

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function authenticate(): Promise<string> {
  if (authToken) return authToken;
  if (!API_URL) {
    throw new Error('API_URL is not configured');
  }

  const body = `username=${encodeURIComponent('demo@lifelens.ai')}&password=${encodeURIComponent('Demo123456!')}`;

  const response = await fetchWithTimeout(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Auth failed with status ${response.status}`);
  }

  const data = await response.json();
  authToken = data.access_token;
  return authToken as string;
}

export async function getDashboardData(): Promise<DashboardData> {
  if (!API_URL) {
    return mockDashboardData;
  }

  try {
    // Ensure we have a valid token before calling protected endpoints
    const token = await authenticate();
    const headers = { Authorization: `Bearer ${token}` };

    // Fetch all required data in parallel with timeout
    const [
      dashboardRes,
      predictionRes,
      clustersRes,
      correlationsRes,
      anomaliesRes,
    ] = await Promise.all([
      fetchWithTimeout(`${API_URL}/api/analytics/dashboard`, { headers }),
      fetchWithTimeout(`${API_URL}/api/analytics/prediction/tomorrow`, { headers }),
      fetchWithTimeout(`${API_URL}/api/analytics/clusters`, { headers }),
      fetchWithTimeout(`${API_URL}/api/analytics/correlations`, { headers }),
      fetchWithTimeout(`${API_URL}/api/analytics/anomalies?last_n_days=7`, { headers }),
    ]);

    if (!dashboardRes.ok) {
      throw new Error(`Dashboard API Error: ${dashboardRes.status} ${dashboardRes.statusText}`);
    }

    const dashData = await dashboardRes.json();
    const predictionData = predictionRes.ok ? await predictionRes.json() : null;
    const clustersData = clustersRes.ok ? await clustersRes.json() : null;
    const correlationsData = correlationsRes.ok ? await correlationsRes.json() : [];
    const anomaliesData = anomaliesRes.ok ? await anomaliesRes.json() : [];

    return {
      lifeScore: {
        overall: dashData.life_score || 0,
        sleep: dashData.life_score_components?.sleep || 0,
        productivity: dashData.life_score_components?.productivity || 0,
        health: dashData.life_score_components?.health || 0,
        finance: dashData.life_score_components?.finance || 0,
        change: dashData.life_score_change_from_yesterday || 0,
      },
      insight: {
        id: '1',
        title: dashData.daily_summary?.title || 'Daily Summary',
        summary: dashData.daily_summary?.what || 'No summary available.',
        whyItMatters: dashData.daily_summary?.why || '',
        actionForToday: dashData.daily_summary?.action || '',
        type: 'daily',
      },
      scoreBreakdown: [
        {
          category: 'sleep',
          score: dashData.life_score_components?.sleep || 0,
          weight: 0.25,
          color: '#00D4AA',
        },
        {
          category: 'productivity',
          score: dashData.life_score_components?.productivity || 0,
          weight: 0.25,
          color: '#4A9EFF',
        },
        {
          category: 'health',
          score: dashData.life_score_components?.health || 0,
          weight: 0.25,
          color: '#B8FF00',
        },
        {
          category: 'finance',
          score: dashData.life_score_components?.finance || 0,
          weight: 0.25,
          color: '#FF9F43',
        },
      ],
      trendData: (dashData.trend_data || []).map((t: Record<string, unknown>) => ({
        date: (t.date as string) || '',
        lifeScore: (t.life_score as number) || 0,
        sleep: (t.sleep_score as number) || 0,
        productivity: (t.productivity_score as number) || 0,
      })),
      prediction: {
        score: predictionData?.predicted_productivity || 0,
        confidence: 'high',
        keyDriver: predictionData?.key_driver || 'Unknown',
        recommendation:
          predictionData?.improvement_tip || 'Keep tracking data for better predictions.',
      },
      insights: (dashData.top_insights || []).map((i: Record<string, string>) => ({
        id: i.id || '',
        title: i.title || '',
        subtitle: i.message || '',
        icon: 'bulb-outline',
      })),
      clusters: (clustersData?.clusters || []).map((c: Record<string, string>) => ({
        label: c.cluster_name || '',
        color: '#4A9EFF',
        active: true,
      })),
      correlations: correlationsData.map(
        (c: Record<string, unknown>, index: number) => ({
          id: index.toString(),
          score: (c.r as number) || 0,
          positive: ((c.r as number) || 0) > 0,
          title: `${c.name_a} & ${c.name_b}`,
          description: (c.insight_message as string) || '',
        })
      ),
      anomalies: anomaliesData.map(
        (a: Record<string, unknown>, index: number) => ({
          id: index.toString(),
          date: (a.date as string) || '',
          title: 'Anomaly Detected',
          description: (a.insight_message as string) || '',
          severity: ((a.anomaly_score as number) || 0) > 0.8 ? 'high' : 'medium',
        })
      ),
    };
  } catch (error) {
    console.warn(
      'Live API request failed or timed out. Falling back to local mock data:',
      error
    );
    // Graceful fallback to rich mock data so the dashboard always renders
    return mockDashboardData;
  }
}
