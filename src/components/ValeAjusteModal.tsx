import React, { useState, useEffect } from 'react';
import { X, CalendarOff, Palmtree, CalendarClock } from 'lucide-react';

const DIAS_SEMANA = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface ValeAjusteModalProps {
  isOpen: boolean;
  funcionarioNome: string;
  mesAno: string; // 'YYYY-MM', mês em exibição — só afeta a grade de folgas extras
  ajusteAtual?: {
    diasSemanaFolga?: number[];
    folgasExtras?: string[];
    feriasInicio?: string;
    feriasFim?: string;
  };
  onClose: () => void;
  onSave: (ajuste: {
    diasSemanaFolga: number[];
    folgasExtras: string[];
    feriasInicio?: string;
    feriasFim?: string;
  }) => void;
}

export const ValeAjusteModal: React.FC<ValeAjusteModalProps> = ({
  isOpen,
  funcionarioNome,
  mesAno,
  ajusteAtual,
  onClose,
  onSave,
}) => {
  const [diasFolga, setDiasFolga] = useState<Set<number>>(new Set(ajusteAtual?.diasSemanaFolga || []));
  const [folgasExtras, setFolgasExtras] = useState<Set<string>>(new Set(ajusteAtual?.folgasExtras || []));
  const [feriasInicio, setFeriasInicio] = useState(ajusteAtual?.feriasInicio || '');
  const [feriasFim, setFeriasFim] = useState(ajusteAtual?.feriasFim || '');

  useEffect(() => {
    setDiasFolga(new Set(ajusteAtual?.diasSemanaFolga || []));
    setFolgasExtras(new Set(ajusteAtual?.folgasExtras || []));
    setFeriasInicio(ajusteAtual?.feriasInicio || '');
    setFeriasFim(ajusteAtual?.feriasFim || '');
  }, [ajusteAtual, isOpen]);

  if (!isOpen) return null;

  const [ano, mes] = mesAno.split('-').map(Number);
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const dias = Array.from({ length: diasNoMes }, (_, i) => i + 1);

  const toggleDia = (dia: number) => {
    const next = new Set(diasFolga);
    if (next.has(dia)) {
      next.delete(dia);
    } else {
      next.add(dia);
    }
    setDiasFolga(next);
  };

  const toggleFolgaExtra = (diaDoMes: number) => {
    const iso = formatISODate(new Date(ano, mes - 1, diaDoMes));
    const next = new Set(folgasExtras);
    if (next.has(iso)) {
      next.delete(iso);
    } else {
      next.add(iso);
    }
    setFolgasExtras(next);
  };

  const handleSave = () => {
    onSave({
      diasSemanaFolga: Array.from(diasFolga).sort((a: number, b: number) => a - b),
      folgasExtras: Array.from(folgasExtras).sort(),
      feriasInicio: feriasInicio || undefined,
      feriasFim: feriasFim || undefined,
    });
    onClose();
  };

  const mesLabel = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Ajustes de vale — {funcionarioNome}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-indigo-300 mb-2">
            <CalendarOff className="w-4 h-4" />
            <span>Dia(s) de folga fixos na semana</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {DIAS_SEMANA.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => toggleDia(value)}
                className={`h-10 rounded-lg text-sm font-medium transition-colors cursor-pointer border ${
                  diasFolga.has(value)
                    ? 'bg-amber-500/25 border-amber-400/50 text-amber-200'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Vale para todos os meses, até ser alterado. Use para folgas que nunca mudam (ex: fábrica = sábado e domingo).
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-sky-300 mb-2">
            <CalendarClock className="w-4 h-4" />
            <span>Folgas extras de {mesLabel}</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {dias.map((dia) => {
              const iso = formatISODate(new Date(ano, mes - 1, dia));
              const isExtra = folgasExtras.has(iso);
              return (
                <button
                  key={dia}
                  type="button"
                  onClick={() => toggleFolgaExtra(dia)}
                  className={`h-9 rounded-lg text-sm font-medium transition-colors cursor-pointer border ${
                    isExtra
                      ? 'bg-sky-500/25 border-sky-400/50 text-sky-200'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {dia}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Só valem neste mês — some com a folga fixa. Use para dias que mudam semana a semana (ex: escala rotativa da loja).
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300 mb-2">
            <Palmtree className="w-4 h-4" />
            <span>Período de férias</span>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-slate-400">Início</label>
              <input
                type="date"
                value={feriasInicio}
                onChange={(e) => setFeriasInicio(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-400">Fim</label>
              <input
                type="date"
                value={feriasFim}
                onChange={(e) => setFeriasFim(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Vale automaticamente em qualquer mês que este período cruzar.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-900/50 transition-all cursor-pointer"
          >
            Salvar ajustes
          </button>
        </div>
      </div>
    </div>
  );
};
