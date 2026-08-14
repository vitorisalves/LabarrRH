import { useState, useEffect, useMemo, useCallback } from 'react';
import { initialEmployees } from './data/initialEmployees';
import { Employee, NewEmployeeFormData, TabType } from './types';
import { Header } from './components/Header';
import { TabNav } from './components/TabNav';
import { EmployeeTable } from './components/EmployeeTable';
import { EmployeeFormModal } from './components/EmployeeFormModal';
import { EmployeeDetailsModal } from './components/EmployeeDetailsModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { TransferModal } from './components/TransferModal';
import { fetchEmployeesFromSheets, syncEmployeesToSheets } from './services/sheetsService';

const STORAGE_KEY = 'rh_employees_database_v1';

export default function App() {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Erro ao ler localStorage', e);
    }
    return initialEmployees;
  });

  const [activeTab, setActiveTab] = useState<TabType>('710_711');
  const [searchTerm, setSearchTerm] = useState('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [employeeToTransfer, setEmployeeToTransfer] = useState<Employee | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
    } catch (e) {
      console.error('Erro ao salvar no localStorage', e);
    }
  }, [employees]);

  // Push updates to Google Sheets in background
  const triggerSheetsSync = useCallback(async (updatedList: Employee[]) => {
    setSyncStatus('syncing');
    try {
      await syncEmployeesToSheets(updatedList);
      setSyncStatus('synced');
      const now = new Date();
      setLastSyncTime(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      );
    } catch (err) {
      console.error('Erro ao sincronizar com Google Sheets:', err);
      setSyncStatus('error');
    }
  }, []);

  // Initial load from Google Sheets
  useEffect(() => {
    let isMounted = true;
    const loadFromSheets = async () => {
      setSyncStatus('syncing');
      try {
        const remoteEmployees = await fetchEmployeesFromSheets();
        if (isMounted) {
          if (remoteEmployees.length > 0) {
            setEmployees(remoteEmployees);
          } else {
            // Se a planilha estiver vazia, sincroniza a base inicial para as abas
            await syncEmployeesToSheets(employees);
          }
          setSyncStatus('synced');
          const now = new Date();
          setLastSyncTime(
            `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
          );
        }
      } catch (err) {
        console.error('Falha ao carregar dados do Google Sheets na inicialização:', err);
        if (isMounted) {
          setSyncStatus('error');
        }
      }
    };

    loadFromSheets();

    return () => {
      isMounted = false;
    };
  }, []);

  // Manual pull/refresh from Google Sheets
  const handleManualSync = async () => {
    setSyncStatus('syncing');
    try {
      const remoteEmployees = await fetchEmployeesFromSheets();
      if (remoteEmployees.length > 0) {
        setEmployees(remoteEmployees);
      } else {
        await syncEmployeesToSheets(employees);
      }
      setSyncStatus('synced');
      const now = new Date();
      setLastSyncTime(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      );
    } catch (err) {
      console.error('Erro na sincronização manual com Google Sheets:', err);
      setSyncStatus('error');
    }
  };

  // Counts by Tab
  const counts = useMemo(() => {
    return {
      '710_711': employees.filter((e) => e.aba === '710_711').length,
      parkshopping: employees.filter((e) => e.aba === 'parkshopping').length,
      freela: employees.filter((e) => e.aba === 'freela').length,
      inativo: employees.filter((e) => e.aba === 'inativo').length,
    };
  }, [employees]);

  // Active employees count (excluding inativos) for header
  const activeEmployeesCount = useMemo(() => {
    return employees.filter((e) => e.aba !== 'inativo').length;
  }, [employees]);

  // Filtered employees for current tab + search
  const filteredEmployees = useMemo(() => {
    return employees
      .filter((e) => e.aba === activeTab)
      .filter((e) => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
          e.nome.toLowerCase().includes(term) ||
          e.cpf.includes(term) ||
          e.email.toLowerCase().includes(term) ||
          e.chavePix.toLowerCase().includes(term) ||
          (e.cargo && e.cargo.toLowerCase().includes(term))
        );
      });
  }, [employees, activeTab, searchTerm]);

  // Actions
  const handleSaveEmployee = (data: NewEmployeeFormData, id?: string) => {
    const now = new Date().toISOString();
    let updatedList: Employee[];

    if (id) {
      // Edit existing
      updatedList = employees.map((emp) =>
        emp.id === id
          ? {
              ...emp,
              ...data,
              updatedAt: now,
            }
          : emp
      );
      setEmployees(updatedList);
    } else {
      // Create new
      const newEmp: Employee = {
        id: `emp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        ...data,
        createdAt: now,
        updatedAt: now,
      };
      updatedList = [newEmp, ...employees];
      setEmployees(updatedList);
      setActiveTab(data.aba);
      setSearchTerm('');
    }

    triggerSheetsSync(updatedList);
  };

  const handleDeleteEmployee = (id: string) => {
    const updatedList = employees.filter((e) => e.id !== id);
    setEmployees(updatedList);
    triggerSheetsSync(updatedList);
  };

  const handleTransferEmployee = (employeeId: string, targetTab: TabType, reason?: string) => {
    const now = new Date().toISOString();
    const updatedList = employees.map((emp) => {
      if (emp.id === employeeId) {
        return {
          ...emp,
          aba: targetTab,
          motivoInativacao: targetTab === 'inativo' ? reason : emp.motivoInativacao,
          dataDesligamento: targetTab === 'inativo' ? now.split('T')[0] : emp.dataDesligamento,
          updatedAt: now,
        };
      }
      return emp;
    });

    setEmployees(updatedList);
    triggerSheetsSync(updatedList);
  };

  const openNewEmployeeModal = () => {
    setEmployeeToEdit(null);
    setIsFormOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEmployeeToEdit(emp);
    setIsFormOpen(true);
  };

  const openDetailsModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsDetailsOpen(true);
  };

  const openDeleteModal = (emp: Employee) => {
    setEmployeeToDelete(emp);
    setIsDeleteOpen(true);
  };

  const openTransferModal = (emp: Employee) => {
    setEmployeeToTransfer(emp);
    setIsTransferOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background ambient lighting gradients */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(79, 70, 229, 0.15) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 0.6) 0%, transparent 100%)',
        }}
      />
      <div className="fixed top-12 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="fixed bottom-10 right-10 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Top Header */}
      <Header
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onOpenNewModal={openNewEmployeeModal}
        activeTab={activeTab}
        totalEmployees={activeEmployeesCount}
        employees={employees}
        syncStatus={syncStatus}
        lastSyncTime={lastSyncTime}
        onManualSync={handleManualSync}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[98%] 2xl:max-w-[1800px] mx-auto px-2 sm:px-4 lg:px-6 py-6 relative z-10">
        {/* Navigation Tabs (710/711, Parkshopping, Freela, Inativo) */}
        <TabNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={counts}
        />

        {/* Tab Content Table Container */}
        <div className="bg-white/5 backdrop-blur-2xl p-4 sm:p-6 border border-t-0 border-white/10 rounded-b-2xl shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div className="text-sm text-slate-300 font-medium flex items-center gap-2">
              <span>Exibindo</span>
              <span className="font-bold text-white px-2.5 py-0.5 rounded-md bg-white/10 border border-white/10 text-sm">
                {filteredEmployees.length}
              </span>
              <span>colaborador(es) na aba</span>
              <span className="font-bold text-indigo-300 text-sm">
                {activeTab === '710_711'
                  ? '710/711'
                  : activeTab === 'parkshopping'
                  ? 'Parkshopping'
                  : activeTab === 'freela'
                  ? 'Freela'
                  : 'Inativo'}
              </span>
              {searchTerm && <span className="text-slate-400"> (filtro: "{searchTerm}")</span>}
            </div>
          </div>

          <EmployeeTable
            employees={filteredEmployees}
            activeTab={activeTab}
            onViewDetails={openDetailsModal}
            onEdit={openEditModal}
            onTransfer={openTransferModal}
            onDelete={openDeleteModal}
            onNewEmployee={openNewEmployeeModal}
          />
        </div>
      </main>


      {/* Modals */}
      <EmployeeFormModal
        isOpen={isFormOpen}
        employeeToEdit={employeeToEdit}
        defaultTab={activeTab}
        onClose={() => {
          setIsFormOpen(false);
          setEmployeeToEdit(null);
        }}
        onSave={handleSaveEmployee}
      />

      <EmployeeDetailsModal
        isOpen={isDetailsOpen}
        employee={selectedEmployee}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedEmployee(null);
        }}
        onEdit={(emp) => {
          setIsDetailsOpen(false);
          openEditModal(emp);
        }}
        onTransfer={(emp) => {
          setIsDetailsOpen(false);
          openTransferModal(emp);
        }}
        onDelete={(emp) => {
          setIsDetailsOpen(false);
          openDeleteModal(emp);
        }}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteOpen}
        employee={employeeToDelete}
        onClose={() => {
          setIsDeleteOpen(false);
          setEmployeeToDelete(null);
        }}
        onConfirm={handleDeleteEmployee}
      />

      <TransferModal
        isOpen={isTransferOpen}
        employee={employeeToTransfer}
        onClose={() => {
          setIsTransferOpen(false);
          setEmployeeToTransfer(null);
        }}
        onTransfer={handleTransferEmployee}
      />
    </div>
  );
}

