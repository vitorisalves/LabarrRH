import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Employee } from '../types';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  employee: Employee | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  employee,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !employee) return null;

  return (
    <div
      id="confirm-delete-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
    >
      <div
        id="confirm-delete-dialog"
        className="w-full max-w-md bg-slate-900/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/15 overflow-hidden text-slate-100"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2 text-rose-400 font-bold">
            <AlertTriangle className="w-5 h-5" />
            <span>Confirmar Exclusão</span>
          </div>
          <button
            id="btn-close-delete-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-white rounded-lg p-1.5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-slate-300 text-sm leading-relaxed">
            Tem certeza de que deseja excluir permanentemente o cadastro do colaborador:
          </p>
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl backdrop-blur-md">
            <p className="font-bold text-rose-200 text-base">{employee.nome}</p>
            <p className="text-xs text-rose-300 mt-1 font-mono">CPF: {employee.cpf}</p>
            <p className="text-xs text-rose-400 mt-0.5">
              Unidade atual:{' '}
              {employee.aba === '710_711'
                ? '710/711'
                : employee.aba === 'parkshopping'
                ? 'Parkshopping'
                : 'Inativo'}
            </p>
          </div>
          <p className="text-xs text-slate-400">
            Esta ação removerá todos os dados do funcionário. Para manter o histórico sem excluir, você pode mover para a aba Inativo.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-white/5 border-t border-white/10">
          <button
            id="btn-cancel-delete"
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 bg-white/5 border border-white/15 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            id="btn-confirm-delete-action"
            type="button"
            onClick={() => {
              onConfirm(employee.id);
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-500 border border-rose-400/30 rounded-xl shadow-lg shadow-rose-950/60 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Confirmar e Excluir</span>
          </button>
        </div>
      </div>
    </div>
  );
};
