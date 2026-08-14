export type TabType = '710_711' | 'parkshopping' | 'freela' | 'inativo';

export interface Employee {
  id: string;
  nome: string;
  cpf: string;
  endereco: string;
  cep?: string;
  dataNascimento: string;
  dataAdmissao: string;
  email: string;
  chavePix: string;
  tipoChavePix?: 'CPF' | 'Email' | 'Telefone' | 'Aleatória';
  contatoEmergencia: string;
  parentescoEmergencia: string;
  telefoneContatoEmergencia?: string;
  aba: TabType;
  cargo?: string;
  observacoes?: string;
  dataDesligamento?: string;
  motivoInativacao?: string;
  createdAt: string;
  updatedAt: string;
}

export type NewEmployeeFormData = Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>;
