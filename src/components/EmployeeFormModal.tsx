import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, AlertCircle, AlertTriangle, ArrowRight, Edit3 } from 'lucide-react';
import { Employee, NewEmployeeFormData, TabType } from '../types';
import { formatCPF, formatCEP, dateToInputFormat, formatDateBR } from '../utils/formatters';

interface EmployeeFormModalProps {
  isOpen: boolean;
  employeeToEdit?: Employee | null;
  defaultTab?: TabType;
  onClose: () => void;
  onSave: (data: NewEmployeeFormData, id?: string) => void;
}

interface MissingFieldItem {
  id: string;
  label: string;
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  isOpen,
  employeeToEdit,
  defaultTab = '710_711',
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<NewEmployeeFormData>({
    nome: '',
    cpf: '',
    endereco: '',
    cep: '',
    dataNascimento: '',
    dataAdmissao: '',
    email: '',
    chavePix: '',
    tipoChavePix: 'CPF',
    contatoEmergencia: '',
    parentescoEmergencia: '',
    aba: defaultTab,
    cargo: '',
    observacoes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [missingFields, setMissingFields] = useState<MissingFieldItem[]>([]);

  useEffect(() => {
    if (employeeToEdit) {
      setFormData({
        nome: employeeToEdit.nome,
        cpf: employeeToEdit.cpf,
        endereco: employeeToEdit.endereco,
        cep: employeeToEdit.cep || '',
        dataNascimento: dateToInputFormat(employeeToEdit.dataNascimento),
        dataAdmissao: dateToInputFormat(employeeToEdit.dataAdmissao),
        email: employeeToEdit.email,
        chavePix: employeeToEdit.chavePix,
        tipoChavePix: employeeToEdit.tipoChavePix || 'CPF',
        contatoEmergencia: employeeToEdit.contatoEmergencia,
        parentescoEmergencia: employeeToEdit.parentescoEmergencia,
        aba: employeeToEdit.aba,
        cargo: employeeToEdit.cargo || '',
        observacoes: employeeToEdit.observacoes || '',
        motivoInativacao: employeeToEdit.motivoInativacao || '',
        dataDesligamento: dateToInputFormat(employeeToEdit.dataDesligamento),
      });
    } else {
      setFormData({
        nome: '',
        cpf: '',
        endereco: '',
        cep: '',
        dataNascimento: '',
        dataAdmissao: new Date().toISOString().split('T')[0],
        email: '',
        chavePix: '',
        tipoChavePix: 'CPF',
        contatoEmergencia: '',
        parentescoEmergencia: '',
        aba: defaultTab,
        cargo: '',
        observacoes: '',
      });
    }
    setErrors({});
    setShowMissingModal(false);
    setMissingFields([]);
  }, [employeeToEdit, defaultTab, isOpen]);

  if (!isOpen) return null;

  // Validação estrita de tipo/formato (apenas valida formato caso o campo tenha sido preenchido)
  const validateFormat = () => {
    const newErrors: Record<string, string> = {};

    // Nome é a identificação mínima obrigatória
    if (!formData.nome.trim()) {
      newErrors.nome = 'Informe o nome do funcionário';
    }

    // CPF: opcional, mas se preenchido precisa ter 11 dígitos
    if (formData.cpf && formData.cpf.trim()) {
      const cpfDigits = formData.cpf.replace(/\D/g, '');
      if (cpfDigits.length !== 11) {
        newErrors.cpf = 'CPF incompleto. Deve conter 11 dígitos no formato 000.000.000-00';
      }
    }

    // CEP: opcional, mas se preenchido precisa ter 8 dígitos
    if (formData.cep && formData.cep.trim()) {
      const cepDigits = formData.cep.replace(/\D/g, '');
      if (cepDigits.length !== 8) {
        newErrors.cep = 'CEP incompleto. Deve conter 8 dígitos no formato 00000-000';
      }
    }

    // E-mail: opcional, mas se preenchido deve ser formato válido
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Formato de e-mail inválido (ex: nome@empresa.com)';
      }
    }

    // Validação da Chave PIX conforme tipo selecionado (se preenchida)
    if (formData.chavePix && formData.chavePix.trim()) {
      const pixVal = formData.chavePix.trim();
      if (formData.tipoChavePix === 'CPF') {
        const digits = pixVal.replace(/\D/g, '');
        if (digits.length !== 11) {
          newErrors.chavePix = 'Para chave PIX do tipo CPF, informe 11 dígitos válidos';
        }
      } else if (formData.tipoChavePix === 'Email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(pixVal)) {
          newErrors.chavePix = 'Para chave PIX do tipo E-mail, informe um e-mail válido';
        }
      } else if (formData.tipoChavePix === 'Telefone') {
        const digits = pixVal.replace(/\D/g, '');
        if (digits.length < 10 || digits.length > 11) {
          newErrors.chavePix = 'Para chave PIX do tipo Telefone, informe DDD + número (10 ou 11 dígitos)';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Identifica quais campos não foram preenchidos
  const getMissingFields = (): MissingFieldItem[] => {
    const list: MissingFieldItem[] = [];

    if (!formData.cpf?.trim()) {
      list.push({ id: 'input-form-cpf', label: 'CPF' });
    }
    if (!formData.dataNascimento) {
      list.push({ id: 'input-form-data-nascimento', label: 'Data de Nascimento' });
    }
    if (!formData.endereco?.trim()) {
      list.push({ id: 'input-form-endereco', label: 'Endereço Completo' });
    }
    if (!formData.cep?.trim()) {
      list.push({ id: 'input-form-cep', label: 'CEP' });
    }
    if (!formData.dataAdmissao) {
      list.push({ id: 'input-form-data-admissao', label: 'Data de Admissão' });
    }
    if (!formData.cargo?.trim()) {
      list.push({ id: 'input-form-cargo', label: 'Cargo / Função' });
    }
    if (!formData.email?.trim()) {
      list.push({ id: 'input-form-email', label: 'E-mail' });
    }
    if (!formData.chavePix?.trim()) {
      list.push({ id: 'input-form-chave-pix', label: 'Chave PIX' });
    }
    if (!formData.contatoEmergencia?.trim()) {
      list.push({ id: 'input-form-contato-emergencia', label: 'Contato de Emergência' });
    }
    if (!formData.parentescoEmergencia?.trim()) {
      list.push({ id: 'input-form-parentesco-emergencia', label: 'Parentesco de Emergência' });
    }

    if (formData.aba === 'inativo') {
      if (!formData.dataDesligamento) {
        list.push({ id: 'input-form-data-desligamento', label: 'Data de Desligamento' });
      }
      if (!formData.motivoInativacao?.trim()) {
        list.push({ id: 'input-form-motivo-inativacao', label: 'Motivo da Inativação' });
      }
    }

    return list;
  };

  const executeSave = () => {
    const payloadToSave: NewEmployeeFormData = {
      ...formData,
      dataNascimento: formData.dataNascimento ? formatDateBR(formData.dataNascimento) : '',
      dataAdmissao: formData.dataAdmissao ? formatDateBR(formData.dataAdmissao) : '',
      dataDesligamento: formData.dataDesligamento ? formatDateBR(formData.dataDesligamento) : '',
    };

    onSave(payloadToSave, employeeToEdit?.id);
    setShowMissingModal(false);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateFormat()) return;

    const uncompleted = getMissingFields();
    if (uncompleted.length > 0) {
      setMissingFields(uncompleted);
      setShowMissingModal(true);
      return;
    }

    executeSave();
  };

  const handleFocusFirstMissing = () => {
    setShowMissingModal(false);
    if (missingFields.length > 0) {
      const firstId = missingFields[0].id;
      setTimeout(() => {
        const el = document.getElementById(firstId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus();
        }
      }, 150);
    }
  };

  return (
    <div
      id="employee-form-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto"
    >
      <div
        id="employee-form-dialog"
        className="w-full max-w-2xl bg-slate-900/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/15 overflow-hidden my-8 text-slate-100 relative"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2.5 text-white font-bold">
            {employeeToEdit ? (
              <>
                <Save className="w-5 h-5 text-indigo-400" />
                <span>Editar Funcionário</span>
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <span>Cadastrar Novo Funcionário</span>
              </>
            )}
          </div>
          <button
            id="btn-close-form-modal"
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white rounded-lg p-1.5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Aba de Lotação */}
            <div className="bg-indigo-500/15 p-4 rounded-xl border border-indigo-400/30 backdrop-blur-md">
              <label htmlFor="input-form-aba" className="block text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">
                Aba / Unidade de Lotação
              </label>
              <select
                id="input-form-aba"
                value={formData.aba}
                onChange={(e) => setFormData({ ...formData, aba: e.target.value as TabType })}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-white/15 focus:border-indigo-400 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 font-medium"
              >
                <option value="710_711" className="bg-slate-900 text-white">710/711</option>
                <option value="parkshopping" className="bg-slate-900 text-white">Parkshopping</option>
                <option value="freela" className="bg-slate-900 text-white">Freela</option>
                <option value="inativo" className="bg-slate-900 text-white">Inativo</option>
              </select>
            </div>

            {/* Dados Pessoais */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-white/10 pb-1.5">
                Identificação e Pessoais
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="input-form-nome" className="block text-xs font-medium text-slate-300 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    id="input-form-nome"
                    type="text"
                    placeholder="Nome completo do funcionário"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className={`w-full px-3.5 py-2.5 bg-white/5 border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                      errors.nome ? 'border-rose-400/60 bg-rose-500/10' : 'border-white/15 focus:border-indigo-400'
                    }`}
                  />
                  {errors.nome && <p className="text-xs text-rose-400 mt-1 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.nome}</p>}
                </div>

                <div>
                  <label htmlFor="input-form-cpf" className="block text-xs font-medium text-slate-300 mb-1">
                    CPF
                  </label>
                  <input
                    id="input-form-cpf"
                    type="text"
                    placeholder="000.000.000-00 (opcional)"
                    maxLength={14}
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                    className={`w-full px-3.5 py-2.5 bg-white/5 border rounded-xl text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                      errors.cpf ? 'border-rose-400/60 bg-rose-500/10' : 'border-white/15 focus:border-indigo-400'
                    }`}
                  />
                  {errors.cpf && <p className="text-xs text-rose-400 mt-1 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.cpf}</p>}
                </div>

                <div>
                  <label htmlFor="input-form-data-nascimento" className="block text-xs font-medium text-slate-300 mb-1">
                    Data de Nascimento
                  </label>
                  <input
                    id="input-form-data-nascimento"
                    type="date"
                    value={formData.dataNascimento}
                    onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
                    className={`w-full px-3.5 py-2.5 bg-white/5 border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                      errors.dataNascimento ? 'border-rose-400/60 bg-rose-500/10' : 'border-white/15 focus:border-indigo-400'
                    }`}
                  />
                  {errors.dataNascimento && <p className="text-xs text-rose-400 mt-1 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.dataNascimento}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="input-form-endereco" className="block text-xs font-medium text-slate-300 mb-1">
                    Endereço Completo
                  </label>
                  <input
                    id="input-form-endereco"
                    type="text"
                    placeholder="Rua, número, complemento, bairro, cidade - UF"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    className={`w-full px-3.5 py-2.5 bg-white/5 border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                      errors.endereco ? 'border-rose-400/60 bg-rose-500/10' : 'border-white/15 focus:border-indigo-400'
                    }`}
                  />
                  {errors.endereco && <p className="text-xs text-rose-400 mt-1 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.endereco}</p>}
                </div>

                <div>
                  <label htmlFor="input-form-cep" className="block text-xs font-medium text-slate-300 mb-1">
                    CEP
                  </label>
                  <input
                    id="input-form-cep"
                    type="text"
                    placeholder="00000-000"
                    maxLength={9}
                    value={formData.cep || ''}
                    onChange={(e) => setFormData({ ...formData, cep: formatCEP(e.target.value) })}
                    className={`w-full px-3.5 py-2.5 bg-white/5 border rounded-xl text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                      errors.cep ? 'border-rose-400/60 bg-rose-500/10' : 'border-white/15 focus:border-indigo-400'
                    }`}
                  />
                  {errors.cep && <p className="text-xs text-rose-400 mt-1 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.cep}</p>}
                </div>
              </div>
            </div>

            {/* Dados Profissionais e Financeiros */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-white/10 pb-1.5">
                Profissional e Financeiro
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="input-form-data-admissao" className="block text-xs font-medium text-slate-300 mb-1">
                    Data de Admissão
                  </label>
                  <input
                    id="input-form-data-admissao"
                    type="date"
                    value={formData.dataAdmissao}
                    onChange={(e) => setFormData({ ...formData, dataAdmissao: e.target.value })}
                    className={`w-full px-3.5 py-2.5 bg-white/5 border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                      errors.dataAdmissao ? 'border-rose-400/60 bg-rose-500/10' : 'border-white/15 focus:border-indigo-400'
                    }`}
                  />
                  {errors.dataAdmissao && <p className="text-xs text-rose-400 mt-1 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.dataAdmissao}</p>}
                </div>

                <div>
                  <label htmlFor="input-form-cargo" className="block text-xs font-medium text-slate-300 mb-1">
                    Cargo / Função
                  </label>
                  <input
                    id="input-form-cargo"
                    type="text"
                    placeholder="Ex: Consultor, Atendente, Gerente"
                    value={formData.cargo}
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/15 focus:border-indigo-400 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="input-form-email" className="block text-xs font-medium text-slate-300 mb-1">
                    E-mail
                  </label>
                  <input
                    id="input-form-email"
                    type="email"
                    placeholder="email.funcionario@empresa.com.br"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-3.5 py-2.5 bg-white/5 border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                      errors.email ? 'border-rose-400/60 bg-rose-500/10' : 'border-white/15 focus:border-indigo-400'
                    }`}
                  />
                  {errors.email && <p className="text-xs text-rose-400 mt-1 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.email}</p>}
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="input-form-chave-pix" className="block text-xs font-medium text-slate-300 mb-1">
                    Chave PIX
                  </label>
                  <div className="flex gap-2">
                    <select
                      id="select-tipo-chave-pix"
                      value={formData.tipoChavePix || 'CPF'}
                      onChange={(e) => setFormData({ ...formData, tipoChavePix: e.target.value as any })}
                      className="w-32 px-3 py-2.5 bg-slate-950/80 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    >
                      <option value="CPF" className="bg-slate-900 text-white">CPF</option>
                      <option value="Email" className="bg-slate-900 text-white">E-mail</option>
                      <option value="Telefone" className="bg-slate-900 text-white">Telefone</option>
                      <option value="Aleatória" className="bg-slate-900 text-white">Aleatória</option>
                    </select>
                    <input
                      id="input-form-chave-pix"
                      type="text"
                      placeholder="Informe a chave PIX para pagamentos (opcional)"
                      value={formData.chavePix}
                      onChange={(e) => setFormData({ ...formData, chavePix: e.target.value })}
                      className={`flex-1 px-3.5 py-2.5 bg-white/5 border rounded-xl text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                        errors.chavePix ? 'border-rose-400/60 bg-rose-500/10' : 'border-white/15 focus:border-indigo-400'
                      }`}
                    />
                  </div>
                  {errors.chavePix && <p className="text-xs text-rose-400 mt-1 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.chavePix}</p>}
                </div>
              </div>
            </div>

            {/* Contato de Emergência */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-white/10 pb-1.5">
                Contato de Emergência
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="input-form-contato-emergencia" className="block text-xs font-medium text-slate-300 mb-1">
                    Nome e Telefone de Emergência
                  </label>
                  <input
                    id="input-form-contato-emergencia"
                    type="text"
                    placeholder="Ex: Maria da Silva (61 99999-9999)"
                    value={formData.contatoEmergencia}
                    onChange={(e) => setFormData({ ...formData, contatoEmergencia: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/15 focus:border-indigo-400 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div>
                  <label htmlFor="input-form-parentesco-emergencia" className="block text-xs font-medium text-slate-300 mb-1">
                    Parentesco do Contato
                  </label>
                  <input
                    id="input-form-parentesco-emergencia"
                    type="text"
                    placeholder="Ex: Mãe, Pai, Cônjuge, Irmão(ã), Amigo(a)"
                    value={formData.parentescoEmergencia}
                    onChange={(e) => setFormData({ ...formData, parentescoEmergencia: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/15 focus:border-indigo-400 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>
            </div>

            {/* Inativo Details if inativo */}
            {formData.aba === 'inativo' && (
              <div className="space-y-3 bg-amber-500/10 p-4 rounded-xl border border-amber-500/30 backdrop-blur-md">
                <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Informações de Inativação
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="input-form-data-desligamento" className="block text-xs font-medium text-slate-300 mb-1">
                      Data de Desligamento / Inativação
                    </label>
                    <input
                      id="input-form-data-desligamento"
                      type="date"
                      value={formData.dataDesligamento || ''}
                      onChange={(e) => setFormData({ ...formData, dataDesligamento: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white/5 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-form-motivo-inativacao" className="block text-xs font-medium text-slate-300 mb-1">
                      Motivo da Inativação
                    </label>
                    <input
                      id="input-form-motivo-inativacao"
                      type="text"
                      placeholder="Ex: Demissão sem justa causa, Pedido, etc."
                      value={formData.motivoInativacao || ''}
                      onChange={(e) => setFormData({ ...formData, motivoInativacao: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white/5 border border-white/15 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-white/5 border-t border-white/10">
            <button
              id="btn-cancel-form"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-300 bg-white/5 border border-white/15 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              id="btn-submit-employee-form"
              type="submit"
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/30 rounded-xl shadow-lg shadow-indigo-900/50 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{employeeToEdit ? 'Atualizar Dados' : 'Salvar Cadastro'}</span>
            </button>
          </div>
        </form>

        {/* Modal Popup de Confirmação de Campos Faltantes */}
        {showMissingModal && (
          <div
            id="missing-fields-modal-overlay"
            className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-5"
          >
            <div
              id="missing-fields-dialog"
              className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 text-slate-100 animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">
                    Campos não preenchidos
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">
                    Os seguintes campos foram deixados em branco no formulário:
                  </p>
                </div>
              </div>

              {/* Lista dos campos faltantes */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 max-h-44 overflow-y-auto">
                <ul className="space-y-1.5 text-xs text-slate-200">
                  {missingFields.map((field) => (
                    <li key={field.id} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span className="font-medium text-slate-200">{field.label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-xs text-slate-400">
                Você pode optar por preenchê-los agora ou salvar o colaborador com os dados atuais.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
                <button
                  id="btn-proceed-without-filling"
                  type="button"
                  onClick={executeSave}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 rounded-xl transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Prosseguir sem preencher</span>
                </button>
                <button
                  id="btn-fill-missing-fields"
                  type="button"
                  onClick={handleFocusFirstMissing}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/30 rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Preencher</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

