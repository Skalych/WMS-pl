export enum UserRole {
  ADMIN_MANAGER = 'ADMIN_MANAGER',
  INBOUND_OPERATOR = 'INBOUND_OPERATOR',
  PICKER = 'PICKER',
  PACKER_DISPATCHER = 'PACKER_DISPATCHER',
}

export enum WorkerStatus {
  OFFLINE = 'OFFLINE',
  IDLE = 'IDLE',
  RECEIVING = 'RECEIVING',
  PUTAWAY = 'PUTAWAY',
  PICKING = 'PICKING',
  SORTING = 'SORTING',
  DISPATCHING = 'DISPATCHING',
  BREAK = 'BREAK',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  IN_WAVE = 'IN_WAVE',
  PICKED_BATCH = 'PICKED_BATCH',
  SORTED = 'SORTED',
  PACKED = 'PACKED',
  SHIPPED = 'SHIPPED',
  CANCELLED = 'CANCELLED',
}

export enum WaveStatus {
  DRAFT = 'DRAFT',
  RELEASED = 'RELEASED',
  IN_PROGRESS = 'IN_PROGRESS',
  PICKED = 'PICKED',
  SORTING = 'SORTING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TaskType {
  RECEIVE_INBOUND = 'RECEIVE_INBOUND',
  PUTAWAY = 'PUTAWAY',
  BATCH_PICK = 'BATCH_PICK',
  PUT_WALL_SORT = 'PUT_WALL_SORT',
  DISPATCH = 'DISPATCH',
}

export interface Employee {
  id: string;
  fullName: string;
  role: UserRole;
  status: WorkerStatus;
  currentLocation: string;
  currentTaskNumber: string | null;
  currentWaveNumber: string | null;
  pickingProgress: number; // 0-100
  shiftTime: string;
  totalPicked: number;
  efficiency: number;
}

export enum ShiftEventType {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  BREAK_START = 'BREAK_START',
  BREAK_END = 'BREAK_END',
  IDLE_START = 'IDLE_START',
  IDLE_END = 'IDLE_END',
}

export interface ShiftEvent {
  id: string;
  event_type: ShiftEventType;
  timestamp: string;
}

export interface Shift {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  total_tasks_completed: number;
  total_items_picked: number;
  total_volume_cm3: number;
  total_orders_completed: number;
  error_count: number;
  events?: ShiftEvent[];
}

export interface InventoryItem {
  id: string;
  sku: string;
  productName: string;
  category: string;
  location: string;
  quantity: number;
  reservedQuantity: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  itemCount: number;
  status: OrderStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  waveNumber?: string;
  createdAt: string;
}

export interface Wave {
  id: string;
  waveNumber: string;
  status: WaveStatus;
  ordersCount: number;
  progress: number; // 0-100
  zone: string;
}

export interface DashboardStats {
  activeOrders: number;
  employeesOnline: number;
  totalEmployees: number;
  inventoryAccuracy: number;
  ordersShippedToday: number;
  inboundPending: number;
  activeWaves: number;
}

export interface MacroOrder {
  id: string;
  referenceNumber: string;
  status: OrderStatus;
  ordersCount: number;
  progress: number;
  createdAt: string;
}
