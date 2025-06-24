import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './UserManagement.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import SearchBar from '../components/SearchBar';
import UserTable from '../components/UserTable';
import EditUserModal from '../components/EditUserModal';
import userService, { type User, type UpdateUserData } from '../services/userService';

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Cargar usuarios al montar el componente
  useEffect(() => {
    loadUsers();
  }, []);

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
    if (!window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      return;
    }

    try {
      await userService.deleteUser(userId);
      setUsers(users.filter(user => user._id !== userId));
      setError('');
    } catch (err: any) {
      setError(err.message || 'Error al eliminar usuario');
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
    <div className="user-management">
      {/* Barra superior */}
      <header className="user-header-bar">
        <div className="header-content">
          <div className="header-left">
            <i className="bi bi-people header-icon"></i>
            <span className="header-title">Users</span>
          </div>
          <div className="header-center">
            <h1 className="user-header">
              <span className="logo-japanese">箱</span>
              <span className="brand-text">hako</span>
              <span className="develop-text">Develop</span>
            </h1>
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
    </div>
  );
};

export default UserManagement; 