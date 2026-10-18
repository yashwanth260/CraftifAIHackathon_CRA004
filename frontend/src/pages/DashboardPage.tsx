import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  AlertTriangle,
  HardHat,
  Eye,
  CheckCircle2,
  Clock,
  Activity,
  ArrowRight,
  TrendingUp,
  AlertOctagon,
  Camera,
  MapPin,
  ExternalLink,
  ChevronRight,
  Sliders,
  Check
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { AnalyticsSummary, Incident } from '../api';

interface DashboardPageProps {
  summary: AnalyticsSummary | null;
  recentIncidents: Incident[];
  onRefresh: () => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#10b981',
};

export const DashboardPage: React.FC<DashboardPageProps> = ({
  summary,
  recentIncidents,
  onRefresh
}) => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<'24h' | '7d'>('7d');

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 py-24 text-xs font-mono">
        <Activity className="w-4 h-4 animate-spin mr-2 text-zinc-400" />
        <span>Synchronizing telemetry stream...</span>
      </div>
    );
  }

  const ppeComplianceRate = summary.total_incidents > 0
    ? Math.max(0, 100 - ((summary.ppe_violations / summary.total_incidents) * 100)).toFixed(1)
    : '100.0';

  return (
    <div className="space-y-5">
      {/* Header Operational Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-zinc-800/80 gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100 flex items-center space-x-2">
            <span>Perimeter Operations Console</span>
          </h1>
          <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
            Surveillance Stream Ingest · Zone Violation Telemetry · PPE Verification Log
          </div>
        </div>

        {/* Quick Shift Health Indicators */}
        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
            ACTIVE ZONES: <span className="font-bold text-zinc-100">{summary.zone_violations > 0 ? '3 ENVELOPES' : '2 ENVELOPES'}</span>
          </div>
          <div className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
            SHIFT DEFCON: <span className="font-bold text-amber-400">GUARDED</span>
          </div>
          <div className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
            PPE SCORE: <span className="font-bold text-emerald-400">{ppeComplianceRate}%</span>
          </div>
        </div>
      </div>

      {/* Top High-Density Metric Strip (4 Pods) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Active Open Incidents */}
        <div className="p-3.5 rounded bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span>UNRESOLVED ALARMS</span>
            <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-zinc-100">{summary.open_incidents}</span>
            <span className="text-[11px] text-zinc-500 font-mono">of {summary.total_incidents} total</span>
          </div>
          <div className="text-[10px] text-amber-400/90 font-mono mt-1">
            {summary.awaiting_review} awaiting initial review
          </div>
        </div>

        {/* Critical Hazards */}
        <div className="p-3.5 rounded bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span>HIGH & CRITICAL</span>
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-red-400">{summary.high_critical_incidents}</span>
            <span className="text-[11px] text-zinc-500 font-mono">priority tier</span>
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">
            Requires immediate supervisor clearance
          </div>
        </div>

        {/* Zone Intrusions */}
        <div className="p-3.5 rounded bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span>PERIMETER INTRUSIONS</span>
            <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-zinc-100">{summary.zone_violations}</span>
            <span className="text-[11px] text-zinc-500 font-mono">dwell breaches</span>
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">
            Bottom-center foot contact verification
          </div>
        </div>

        {/* PPE Non-Compliance */}
        <div className="p-3.5 rounded bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span>PPE NON-COMPLIANCE</span>
            <HardHat className="w-3.5 h-3.5 text-yellow-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-zinc-100">{summary.ppe_violations}</span>
            <span className="text-[11px] text-zinc-500 font-mono">flagged events</span>
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">
            {summary.uncertain_observations} marked uncertain / occluded
          </div>
        </div>
      </div>

      {/* Main Two-Column Tactical Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Velocity Chart + Active Zones Telemetry */}
        <div className="lg:col-span-2 space-y-4">
          {/* Incident Timeline Card */}
          <div className="p-4 rounded bg-zinc-900/90 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-semibold text-zinc-200">Incident Velocity & Frequency (7-Day Rolling)</span>
              </div>

              <div className="flex items-center space-x-1 bg-zinc-950 p-0.5 rounded border border-zinc-800 text-[10px] font-mono">
                <button
                  onClick={() => setTimeRange('24h')}
                  className={`px-2 py-0.5 rounded ${timeRange === '24h' ? 'bg-zinc-800 text-zinc-100 font-bold' : 'text-zinc-500'}`}
                >
                  24H
                </button>
                <button
                  onClick={() => setTimeRange('7d')}
                  className={`px-2 py-0.5 rounded ${timeRange === '7d' ? 'bg-zinc-800 text-zinc-100 font-bold' : 'text-zinc-500'}`}
                >
                  7D
                </button>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary.trends}>
                  <defs>
                    <linearGradient id="areaViolations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="areaPPE" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#52525b" fontSize={10} fontFamily="monospace" />
                  <YAxis stroke="#52525b" fontSize={10} fontFamily="monospace" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}
                  />
                  <Area type="monotone" dataKey="violations" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#areaViolations)" name="Zone Intrusions" />
                  <Area type="monotone" dataKey="ppe_incidents" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#areaPPE)" name="PPE Violations" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Calibrated Restricted Zones Overview */}
          <div className="p-4 rounded bg-zinc-900/90 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80 text-xs">
              <div className="flex items-center space-x-2 text-zinc-300 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                <span>Active Safety Perimeter Envelopes</span>
              </div>
              <button
                onClick={() => navigate('/zones')}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center space-x-1"
              >
                <span>Configure Zones</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded bg-zinc-950 border border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-200">Robotic Cell #3 Perimeter</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-950/40 text-red-400 border border-red-900/50">
                    CRITICAL
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 font-mono">Dwell: 1.5s · Mandatory: Hard Hat, Hi-Vis Vest</div>
                <div className="flex items-center justify-between pt-1 text-[10px] text-zinc-500 font-mono">
                  <span>LAST EVENT: 14m ago</span>
                  <span className="text-emerald-400">MONITORED</span>
                </div>
              </div>

              <div className="p-3 rounded bg-zinc-950 border border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-200">Forklift Transit Crossing</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/40 text-amber-400 border border-amber-900/50">
                    HIGH
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 font-mono">Dwell: 2.0s · Mandatory: Hi-Vis Vest</div>
                <div className="flex items-center justify-between pt-1 text-[10px] text-zinc-500 font-mono">
                  <span>LAST EVENT: 1h 20m ago</span>
                  <span className="text-emerald-400">MONITORED</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Priority Alarm Queue & Distribution */}
        <div className="space-y-4">
          {/* Priority Alarm Action Queue */}
          <div className="p-4 rounded bg-zinc-900/90 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80 text-xs">
              <span className="font-semibold text-zinc-200">Priority Review Queue</span>
              <span className="text-[10px] font-mono text-zinc-500">Live Ingest</span>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {recentIncidents.slice(0, 5).map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => navigate(`/incidents?focus=${inc.id}`)}
                  className="p-3 rounded bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 cursor-pointer transition space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                      inc.severity === 'CRITICAL' ? 'bg-red-950/60 text-red-400 border border-red-900/60' :
                      inc.severity === 'HIGH' ? 'bg-amber-950/60 text-amber-400 border border-amber-900/60' :
                      'bg-zinc-800 text-zinc-300'
                    }`}>
                      {inc.severity}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {new Date(inc.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="font-medium text-zinc-200 text-[11px] truncate">
                    {inc.event_type.replace(/_/g, ' ')}
                  </div>
                  <p className="text-[10px] text-zinc-400 line-clamp-1">
                    {inc.explanation}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/incidents')}
              className="w-full py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition text-center"
            >
              Open Full Incident Logbook
            </button>
          </div>

          {/* Severity Breakdown Donut */}
          <div className="p-4 rounded bg-zinc-900/90 border border-zinc-800 space-y-2">
            <div className="text-xs font-semibold text-zinc-300">Severity Distribution</div>
            <div className="h-36 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.severity_distribution}
                    dataKey="count"
                    nameKey="severity"
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={2}
                  >
                    {summary.severity_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.severity] || '#52525b'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '4px', fontSize: '10px', fontFamily: 'monospace' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-zinc-400 pt-1 border-t border-zinc-800">
              {summary.severity_distribution.map(s => (
                <div key={s.severity} className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[s.severity] || '#52525b' }} />
                  <span>{s.severity}: {s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Table: Surveillance Audit Logbook */}
      <div className="p-4 rounded bg-zinc-900/90 border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80 text-xs">
          <div>
            <span className="font-semibold text-zinc-200">Surveillance Incident Logbook</span>
            <span className="text-[11px] text-zinc-500 font-mono ml-2">Recent verified captures</span>
          </div>
          <button
            onClick={() => navigate('/incidents')}
            className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center space-x-1"
          >
            <span>Full Logbook</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-950 text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="py-2 px-3">RECORD ID</th>
                <th className="py-2 px-3">CATEGORY</th>
                <th className="py-2 px-3">SEVERITY</th>
                <th className="py-2 px-3">CAMERA SOURCE</th>
                <th className="py-2 px-3">PPE STATUS</th>
                <th className="py-2 px-3">STATUS</th>
                <th className="py-2 px-3">TIMESTAMP</th>
                <th className="py-2 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {recentIncidents.slice(0, 5).map((inc) => (
                <tr key={inc.id} className="hover:bg-zinc-800/40 transition">
                  <td className="py-2.5 px-3 text-zinc-300">
                    <div className="flex items-center space-x-1.5">
                      {inc.is_demo && (
                        <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 text-[9px] font-bold">
                          REF
                        </span>
                      )}
                      <span>{inc.id.substring(0, 14)}...</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-zinc-200 font-sans font-medium">
                    {inc.event_type.replace(/_/g, ' ')}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      inc.severity === 'CRITICAL' ? 'bg-red-950/60 text-red-400 border border-red-900/60' :
                      inc.severity === 'HIGH' ? 'bg-amber-950/60 text-amber-400 border border-amber-900/60' :
                      'bg-zinc-800 text-zinc-300'
                    }`}>
                      {inc.severity}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-zinc-400 truncate max-w-[130px]">
                    {inc.source_id}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-zinc-300 font-sans">{inc.ppe_status}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-zinc-300">{inc.status}</span>
                  </td>
                  <td className="py-2.5 px-3 text-zinc-500">
                    {new Date(inc.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-sans">
                    <button
                      onClick={() => navigate(`/incidents?focus=${inc.id}`)}
                      className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
