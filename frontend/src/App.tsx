import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { LiveMonitoringPage } from './pages/LiveMonitoringPage';
import { VideoAnalysisPage } from './pages/VideoAnalysisPage';
import { RestrictedZonesPage } from './pages/RestrictedZonesPage';
import { PPECompliancePage } from './pages/PPECompliancePage';
import { IncidentCenterPage } from './pages/IncidentCenterPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import {
  api,
  SystemStatus,
  AnalyticsSummary,
  Incident,
  RestrictedZone,
  VideoSource,
  ProcessingJob
} from './api';

export const App: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [zones, setZones] = useState<RestrictedZone[]>([]);
  const [videos, setVideos] = useState<VideoSource[]>([]);
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const fetchAllData = async () => {
    try {
      const [st, an, inc, zn, vid, jb] = await Promise.all([
        api.getSystemStatus(),
        api.getAnalyticsSummary(),
        api.getIncidents(),
        api.getZones(),
        api.getVideos(),
        api.getJobs(),
      ]);
      setSystemStatus(st);
      setAnalytics(an);
      setIncidents(inc);
      setZones(zn);
      setVideos(vid);
      setJobs(jb);
    } catch (err) {
      console.error('Failed to fetch Sentinel telemetry:', err);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleDemo = async () => {
    try {
      setIsDemoLoading(true);
      if (systemStatus?.demo_mode_active) {
        await api.clearDemo();
      } else {
        await api.loadDemo();
      }
      await fetchAllData();
    } catch (err: any) {
      alert(`Demo mode action error: ${err.message}`);
    } finally {
      setIsDemoLoading(false);
    }
  };

  const openIncidentsCount = incidents.filter(i =>
    i.status === 'NEW' || i.status === 'UNDER_REVIEW' || i.status === 'ACKNOWLEDGED'
  ).length;

  return (
    <BrowserRouter>
      <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
        <Navbar
          status={systemStatus}
          onRefresh={fetchAllData}
          onToggleDemo={handleToggleDemo}
          isDemoLoading={isDemoLoading}
        />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar openIncidentsCount={openIncidentsCount} />

          <main className="flex-1 overflow-y-auto bg-[#09090b] p-4 lg:p-6">
            <Routes>
              <Route
                path="/"
                element={
                  <DashboardPage
                    summary={analytics}
                    recentIncidents={incidents}
                    onRefresh={fetchAllData}
                  />
                }
              />
              <Route
                path="/monitoring"
                element={
                  <LiveMonitoringPage
                    incidents={incidents}
                    zones={zones}
                  />
                }
              />
              <Route
                path="/video-analysis"
                element={
                  <VideoAnalysisPage
                    videos={videos}
                    jobs={jobs}
                    zones={zones}
                    onRefresh={fetchAllData}
                  />
                }
              />
              <Route
                path="/zones"
                element={
                  <RestrictedZonesPage
                    zones={zones}
                    onRefresh={fetchAllData}
                  />
                }
              />
              <Route
                path="/ppe"
                element={
                  <PPECompliancePage
                    status={systemStatus}
                    incidents={incidents}
                    zones={zones}
                    onRefresh={fetchAllData}
                  />
                }
              />
              <Route
                path="/incidents"
                element={
                  <IncidentCenterPage
                    incidents={incidents}
                    onRefresh={fetchAllData}
                  />
                }
              />
              <Route
                path="/analytics"
                element={
                  <AnalyticsPage summary={analytics} />
                }
              />
              <Route
                path="/settings"
                element={
                  <SettingsPage
                    status={systemStatus}
                    onRefresh={fetchAllData}
                  />
                }
              />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
