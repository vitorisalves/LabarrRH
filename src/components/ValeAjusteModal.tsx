import React, { useState, useEffect } from 'react';
import { X, CalendarOff, Palmtree } from 'lucide-react';

interface ValeAjusteModalProps {
  isOpen: boolean;
  funcionarioNome: string;
  mesAno: string; // 'YYYY-MM'
  ajusteAtual?: {
    folgasManuais?: number[];
    feriasInicio?: string;
    feriasFim?: string;
  };
  onClose: () => void;
  onSave: (ajuste: { folgasManuais: number[]; feriasInicio?: string; feriasFim?: string }) => void;
}

export const ValeAjusteModal: React.FC<ValeAjusteModalProps> = ({
  isOpen,
  funcionarioNome,
  mesAno,
  ajusteAtual,
  onClose,
  onSave,
}) => {
  const [folgas, setFolgas] = useState<Set<number>>(new Set(ajusteAtual?.folgasManuais || []));
  const [feriasInicio, setFeriasInicio] = useState(ajusteAtual?.feriasInicio || '');
  const [feriasFim, setFeriasFim] = useState(ajusteAtual?.feriasFim || '');

  useEffect(() => {
    setFolgas(new Set(ajusteAtual?.folgasManuais || []));
    setFeriasInicio(ajusteAtual?.feriasInicio || '');
    setFeriasFim(ajusteAtual?.feriasFim || '');
  }, [ajusteAtual, mesAno, isOpen]);

  if (!isOpen) return null;

  const [ano, mes] = mesAno.split('-').map(Number);
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const dias = Array.from({ length: diasNoMes }, (_, i) => i + 1);

  const toggleDia = (dia: number) => {
    const next = new Set(folgas);
    if (next.has(dia)) {
      next.delete(dia);
    } else {
      next.add(dia);
    }
    setFolgas(next);
  };

  const handleSave = () => {
    onSave({
      folgasManuais: Array.from(folgas).sort((a: number, b: number) => a - b),
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
            <span>Folgas manuais do mês</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {dias.map((dia) => (
              <button
                key={dia}
                type="button"
                onClick={() => toggleDia(dia)}
                className={`h-9 rounded-lg text-sm font-medium transition-colors cursor-pointer border ${
                  folgas.has(dia)
                    ? 'bg-amber-500/25 border-amber-400/50 text-amber-200'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {dia}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Marcados: {folgas.size > 0 ? Array.from(folgas).sort((a: number, b: number) => a - b).join(', ') : 'nenhum'}
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
