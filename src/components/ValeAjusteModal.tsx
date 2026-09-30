import React, { useState, useEffect } from 'react';
import { X, CalendarOff, Palmtree } from 'lucide-react';

const DIAS_SEMANA = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

interface ValeAjusteModalProps {
  isOpen: boolean;
  funcionarioNome: string;
  ajusteAtual?: {
    diasSemanaFolga?: number[];
    feriasInicio?: string;
    feriasFim?: string;
  };
  onClose: () => void;
  onSave: (ajuste: { diasSemanaFolga: number[]; feriasInicio?: string; feriasFim?: string }) => void;
}

export const ValeAjusteModal: React.FC<ValeAjusteModalProps> = ({
  isOpen,
  funcionarioNome,
  ajusteAtual,
  onClose,
  onSave,
}) => {
  const [diasFolga, setDiasFolga] = useState<Set<number>>(new Set(ajusteAtual?.diasSemanaFolga || []));
  const [feriasInicio, setFeriasInicio] = useState(ajusteAtual?.feriasInicio || '');
  const [feriasFim, setFeriasFim] = useState(ajusteAtual?.feriasFim || '');

  useEffect(() => {
    setDiasFolga(new Set(ajusteAtual?.diasSemanaFolga || []));
    setFeriasInicio(ajusteAtual?.feriasInicio || '');
    setFeriasFim(ajusteAtual?.feriasFim || '');
  }, [ajusteAtual, isOpen]);

  if (!isOpen) return null;

  const toggleDia = (dia: number) => {
    const next = new Set(diasFolga);
    if (next.has(dia)) {
      next.delete(dia);
    } else {
      next.add(dia);
    }
    setDiasFolga(next);
  };

  const handleSave = () => {
    onSave({
      diasSemanaFolga: Array.from(diasFolga).sort((a: number, b: number) => a - b),
      feriasInicio: feriasInicio || undefined,
      feriasFim: feriasFim || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
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
            Vale para todos os meses, até ser alterado. Deixe sem marcar para usar o cálculo automático por proporção.
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
