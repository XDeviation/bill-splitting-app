import { User, Bill, BillStatus, Settlement, CurrencyType, BillShare } from '../types';

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
  let shares = [...bill.shares];
  
  // 如果需要均分账单
  if (shares.every(share => share.amount === 0)) {
    // 计算需要均分的总金额
    const totalAmount = bill.totalAmount;
    // 参与分账的总人数
    const totalParticipants = shares.length;
    
    if (totalParticipants > 0) {
      // 非创建者的人数
      const nonCreatorCount = shares.filter(share => share.userId !== bill.createdBy).length;
      
      if (nonCreatorCount > 0) {
        // 计算每人应付金额（向下取整到2位小数）
        let amountPerPerson = Math.floor(totalAmount / totalParticipants * 100) / 100;
        
        // 计算向下取整后的总金额
        let baseAllocatedAmount = amountPerPerson * totalParticipants;
        
        // 计算剩余的差额（应该是正数，表示还有多少钱没分配）
        let difference = parseFloat((totalAmount - baseAllocatedAmount).toFixed(2));
        
        // 需要增加0.01的人数
        let adjustmentCount = Math.round(difference * 100); // 转换为分
        
        // 确保不超过非创建者人数
        adjustmentCount = Math.min(adjustmentCount, nonCreatorCount);
        
        // 如果有差额需要调整
        if (adjustmentCount > 0) {
          // 创建者支付的基本金额
          let creatorAmount = amountPerPerson;
          
          // 为非创建者分配金额，部分人增加0.01
          const nonCreatorShares = shares.filter(share => share.userId !== bill.createdBy);
          const creatorShares = shares.filter(share => share.userId === bill.createdBy);
          
          // 处理非创建者分账
          let updatedNonCreatorShares = nonCreatorShares.map((share, index) => {
            // 前adjustmentCount个非创建者各多付0.01
            if (index < adjustmentCount) {
              // 多付0.01
              return { ...share, amount: parseFloat((amountPerPerson + 0.01).toFixed(2)) };
            } else {
              // 正常付款
              return { ...share, amount: amountPerPerson };
            }
          });
          
          // 计算非创建者总支付金额
          const nonCreatorTotal = updatedNonCreatorShares.reduce((sum, share) => 
            sum + share.amount, 0);
          
          // 创建者支付的金额 = 总金额 - 非创建者总支付金额
          if (creatorShares.length > 0) {
            creatorAmount = parseFloat((totalAmount - nonCreatorTotal).toFixed(2));
            // 防止负数
            creatorAmount = Math.max(0, creatorAmount);
          }
          
          // 重新组合所有分账
          shares = [
            ...updatedNonCreatorShares,
            ...creatorShares.map(share => ({ ...share, amount: creatorAmount }))
          ];
        } else {
          // 如果不需要调整，所有人平均分配
          shares = shares.map(share => ({ ...share, amount: amountPerPerson }));
        }
      } else {
        // 如果只有创建者一个人，那么创建者支付全部金额
        shares = shares.map(share => ({ 
          ...share, 
          amount: share.userId === bill.createdBy ? totalAmount : 0 
        }));
      }
      
      // 再次检查总和是否等于账单总额
      const totalShares = parseFloat(shares.reduce((sum, share) => sum + share.amount, 0).toFixed(2));
      if (Math.abs(totalShares - totalAmount) > 0.01) {
        console.warn(`分账总额(${totalShares})与账单总额(${totalAmount})不匹配，差额: ${totalShares - totalAmount}`);
      }
    }
  }
  
  // 确保创建者的分账标记为已支付
  const sharesWithCreatorPaid = shares.map(share => {
    if (share.userId === bill.createdBy) {
      return { ...share, paid: true };
    }
    return share;
  });
  
  // 生成唯一ID，使用时间戳 + 随机数
  const uniqueId = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  
  const newBill: Bill = {
    ...bill,
    id: uniqueId,
    createdAt: Date.now(),
    status: bill.status || BillStatus.UNPAID, // 默认为未出账状态
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
export const mergeBillsByCurrency = (): { [key in CurrencyType]?: Bill[] } => {
  const bills = getBills();
  const pendingBills = bills.filter(bill => bill.status === BillStatus.PENDING);
  const result: { [key in CurrencyType]?: Bill[] } = {
    [CurrencyType.CNY]: [],
    [CurrencyType.JPY]: [],
  };
  
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
    
    // 调整所有余额为两位小数
    Object.keys(userBalances).forEach(userId => {
      userBalances[userId] = parseFloat(userBalances[userId].toFixed(2));
    });
    
    // 获取所有净收款方（余额为正）的用户
    const creditors = Object.entries(userBalances)
      .filter(([_, balance]) => balance > 0)
      .sort((a, b) => b[1] - a[1]); // 按金额降序
    
    // 获取所有需要付款的用户（余额为负）
    const debtors = Object.entries(userBalances)
      .filter(([_, balance]) => balance < 0)
      .sort((a, b) => a[1] - b[1]); // 按欠款多少排序
    
    if (creditors.length === 0 || debtors.length === 0) return; // 如果没有净收款方或付款方，则不需要合并
    
    // 收集要标记为已合账的原始账单ID
    const originalBillIds = currencyBills.map(bill => bill.id);
    
    // 修复：避免在循环中使用indexOf，因为它可能创建错误的索引
    // 为每个收款人创建一个合并账单
    creditors.forEach((creditor, creditorIndex) => {
      const [creditorId, creditorBalance] = creditor;
      
      // 深拷贝付款人列表，以便在处理过程中修改
      let remainingDebtors = [...debtors];
      let totalCollectedForCreditor = 0;
      const creditorShares: BillShare[] = [];
      
      // 为该收款人分配欠款人
      while (remainingDebtors.length > 0 && totalCollectedForCreditor < creditorBalance) {
        const [debtorId, debtorBalance] = remainingDebtors[0];
        const absDebtorBalance = Math.abs(debtorBalance);
        
        // 计算这个欠款人应该付给当前收款人的金额
        const amountToAllocate = Math.min(
          absDebtorBalance, 
          parseFloat((creditorBalance - totalCollectedForCreditor).toFixed(2))
        );
        
        if (amountToAllocate > 0) {
          // 添加到该收款人的分账中
          creditorShares.push({
            userId: debtorId,
            amount: parseFloat(amountToAllocate.toFixed(2)),
            paid: false
          });
          
          // 更新已收集的总金额
          totalCollectedForCreditor = parseFloat((totalCollectedForCreditor + amountToAllocate).toFixed(2));
          
          // 更新欠款人的余额
          if (Math.abs(absDebtorBalance - amountToAllocate) < 0.01) {
            // 如果欠款人的债务已经完全分配，则从列表中移除
            remainingDebtors.shift();
          } else {
            // 否则更新欠款人的余额
            remainingDebtors[0] = [
              debtorId, 
              parseFloat((debtorBalance + amountToAllocate).toFixed(2))
            ];
          }
        } else {
          // 如果无法分配更多金额，跳出循环
          break;
        }
      }
      
      // 如果没有分账，则跳过创建账单
      if (creditorShares.length === 0) return;
      
      // 计算总金额
      const totalAmount = parseFloat(
        creditorShares.reduce((sum, share) => sum + share.amount, 0).toFixed(2)
      );
      
      // 如果总金额太小，则不创建账单
      if (totalAmount < 0.01) return;
      
      // 创建合并账单的标题
      const mergedTitle = currencyBills
        .map(bill => bill.title.substring(0, 10)) // 截取每个标题的前10个字符
        .join(' + ');
      
      // 创建最终标题，添加合并标记和收款人姓名
      const creditorName = getUserName(creditorId);
      const finalTitle = `【合并账单-${creditorName}】${mergedTitle}${currencyBills.length > 2 ? '等' : ''}`;
      
      // 创建合并账单
      const mergedBill: Omit<Bill, 'id' | 'createdAt'> = {
        title: finalTitle,
        description: `自动合并的${currencyType}账单，收款人: ${creditorName}，包含${currencyBills.length}个原始账单`,
        totalAmount: totalAmount,
        createdBy: creditorId, // 将当前处理的收款人设为创建者
        status: BillStatus.PENDING, // 直接标记为待付款状态
        shares: creditorShares,
        currency: currencyType,
      };
      
      try {
        // 确保在多次快速操作时ID不会冲突，添加小延迟
        setTimeout(() => {
          // 添加合并账单
          const newBill = addBill(mergedBill);
          
          // 将新创建的账单添加到结果中
          if (!result[currencyType]) {
            result[currencyType] = [];
          }
          result[currencyType]?.push(newBill);
          
          // 在所有收款人的账单都创建完毕后，将原始账单标记为已合账
          // 由于是在异步操作中，需要在最外层再处理
        }, 10 * (creditorIndex + 1)); // 使用索引而不是indexOf来错开时间
      } catch (error) {
        console.error(`合并账单创建失败(收款人: ${creditorName}):`, error);
      }
    });
    
    // 在所有收款人的账单都创建完毕后，将原始账单标记为已合账
    // 添加更长的延迟，确保所有合并账单都已创建
    setTimeout(() => {
      // 获取最新的账单列表
      const allBills = getBills();
      
      // 找到原始账单并标记为已合账
      originalBillIds.forEach(billId => {
        const billToUpdate = allBills.find(b => b.id === billId);
        if (billToUpdate) {
          billToUpdate.status = BillStatus.MERGED;
        }
      });
      
      // 更新原始账单状态
      localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(allBills));
    }, 100); // 使用更长的延迟
  });
  
  return result;
};

// 在getUserName函数中添加对空用户ID的处理
export const getUserName = (userId: string): string => {
  if (!userId) return '系统';
  
  const user = getUsers().find(u => u.id === userId);
  return user ? user.name : '未知用户';
}; 