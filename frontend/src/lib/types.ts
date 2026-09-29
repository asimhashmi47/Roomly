export type Role = 'ADMIN' | 'USER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  currentBooking?: { title: string; endTime: string } | null;
}

export interface Booking {
  id: string;
  roomId: string;
  title: string;
  startTime: string;
  endTime: string;
  createdBy: string;
  creatorName: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  userName: string | null;
  createdAt: string;
}

export interface SystemLogEntry {
  id: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  createdAt: string;
}

export interface Stats {
  totalRooms: number;
  totalUsers: number;
  todaysBookings: number;
  upcomingBookings: number;
  recentActivity: AuditEntry[];
}

export interface Paged<T> {
  total: number;
  page: number;
  pageSize: number;
  logs: T[];
}
