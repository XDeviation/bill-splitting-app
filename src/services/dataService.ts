import { User, Bill, BillStatus, Settlement, CurrencyType } from '../types';

// 使用localStorage存储数据
const STORAGE_KEYS = {
  USERS: 'bill-splitting-users',
  BILLS: 'bill-splitting-bills',
};

// 初始用户数据
const DEFAULT_USERS: User[] = [
  { id: '1', name: '张三' },
  { id: '2', name: '李四' },
  { id: '3', name: '王五' },
];

// 获取用户
export const getUsers = (): User[] => {
  if (typeof window === 'undefined') return DEFAULT_USERS;
  
  const stored = localStorage.getItem(STORAGE_KEYS.USERS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }
  
  return JSON.parse(stored);
};

// 添加用户
export const addUser = (name: string): User => {
  const users = getUsers();
  const newUser = {
    id: Date.now().toString(),
    name,
  };
  
  users.push(newUser);
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  return newUser;
};

// 更新用户
export const updateUser = (user: User): User => {
  const users = getUsers();
  const index = users.findIndex(u => u.id === user.id);
  
  if (index >= 0) {
    users[index] = user;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }
  
  return user;
};

// 获取账单
export const getBills = (): Bill[] => {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(STORAGE_KEYS.BILLS);
  if (!stored) return [];
  
  return JSON.parse(stored, (key, value) => {
    if (key === 'createdAt' && typeof value === 'string') return new Date(value).getTime();
    return value;
  });
};

// 添加账单
export const addBill = (bill: Omit<Bill, 'id' | 'createdAt'>): Bill => {
  const bills = getBills();
  
  // 确保创建者的分账标记为已支付
  const sharesWithCreatorPaid = bill.shares.map(share => {
    if (share.userId === bill.createdBy) {
      return { ...share, paid: true };
    }
    return share;
  });
  
  const newBill: Bill = {
    ...bill,
    id: Date.now().toString(),
    createdAt: Date.now(),
    currency: bill.currency || CurrencyType.CNY, // 默认使用人民币
    shares: sharesWithCreatorPaid
  };
  
  bills.push(newBill);
  localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
  return newBill;
};

// 更新账单
export const updateBill = (bill: Bill): Bill => {
  const bills = getBills();
  const index = bills.findIndex(b => b.id === bill.id);
  
  if (index >= 0) {
    bills[index] = bill;
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
  }
  
  return bill;
};

// 计算结算金额
export const calculateSettlements = (): Settlement[] => {
  const bills = getBills();
  const users = getUsers();
  
  // 按货币类型分组
  const settlementsByCurrency: Record<CurrencyType, Settlement[]> = {
    [CurrencyType.CNY]: [],
    [CurrencyType.JPY]: [],
  };
  
  // 分别计算不同货币类型的结算
  Object.values(CurrencyType).forEach(currency => {
    // 计算每个用户的净欠款（+表示需要支付给他人，-表示需要从他人收取）
    const balances: Record<string, number> = {};
    
    // 初始化余额
    users.forEach(user => {
      balances[user.id] = 0;
    });
    
    // 只考虑状态为PENDING的账单和指定货币类型
    const pendingBills = bills.filter(bill => 
      bill.status === BillStatus.PENDING && 
      bill.currency === currency
    );
    
    // 计算每个用户的余额
    pendingBills.forEach(bill => {
      bill.shares.forEach(share => {
        if (!share.paid) {
          // 欠款人需要支付（负值）
          balances[share.userId] -= share.amount;
          // 收款人需要收取（正值）
          balances[bill.createdBy] += share.amount;
        }
      });
    });
    
    // 计算最终的结算方案
    const debtors = Object.entries(balances)
      .filter(([_, balance]) => balance < 0)
      .sort((a, b) => a[1] - b[1]); // 从欠得最多的开始
    
    const creditors = Object.entries(balances)
      .filter(([_, balance]) => balance > 0)
      .sort((a, b) => b[1] - a[1]); // 从收得最多的开始
    
    let debtorIndex = 0;
    let creditorIndex = 0;
    
    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const [debtorId, debtorBalance] = debtors[debtorIndex];
      const [creditorId, creditorBalance] = creditors[creditorIndex];
      
      const debtAmount = Math.min(Math.abs(debtorBalance), creditorBalance);
      
      if (debtAmount > 0) {
        settlementsByCurrency[currency].push({
          fromUser: debtorId,
          toUser: creditorId,
          amount: debtAmount,
          currency: currency,
        });
      }
      
      // 更新余额
      const newDebtorBalance = debtorBalance + debtAmount;
      const newCreditorBalance = creditorBalance - debtAmount;
      
      // 更新数组中的值
      debtors[debtorIndex] = [debtorId, newDebtorBalance];
      creditors[creditorIndex] = [creditorId, newCreditorBalance];
      
      // 如果债务人已经还清或债权人已经收回，移动到下一个
      if (Math.abs(newDebtorBalance) < 0.01) debtorIndex++;
      if (newCreditorBalance < 0.01) creditorIndex++;
    }
  });
  
  // 合并所有货币类型的结算结果
  return [
    ...settlementsByCurrency[CurrencyType.CNY],
    ...settlementsByCurrency[CurrencyType.JPY],
  ];
};

// 批量操作账单
export const batchUpdateBills = (billIds: string[], action: 'markAsPending' | 'markAsCompleted', filterUserId?: string, filterType?: 'all' | 'toPay' | 'toReceive'): Bill[] => {
  const bills = getBills();
  const updatedBills: Bill[] = [];
  
  billIds.forEach(billId => {
    const bill = bills.find(b => b.id === billId);
    if (bill) {
      // 如果是标记为待付款，则直接更新状态
      if (action === 'markAsPending') {
        bill.status = BillStatus.PENDING;
        updatedBills.push(bill);
      } 
      // 如果是标记为已完成
      else if (action === 'markAsCompleted') {
        // 用户筛选了待付款的情况，只将该用户的分账标记为已支付
        if (filterUserId && filterType === 'toPay') {
          // 找到该用户的分账并标记为已支付
          const userShare = bill.shares.find(s => s.userId === filterUserId && !s.paid);
          if (userShare) {
            userShare.paid = true;
            
            // 检查该账单是否所有分账都已支付
            const allPaid = bill.shares.every(s => s.paid);
            if (allPaid) {
              bill.status = BillStatus.COMPLETED;
            }
            
            updatedBills.push(bill);
          }
        }
        // 用户筛选了待收款的情况，将所有分账标记为已支付
        else if (filterUserId && filterType === 'toReceive') {
          // 将所有分账标记为已支付
          bill.shares.forEach(share => {
            share.paid = true;
          });
          bill.status = BillStatus.COMPLETED;
          updatedBills.push(bill);
        }
        // 没有筛选，直接标记为已完成
        else {
          bill.status = BillStatus.COMPLETED;
          updatedBills.push(bill);
        }
      }
    }
  });
  
  localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
  return updatedBills;
};

// 获取与特定用户相关的账单
export const getBillsByUser = (userId: string, type: 'all' | 'toPay' | 'toReceive'): Bill[] => {
  const bills = getBills();
  
  switch (type) {
    case 'all':
      // 所有与该用户相关的账单
      return bills.filter(bill => 
        bill.createdBy === userId || 
        bill.shares.some(share => share.userId === userId)
      );
    
    case 'toPay':
      // 该用户需要支付的账单
      return bills.filter(bill => 
        bill.status === BillStatus.PENDING && 
        bill.createdBy !== userId && 
        bill.shares.some(share => share.userId === userId && !share.paid)
      );
    
    case 'toReceive':
      // 该用户需要收款的账单
      return bills.filter(bill => 
        bill.status === BillStatus.PENDING && 
        bill.createdBy === userId && 
        bill.shares.some(share => !share.paid)
      );
    
    default:
      return [];
  }
};

// 标记账单为已完成
export const markBillAsCompleted = (billId: string): Bill | null => {
  const bills = getBills();
  const bill = bills.find(b => b.id === billId);
  
  if (!bill) return null;
  
  bill.status = BillStatus.COMPLETED;
  localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
  return bill;
};

// 标记分账已支付
export const markShareAsPaid = (billId: string, userId: string): Bill | null => {
  const bills = getBills();
  const bill = bills.find(b => b.id === billId);
  
  if (!bill) return null;
  
  const share = bill.shares.find(s => s.userId === userId);
  if (share) {
    share.paid = true;
    
    // 检查是否所有分账都已支付
    const allPaid = bill.shares.every(s => s.paid);
    if (allPaid) {
      bill.status = BillStatus.COMPLETED;
    }
    
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
  }
  
  return bill;
};

// 标记账单为待付款
export const markBillAsPending = (billId: string): Bill | null => {
  const bills = getBills();
  const bill = bills.find(b => b.id === billId);
  
  if (!bill) return null;
  
  bill.status = BillStatus.PENDING;
  localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
  return bill;
};

// 删除账单
export const deleteBill = (billId: string): boolean => {
  const bills = getBills();
  const initialLength = bills.length;
  const filteredBills = bills.filter(bill => bill.id !== billId);
  
  if (filteredBills.length === initialLength) {
    return false; // 没有找到要删除的账单
  }
  
  localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(filteredBills));
  return true;
}; 