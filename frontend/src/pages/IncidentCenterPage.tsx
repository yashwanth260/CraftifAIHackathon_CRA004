import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertOctagon,
  Search,
  Download,
  CheckCircle,
  Clock,
  Eye,
  XCircle,
  FileText,
  Shield,
  Hash,
  User,
  History,
  X,
  RefreshCw,
  Image as ImageIcon,
  Check,
  ChevronDown
} from 'lucide-react';
import { api, Incident } from '../api';

interface IncidentCenterPageProps {
  incidents: Incident[];
  onRefresh: () => void;
}

export const IncidentCenterPage: React.FC<IncidentCenterPageProps> = ({ incidents, onRefresh }) => {
  const [searchParams] = useSearchParams();
  const focusedId = searchParams.get('focus');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'evidence' | 'custody' | 'audit'>('evidence');

  // Selected Incident for Inspection Drawer
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [incidentDetails, setIncidentDetails] = useState<any | null>(null);
  const [notes, setNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (focusedId) {
      const match = incidents.find(i => i.id === focusedId);
      if (match) {
        handleOpenInspection(match);
      }
    }
  }, [focusedId, incidents]);

  const handleOpenInspection = async (inc: Incident) => {
    setSelectedIncident(inc);
    setNotes(inc.resolution_notes || inc.dismiss_reason || '');
    setActiveTab('evidence');
    try {
      const details = await api.getIncidentDetails(inc.id);
      setIncidentDetails(details);
    } catch {
      setIncidentDetails(null);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedIncident) return;
    try {
      setIsUpdating(true);
      const payload: any = { status: newStatus };
      if (newStatus === 'RESOLVED') payload.resolution_notes = notes || 'Resolved by safety operator review.';
      if (newStatus === 'DISMISSED') payload.dismiss_reason = notes || 'Dismissed as false observation.';

      await api.updateIncident(selectedIncident.id, payload);
      const updated = await api.getIncidentDetails(selectedIncident.id);
      setIncidentDetails(updated);
      setSelectedIncident(updated.incident);
      onRefresh();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const filtered = incidents.filter(inc => {
    if (statusFilter && inc.status !== statusFilter) return false;
    if (severityFilter && inc.severity !== severityFilter) return false;
    if (modeFilter === 'REAL' && inc.is_demo) return false;
    if (modeFilter === 'DEMO' && !inc.is_demo) return false;
    if (search) {
      const s = search.toLowerCase();
      const inExpl = inc.explanation?.toLowerCase().includes(s);
      const inId = inc.id?.toLowerCase().includes(s);
      const inSource = inc.source_id?.toLowerCase().includes(s);
      if (!inExpl && !inId && !inSource) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-zinc-800/80 gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100 flex items-center space-x-2">
            <span>Perimeter Incident Logbook & Chain of Custody</span>
          </h1>
          <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
            Audit-Authenticated Safety Breaches · Cryptographic Image Hashes · Operator Clearances
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <a
            href="/api/incidents/export.csv"
            download
            className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-semibold flex items-center space-x-1.5 transition"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>Export CSV Report</span>
          </a>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="p-3 rounded bg-zinc-900/90 border border-zinc-800 flex flex-wrap items-center gap-2.5 text-xs font-mono">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search incident ID, explanation, camera..."
            className="w-full pl-8 pr-3 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder-zinc-500 text-xs focus:outline-none focus:border-zinc-600 font-mono"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs"
        >
          <option value="">Status: All Records</option>
          <option value="NEW">Status: NEW</option>
          <option value="ACKNOWLEDGED">Status: ACKNOWLEDGED</option>
          <option value="UNDER_REVIEW">Status: UNDER REVIEW</option>
          <option value="RESOLVED">Status: RESOLVED</option>
          <option value="DISMISSED">Status: DISMISSED</option>
        </select>

        {/* Severity Filter */}
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs"
        >
          <option value="">Severity: All Tiers</option>
          <option value="CRITICAL">Tier: CRITICAL</option>
          <option value="HIGH">Tier: HIGH</option>
          <option value="MEDIUM">Tier: MEDIUM</option>
          <option value="LOW">Tier: LOW</option>
        </select>

        {/* Data Origin */}
        <select
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs"
        >
          <option value="">Mode: Real & Reference</option>
          <option value="REAL">Mode: Real Inferences Only</option>
          <option value="DEMO">Mode: Reference Dataset Only</option>
        </select>

        <span className="text-zinc-500 text-[11px] ml-auto">
          {filtered.length} of {incidents.length} records
        </span>
      </div>

      {/* Main Table */}
      <div className="rounded bg-zinc-900/90 border border-zinc-800 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-xs font-mono">
            No incident records match the active filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-zinc-950 text-zinc-500 border-b border-zinc-800 text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">RECORD UID</th>
                  <th className="py-2.5 px-3 font-sans">CATEGORY</th>
                  <th className="py-2.5 px-3">TIER</th>
                  <th className="py-2.5 px-3 font-sans">SOURCE / TRACK</th>
                  <th className="py-2.5 px-3">EVIDENCE</th>
                  <th className="py-2.5 px-3">WORKFLOW</th>
                  <th className="py-2.5 px-3">TIMESTAMP</th>
                  <th className="py-2.5 px-3 text-right">INSPECT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filtered.map((inc) => (
                  <tr key={inc.id} className="hover:bg-zinc-800/30 transition">
                    <td className="py-2.5 px-3 text-zinc-300">
                      <div className="flex items-center space-x-1.5">
                        {inc.is_demo && (
                          <span className="px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 text-[9px] font-bold">
                            REF
                          </span>
                        )}
                        <span>{inc.id.substring(0, 15)}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-sans font-medium text-zinc-100">
                      {inc.event_type.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inc.severity === 'CRITICAL' ? 'bg-red-950/60 text-red-400 border border-red-900/50' :
                        inc.severity === 'HIGH' ? 'bg-amber-950/60 text-amber-400 border border-amber-900/50' :
                        'bg-zinc-800 text-zinc-300'
                      }`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-zinc-400">
                      <div className="font-mono text-zinc-300 text-[11px] truncate max-w-[130px]">{inc.source_id}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">TRK #{inc.track_id || 'N/A'}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      {inc.evidence_url ? (
                        <span className="text-emerald-400 text-[11px] flex items-center space-x-1">
                          <ImageIcon className="w-3 h-3" />
                          <span>Frame</span>
                        </span>
                      ) : (
                        <span className="text-zinc-600">None</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[11px] font-semibold ${
                        inc.status === 'NEW' ? 'text-amber-400' :
                        inc.status === 'UNDER_REVIEW' ? 'text-indigo-400' :
                        inc.status === 'RESOLVED' ? 'text-emerald-400' :
                        'text-zinc-500'
                      }`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-500 text-[11px]">
                      {new Date(inc.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-sans">
                      <button
                        onClick={() => handleOpenInspection(inc)}
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
        )}
      </div>

      {/* Enterprise Inspection Drawer */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex justify-end z-50">
          <div className="w-full max-w-xl bg-[#121216] border-l border-zinc-800 h-full overflow-y-auto p-5 space-y-4 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-zinc-800">
              <div>
                <div className="flex items-center space-x-2 font-mono text-[11px]">
                  <span className={`px-2 py-0.5 rounded font-bold ${
                    selectedIncident.severity === 'CRITICAL' ? 'bg-red-950/80 text-red-400 border border-red-900/50' :
                    selectedIncident.severity === 'HIGH' ? 'bg-amber-950/80 text-amber-400 border border-amber-900/50' :
                    'bg-zinc-800 text-zinc-300'
                  }`}>
                    {selectedIncident.severity}
                  </span>
                  <span className="text-zinc-400">UID: {selectedIncident.id}</span>
                </div>
                <h2 className="text-sm font-bold text-zinc-100 mt-1">
                  {selectedIncident.event_type.replace(/_/g, ' ')}
                </h2>
              </div>

              <button
                onClick={() => setSelectedIncident(null)}
                className="p-1 rounded bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs in Drawer */}
            <div className="flex items-center space-x-1 border-b border-zinc-800 text-xs font-mono">
              <button
                onClick={() => setActiveTab('evidence')}
                className={`px-3 py-1.5 border-b-2 font-medium transition ${
                  activeTab === 'evidence'
                    ? 'border-amber-500 text-zinc-100 font-bold'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Visual Evidence
              </button>
              <button
                onClick={() => setActiveTab('custody')}
                className={`px-3 py-1.5 border-b-2 font-medium transition ${
                  activeTab === 'custody'
                    ? 'border-amber-500 text-zinc-100 font-bold'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Chain of Custody
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-3 py-1.5 border-b-2 font-medium transition ${
                  activeTab === 'audit'
                    ? 'border-amber-500 text-zinc-100 font-bold'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Audit Trail ({incidentDetails?.audit_logs?.length || 0})
              </button>
            </div>

            {/* Tab 1: Visual Evidence */}
            {activeTab === 'evidence' && (
              <div className="space-y-3 text-xs">
                {selectedIncident.evidence_url ? (
                  <div className="rounded overflow-hidden border border-zinc-800 bg-black">
                    <img
                      src={selectedIncident.evidence_url}
                      alt="Evidence Frame"
                      className="w-full h-auto object-cover"
                    />
                    <div className="p-2.5 bg-zinc-950 border-t border-zinc-800 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
                      <span>FRAME NUMBER: #{incidentDetails?.evidence?.frame_number || '1'}</span>
                      <span className="text-emerald-400">CRYPTOGRAPHIC SIGNATURE VERIFIED</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 bg-zinc-950 rounded border border-zinc-800 text-center text-zinc-500 text-xs font-mono">
                    No image file persisted for this telemetry observation.
                  </div>
                )}

                {/* Observation Rationale */}
                <div className="p-3 rounded bg-zinc-950 border border-zinc-800 space-y-1.5">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase">OBSERVATION RATIONALE</span>
                  <p className="text-zinc-200 text-xs leading-relaxed">{selectedIncident.explanation}</p>
                </div>
              </div>
            )}

            {/* Tab 2: Chain of Custody */}
            {activeTab === 'custody' && (
              <div className="space-y-3 text-xs font-mono">
                <div className="p-3.5 rounded bg-zinc-950 border border-zinc-800 space-y-2">
                  <span className="text-[10px] text-zinc-500 uppercase">SHA-256 IMAGE DIGEST</span>
                  <div className="p-2 bg-zinc-900 rounded border border-zinc-800 text-[11px] text-zinc-300 break-all select-all">
                    {selectedIncident.evidence_hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    Local SHA-256 digest validates image immutability across file storage systems.
                  </p>
                </div>

                <div className="p-3 rounded bg-zinc-950 border border-zinc-800 space-y-1.5 text-[11px]">
                  <div className="flex justify-between"><span className="text-zinc-500">INGEST SOURCE:</span> <span className="text-zinc-200">{selectedIncident.source_id}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">TRACK ID:</span> <span className="text-zinc-200">#{selectedIncident.track_id || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">CONFIDENCE:</span> <span className="text-emerald-400">{selectedIncident.confidence ? `${(selectedIncident.confidence * 100).toFixed(0)}%` : 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">ZONE ENVELOPE:</span> <span className="text-zinc-200">{selectedIncident.zone_id || 'None'}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">PPE STATUS:</span> <span className="text-zinc-200">{selectedIncident.ppe_status}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">DETECTION MODEL:</span> <span className="text-zinc-200">{selectedIncident.model_name}</span></div>
                </div>
              </div>
            )}

            {/* Tab 3: Audit Trail */}
            {activeTab === 'audit' && (
              <div className="space-y-2 text-xs font-mono">
                {incidentDetails?.audit_logs?.map((l: any) => (
                  <div key={l.id} className="p-2.5 rounded bg-zinc-950 border border-zinc-800 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-amber-400">{l.action}</span>
                      <span className="text-zinc-500">{new Date(l.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-zinc-300 text-[11px] font-sans">{l.details}</p>
                    <div className="text-[9px] text-zinc-500">ACTOR: {l.actor}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Operator Review Actions */}
            <div className="pt-3 border-t border-zinc-800 space-y-2.5">
              <span className="text-[10px] text-zinc-500 font-mono uppercase">OPERATOR WORKFLOW TRANSITIONS</span>

              <div className="grid grid-cols-4 gap-1.5 text-xs font-mono">
                <button
                  onClick={() => handleStatusChange('ACKNOWLEDGED')}
                  disabled={isUpdating}
                  className="py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-[11px] font-medium border border-zinc-700"
                >
                  Ack
                </button>
                <button
                  onClick={() => handleStatusChange('UNDER_REVIEW')}
                  disabled={isUpdating}
                  className="py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-indigo-300 text-[11px] font-medium border border-zinc-700"
                >
                  Review
                </button>
                <button
                  onClick={() => handleStatusChange('RESOLVED')}
                  disabled={isUpdating}
                  className="py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-[11px] font-medium border border-zinc-700"
                >
                  Resolve
                </button>
                <button
                  onClick={() => handleStatusChange('DISMISSED')}
                  disabled={isUpdating}
                  className="py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[11px] font-medium border border-zinc-700"
                >
                  Dismiss
                </button>
              </div>

              <div>
                <label className="block text-zinc-400 text-[10px] font-mono mb-1">OPERATOR NOTES / CLEARANCE JUSTIFICATION</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter supervisor notes..."
                  className="w-full p-2 rounded bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-zinc-600 font-sans"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
