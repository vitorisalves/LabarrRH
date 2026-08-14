import React, { useState } from 'react';
import { ArrowRightLeft, X } from 'lucide-react';
import { Employee, TabType } from '../types';

interface TransferModalProps {
  isOpen: boolean;
  employee: Employee | null;
  onClose: () => void;
  onTransfer: (employeeId: string, targetTab: TabType, reason?: string) => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  employee,
  onClose,
  onTransfer,
}) => {
  const [targetTab, setTargetTab] = useState<TabType>('710_711');
  const [reason, setReason] = useState('');

  React.useEffect(() => {
    if (employee) {
      if (employee.aba === '710_711') setTargetTab('parkshopping');
      else if (employee.aba === 'parkshopping') setTargetTab('710_711');
      else setTargetTab('710_711');
      setReason(employee.motivoInativacao || '');
    }
  }, [employee]);

  if (!isOpen || !employee) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onTransfer(employee.id, targetTab, reason);
    onClose();
  };

  const getTabLabel = (tab: TabType) => {
    switch (tab) {
      case '710_711':
        return '710/711';
      case 'parkshopping':
        return 'Parkshopping';
      case 'freela':
        return 'Freela';
      case 'inativo':
        return 'Inativo (Desligado/Afastado)';
    }
  };

  return (
    <div
      id="transfer-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
    >
      <div
        id="transfer-dialog"
        className="w-full max-w-lg bg-slate-900/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/15 overflow-hidden text-slate-100"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2 text-white font-bold">
            <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
            <span>Mover de Aba / Lotação</span>
          </div>
          <button
            id="btn-close-transfer-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-white rounded-lg p-1.5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl backdrop-blur-md">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Colaborador</p>
              <p className="font-bold text-white text-base mt-1">{employee.nome}</p>
              <p className="text-xs text-slate-400 mt-1">
                Aba atual:{' '}
                <span className="font-semibold text-indigo-300">{getTabLabel(employee.aba)}</span>
              </p>
            </div>

            <div>
              <label htmlFor="select-target-tab" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Nova Lotação / Aba de Destino
              </label>
              <select
                id="select-target-tab"
                value={targetTab}
                onChange={(e) => setTargetTab(e.target.value as TabType)}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-white/15 focus:border-indigo-400 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
                <option value="710_711" className="bg-slate-900 text-white">710/711</option>
                <option value="parkshopping" className="bg-slate-900 text-white">Parkshopping</option>
                <option value="freela" className="bg-slate-900 text-white">Freela</option>
                <option value="inativo" className="bg-slate-900 text-white">Inativo</option>
              </select>
            </div>

            {targetTab === 'inativo' && (
              <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/30 backdrop-blur-md space-y-2">
                <label htmlFor="input-inactivation-reason" className="block text-xs font-semibold text-amber-300 uppercase tracking-wider">
                  Motivo da Inativação / Desligamento
                </label>
                <input
                  id="input-inactivation-reason"
                  type="text"
                  placeholder="Ex: Pedido de demissão, fim de contrato, etc."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/15 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-white/5 border-t border-white/10">
            <button
              id="btn-cancel-transfer"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-300 bg-white/5 border border-white/15 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              id="btn-confirm-transfer"
              type="submit"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/30 rounded-xl shadow-lg shadow-indigo-900/50 transition-colors cursor-pointer"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Confirmar Movimentação</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
