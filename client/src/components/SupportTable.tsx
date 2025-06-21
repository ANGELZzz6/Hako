import React from 'react';
import SupportRow from './SupportRow';

interface Ticket {
  id: number;
  title: string;
  description: string;
  user: string;
  priority: string;
  status: string;
  category: string;
  createdAt: string;
}

interface SupportTableProps {
  tickets: Ticket[];
}

const SupportTable: React.FC<SupportTableProps> = ({ tickets }) => {
  return (
    <div className="table-container">
      <table className="support-table">
        <thead>
          <tr>
            <th>Título</th>
            <th>Usuario</th>
            <th>Prioridad</th>
            <th>Estado</th>
            <th>Categoría</th>
            <th>Fecha</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <SupportRow key={ticket.id} ticket={ticket} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SupportTable; 