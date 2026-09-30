import React, { useState, useMemo, useEffect } from 'react';
import { Building2, Store, Download, RefreshCw, Settings2 } from 'lucide-react';
import { Employee } from '../types';
import { UnidadeVale, ValeCalculado } from '../types/vale';
import { calcularValeFuncionario } from '../utils/valeCalculations';
import { getAjuste, saveAjuste, getAllAjustes } from '../services/valesLocalStore';
import { syncValesToSheets, fetchValorVAConfig, saveValorVAConfig } from '../services/valesService';
import { ValeAjusteModal } from './ValeAjusteModal';

interface ValesViewProps {
  employees: Employee[];
  onUpdateEmployee: (id: string, valorVT: number) => void;
}

function currentMesAno(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export const ValesView: React.FC<ValesViewProps> = ({ employees, onUpdateEmployee }) => {
  const [unidade, setUnidade] = useState<UnidadeVale>('710_711');
  const [mesAno, setMesAno] = useState<string>(currentMesAno());
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [ajusteModalFuncionario, setAjusteModalFuncionario] = useState<Employee | null>(null);
  const [ajusteVersion, setAjusteVersion] = useState(0);
  const [valorVA, setValorVA] = useState(0);
  const [valorVAInput, setValorVAInput] = useState('0');

  useEffect(() => {
    fetchValorVAConfig().then((v) => {
      setValorVA(v);
      setValorVAInput(String(v));
    });
  }, []);

  const funcionariosDaUnidade = useMemo(
    () => employees.filter((e) => e.aba === unidade),
    [employees, unidade]
  );

  const linhas: ValeCalculado[] = useMemo(() => {
    return funcionariosDaUnidade.map((emp) => {
      const ajuste = getAjuste(emp.id, unidade);
      const resultado = calcularValeFuncionario(
        { admissao: emp.dataAdmissao, desligamento: emp.dataDesligamento, valorVT: emp.valorVT },
        unidade,
        mesAno,
        valorVA,
        ajuste
      );
      return {
        funcionarioId: emp.id,
        nome: emp.nome,
        cargo: emp.cargo,
        chavePix: emp.chavePix,
        ...resultado,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funcionariosDaUnidade, unidade, mesAno, valorVA, ajusteVersion]);

  const totalVA = linhas.reduce((sum, l) => sum + l.totalVA, 0);
  const totalVT = linhas.reduce((sum, l) => sum + l.totalVT, 0);
  const totalGeral = totalVA + totalVT;

  const handleSaveValorVA = async () => {
    const valor = Number(valorVAInput.replace(',', '.')) || 0;
    setValorVA(valor);
    try {
      await saveValorVAConfig(valor);
    } catch (err) {
      console.error('Erro ao salvar valor de VA:', err);
    }
  };

  const handleSaveAjuste = (ajuste: { diasSemanaFolga: number[]; feriasInicio?: string; feriasFim?: string }) => {
    if (!ajusteModalFuncionario) return;
    saveAjuste({
      funcionarioId: ajusteModalFuncionario.id,
      unidade,
      ...ajuste,
    });
    setAjusteVersion((v) => v + 1);
  };

  const handleSync = async () => {
    setSyncStatus('syncing');
    try {
      const todosAjustes = getAllAjustes(unidade);
      const registros = linhas.map((l) => {
        const ajuste = todosAjustes.find((a) => a.funcionarioId === l.funcionarioId);
        return {
          funcionarioId: l.funcionarioId,
          diasVA: l.diasVA,
          valorVA: l.valorVA,
          totalVA: l.totalVA,
          diasVT: l.diasVT,
          valorVT: l.valorVT,
          totalVT: l.totalVT,
          diasSemanaFolga: ajuste?.diasSemanaFolga,
          feriasInicio: ajuste?.feriasInicio,
          feriasFim: ajuste?.feriasFim,
        };
      });
      await syncValesToSheets(unidade, mesAno, registros);
      setSyncStatus('synced');
    } catch (err) {
      console.error('Erro ao sincronizar vales:', err);
      setSyncStatus('error');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Nome', 'Cargo', 'ChavePix', 'DiasVA', 'ValorVA', 'TotalVA', 'DiasVT', 'ValorVT', 'TotalVT'];
    const rows = linhas.map((l) => [
      `"${l.nome.replace(/"/g, '""')}"`,
      `"${(l.cargo || '').replace(/"/g, '""')}"`,
      `"${l.chavePix}"`,
      l.diasVA,
      l.valorVA.toFixed(2),
      l.totalVA.toFixed(2),
      l.diasVT,
      l.valorVT.toFixed(2),
      l.totalVT.toFixed(2),
    ]);
    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `vales_${unidade}_${mesAno}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-md rounded-t-2xl">
        <div className="flex gap-2 px-4 sm:px-6 pt-2">
          <button
            onClick={() => setUnidade('710_711')}
            className={`flex items-center gap-2.5 py-3 px-4 font-medium text-sm border-b-2 rounded-t-xl transition-all cursor-pointer ${
              unidade === '710_711'
                ? 'text-emerald-300 border-emerald-400/60 bg-emerald-500/15 shadow-[0_0_15px_rgba(16,185,129,0.2)] font-semibold backdrop-blur-md'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>710/711</span>
          </button>
          <button
            onClick={() => setUnidade('parkshopping')}
            className={`flex items-center gap-2.5 py-3 px-4 font-medium text-sm border-b-2 rounded-t-xl transition-all cursor-pointer ${
              unidade === 'parkshopping'
                ? 'text-indigo-300 border-indigo-400/60 bg-indigo-500/15 shadow-[0_0_15px_rgba(99,102,241,0.25)] font-semibold backdrop-blur-md'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Parkshopping</span>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white/5 backdrop-blur-2xl p-4 border border-white/10 rounded-2xl shadow-2xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-300 font-medium">Mês:</label>
            <input
              type="month"
              value={mesAno}
              onChange={(e) => setMesAno(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
            <label className="text-sm text-slate-300 font-medium ml-2">VA (todos):</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={valorVAInput}
              onChange={(e) => setValorVAInput(e.target.value)}
              onBlur={handleSaveValorVA}
              className="w-24 px-2 py-2 bg-white/5 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/15 rounded-xl backdrop-blur-md hover:border-white/25 transition-all cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4 text-indigo-300" />
              <span>Exportar CSV</span>
            </button>
            <button
              onClick={handleSync}
              disabled={syncStatus === 'syncing'}
              className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl backdrop-blur-md transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-400 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              <span>{syncStatus === 'syncing' ? 'Sincronizando...' : 'Sincronizar planilha'}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm">
            <span className="text-amber-200/80">Total VA: </span>
            <span className="text-amber-200 font-bold">R$ {totalVA.toFixed(2)}</span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-sm">
            <span className="text-indigo-200/80">Total VT: </span>
            <span className="text-indigo-200 font-bold">R$ {totalVT.toFixed(2)}</span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-sm">
            <span className="text-emerald-200/80">Total Geral: </span>
            <span className="text-emerald-200 font-bold">R$ {totalGeral.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5 border-b border-white/10 text-left text-slate-300 font-semibold">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Cargo</th>
              <th className="px-4 py-3">Chave PIX</th>
              <th className="px-4 py-3 text-center">Dias VA</th>
              <th className="px-4 py-3 text-right">Total VA</th>
              <th className="px-4 py-3 text-center">Dias VT</th>
              <th className="px-4 py-3 text-right">Valor VT/dia</th>
              <th className="px-4 py-3 text-right">Total VT</th>
              <th className="px-4 py-3 text-center">Ajustes</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => {
              const emp = funcionariosDaUnidade.find((e) => e.id === linha.funcionarioId)!;
              return (
                <tr key={linha.funcionarioId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{linha.nome}</td>
                  <td className="px-4 py-3 text-slate-300">{linha.cargo || '—'}</td>
                  <td className="px-4 py-3 text-slate-300">{linha.chavePix || '—'}</td>
                  <td className="px-4 py-3 text-center text-slate-200">{linha.diasVA}</td>
                  <td className="px-4 py-3 text-right text-amber-300 font-semibold">R$ {linha.totalVA.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center text-slate-200">{linha.diasVT}</td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={linha.valorVT}
                      onChange={(e) => onUpdateEmployee(linha.funcionarioId, Number(e.target.value) || 0)}
                      className="w-24 px-2 py-1 bg-white/5 border border-white/15 rounded-lg text-right text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-indigo-300 font-semibold">R$ {linha.totalVT.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setAjusteModalFuncionario(emp)}
                      title="Marcar folga fixa da semana / férias"
                      className="inline-flex items-center justify-center p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {linhas.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                  Nenhum funcionário nesta unidade.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {ajusteModalFuncionario && (
        <ValeAjusteModal
          isOpen={true}
          funcionarioNome={ajusteModalFuncionario.nome}
          ajusteAtual={getAjuste(ajusteModalFuncionario.id, unidade)}
          onClose={() => setAjusteModalFuncionario(null)}
          onSave={handleSaveAjuste}
        />
      )}
    </div>
  );
};
