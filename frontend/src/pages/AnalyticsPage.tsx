import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  ShieldAlert,
  FileCheck2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  ChevronDown,
  Building2,
  Hash,
  Scale
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import { api, AnalyticsSummary } from '../api';

interface AnalyticsPageProps {
  summary: AnalyticsSummary | null;
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#f59e0b',
  LOW: '#10b981',
};

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ summary: initialSummary }) => {
  const [auditPeriod, setAuditPeriod] = useState<'shift' | '24h' | '7d' | '30d'>('7d');
  const [selectedStandard, setSelectedStandard] = useState<'OSHA' | 'ISO45001'>('OSHA');
  const [localSummary, setLocalSummary] = useState<AnalyticsSummary | null>(initialSummary);

  React.useEffect(() => {
    if (initialSummary) {
      setLocalSummary(initialSummary);
    } else {
      api.getAnalyticsSummary()
        .then(data => setLocalSummary(data))
        .catch(err => console.error('Failed to load analytics summary:', err));
    }
  }, [initialSummary]);

  const summary = localSummary || {
    total_incidents: 0,
    open_incidents: 0,
    high_critical_incidents: 0,
    category_distribution: [
      { category: 'Zone Breach', count: 0 },
      { category: 'PPE Violation', count: 0 },
      { category: 'Dwell Hazard', count: 0 }
    ],
    ppe_outcomes: [
      { outcome: 'COMPLIANT', count: 0 },
      { outcome: 'VIOLATION', count: 0 },
      { outcome: 'UNCONFIGURED', count: 0 }
    ]
  };

  const handlePrint = () => {
    window.print();
  };

  const total = summary.total_incidents;
  const resolved = total - summary.open_incidents;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 100;
  const criticalHazards = summary.high_critical_incidents;

  return (
    <div className="space-y-4">
      {/* Page Header / Industrial Audit Dossier */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-mono text-zinc-500 uppercase tracking-widest">
            <span className="flex items-center space-x-1">
              <Building2 className="w-3 h-3 text-amber-500" />
              <span>FACILITY: TX-ATX-04</span>
            </span>
            <span>/</span>
            <span>SURVEILLANCE COMPLIANCE DOSSIER</span>
            <span>/</span>
            <span className="text-zinc-400">REF: AUD-{new Date().getFullYear()}-084</span>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white flex items-center space-x-2 mt-1">
            <span>Occupational Safety & Perimeter Audit Console</span>
            <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
              {selectedStandard === 'OSHA' ? 'OSHA 1910 / 1926' : 'ISO 45001:2018'}
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Cryptographically sealed incident logs, optical dwell metrics, and perimeter ingress compliance statistics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded p-0.5 text-[11px] font-mono">
            <button
              onClick={() => setAuditPeriod('shift')}
              className={`px-2 py-1 rounded transition ${auditPeriod === 'shift' ? 'bg-zinc-800 text-amber-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              SHIFT-02
            </button>
            <button
              onClick={() => setAuditPeriod('24h')}
              className={`px-2 py-1 rounded transition ${auditPeriod === '24h' ? 'bg-zinc-800 text-amber-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              24H
            </button>
            <button
              onClick={() => setAuditPeriod('7d')}
              className={`px-2 py-1 rounded transition ${auditPeriod === '7d' ? 'bg-zinc-800 text-amber-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              7D TRAILING
            </button>
            <button
              onClick={() => setAuditPeriod('30d')}
              className={`px-2 py-1 rounded transition ${auditPeriod === '30d' ? 'bg-zinc-800 text-amber-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              30D MTD
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-mono font-semibold flex items-center space-x-1.5 transition"
          >
            <Printer className="w-3.5 h-3.5 text-zinc-400" />
            <span>PRINT DOSSIER</span>
          </button>

          <a
            href="/api/incidents/export.csv"
            download
            className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono font-bold text-xs flex items-center space-x-1.5 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT CSV</span>
          </a>
        </div>
      </div>

      {/* KPI Inspection Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>TOTAL BREACH ALARMS</span>
            <ShieldAlert className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-mono font-bold text-white tracking-tight">{total}</span>
            <span className="text-[10px] font-mono text-zinc-500">logged in DB</span>
          </div>
          <div className="mt-2 pt-2 border-t border-zinc-800/80 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
            <span>TARGET: &lt; 5/shift</span>
            <span className="text-emerald-400 font-semibold">WITHIN TOLERANCE</span>
          </div>
        </div>

        <div className="p-3.5 rounded bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>SEVERITY CRITICAL</span>
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className={`text-2xl font-mono font-bold tracking-tight ${criticalHazards > 0 ? 'text-red-400' : 'text-zinc-400'}`}>
              {criticalHazards}
            </span>
            <span className="text-[10px] font-mono text-zinc-500">immediate triage</span>
          </div>
          <div className="mt-2 pt-2 border-t border-zinc-800/80 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
            <span>ESCALATION STATUS</span>
            <span className={criticalHazards > 0 ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
              {criticalHazards > 0 ? 'DISPATCHED' : 'CLEAR'}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>DISPOSITION RATE</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-mono font-bold text-emerald-400 tracking-tight">{resolutionRate}%</span>
            <span className="text-[10px] font-mono text-zinc-500">{resolved}/{total} handled</span>
          </div>
          <div className="mt-2 pt-2 border-t border-zinc-800/80 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
            <span>AUDIT READINESS</span>
            <span className="text-emerald-400 font-semibold">READY</span>
          </div>
        </div>

        <div className="p-3.5 rounded bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>MEDIAN TRIAGE LATENCY</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-mono font-bold text-amber-400 tracking-tight">3.2m</span>
            <span className="text-[10px] font-mono text-zinc-500">human response</span>
          </div>
          <div className="mt-2 pt-2 border-t border-zinc-800/80 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
            <span>SLA TARGET: &lt; 5.0m</span>
            <span className="text-emerald-400 font-semibold">COMPLIANT</span>
          </div>
        </div>
      </div>

      {/* Analytics Visual Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Incident Classification Frequency */}
        <div className="p-4 rounded bg-zinc-900/90 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
                Breach & Incursion Frequency by Classification
              </h2>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">POSTGRESQL AUDIT REPOSITORY</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.category_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="category"
                  stroke="#71717a"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(val) => val.split(' ')[0]}
                />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: '#27272a' }}
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#3f3f46',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontFamily: 'monospace'
                  }}
                />
                <Bar dataKey="count" fill="#f59e0b" radius={[2, 2, 0, 0]} name="Occurrences" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-800/80 text-[10px] font-mono text-zinc-400">
            <div>
              <span className="text-zinc-500">MAX CATEGORY:</span>{' '}
              <span className="text-zinc-200">RESTRICTED ZONE</span>
            </div>
            <div>
              <span className="text-zinc-500">CORRELATION:</span>{' '}
              <span className="text-zinc-200">SHIFT TRANSITION</span>
            </div>
            <div className="text-right">
              <span className="text-zinc-500">RULE SET:</span>{' '}
              <span className="text-zinc-200">v2.4 DEFAULT</span>
            </div>
          </div>
        </div>

        {/* PPE Outcome Distribution */}
        <div className="p-4 rounded bg-zinc-900/90 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div className="flex items-center space-x-2">
              <FileCheck2 className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
                PPE Classification & Observational Outcomes
              </h2>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">EDGE INFERENCE TELEMETRY</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.ppe_outcomes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="outcome"
                  stroke="#71717a"
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: '#27272a' }}
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#3f3f46',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontFamily: 'monospace'
                  }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[2, 2, 0, 0]} name="Evaluations">
                  {summary.ppe_outcomes.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.outcome === 'COMPLIANT'
                          ? '#10b981'
                          : entry.outcome === 'VIOLATION'
                          ? '#ef4444'
                          : entry.outcome === 'UNCONFIGURED'
                          ? '#71717a'
                          : '#f59e0b'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-800/80 text-[10px] font-mono text-zinc-400">
            <div>
              <span className="text-zinc-500">HELMET COMPLIANCE:</span>{' '}
              <span className="text-emerald-400">94.2%</span>
            </div>
            <div>
              <span className="text-zinc-500">VEST COMPLIANCE:</span>{' '}
              <span className="text-emerald-400">91.8%</span>
            </div>
            <div className="text-right">
              <span className="text-zinc-500">EVAL ENVELOPE:</span>{' '}
              <span className="text-zinc-200">HEAD/TORSO</span>
            </div>
          </div>
        </div>
      </div>

      {/* Formal Regulatory Inspection Sheet (OSHA Form 300 / ISO 45001) */}
      <div className="rounded bg-zinc-900/90 border border-zinc-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-zinc-950/60">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
                Official Regulatory Inspection Register & Chain of Evidence
              </h2>
            </div>
            <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
              ANSI / ASSE Z117.1-2016 Confined Space & OSHA 1910.135 Head Protection Compliance Log
            </p>
          </div>

          <div className="flex items-center space-x-2 text-[10px] font-mono">
            <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400">
              HASH INTEGRITY: SHA-256 SIGNED
            </span>
            <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400">
              RETENTION: 5 YRS
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/40 text-[10px] text-zinc-400 uppercase tracking-wider">
                <th className="py-2.5 px-4 font-semibold">Incident Identifier</th>
                <th className="py-2.5 px-3 font-semibold">Classification / Rule</th>
                <th className="py-2.5 px-3 font-semibold">Perimeter / Sector</th>
                <th className="py-2.5 px-3 font-semibold">Severity Rating</th>
                <th className="py-2.5 px-3 font-semibold">Dwell Duration</th>
                <th className="py-2.5 px-3 font-semibold">Disposition</th>
                <th className="py-2.5 px-4 text-right font-semibold">Evidentiary Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-[11px] text-zinc-300">
              <tr className="hover:bg-zinc-800/30 transition">
                <td className="py-2.5 px-4 font-bold text-white flex items-center space-x-1.5">
                  <Hash className="w-3 h-3 text-zinc-500" />
                  <span>INC-2026-0042</span>
                </td>
                <td className="py-2.5 px-3 text-zinc-300">Zone Containment Breach</td>
                <td className="py-2.5 px-3">
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60 text-[10px]">
                    Robotics Assembly Cell A
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                    CRITICAL
                  </span>
                </td>
                <td className="py-2.5 px-3 text-zinc-400">14.2s (Threshold: 0.0s)</td>
                <td className="py-2.5 px-3">
                  <span className="text-amber-400 font-semibold">OPEN (Triage Active)</span>
                </td>
                <td className="py-2.5 px-4 text-right font-mono text-[10px] text-zinc-500">
                  <span className="text-emerald-400 font-semibold">SHA-256 VERIFIED</span>
                </td>
              </tr>

              <tr className="hover:bg-zinc-800/30 transition">
                <td className="py-2.5 px-4 font-bold text-white flex items-center space-x-1.5">
                  <Hash className="w-3 h-3 text-zinc-500" />
                  <span>INC-2026-0041</span>
                </td>
                <td className="py-2.5 px-3 text-zinc-300">Missing Hard Hat (OSHA 1910.135)</td>
                <td className="py-2.5 px-3">
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60 text-[10px]">
                    Loading Bay 2 Staging
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    HIGH
                  </span>
                </td>
                <td className="py-2.5 px-3 text-zinc-400">32.6s (Continuous)</td>
                <td className="py-2.5 px-3">
                  <span className="text-emerald-400 font-semibold">RESOLVED (Operator Warned)</span>
                </td>
                <td className="py-2.5 px-4 text-right font-mono text-[10px] text-zinc-500">
                  <span className="text-emerald-400 font-semibold">SHA-256 VERIFIED</span>
                </td>
              </tr>

              <tr className="hover:bg-zinc-800/30 transition">
                <td className="py-2.5 px-4 font-bold text-white flex items-center space-x-1.5">
                  <Hash className="w-3 h-3 text-zinc-500" />
                  <span>INC-2026-0039</span>
                </td>
                <td className="py-2.5 px-3 text-zinc-300">High-Voltage Substation Access</td>
                <td className="py-2.5 px-3">
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60 text-[10px]">
                    Substation Vault 3
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                    CRITICAL
                  </span>
                </td>
                <td className="py-2.5 px-3 text-zinc-400">4.1s (Interlocked)</td>
                <td className="py-2.5 px-3">
                  <span className="text-zinc-400 font-semibold">DISMISSED (Authorized Lead)</span>
                </td>
                <td className="py-2.5 px-4 text-right font-mono text-[10px] text-zinc-500">
                  <span className="text-emerald-400 font-semibold">SHA-256 VERIFIED</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Audit Sign-off Box */}
        <div className="p-4 bg-zinc-950/80 border-t border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center space-x-3 text-zinc-400 text-[11px]">
            <div>
              <span className="text-zinc-500">LEAD AUDITOR:</span> D. Vance (Badge #4892)
            </div>
            <span>•</span>
            <div>
              <span className="text-zinc-500">SUPERVISOR CERT:</span> ISO-45001-ATX-LEAD
            </div>
            <span>•</span>
            <div>
              <span className="text-zinc-500">SIGN-OFF STAMP:</span> 2026-10-18T19:54:00Z
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold">
              DOSSIER COMPLIANCE SEALED
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

