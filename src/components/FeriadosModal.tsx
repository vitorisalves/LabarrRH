import React, { useState, useEffect } from 'react';
import { X, CalendarHeart, Building2, Store, Plus, Trash2 } from 'lucide-react';
import { FeriadosArmazenados } from '../types/vale';
import { fetchFeriadosSugeridos, FeriadoSugerido } from '../services/feriadosService';

interface FeriadosModalProps {
  isOpen: boolean;
  feriados: FeriadosArmazenados;
  onClose: () => void;
  onSave: (feriados: FeriadosArmazenados) => void;
}

function formatDataBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export const FeriadosModal: React.FC<FeriadosModalProps> = ({ isOpen, feriados, onClose, onSave }) => {
  const [fabrica, setFabrica] = useState<string[]>(feriados.fabrica);
  const [loja, setLoja] = useState<string[]>(feriados.loja);
  const [novaDataFabrica, setNovaDataFabrica] = useState('');
  const [novaDataLoja, setNovaDataLoja] = useState('');
  const [sugestoes, setSugestoes] = useState<FeriadoSugerido[]>([]);

  useEffect(() => {
    setFabrica(feriados.fabrica);
    setLoja(feriados.loja);
  }, [feriados, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchFeriadosSugeridos(new Date().getFullYear()).then(setSugestoes);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const addData = (grupo: 'fabrica' | 'loja', data: string) => {
    if (!data) return;
    if (grupo === 'fabrica') {
      if (!fabrica.includes(data)) setFabrica([...fabrica, data].sort());
    } else {
      if (!loja.includes(data)) setLoja([...loja, data].sort());
    }
  };

  const removeData = (grupo: 'fabrica' | 'loja', data: string) => {
    if (grupo === 'fabrica') setFabrica(fabrica.filter((d) => d !== data));
    else setLoja(loja.filter((d) => d !== data));
  };

  const handleSave = () => {
    onSave({ fabrica, loja });
    onClose();
  };

  const renderGrupo = (
    grupo: 'fabrica' | 'loja',
    label: string,
    icon: React.ReactNode,
    lista: string[],
    novaData: string,
    setNovaData: (v: string) => void,
    corClasses: string
  ) => (
    <div>
      <div className={`flex items-center gap-2 text-sm font-semibold mb-2 ${corClasses}`}>
        {icon}
        <span>Feriados — {label}</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {lista.length === 0 && <span className="text-xs text-slate-500">Nenhum feriado marcado.</span>}
        {lista.map((data) => (
          <span
            key={data}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-200"
          >
            {formatDataBR(data)}
            <button
              type="button"
              onClick={() => removeData(grupo, data)}
              className="text-slate-400 hover:text-rose-400 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      <div className="flex gap-2 mb-3">
        <input
          type="date"
          value={novaData}
          onChange={(e) => setNovaData(e.target.value)}
          className="flex-1 px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        />
        <button
          type="button"
          onClick={() => {
            addData(grupo, novaData);
            setNovaData('');
          }}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar
        </button>
      </div>

      {sugestoes.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 mb-1.5">Sugestões (feriados nacionais / DF):</p>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
            {sugestoes.map((s) => {
              const jaAdicionado = lista.includes(s.data);
              return (
                <button
                  key={s.data + s.nome}
                  type="button"
                  disabled={jaAdicionado}
                  onClick={() => addData(grupo, s.data)}
                  title={s.nome}
                  className={`text-[11px] font-medium px-2 py-1 rounded-md border transition-colors ${
                    jaAdicionado
                      ? 'bg-white/5 border-white/10 text-slate-600 cursor-not-allowed'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 cursor-pointer'
                  }`}
                >
                  {formatDataBR(s.data)} · {s.nome}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CalendarHeart className="w-5 h-5 text-rose-300" />
            Feriados — Fábrica e Loja
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400 -mt-4">
          Um feriado marcado aqui remove 1 dia de vale (VA e VT) de todos os funcionários daquele grupo,
          automaticamente, em qualquer mês que a data cair.
        </p>

        {renderGrupo(
          'fabrica',
          'Fábrica',
          <Building2 className="w-4 h-4" />,
          fabrica,
          novaDataFabrica,
          setNovaDataFabrica,
          'text-orange-300'
        )}

        <div className="border-t border-white/10" />

        {renderGrupo(
          'loja',
          'Loja',
          <Store className="w-4 h-4" />,
          loja,
          novaDataLoja,
          setNovaDataLoja,
          'text-sky-300'
        )}

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
            Salvar feriados
          </button>
        </div>
      </div>
    </div>
  );
};
