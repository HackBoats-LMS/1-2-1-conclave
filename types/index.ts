export interface User {
  id: string;
  email: string;
  name: string;
  businessName?: string;
  businessCategory?: string;
  contactNumber?: string;
  description?: string;
  role: 'ADMIN' | 'USER';
  isApproved: boolean;
  onboardingCompleted: boolean;
}

export interface Table {
  id: string;
  roundId: string;
  tableNumber: number;
}

export interface Round {
  id: string;
  slotId: string;
  roundNumber: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  startTime?: string;
}

export interface Slot {
  id: string;
  slotNumber: number;
}

export interface Referral {
  id: string;
  fromUserId: string;
  toUserId: string;
  note?: string;
  createdAt: string;
}
