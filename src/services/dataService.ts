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

// 一键合账功能
export const mergeBillsByCurrency = (): { [key in CurrencyType]?: Bill } => {
  const bills = getBills();
  const pendingBills = bills.filter(bill => bill.status === BillStatus.PENDING);
  const result: { [key in CurrencyType]?: Bill } = {};
  
  // 按币种分组
  const billsByCurrency: Record<CurrencyType, Bill[]> = {
    [CurrencyType.CNY]: [],
    [CurrencyType.JPY]: [],
  };
  
  pendingBills.forEach(bill => {
    billsByCurrency[bill.currency].push(bill);
  });
  
  // 处理每一种货币类型
  Object.entries(billsByCurrency).forEach(([currency, currencyBills]) => {
    if (currencyBills.length <= 1) return; // 至少要有两个账单才需要合并
    
    const currencyType = currency as CurrencyType;
    const users = getUsers();
    
    // 计算用户净收支，正值表示需要收钱，负值表示需要付钱
    const userBalances: Record<string, number> = {};
    
    // 初始化余额
    users.forEach(user => {
      userBalances[user.id] = 0;
    });
    
    // 计算每个用户在所有待付款账单中的净收支
    currencyBills.forEach(bill => {
      // 收款人（创建者）收取的金额
      let creatorReceives = 0;
      
      bill.shares.forEach(share => {
        if (!share.paid) { // 只考虑未支付的部分
          // 付款人减去应付金额
          userBalances[share.userId] -= share.amount;
          // 统计创建者应收取的金额
          creatorReceives += share.amount;
        }
      });
      
      // 创建者增加应收金额
      userBalances[bill.createdBy] += creatorReceives;
    });
    
    // 生成新的合并账单
    // 只有收款方（余额为正）的用户作为创建者
    const creditors = Object.entries(userBalances)
      .filter(([_, balance]) => balance > 0)
      .sort((a, b) => b[1] - a[1]); // 按金额降序
    
    if (creditors.length === 0) return; // 如果没有净收款方，则不需要合并
    
    // 选择收款金额最大的用户作为创建者
    const [creatorId, _] = creditors[0];
    
    // 找出所有需要付款的用户（余额为负）
    const debtors = Object.entries(userBalances)
      .filter(([userId, balance]) => balance < 0 && userId !== creatorId); // 余额为负且不是创建者
    
    if (debtors.length === 0) return; // 如果没有净付款方，则不需要合并
    
    // 创建分账
    const shares = debtors.map(([userId, balance]) => ({
      userId,
      amount: Math.abs(balance), // 取绝对值，因为原值为负
      paid: false,
    }));
    
    // 创建合并账单的标题
    const mergedTitle = currencyBills
      .map(bill => bill.title)
      .join(' - ');
    
    // 创建合并账单
    const mergedBill: Omit<Bill, 'id' | 'createdAt'> = {
      title: `合并:${mergedTitle}`,
      description: `自动合并的${currencyType}账单，包含${currencyBills.length}个原始账单`,
      totalAmount: shares.reduce((sum, share) => sum + share.amount, 0),
      createdBy: '', // 设置为空字符串，表示系统创建
      status: BillStatus.PENDING,
      shares,
      currency: currencyType,
    };
    
    // 添加合并账单
    const newBill = addBill(mergedBill);
    result[currencyType] = newBill;
    
    // 将原始账单标记为已合账
    currencyBills.forEach(bill => {
      bill.status = BillStatus.MERGED;
    });
    
    // 更新原始账单状态
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
  });
  
  return result;
};

// 在getUserName函数中添加对空用户ID的处理
export const getUserName = (userId: string): string => {
  if (!userId) return '系统';
  
  const user = getUsers().find(u => u.id === userId);
  return user ? user.name : '未知用户';
}; 