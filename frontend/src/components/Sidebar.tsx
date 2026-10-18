import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Radio,
  Film,
  MapPin,
  HardHat,
  AlertOctagon,
  BarChart3,
  Sliders,
  Server,
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

interface SidebarProps {
  openIncidentsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ openIncidentsCount }) => {
  // Collapsed by default (icon-only mode as requested)
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();

  // Keyboard shortcut listener: Ctrl+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsExpanded(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const sections = [
    {
      title: 'OPERATIONAL COMMAND',
      items: [
        { to: '/', label: 'Overview Console', icon: LayoutDashboard, shortcut: '1' },
        { to: '/monitoring', label: 'Live CCTV Matrix', icon: Radio, shortcut: '2' },
        { to: '/video-analysis', label: 'Video Ingest & Jobs', icon: Film, shortcut: '3' },
      ]
    },
    {
      title: 'PERIMETER & COMPLIANCE',
      items: [
        { to: '/zones', label: 'Zone Envelopes', icon: MapPin, shortcut: '4' },
        { to: '/ppe', label: 'PPE Inspections', icon: HardHat, shortcut: '5' },
        {
          to: '/incidents',
          label: 'Incident Logbook',
          icon: AlertOctagon,
          shortcut: '6',
          badge: openIncidentsCount > 0 ? openIncidentsCount : undefined
        },
        { to: '/analytics', label: 'Audit & Reports', icon: BarChart3, shortcut: '7' },
      ]
    },
    {
      title: 'ENGINE & HARDWARE',
      items: [
        { to: '/settings', label: 'Device & Models', icon: Sliders, shortcut: '8' },
      ]
    }
  ];

  return (
    <aside
      className={`${
        isExpanded ? 'w-60' : 'w-16'
      } transition-all duration-300 ease-in-out bg-[#101014] border-r border-zinc-800/80 flex flex-col justify-between shrink-0 select-none relative z-30`}
    >
      {/* Top Controls / Expand-Collapse Header */}
      <div>
        <div className="h-10 px-3 border-b border-zinc-800/80 flex items-center justify-between text-zinc-400">
          {isExpanded ? (
            <>
              <span className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase">
                COMMAND DOCK
              </span>
              <button
                onClick={() => setIsExpanded(false)}
                title="Collapse to icons (Ctrl+B)"
                className="p-1 rounded hover:bg-zinc-800 hover:text-amber-400 text-zinc-400 transition flex items-center space-x-1"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsExpanded(true)}
              title="Expand menu (Ctrl+B)"
              className="w-full flex items-center justify-center p-1 rounded hover:bg-zinc-800 hover:text-amber-400 text-zinc-400 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Sections */}
        <div className={`py-3 ${isExpanded ? 'px-3 space-y-5' : 'px-2 space-y-3'}`}>
          {sections.map((sec, secIdx) => (
            <div key={secIdx} className="space-y-1">
              {isExpanded ? (
                <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 font-mono">
                  {sec.title}
                </div>
              ) : (
                secIdx > 0 && <div className="border-t border-zinc-800/60 my-2 mx-1" />
              )}

              <nav className="space-y-1">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.to;

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => {
                        // When in icon-only mode, clicking opens/shows the full menu
                        if (!isExpanded) {
                          setIsExpanded(true);
                        }
                      }}
                      className={({ isActive: linkActive }) =>
                        `relative group flex items-center rounded transition text-xs font-medium ${
                          isExpanded
                            ? `justify-between px-3 py-2 ${
                                linkActive
                                  ? 'bg-zinc-800/90 text-zinc-100 font-semibold border-l-2 border-amber-500 pl-2.5'
                                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                              }`
                            : `justify-center py-2.5 w-full ${
                                linkActive
                                  ? 'bg-zinc-800/90 text-amber-400 border-l-2 border-amber-500'
                                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80'
                              }`
                        }`
                      }
                      title={!isExpanded ? `${item.label} (Alt+${item.shortcut})` : undefined}
                    >
                      {/* Icon */}
                      <div className="flex items-center space-x-2.5 relative">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive ? 'text-amber-400' : 'text-zinc-400 group-hover:text-zinc-200'
                          }`}
                        />
                        {isExpanded && <span>{item.label}</span>}

                        {/* Badge for Collapsed Mode */}
                        {!isExpanded && item.badge !== undefined && (
                          <span className="absolute -top-1.5 -right-2 px-1 min-w-[14px] h-[14px] flex items-center justify-center text-[9px] font-bold font-mono rounded-full bg-amber-500 text-zinc-950">
                            {item.badge}
                          </span>
                        )}
                      </div>

                      {/* Expanded Mode: Badges and Shortcut Key */}
                      {isExpanded && (
                        <div className="flex items-center space-x-1.5">
                          {item.badge !== undefined && (
                            <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono">
                              {item.badge}
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-600 font-mono hidden md:inline">
                            Alt+{item.shortcut}
                          </span>
                        </div>
                      )}

                      {/* Collapsed Mode Floating Flyout Tooltip */}
                      {!isExpanded && (
                        <div className="absolute left-full ml-2 px-2.5 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-mono font-medium whitespace-nowrap shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center space-x-2">
                          <span className="font-sans font-semibold">{item.label}</span>
                          <span className="text-[10px] text-amber-400 font-mono">Alt+{item.shortcut}</span>
                        </div>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </div>

      {/* Enterprise Node Diagnostic Footer */}
      <div className="p-2">
        {isExpanded ? (
          <div className="p-3 rounded bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-400 font-mono space-y-1.5">
            <div className="flex items-center justify-between text-zinc-300 font-semibold text-[10px]">
              <span className="flex items-center space-x-1.5">
                <Server className="w-3 h-3 text-zinc-400" />
                <span>NODE: ATX-SRV-01</span>
              </span>
              <span className="text-emerald-400 font-bold">STABLE</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <span>STORAGE WAL</span>
              <span>SYNCED</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <span>LATENCY</span>
              <span className="text-zinc-400">38 ms</span>
            </div>

            <button
              onClick={() => setIsExpanded(false)}
              className="w-full mt-2 pt-1.5 border-t border-zinc-800/80 text-[10px] text-zinc-500 hover:text-amber-400 flex items-center justify-center space-x-1 transition"
            >
              <ChevronLeft className="w-3 h-3" />
              <span>COLLAPSE RAIL</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsExpanded(true)}
            title="NODE: ATX-SRV-01 (STABLE) - Click to expand"
            className="w-full p-2.5 rounded bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center relative group transition"
          >
            <Server className="w-4 h-4 text-zinc-400 group-hover:text-amber-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute top-1.5 right-1.5" />

            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-300 text-[10px] font-mono whitespace-nowrap shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
              NODE: ATX-SRV-01 · <span className="text-emerald-400 font-bold">STABLE (38ms)</span>
            </div>
          </button>
        )}
      </div>
    </aside>
  );
};

