import type { UserRole } from './user';

export type AccessRequestStatus = 'pending' | 'approved' | 'denied';

export interface AccessRequest {
  id: string;
  uid: string;
  email: string;
  name: string;
  photoURL?: string;
  status: AccessRequestStatus;
  role?: UserRole;
  createdAt: string;
  updatedAt: string;
  lastNotifiedAt?: string;
}
