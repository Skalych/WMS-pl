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
  PARTIALLY_IN_WAVE = 'PARTIALLY_IN_WAVE',
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
  currentCartItems?: number;
  cartCapacityItems?: number;
  hasActiveShift?: boolean;
  breakSummary?: BreakSummary | null;
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

export interface BreakSession {
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
}

export interface BreakSummary {
  breakCount: number;
  breakMinutes: number;
  overLimit: boolean;
  currentBreakStartedAt: string | null;
  sessions: BreakSession[];
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
  total_units_received?: number;
  events?: ShiftEvent[];
  break_summary: BreakSummary;
}

export interface MyShiftTaskProgress {
  taskId: string;
  taskType: string;
  quantityDone: number;
  quantityTotal: number;
}

export interface MyShiftSnapshot {
  hasActiveShift: boolean;
  status: WorkerStatus;
  role: UserRole;
  shiftId: string | null;
  startTime: string | null;
  elapsedMinutes: number;
  breakMinutes: number;
  breakCount: number;
  currentBreakStartedAt: string | null;
  onBreak: boolean;
  totalItemsPicked: number;
  totalUnitsReceived: number;
  totalTasksCompleted: number;
  pickRatePerHour: number;
  currentTask: MyShiftTaskProgress | null;
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
  totalRequested: number;
  totalAllocated: number;
  status: OrderStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  waveNumber?: string;
  createdAt: string;
}

export interface WaveAllocationSummary {
  linesFullyAllocated: number;
  linesPartiallyAllocated: number;
  linesSkipped: number;
  totalUnitsAllocated: number;
}

export interface WaveCreateResult extends Wave {
  allocationSummary: WaveAllocationSummary;
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

export enum InboundStatus {
  PENDING = 'PENDING',
  IN_RECEIVING = 'IN_RECEIVING',
  RECEIVED = 'RECEIVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface InboundShipment {
  id: string;
  shipmentNumber: string;
  supplierName: string;
  status: InboundStatus;
  dockNumber?: string;
  itemsCount: number;
  createdAt: string;
}

export interface InventoryTransaction {
  id: string;
  productSku: string;
  quantity: number;
  transactionType: string;
  sourceLocation?: string;
  targetLocation?: string;
  createdAt: string;
}

export interface MacroOrder {
  id: string;
  referenceNumber: string;
  status: OrderStatus;
  ordersCount: number;
  progress: number;
  createdAt: string;
}

export interface TerminalTask {
  taskId: string;
  taskType: string;
  locationCode: string;
  productSku: string;
  quantityRequired: number;
  cartId: string | null;
}

export interface TerminalScanResult {
  status: string;
  message: string;
  quantity_picked?: number;
  task_completed?: boolean;
}

export interface ShiftLiveBucket {
  time: string;
  picked: number;
  inbound: number;
}

export interface ShiftLivePicker {
  user_id: string;
  name: string;
  items: number;
  pct_of_leader: number;
}

export interface ShiftLiveEventItem {
  id: string;
  at: string;
  type: string;
  actor: string;
  detail: string;
}

export interface ShiftLiveSnapshot {
  shift_active: boolean;
  shift_started_at: string | null;
  elapsed_seconds: number;
  items_picked: number;
  items_picked_delta_5m: number;
  waves_completed: number;
  waves_active: number;
  orders_shipped: number;
  inbound_received_units: number;
  pickers_online: number;
  pick_rate_per_hour: number;
  bucket_minutes: number;
  chart_window_start: string | null;
  chart_window_end: string | null;
  hourly_buckets: ShiftLiveBucket[];
  top_pickers: ShiftLivePicker[];
  recent_events: ShiftLiveEventItem[];
}

