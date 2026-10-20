export interface User {
  id?: string;
  uid: string;
  email: string | null;
  displayName: string | null;
}

export type MemberStatus = 'Ativo' | 'Inativo' | 'Visitante';

export interface Member {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  birthDate: string;
  baptismDate: string;
  status: MemberStatus;
  isTither: boolean;
  notes: string;
  createdAt: string;
}

export type PaymentMethod = 'PIX' | 'Espécie' | 'Cartão' | 'Transferência';

export interface Tithe {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  contributionDate: string;
  status: 'Confirmado' | 'Pendente';
  notes: string;
  createdAt: string;
}

export interface IAuthService {
  hasUsers: () => Promise<boolean>;
  onAuthStateChanged: (callback: (user: User | null) => void) => () => void;
  signInWithGoogle: () => Promise<void>;
  login: (email: string, password: string) => Promise<User | null>;
  register: (email: string, password: string, displayName: string) => Promise<User | null>;
  signOut: () => Promise<void>;
}

export interface IDataRepository<T> {
  getAll: () => Promise<T[]>;
  add: (item: Omit<T, 'id'>) => Promise<string>;
  update: (id: string, item: Partial<T>) => Promise<void>;
  delete: (id: string) => Promise<void>;
  clear: () => Promise<void>;
  onSnapshot: (callback: (items: T[]) => void) => () => void;
}
