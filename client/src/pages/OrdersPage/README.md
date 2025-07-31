# OrdersPage - Estructura Refactorizada

Este directorio contiene la versión refactorizada del componente `OrdersPage`, dividido en módulos más pequeños y organizados para mejorar la mantenibilidad y legibilidad del código.

## Estructura de Directorios

```
OrdersPage/
├── components/           # Componentes reutilizables
│   ├── ProductCard.tsx   # Tarjeta de producto individual
│   ├── LockerVisualization.tsx # Visualización de casilleros
│   ├── AppointmentCard.tsx # Tarjeta de reserva
│   ├── EditAppointmentModal.tsx # Modal de edición
│   ├── LoadingOverlay.tsx # Overlay de carga
│   └── index.ts         # Exportaciones de componentes
├── hooks/               # Hooks personalizados
│   └── useOrdersPage.ts # Hook principal con toda la lógica
├── utils/               # Utilidades
│   ├── dateUtils.ts     # Utilidades para manejo de fechas
│   └── productUtils.ts  # Utilidades para productos y casilleros
├── constants/           # Constantes
│   └── index.ts        # Constantes del componente
├── index.tsx           # Componente principal refactorizado
├── index.ts           # Exportaciones principales
└── README.md          # Esta documentación
```

## Componentes

### ProductCard
Muestra cada producto individual con su información, estado y opciones de selección.

### LockerVisualization
Visualiza los casilleros con el algoritmo de bin packing 3D.

### AppointmentCard
Muestra cada reserva activa con opciones de modificación y cancelación.

### EditAppointmentModal
Modal para editar fechas, horarios y casilleros de las reservas.

### LoadingOverlay
Overlay de carga reutilizable para diferentes operaciones.

## Hooks

### useOrdersPage
Hook principal que contiene toda la lógica de estado y funciones del componente original.

## Utilidades

### dateUtils.ts
- `createLocalDate`: Crear fechas locales correctamente
- `getAvailableDates`: Obtener fechas disponibles
- `getAvailableTimeSlotsForDate`: Obtener horarios disponibles
- `getTimeUntilAppointment`: Calcular tiempo restante
- `isAppointmentExpired`: Verificar si una reserva expiró
- `canModifyAppointment`: Verificar si se puede modificar
- `canAddProductsToAppointment`: Verificar si se pueden agregar productos

### productUtils.ts
- `getDimensiones`: Obtener dimensiones de un producto
- `getVolumen`: Calcular volumen de un producto
- `tieneDimensiones`: Verificar si tiene dimensiones
- `calculateSlotsNeeded`: Calcular slots necesarios
- `calculateLockerVolume`: Calcular volumen del casillero
- `hasLockerSpace`: Verificar espacio disponible
- `getLockerUsagePercentage`: Obtener porcentaje de uso
- `getAvailableLockersForEdit`: Obtener casilleros disponibles para edición

## Constantes

### index.ts
- `statusLabels`: Etiquetas de estado
- `statusColors`: Colores de estado
- `LOCKER_MAX_VOLUME`: Volumen máximo del casillero
- `LOCKER_MAX_SLOTS`: Slots máximos del casillero
- `SLOT_SIZE`: Tamaño de cada slot

## Beneficios de la Refactorización

1. **Separación de Responsabilidades**: Cada archivo tiene una responsabilidad específica
2. **Reutilización**: Los componentes y utilidades pueden ser reutilizados
3. **Mantenibilidad**: Es más fácil mantener y modificar código específico
4. **Legibilidad**: El código es más fácil de leer y entender
5. **Testabilidad**: Cada módulo puede ser testeado independientemente
6. **Escalabilidad**: Es más fácil agregar nuevas funcionalidades

## Uso

El componente principal `OrdersPage` ahora es un wrapper simple que importa y renderiza el componente refactorizado:

```tsx
import React from 'react';
import OrdersPageComponent from './OrdersPage/index';

const OrdersPage: React.FC = () => {
  return <OrdersPageComponent />;
};

export default OrdersPage;
```

Esto mantiene la compatibilidad con el código existente mientras aprovecha la nueva estructura modular. 