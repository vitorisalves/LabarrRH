import React from 'react';
import {
  X,
  User,
  CreditCard,
  MapPin,
  Calendar,
  Mail,
  PhoneCall,
  HeartHandshake,
  Briefcase,
  Copy,
  Check,
  ArrowRightLeft,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Employee } from '../types';
import { formatDateBR } from '../utils/formatters';

interface EmployeeDetailsModalProps {
  isOpen: boolean;
  employee: Employee | null;
  onClose: () => void;
  onEdit: (employee: Employee) => void;
  onTransfer: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
}

export const EmployeeDetailsModal: React.FC<EmployeeDetailsModalProps> = ({
  isOpen,
  employee,
  onClose,
  onEdit,
  onTransfer,
  onDelete,
}) => {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  if (!isOpen || !employee) return null;

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getTabBadge = () => {
    switch (employee.aba) {
      case '710_711':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Unidade 710/711
          </span>
        );
      case 'parkshopping':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Unidade Parkshopping
          </span>
        );
      case 'freela':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Freela
          </span>
        );
      case 'inativo':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-slate-300 border border-white/15">
            Inativo
          </span>
        );
    }
  };

  return (
    <div
      id="employee-details-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto"
    >
      <div
        id="employee-details-dialog"
        className="w-full max-w-2xl bg-slate-900/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/15 overflow-hidden my-8 text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 font-bold flex items-center justify-center text-lg shadow-inner">
              {employee.nome.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">{employee.nome}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                {getTabBadge()}
                {employee.cargo && (
                  <span className="text-xs text-slate-400 font-medium">{employee.cargo}</span>
                )}
              </div>
            </div>
          </div>
          <button
            id="btn-close-details-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-white rounded-lg p-1.5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Card: Dados Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" /> CPF
                </span>
                <button
                  onClick={() => handleCopy(employee.cpf, 'cpf')}
                  className="text-slate-400 hover:text-indigo-300 p-1 hover:bg-white/10 rounded transition-colors"
                  title="Copiar CPF"
                >
                  {copiedKey === 'cpf' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-sm font-mono font-semibold text-white mt-1.5">{employee.cpf}</p>
            </div>

            <div className="p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Data de Nascimento
              </span>
              <p className="text-sm font-semibold text-white mt-1.5">
                {formatDateBR(employee.dataNascimento)}
              </p>
            </div>

            <div className="p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-indigo-400" /> Data de Admissão
              </span>
              <p className="text-sm font-semibold text-white mt-1.5">
                {formatDateBR(employee.dataAdmissao)}
              </p>
            </div>

            <div className="p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" /> E-mail
                </span>
                <button
                  onClick={() => handleCopy(employee.email, 'email')}
                  className="text-slate-400 hover:text-indigo-300 p-1 hover:bg-white/10 rounded transition-colors"
                  title="Copiar E-mail"
                >
                  {copiedKey === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-sm font-semibold text-white mt-1.5 truncate">{employee.email}</p>
            </div>
          </div>

          {/* Endereço & CEP */}
          <div className="p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" /> Endereço Residencial
              </span>
              {employee.cep ? (
                <span className="text-xs font-mono font-semibold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-0.5 rounded-md">
                  CEP: {employee.cep}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(employee);
                  }}
                  className="text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-2.5 py-0.5 rounded-md transition-colors cursor-pointer"
                >
                  + Adicionar CEP
                </button>
              )}
            </div>
            <p className="text-sm text-slate-200 mt-1.5 font-medium">{employee.endereco}</p>
          </div>

          {/* Chave PIX */}
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-xl backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" /> Chave PIX {employee.tipoChavePix ? `(${employee.tipoChavePix})` : ''}
              </span>
              <button
                onClick={() => handleCopy(employee.chavePix, 'pix')}
                className="flex items-center gap-1 text-xs font-medium text-emerald-200 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                {copiedKey === 'pix' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" /> Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copiar PIX
                  </>
                )}
              </button>
            </div>
            <p className="text-sm font-mono font-semibold text-emerald-200 mt-1.5 select-all">
              {employee.chavePix}
            </p>
          </div>

          {/* Contato de Emergência */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-xl backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-amber-400" /> Contato de Emergência
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-200 bg-amber-500/20 border border-amber-400/30 px-2.5 py-0.5 rounded-lg">
                <HeartHandshake className="w-3.5 h-3.5" /> {employee.parentescoEmergencia}
              </span>
            </div>
            <p className="text-sm font-semibold text-amber-100 mt-1.5">
              {employee.contatoEmergencia}
            </p>
          </div>

          {/* Se inativo */}
          {employee.aba === 'inativo' && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/25 rounded-xl backdrop-blur-md">
              <span className="text-xs font-semibold text-rose-300 uppercase tracking-wider">
                Informações de Desligamento / Inatividade
              </span>
              <div className="mt-1.5 text-xs text-rose-200 space-y-1">
                {employee.dataDesligamento && (
                  <p>
                    <span className="font-semibold text-white">Data de Desligamento:</span>{' '}
                    {formatDateBR(employee.dataDesligamento)}
                  </p>
                )}
                {employee.motivoInativacao && (
                  <p>
                    <span className="font-semibold text-white">Motivo:</span> {employee.motivoInativacao}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-white/5 border-t border-white/10">
          <button
            id="btn-details-delete"
            type="button"
            onClick={() => {
              onClose();
              onDelete(employee);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-rose-300 bg-rose-500/15 border border-rose-500/30 rounded-xl hover:bg-rose-500/25 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Excluir</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              id="btn-details-transfer"
              type="button"
              onClick={() => {
                onClose();
                onTransfer(employee);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 bg-white/5 border border-white/15 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-300" />
              <span>Mover de Aba</span>
            </button>
            <button
              id="btn-details-edit"
              type="button"
              onClick={() => {
                onClose();
                onEdit(employee);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/30 rounded-xl shadow-lg shadow-indigo-900/50 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
