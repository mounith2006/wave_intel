import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Upload,
  Activity,
  Binary,
  Cpu,
  FileText,
  Settings,
  HelpCircle,
  Radio
} from 'lucide-react';

export const Sidebar = () => {
  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/upload', label: 'Upload Signal', icon: Upload },
    { path: '/analyze', label: 'Analyze Signal', icon: Activity },
    { path: '/decode', label: 'Decode Signal', icon: Binary },
    { path: '/bitstream', label: 'Bit Stream', icon: Cpu },
    { path: '/reports', label: 'Reports', icon: FileText },
  ];

  return (
    <aside className="w-[230px] shrink-0 bg-[#071525] flex flex-col justify-between h-full min-h-[calc(100vh-57px)] p-4 select-none text-slate-300">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="px-3 py-2 flex items-center gap-2.5 border-b border-slate-800/80 pb-4">
          <div className="p-2 rounded-lg bg-blue-600 text-white font-bold">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="font-orbitron font-extrabold text-white text-base tracking-wider">
              WaveIntel
            </div>
            <div className="text-[10px] text-blue-400 font-semibold tracking-wide uppercase">
              Signal Analysis Platform
            </div>
          </div>
        </div>

        {/* Guided Workflow Nav */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#1677FF] text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-[#0E2238]'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Settings & Help */}
      <div className="pt-4 border-t border-slate-800/80 space-y-1">
        <button className="w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-[#0E2238] transition">
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
        <button className="w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-[#0E2238] transition">
          <HelpCircle className="w-4 h-4" />
          <span>Help & Documentation</span>
        </button>
      </div>
    </aside>
  );
};
