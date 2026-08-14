import React from 'react';
import { Building2, Store, UserX, Clock } from 'lucide-react';
import { TabType } from '../types';

interface TabNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  counts: {
    '710_711': number;
    parkshopping: number;
    freela: number;
    inativo: number;
  };
}

export const TabNav: React.FC<TabNavProps> = ({
  activeTab,
  onTabChange,
  counts,
}) => {
  const tabs: { id: TabType; label: string; icon: React.ReactNode; activeColor: string; activeBadge: string; activeGlow: string }[] = [
    {
      id: '710_711',
      label: '710/711',
      icon: <Building2 className="w-4 h-4" />,
      activeColor: 'text-emerald-300 border-emerald-400/60 bg-emerald-500/15',
      activeBadge: 'bg-emerald-500/25 text-emerald-200 border-emerald-400/30',
      activeGlow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]',
    },
    {
      id: 'parkshopping',
      label: 'Parkshopping',
      icon: <Store className="w-4 h-4" />,
      activeColor: 'text-indigo-300 border-indigo-400/60 bg-indigo-500/15',
      activeBadge: 'bg-indigo-500/25 text-indigo-200 border-indigo-400/30',
      activeGlow: 'shadow-[0_0_15px_rgba(99,102,241,0.25)]',
    },
    {
      id: 'freela',
      label: 'Freela',
      icon: <Clock className="w-4 h-4" />,
      activeColor: 'text-amber-300 border-amber-400/60 bg-amber-500/15',
      activeBadge: 'bg-amber-500/25 text-amber-200 border-amber-400/30',
      activeGlow: 'shadow-[0_0_15px_rgba(245,158,11,0.25)]',
    },
    {
      id: 'inativo',
      label: 'Inativo',
      icon: <UserX className="w-4 h-4" />,
      activeColor: 'text-slate-200 border-slate-400/60 bg-white/10',
      activeBadge: 'bg-white/15 text-slate-200 border-white/20',
      activeGlow: 'shadow-[0_0_15px_rgba(255,255,255,0.1)]',
    },
  ];

  return (
    <div className="border-b border-white/10 bg-white/5 backdrop-blur-md rounded-t-2xl">
      <div className="flex gap-2 px-4 sm:px-6 pt-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-button-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2.5 py-3 px-4 font-medium text-sm border-b-2 rounded-t-xl transition-all cursor-pointer ${
                isActive
                  ? `${tab.activeColor} ${tab.activeGlow} font-semibold backdrop-blur-md`
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  isActive
                    ? tab.activeBadge
                    : 'bg-white/5 text-slate-400 border-white/10'
                }`}
              >
                {counts[tab.id]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
