import { apiClient } from './client';
import { 
  UserRole, WorkerStatus, Employee, DashboardStats, 
  Order, Wave, InventoryItem, MacroOrder
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
    return response.data;
  }
};

// Users / Employees Services
export const userService = {
  getEmployees: async (role?: UserRole, status?: WorkerStatus): Promise<Employee[]> => {
    let url = '/users/';
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
      currentLocation: u.current_location_id || 'N/A',
      currentTaskNumber: null,
      currentWaveNumber: null,
      pickingProgress: 0,
      shiftTime: '00:00',
      totalPicked: u.items_picked || 0,
      efficiency: u.efficiency || 1.0
    }));
  },
  
  updateEmployee: async (id: string, updates: { status?: WorkerStatus, efficiency?: number }) => {
    const response = await apiClient.patch(`/users/${id}/status`, updates);
    return response.data;
  }
};

// Inventory Services
export const inventoryService = {
  getInventory: async (): Promise<InventoryItem[]> => {
    const response = await apiClient.get('/inventory/');
    return response.data.map((item: any) => ({
      id: item.id,
      sku: item.sku,
      productName: item.product_name,
      category: item.category || 'Unknown',
      location: item.location,
      quantity: item.quantity,
      reservedQuantity: item.reserved_quantity,
      status: item.status
    }));
  }
};

// Orders & Waves Services
export const orderService = {
  getOrders: async (): Promise<Order[]> => {
    const response = await apiClient.get('/orders/');
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
    const response = await apiClient.get('/waves/');
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
    const response = await apiClient.post('/waves/', { order_ids: orderIds });
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
