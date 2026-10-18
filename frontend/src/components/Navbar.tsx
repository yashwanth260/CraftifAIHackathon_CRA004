import React from 'react';
import {
  Shield,
  RefreshCw,
  Building2,
  Cpu,
  Database,
  Radio,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  UserCheck
} from 'lucide-react';
import { SystemStatus } from '../api';

interface NavbarProps {
  status: SystemStatus | null;
  onRefresh: () => void;
  onToggleDemo: () => void;
  isDemoLoading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  status,
  onRefresh,
  onToggleDemo,
  isDemoLoading
}) => {
  const isPipeConnected = status?.pipegen_status === 'CONNECTED';

  return (
    <header className="h-14 bg-[#101014] border-b border-zinc-800/80 flex items-center justify-between px-5 sticky top-0 z-40 select-none">
      {/* Brand & Facility Selector */}
      <div className="flex items-center space-x-5">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-100 shadow-sm">
            <Shield className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm tracking-tight text-zinc-100">SENTINEL</span>
              <span className="text-[10px] text-zinc-500 font-mono tracking-wider">VMS v2.4</span>
            </div>
            <div className="text-[11px] text-zinc-400 font-mono">Vision Management System</div>
          </div>
        </div>

        <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

        {/* Facility Location Selector */}
        <div className="hidden md:flex items-center space-x-2 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:border-zinc-700 cursor-pointer transition">
          <Building2 className="w-3.5 h-3.5 text-zinc-400" />
          <span className="font-medium">Austin Facility · Bay 4</span>
          <ChevronDown className="w-3 h-3 text-zinc-500" />
        </div>
      </div>

      {/* Center Operational Telemetry Pills */}
      <div className="hidden xl:flex items-center space-x-2 text-xs font-mono">
        {/* Core Status */}
        <div className="flex items-center space-x-2 px-3 py-1 rounded bg-zinc-900/90 border border-zinc-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-zinc-400">Core:</span>
          <span className="text-zinc-200 font-medium">{status?.backend_status || 'ONLINE'}</span>
        </div>

        {/* Inference Device */}
        <div className="flex items-center space-x-2 px-3 py-1 rounded bg-zinc-900/90 border border-zinc-800">
          <Cpu className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-zinc-400">Device:</span>
          <span className="text-zinc-200 truncate max-w-[130px]" title={status?.inference_device}>
            {status?.inference_device || 'CPU Host'}
          </span>
        </div>

        {/* Vision Model */}
        <div className="flex items-center space-x-2 px-3 py-1 rounded bg-zinc-900/90 border border-zinc-800">
          <span className="text-zinc-400">Model:</span>
          <span className="text-zinc-200 font-medium">{status?.person_model_name || 'yolov8n'}</span>
          <span className="text-[10px] text-emerald-400">({status?.person_model_status || 'READY'})</span>
        </div>

        {/* PipeGen Bridge Link */}
        <div className={`flex items-center space-x-2 px-3 py-1 rounded border ${
          isPipeConnected
            ? 'bg-emerald-950/20 border-emerald-800/50 text-emerald-300'
            : 'bg-zinc-900/90 border-zinc-800 text-amber-400'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isPipeConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <span>Edge Bridge: {isPipeConnected ? 'Linked' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Right Controls: Shift, Test Mode Toggle & Reload */}
      <div className="flex items-center space-x-3 text-xs">
        {/* Shift Badge */}
        <div className="hidden sm:flex items-center space-x-1.5 text-zinc-400 font-mono text-[11px] px-2.5 py-1 bg-zinc-900/60 rounded border border-zinc-800/80">
          <UserCheck className="w-3.5 h-3.5 text-zinc-400" />
          <span>Shift Day-B</span>
        </div>

        {/* Data Mode Switch (Demo/Test vs Live Real) */}
        <button
          onClick={onToggleDemo}
          disabled={isDemoLoading}
          className={`px-3 py-1.5 rounded text-xs font-medium flex items-center space-x-1.5 transition ${
            status?.demo_mode_active
              ? 'bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/40'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
          }`}
          title="Toggle reference test data sets"
        >
          {isDemoLoading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : status?.demo_mode_active ? (
            <>
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Clear Sample Records</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-zinc-400" />
              <span>Load Reference Data</span>
            </>
          )}
        </button>

        {/* Reload telemetry */}
        <button
          onClick={onRefresh}
          className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition"
          title="Sync Telemetry"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
