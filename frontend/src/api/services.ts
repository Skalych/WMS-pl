import { apiClient } from './client';
import { 
  UserRole, WorkerStatus, Employee, DashboardStats, 
  Order, Wave, InventoryItem, MacroOrder, InboundShipment, InventoryTransaction
} from '../types';

// Auth Services
export const authService = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', {
      email,
      password
    });
    return response.data;
  },

  getMe: async () => {
    const response = await apiClient.get('/users/me');
    return response.data;
  },
  
  register: async (email: string, password: string, fullName: string, role: UserRole) => {
    const response = await apiClient.post('/auth/register', {
      email, password, full_name: fullName, role
    });
    return response.data;
  }
};

// Dashboard Services
export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get('/dashboard/stats');
    const d = response.data;
    return {
      activeOrders: d.active_orders || 0,
      employeesOnline: d.employees_online || 0,
      totalEmployees: d.total_employees || 0,
      inventoryAccuracy: d.inventory_accuracy || 0,
      ordersShippedToday: d.orders_shipped_today || 0,
      inboundPending: d.inbound_pending || 0,
      activeWaves: d.active_waves || 0
    };
  },
  toggleSimulation: async (active: boolean): Promise<{status: string, simulation_active: boolean}> => {
    const response = await apiClient.post('/dashboard/simulation/toggle', { active });
    return response.data;
  }
};

// Users / Employees Services
export const userService = {
  getEmployees: async (role?: UserRole, status?: WorkerStatus): Promise<Employee[]> => {
    let url = '/users';
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (status) params.append('status', status);
    
    if (params.toString()) url += `?${params.toString()}`;
    const response = await apiClient.get(url);
    
    // Мапинг полів бекенду на інтерфейс фронтенду
    return response.data.map((u: any) => ({
      id: u.id,
      fullName: u.full_name,
      role: u.role,
      status: u.status,
      currentLocation: u.current_location_code || 'N/A',
      currentTaskNumber: null,
      currentWaveNumber: null,
      pickingProgress: 0,
      shiftTime: '00:00',
      totalPicked: u.items_picked || 0,
      efficiency: u.efficiency || 1.0
    }));
  },
  
  getCurrentShift: async (userId: string): Promise<any> => {
    const response = await apiClient.get(`/users/${userId}/shift/current`);
    return response.data;
  },
  
  getPastShifts: async (userId: string): Promise<any[]> => {
    const response = await apiClient.get(`/users/${userId}/shifts`);
    return response.data;
  },

  startBreak: async (userId: string): Promise<any> => {
    const response = await apiClient.post(`/users/${userId}/break/start`);
    return response.data;
  },

  endBreak: async (userId: string): Promise<any> => {
    const response = await apiClient.post(`/users/${userId}/break/end`);
    return response.data;
  },

  updateStatus: async (userId: string, status: WorkerStatus, efficiency?: number, locationId?: string) => {
    const response = await apiClient.patch(`/users/${userId}/status`, { status, efficiency, location_id: locationId });
    return response.data;
  },

  startShift: async (userIds: string[]) => {
    const response = await apiClient.post(`/users/shift/start`, { user_ids: userIds });
    return response.data;
  },

  endShift: async (userIds: string[]) => {
    const response = await apiClient.post(`/users/shift/end`, { user_ids: userIds });
    return response.data;
  }
};

export const inboundService = {
  getShipments: async (): Promise<InboundShipment[]> => {
    const response = await apiClient.get('/inbound');
    return response.data.map((s: any) => ({
      id: s.id,
      shipmentNumber: s.shipment_number,
      supplierName: s.supplier_name,
      status: s.status,
      dockNumber: s.dock_number,
      itemsCount: s.items_count,
      createdAt: s.created_at,
    }));
  },

  createShipment: async (supplierName: string, dockNumber: string, items: { product_id: string; expected_quantity: number }[]) => {
    const response = await apiClient.post('/inbound', {
      supplier_name: supplierName,
      dock_number: dockNumber || null,
      items,
    });
    return response.data;
  },

  receiveShipment: async (shipmentId: string) => {
    const response = await apiClient.post(`/inbound/${shipmentId}/receive`);
    return response.data;
  },
};

export const inventoryService = {
  getInventory: async (page: number = 1, limit: number = 50, search?: string, status?: string, category?: string, sortBy?: string): Promise<{items: InventoryItem[], total: number}> => {
    let url = `/inventory/?page=${page}&size=${limit}`;
    if (search) url += `&search=${search}`;
    if (status && status !== 'all') url += `&status=${status}`;
    if (category && category !== 'all') url += `&category=${category}`;
    if (sortBy && sortBy !== 'newest') url += `&sort_by=${sortBy}`;
    const response = await apiClient.get(url);
    return {
      total: response.data.total,
      items: response.data.items.map((item: any) => ({
        id: item.id,
        sku: item.sku,
        productName: item.product_name,
        category: item.category || 'Unknown',
        location: item.location,
        quantity: item.quantity,
        reservedQuantity: item.reserved_quantity,
        status: item.status
      }))
    };
  },

  getTransactions: async (page = 1, size = 50): Promise<{ items: InventoryTransaction[]; total: number }> => {
    const response = await apiClient.get(`/inventory/transactions?page=${page}&size=${size}`);
    return {
      total: response.data.total,
      items: response.data.items.map((tx: any) => ({
        id: tx.id,
        productSku: tx.product_sku,
        quantity: tx.quantity,
        transactionType: tx.transaction_type,
        sourceLocation: tx.source_location,
        targetLocation: tx.target_location,
        createdAt: tx.created_at,
      })),
    };
  }
};

// Orders & Waves Services
export const orderService = {
  getOrders: async (): Promise<Order[]> => {
    const response = await apiClient.get('/orders');
    return response.data.map((o: any) => ({
      id: o.id,
      orderNumber: o.order_number,
      customerName: o.customer_name || 'Customer',
      itemCount: o.item_count || 0,
      status: o.status,
      priority: o.priority,
      macroOrderId: o.macro_order_id,
      createdAt: o.created_at
    }));
  },
  
  getMacroOrders: async (): Promise<MacroOrder[]> => {
    const response = await apiClient.get('/orders/macro');
    return response.data.map((m: any) => ({
      id: m.id,
      referenceNumber: m.reference_number,
      status: m.status,
      ordersCount: m.orders_count,
      progress: m.progress,
      createdAt: m.created_at
    }));
  },

  createMacroOrder: async (size: 'small' | 'medium' | 'large'): Promise<MacroOrder> => {
    const response = await apiClient.post('/orders/macro', { size });
    const m = response.data;
    return {
      id: m.id,
      referenceNumber: m.reference_number,
      status: m.status,
      ordersCount: m.orders_count,
      progress: m.progress,
      createdAt: m.created_at
    };
  },
  
  getWaves: async (): Promise<Wave[]> => {
    const response = await apiClient.get('/waves');
    return response.data.map((w: any) => ({
      id: w.id,
      waveNumber: w.wave_number,
      status: w.status,
      ordersCount: w.total_orders_count,
      progress: w.progress || 0,
      zone: 'All'
    }));
  },

  createWave: async (orderIds: string[]): Promise<Wave> => {
    const response = await apiClient.post('/waves', { order_ids: orderIds });
    const w = response.data;
    return {
      id: w.id,
      waveNumber: w.wave_number,
      status: w.status,
      ordersCount: w.total_orders_count,
      progress: w.progress || 0,
      zone: 'All'
    };
  }
};
