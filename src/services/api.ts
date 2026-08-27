import { DashboardData } from '@/src/features/dashboard/dashboard.types';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("EXPO_PUBLIC_API_URL is not defined in the .env file");
}
let authToken: string | null = null;

async function authenticate(): Promise<string> {
  if (authToken) return authToken;
  
  const params = new URLSearchParams();
  params.append('username', 'demo@lifelens.ai');
  params.append('password', 'Demo123456!');
  
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  
  if (!response.ok) {
    throw new Error('Failed to authenticate with demo account');
  }
  
  const data = await response.json();
  authToken = data.access_token;
  return authToken as string;
}

export async function getDashboardData(): Promise<DashboardData> {
  // Ensure we have a valid token before calling protected endpoints
  const token = await authenticate();
  const headers = { 'Authorization': `Bearer ${token}` };

  // Fetch all required data in parallel
  const [
    dashboardRes,
    predictionRes,
    clustersRes,
    correlationsRes,
    anomaliesRes
  ] = await Promise.all([
    fetch(`${API_URL}/api/analytics/dashboard`, { headers }),
    fetch(`${API_URL}/api/analytics/prediction/tomorrow`, { headers }),
    fetch(`${API_URL}/api/analytics/clusters`, { headers }),
    fetch(`${API_URL}/api/analytics/correlations`, { headers }),
    fetch(`${API_URL}/api/analytics/anomalies?last_n_days=7`, { headers }),
  ]);

  if (!dashboardRes.ok) {
    throw new Error(`Dashboard API Error: ${dashboardRes.status} ${dashboardRes.statusText}`);
  }

  const dashData = await dashboardRes.json();
  const predictionData = predictionRes.ok ? await predictionRes.json() : null;
  const clustersData = clustersRes.ok ? await clustersRes.json() : null;
  const correlationsData = correlationsRes.ok ? await correlationsRes.json() : [];
  const anomaliesData = anomaliesRes.ok ? await anomaliesRes.json() : [];

  // Map backend responses to frontend DashboardData schema
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
      { category: 'sleep', score: dashData.life_score_components?.sleep || 0, weight: 0.25, color: '#00D4AA' },
      { category: 'productivity', score: dashData.life_score_components?.productivity || 0, weight: 0.25, color: '#4A9EFF' },
      { category: 'health', score: dashData.life_score_components?.health || 0, weight: 0.25, color: '#B8FF00' },
      { category: 'finance', score: dashData.life_score_components?.finance || 0, weight: 0.25, color: '#FF9F43' },
    ],
    trendData: (dashData.trend_data || []).map((t: any) => ({
      date: t.date,
      lifeScore: t.life_score,
      sleep: t.sleep_score,
      productivity: t.productivity_score,
    })),
    prediction: {
      score: predictionData?.predicted_productivity || 0,
      confidence: 'high',
      keyDriver: predictionData?.key_driver || 'Unknown',
      recommendation: predictionData?.improvement_tip || 'Keep tracking data for better predictions.',
    },
    insights: (dashData.top_insights || []).map((i: any) => ({
      id: i.id,
      title: i.title,
      subtitle: i.message,
      icon: 'bulb-outline',
    })),
    clusters: (clustersData?.clusters || []).map((c: any) => ({
      label: c.cluster_name,
      color: '#4A9EFF',
      active: true,
    })),
    correlations: correlationsData.map((c: any, index: number) => ({
      id: index.toString(),
      score: c.r,
      positive: c.r > 0,
      title: `${c.name_a} & ${c.name_b}`,
      description: c.insight_message,
    })),
    anomalies: anomaliesData.map((a: any, index: number) => ({
      id: index.toString(),
      date: a.date,
      title: `Anomaly Detected`,
      description: a.insight_message,
      severity: a.anomaly_score > 0.8 ? 'high' : 'medium',
    })),
  };
}
