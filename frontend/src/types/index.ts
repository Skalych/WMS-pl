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
  inventoryAccuracy: number;
  orderVelocity: number;
  ordersShippedToday: number;
  inboundReceived: number;
}
