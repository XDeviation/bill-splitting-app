export enum BillStatus {
  UNPAID = 'unpaid',     // 未出账
  PENDING = 'pending',   // 待付款
  COMPLETED = 'completed', // 已完成
  MERGED = 'merged',     // 已合账
}

export enum CurrencyType {
  CNY = 'CNY', // 人民币
  JPY = 'JPY', // 日元
}

export interface User {
  id: string;
  name: string;
}

export interface BillShare {
  userId: string;
  amount: number;
  paid: boolean;
}

export interface Bill {
  id: string;
  title: string;
  description?: string;
  totalAmount: number;
  createdBy: string;
  createdAt: number;
  status: BillStatus;
  shares: BillShare[];
  currency: CurrencyType; // 账单货币类型
}

export interface Settlement {
  fromUser: string;
  toUser: string;
  amount: number;
  currency: CurrencyType; // 结算货币类型
} 