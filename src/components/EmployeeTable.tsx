import React, { useState } from 'react';
import {
  Eye,
  Edit2,
  ArrowRightLeft,
  Trash2,
  User,
  PhoneCall,
  Calendar,
  CreditCard,
  Building2,
  Store,
  Clock,
  UserX,
  Mail,
  Copy,
  Check,
} from 'lucide-react';
import { Employee, TabType } from '../types';
import { formatDateBR } from '../utils/formatters';

interface EmployeeTableProps {
  employees: Employee[];
  activeTab: TabType;
  onViewDetails: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
  onTransfer: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
  onNewEmployee: () => void;
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({
  employees,
  activeTab,
  onViewDetails,
  onEdit,
  onTransfer,
  onDelete,
  onNewEmployee,
}) => {
  const [copiedPixId, setCopiedPixId] = useState<string | null>(null);

  const handleCopyPix = (empId: string, pix: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(pix);
    setCopiedPixId(empId);
    setTimeout(() => {
      setCopiedPixId(null);
    }, 2000);
  };
  if (employees.length === 0) {
    return (
      <div
        id="empty-state-container"
        className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-12 text-center my-4 shadow-xl"
      >
        <div className="w-16 h-16 bg-white/10 border border-white/15 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_25px_rgba(99,102,241,0.2)]">
          {activeTab === '710_711' ? (
            <Building2 className="w-8 h-8 text-emerald-400" />
          ) : activeTab === 'parkshopping' ? (
            <Store className="w-8 h-8 text-indigo-400" />
          ) : activeTab === 'freela' ? (
            <Clock className="w-8 h-8 text-amber-400" />
          ) : (
            <UserX className="w-8 h-8 text-slate-400" />
          )}
        </div>
        <h3 className="text-base font-bold text-white">
          Nenhum colaborador encontrado
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1.5 mb-6">
          Não há registros cadastrados nesta unidade ou correspondentes aos termos da busca.
        </p>
        <button
          id="btn-empty-state-add"
          onClick={onNewEmployee}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-900/50 border border-indigo-400/30 transition-all cursor-pointer"
        >
          <User className="w-4 h-4" />
          <span>Cadastrar Primeiro Funcionário</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-white/10 text-slate-300 text-xs uppercase tracking-wider font-bold">
              <th className="py-4 px-5 font-bold">Funcionário / Cargo</th>
              <th className="py-4 px-5 font-bold">Admissão / Nasc.</th>
              <th className="py-4 px-5 font-bold">Chave PIX</th>
              <th className="py-4 px-5 font-bold">Contato Emergência</th>
              <th className="py-4 px-5 font-bold">E-mail / Endereço</th>
              <th className="py-4 px-5 text-right font-bold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm">
            {employees.map((emp) => (
              <tr
                key={emp.id}
                id={`employee-row-${emp.id}`}
                onClick={() => onViewDetails(emp)}
                title="Clique em qualquer lugar da linha para abrir os detalhes"
                className="hover:bg-indigo-600/15 active:bg-indigo-600/20 transition-all group cursor-pointer"
              >
                {/* Nome & CPF */}
                <td className="py-4 px-5">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 font-bold flex items-center justify-center text-sm group-hover:bg-indigo-500/30 transition-colors shadow-inner">
                      {emp.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-slate-100 group-hover:text-indigo-300 text-left transition-colors text-base">
                        {emp.nome}
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 mt-1">
                        <span className="font-mono text-xs text-slate-400 font-medium">{emp.cpf}</span>
                        {emp.cargo && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span className="text-indigo-300 font-semibold text-xs">{emp.cargo}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Admissão & Nascimento */}
                <td className="py-4 px-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
                      <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>Adm: {formatDateBR(emp.dataAdmissao)}</span>
                    </div>
                    <p className="text-xs text-slate-400 pl-6 font-medium">
                      Nasc: {formatDateBR(emp.dataNascimento)}
                    </p>
                  </div>
                </td>

                {/* Chave PIX */}
                <td className="py-4 px-5">
                  <button
                    type="button"
                    onClick={(e) => handleCopyPix(emp.id, emp.chavePix, e)}
                    className="group/pix flex items-center gap-2 font-mono text-slate-200 font-semibold max-w-[240px] hover:text-emerald-300 transition-colors cursor-pointer bg-white/5 hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-500/30 px-3 py-2 rounded-xl text-left"
                    title="Clique para copiar a chave PIX"
                  >
                    {copiedPixId === emp.id ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-emerald-300 font-bold text-xs">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 text-emerald-400 shrink-0 group-hover/pix:scale-110 transition-transform" />
                        <span className="truncate text-xs">{emp.chavePix}</span>
                        <Copy className="w-3.5 h-3.5 text-slate-400 group-hover/pix:text-emerald-300 shrink-0 opacity-0 group-hover/pix:opacity-100 transition-opacity ml-auto" />
                      </>
                    )}
                  </button>
                  {emp.tipoChavePix && (
                    <span className="inline-block mt-1 text-[11px] text-emerald-300 font-bold uppercase bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-md">
                      {emp.tipoChavePix}
                    </span>
                  )}
                </td>

                {/* Contato Emergência */}
                <td className="py-4 px-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
                      <PhoneCall className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="truncate max-w-[200px]">{emp.contatoEmergencia}</span>
                    </div>
                    <span className="inline-block text-[11px] text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-md font-semibold">
                      {emp.parentescoEmergencia}
                    </span>
                  </div>
                </td>

                {/* E-mail / Endereço */}
                <td className="py-4 px-5 max-w-[240px]">
                  <div className="flex items-center gap-2 text-slate-200 font-medium text-xs truncate" title={emp.email}>
                    <Mail className="w-4 h-4 text-indigo-300 shrink-0" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-1 font-normal" title={emp.endereco}>
                    {emp.endereco}
                  </p>
                  {emp.cep && (
                    <span className="inline-block text-[11px] font-mono text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded mt-1">
                      CEP: {emp.cep}
                    </span>
                  )}
                </td>

                {/* Ações */}
                <td className="py-4 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      id={`btn-view-${emp.id}`}
                      onClick={() => onViewDetails(emp)}
                      title="Ver todos os detalhes"
                      className="p-2.5 text-slate-400 hover:text-indigo-300 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      id={`btn-edit-${emp.id}`}
                      onClick={() => onEdit(emp)}
                      title="Editar cadastro"
                      className="p-2.5 text-slate-400 hover:text-indigo-300 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      id={`btn-transfer-${emp.id}`}
                      onClick={() => onTransfer(emp)}
                      title="Mover de aba / Lotação"
                      className="p-2.5 text-slate-400 hover:text-amber-300 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </button>
                    <button
                      id={`btn-delete-${emp.id}`}
                      onClick={() => onDelete(emp)}
                      title="Excluir funcionário"
                      className="p-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
