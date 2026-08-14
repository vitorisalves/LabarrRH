import React from 'react';
import { Users, UserPlus, Search, Download, FileSpreadsheet, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Employee, TabType } from '../types';

interface HeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onOpenNewModal: () => void;
  activeTab: TabType;
  totalEmployees: number;
  employees: Employee[];
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncTime: string | null;
  onManualSync: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchTerm,
  onSearchChange,
  onOpenNewModal,
  activeTab,
  totalEmployees,
  employees,
  syncStatus,
  lastSyncTime,
  onManualSync,
}) => {
  const getTabTitle = () => {
    switch (activeTab) {
      case '710_711':
        return 'Unidade 710/711';
      case 'parkshopping':
        return 'Unidade Parkshopping';
      case 'freela':
        return 'Freela';
      case 'inativo':
        return 'Funcionários Inativos';
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Nome',
      'CPF',
      'Endereco',
      'CEP',
      'DataNascimento',
      'DataAdmissao',
      'Email',
      'ChavePix',
      'TipoChavePix',
      'ContatoEmergencia',
      'ParentescoEmergencia',
      'Aba',
      'Cargo',
      'DataDesligamento',
      'MotivoInativacao',
    ];

    const rows = employees.map((emp) => [
      emp.id,
      `"${emp.nome.replace(/"/g, '""')}"`,
      `"${emp.cpf}"`,
      `"${emp.endereco.replace(/"/g, '""')}"`,
      `"${emp.cep || ''}"`,
      emp.dataNascimento,
      emp.dataAdmissao,
      `"${emp.email}"`,
      `"${emp.chavePix}"`,
      emp.tipoChavePix || 'CPF',
      `"${emp.contatoEmergencia.replace(/"/g, '""')}"`,
      `"${emp.parentescoEmergencia.replace(/"/g, '""')}"`,
      emp.aba,
      `"${(emp.cargo || '').replace(/"/g, '""')}"`,
      emp.dataDesligamento || '',
      `"${(emp.motivoInativacao || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `rh_funcionarios_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 sticky top-0 z-20 shadow-lg shadow-black/20">
      <div className="w-full max-w-[98%] 2xl:max-w-[1800px] mx-auto px-2 sm:px-4 lg:px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center p-0.5 shadow-[0_0_20px_rgba(255,255,255,0.2)] border border-white/40 shrink-0 overflow-hidden">
              <img
                src="/labarr-logo.svg"
                alt="Labarr - Chocolate de Origem"
                className="w-full h-full object-contain rounded-full"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Labarr <span className="text-indigo-400">HR</span>
                </h1>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-semibold text-indigo-300 backdrop-blur-xs">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"></div>
                  <span>Controle de Funcionários</span>
                </div>
              </div>
              <p className="text-sm text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                <span>{totalEmployees} colaboradores</span>
                <span className="text-slate-600">•</span>
                <span className="text-indigo-300 font-medium">{getTabTitle()}</span>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={onManualSync}
                  title="Clique para sincronizar agora com a planilha Google Sheets"
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold">Google Sheets</span>
                  {syncStatus === 'syncing' ? (
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin ml-0.5" />
                  ) : syncStatus === 'synced' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />
                  ) : syncStatus === 'error' ? (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 ml-0.5" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />
                  )}
                  {lastSyncTime && (
                    <span className="text-xs text-emerald-400/90 font-normal">
                      ({lastSyncTime})
                    </span>
                  )}
                </button>
              </p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[260px] flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="search-employees-input"
                type="text"
                placeholder="Buscar nome, CPF ou e-mail..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 hover:bg-white/10 focus:bg-slate-900/90 border border-white/15 focus:border-indigo-400/70 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 backdrop-blur-md transition-all shadow-inner"
              />
            </div>

            {/* Sincronizar Google Sheets button */}
            <button
              id="btn-sync-sheets"
              onClick={onManualSync}
              disabled={syncStatus === 'syncing'}
              title="Sincronizar com o Google Sheets"
              className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl backdrop-blur-md transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-400 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {syncStatus === 'syncing' ? 'Sincronizando...' : 'Sincronizar'}
              </span>
            </button>

            {/* Export CSV (sheets compatible) */}
            <button
              id="btn-export-csv"
              onClick={handleExportCSV}
              title="Exportar base em formato CSV (compatível com Google Sheets)"
              className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/15 rounded-xl backdrop-blur-md hover:border-white/25 transition-all cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4 text-indigo-300" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>

            {/* Novo Funcionário */}
            <button
              id="btn-open-new-employee"
              onClick={onOpenNewModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-900/50 hover:shadow-indigo-800/60 border border-indigo-400/30 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Novo Funcionário</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
