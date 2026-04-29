import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './UserManagement.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import SearchBar from '../components/SearchBar';
import UserTable from '../components/UserTable';
import EditUserModal from '../components/EditUserModal';
import userService, { type User, type UpdateUserData } from '../services/userService';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';


const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isAdmin, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Estado para el modal de confirmación genérico
  const [modalConfig, setModalConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    type: 'confirm' | 'alert';
    variant: 'primary' | 'danger' | 'warning' | 'success' | 'info';
    confirmText?: string;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => { },
    type: 'alert',
    variant: 'primary'
  });

  // Función auxiliar para mostrar el modal de confirmación
  const showConfirm = (title: string, message: string, variant: 'primary' | 'danger' | 'warning' | 'success' | 'info' = 'primary', confirmText?: string) => {
    return new Promise<boolean>((resolve) => {
      setModalConfig({
        show: true,
        title,
        message,
        onConfirm: () => {
          setModalConfig(prev => ({ ...prev, show: false }));
          resolve(true);
        },
        onCancel: () => {
          setModalConfig(prev => ({ ...prev, show: false }));
          resolve(false);
        },
        type: 'confirm',
        variant,
        confirmText
      });
    });
  };

  // Cargar usuarios al montar el componente
  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate('/', { replace: true });
    } else {
      loadUsers();
    }
  }, [isAuthenticated, isAdmin, navigate]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await userService.getAllUsers();
      setUsers(usersData);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleDelete = async (userId: string) => {
    const confirmed = await showConfirm(
      'Desactivar usuario',
      'El usuario será desactivado. Sus datos se conservarán en la base de datos y podrás reactivarlo en cualquier momento con el botón de estado. ¿Deseas continuar?',
      'danger',
      'Desactivar usuario'
    );
    
    if (!confirmed) return;

    try {
      const result = await userService.deleteUser(userId);
      // Soft delete: actualizar isActive en lugar de remover de la lista
      setUsers(users.map(user =>
        user._id === userId ? { ...user, isActive: result.user?.isActive ?? false } : user
      ));
      setError('');
    } catch (err: any) {
      setError(err.message || 'Error al desactivar usuario');
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      const result = await userService.toggleUserStatus(userId);
      setUsers(users.map(user =>
        user._id === userId ? { ...user, isActive: result.user.isActive } : user
      ));
      setError('');
    } catch (err: any) {
      setError(err.message || 'Error al cambiar estado del usuario');
    }
  };

  const handleSaveUser = async (userData: UpdateUserData) => {
    if (!selectedUser) return;

    try {
      const result = await userService.updateUser(selectedUser._id, userData);
      setUsers(users.map(user =>
        user._id === selectedUser._id ? result.user : user
      ));
      setError('');
    } catch (err: any) {
      throw err; // Re-lanzar para que el modal maneje el error
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  return (
    <div className="user-management" data-theme="light">
      {/* Barra superior */}
      <header className="user-header-bar">
        <div className="header-content">
          <div className="header-left">
            <i className="bi bi-people header-icon"></i>
            <span className="header-title">Users</span>
          </div>
          <div className="header-center">
            <span className="logo-japanese">箱</span><span className="brand-text">hako</span>
          </div>
          <div className="header-right">
            <Link to="/admin" className="back-link">
              <i className="bi bi-arrow-left-circle header-icon"></i>
            </Link>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="user-main-content">
        <div className="container">
          {/* Barra de búsqueda */}
          <SearchBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />

          {/* Mensaje de error */}
          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="loading-container">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
              <p>Cargando usuarios...</p>
            </div>
          )}

          {/* Tabla de usuarios */}
          {!loading && (
            <UserTable
              users={filteredUsers}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
            />
          )}

          {/* Mensaje cuando no hay usuarios */}
          {!loading && filteredUsers.length === 0 && (
            <div className="no-users">
              <i className="bi bi-people-fill"></i>
              <p>No se encontraron usuarios</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal de edición */}
      <EditUserModal
        user={selectedUser}
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSaveUser}
      />

      {/* Modal de Confirmación Genérico */}
      <ConfirmModal
        show={modalConfig.show}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={modalConfig.onConfirm}
        onCancel={modalConfig.onCancel}
        type={modalConfig.type}
        variant={modalConfig.variant}
        confirmText={modalConfig.confirmText}
      />
    </div>
  );
};

export default UserManagement; 