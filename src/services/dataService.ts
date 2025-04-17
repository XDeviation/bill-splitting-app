import { User, Bill, BillStatus, Settlement, CurrencyType } from "../types";
import { userApi, billApi } from "./apiService";

// 用户数据缓存
let usersCache: User[] | null = null;
let usersCacheTimestamp: number = 0;
const CACHE_EXPIRY_MS = 60000; // 缓存有效期1分钟

// 账单数据缓存
let billsCache: Bill[] | null = null;
let billsCacheTimestamp: number = 0;

// 获取用户
export const getUsers = async (): Promise<User[]> => {
  try {
    const now = Date.now();

    // 使用缓存数据，如果缓存有效且未过期
    if (usersCache && now - usersCacheTimestamp < CACHE_EXPIRY_MS) {
      return usersCache;
    }

    // 获取新数据并更新缓存
    const users = await userApi.getUsers();
    usersCache = users;
    usersCacheTimestamp = now;
    return users;
  } catch (error) {
    console.error("获取用户失败:", error);
    // 如果请求失败但有缓存，返回缓存数据
    if (usersCache) {
      return usersCache;
    }
    return [];
  }
};

// 添加用户
export const addUser = async (name: string): Promise<User | null> => {
  try {
    const newUser = await userApi.addUser(name);
    // 更新缓存
    if (newUser) {
      usersCache = null; // 强制下次重新获取
    }
    return newUser;
  } catch (error) {
    console.error("添加用户失败:", error);
    return null;
  }
};

// 更新用户 (当前API未实现此功能，保留接口兼容性)
export const updateUser = async (user: User): Promise<User> => {
  return user;
};

// 获取账单
export const getBills = async (): Promise<Bill[]> => {
  try {
    const now = Date.now();

    // 使用缓存数据，如果缓存有效且未过期
    if (billsCache && now - billsCacheTimestamp < CACHE_EXPIRY_MS) {
      return billsCache;
    }

    // 获取新数据并更新缓存
    const bills = await billApi.getBills();
    billsCache = bills;
    billsCacheTimestamp = now;
    return bills;
  } catch (error) {
    console.error("获取账单失败:", error);
    // 如果请求失败但有缓存，返回缓存数据
    if (billsCache) {
      return billsCache;
    }
    return [];
  }
};

// 将元转换为分（整数）
export const yuanToFen = (yuan: number): number => {
  // 所有币种都乘以100进行整数计算
  return Math.round(yuan * 100);
};

// 将分转换为元（显示用）
export const fenToYuan = (fen: number): string => {
  return (fen / 100).toFixed(2);
};

// 清除账单缓存
const clearBillsCache = () => {
  billsCache = null;
  billsCacheTimestamp = 0;
};

// 添加账单
export const addBill = async (
  bill: Omit<Bill, "id" | "createdAt">
): Promise<Bill | null> => {
  try {
    let shares = [...bill.shares];

    // 如果需要均分账单
    if (shares.every((share) => share.amount === 0)) {
      // 计算需要均分的总金额（分）
      const totalAmount = bill.totalAmount;
      // 参与分账的总人数
      const totalParticipants = shares.length;

      if (totalParticipants > 0) {
        // 找出创建者
        const creatorIndex = shares.findIndex(
          (share) => share.userId === bill.createdBy
        );

        if (totalParticipants > 1 && creatorIndex !== -1) {
          // 计算每人应付金额（整数分）
          const amountPerPerson = Math.floor(totalAmount / totalParticipants);

          // 非创建者的总金额
          let totalNonCreatorAmount = 0;

          // 为非创建者分配金额
          shares = shares.map((share, index) => {
            if (index !== creatorIndex) {
              totalNonCreatorAmount += amountPerPerson;
              return { ...share, amount: amountPerPerson };
            }
            return share;
          });

          // 创建者承担余额（总金额减去其他人的份额）
          const creatorAmount = totalAmount - totalNonCreatorAmount;
          shares[creatorIndex] = {
            ...shares[creatorIndex],
            amount: creatorAmount,
          };
        } else {
          // 如果只有创建者一个人，那么创建者支付全部金额
          shares = shares.map((share) => ({
            ...share,
            amount: share.userId === bill.createdBy ? totalAmount : 0,
          }));
        }
      }
    }

    // 确保创建者的分账标记为已支付
    const sharesWithCreatorPaid = shares.map((share) => {
      if (share.userId === bill.createdBy) {
        return { ...share, paid: true };
      }
      return share;
    });

    const billToAdd = {
      ...bill,
      shares: sharesWithCreatorPaid,
    };

    const result = await billApi.addBill(billToAdd);

    // 清除缓存，确保下次获取最新数据
    clearBillsCache();

    return result;
  } catch (error) {
    console.error("添加账单失败:", error);
    return null;
  }
};

// 更新账单
export const updateBill = async (bill: Bill): Promise<Bill | null> => {
  try {
    const result = await billApi.updateBill(bill.id, bill);

    // 清除缓存，确保下次获取最新数据
    clearBillsCache();

    return result;
  } catch (error) {
    console.error("更新账单失败:", error);
    return null;
  }
};

// 计算结算金额
export const calculateSettlements = async (): Promise<Settlement[]> => {
  const bills = await getBills();
  const users = await getUsers();

  // 按货币类型分组
  const settlementsByCurrency: Record<CurrencyType, Settlement[]> = {
    [CurrencyType.CNY]: [],
    [CurrencyType.JPY]: [],
  };

  // 分别计算不同货币类型的结算
  Object.values(CurrencyType).forEach((currency) => {
    // 计算每个用户的净欠款（+表示需要支付给他人，-表示需要从他人收取）
    const balances: Record<string, number> = {};

    // 初始化余额
    users.forEach((user) => {
      balances[user.id] = 0;
    });

    // 考虑待付款状态和已完成状态的账单
    const relevantBills = bills.filter(
      (bill) =>
        (bill.status === BillStatus.PENDING ||
          bill.status === BillStatus.COMPLETED) &&
        bill.currency === currency
    );

    // 计算每个用户的净欠款
    relevantBills.forEach((bill) => {
      bill.shares.forEach((share) => {
        const { userId, amount, paid } = share;

        // 如果已支付，不考虑这部分
        if (paid) return;

        // 欠款人需要支付
        balances[userId] += amount;

        // 创建者需要收取
        balances[bill.createdBy] -= amount;
      });
    });

    // 创建结算列表
    const settlements: Settlement[] = [];

    // 创建欠款人和收款人列表
    const debtors: { userId: string; amount: number }[] = [];
    const creditors: { userId: string; amount: number }[] = [];

    // 分类欠款人和收款人
    Object.entries(balances).forEach(([userId, amount]) => {
      if (amount > 0) {
        debtors.push({ userId, amount });
      } else if (amount < 0) {
        creditors.push({ userId, amount: -amount });
      }
    });

    // 排序欠款人和收款人（从大到小）
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    // 创建结算方案
    let debtorIndex = 0;
    let creditorIndex = 0;

    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const debtor = debtors[debtorIndex];
      const creditor = creditors[creditorIndex];

      // 计算本次结算金额
      const settleAmount = Math.min(debtor.amount, creditor.amount);

      // 如果结算金额大于0，创建结算记录
      if (settleAmount > 0) {
        settlements.push({
          fromUser: debtor.userId,
          toUser: creditor.userId,
          amount: settleAmount,
          currency,
        });
      }

      // 更新余额
      debtor.amount -= settleAmount;
      creditor.amount -= settleAmount;

      // 如果欠款人已结清，移到下一个
      if (debtor.amount <= 0) {
        debtorIndex++;
      }

      // 如果收款人已收齐，移到下一个
      if (creditor.amount <= 0) {
        creditorIndex++;
      }
    }

    settlementsByCurrency[currency] = settlements;
  });

  // 合并所有货币类型的结算
  return [
    ...settlementsByCurrency[CurrencyType.CNY],
    ...settlementsByCurrency[CurrencyType.JPY],
  ];
};

// 批量更新账单
export const batchUpdateBills = async (
  billIds: string[],
  action: "markAsPending" | "markAsCompleted",
  filterUserId?: string,
  filterType?: "all" | "toPay" | "toReceive"
): Promise<Bill[]> => {
  const bills = await getBills();
  const updatedBills: Bill[] = [];

  for (const id of billIds) {
    const bill = bills.find((b) => b.id === id);
    if (!bill) continue;

    // 跳过已合账的账单
    if (bill.status === BillStatus.MERGED) {
      console.log(`跳过已合账账单: ${bill.id}`);
      continue;
    }

    // 检查过滤条件
    if (filterUserId && filterType) {
      if (
        filterType === "toPay" &&
        !bill.shares.some((s) => s.userId === filterUserId && !s.paid)
      ) {
        continue;
      }
      if (filterType === "toReceive" && bill.createdBy !== filterUserId) {
        continue;
      }
    }

    try {
      const newStatus =
        action === "markAsPending" ? BillStatus.PENDING : BillStatus.COMPLETED;
      const updatedBill = await billApi.updateBill(id, { status: newStatus });
      updatedBills.push(updatedBill);
    } catch (error) {
      console.error(`更新账单 ${id} 失败:`, error);
    }
  }

  // 清除缓存，确保下次获取最新数据
  clearBillsCache();

  return updatedBills;
};

// 按用户获取账单
export const getBillsByUser = async (
  userId: string,
  type: "all" | "toPay" | "toReceive"
): Promise<Bill[]> => {
  const bills = await getBills();

  return bills.filter((bill) => {
    if (type === "all") {
      return (
        bill.shares.some((s) => s.userId === userId) ||
        bill.createdBy === userId
      );
    }

    if (type === "toPay") {
      return bill.shares.some(
        (s) => s.userId === userId && !s.paid && bill.createdBy !== userId
      );
    }

    if (type === "toReceive") {
      return bill.createdBy === userId && bill.shares.some((s) => !s.paid);
    }

    return false;
  });
};

// 将账单标记为已完成
export const markBillAsCompleted = async (
  billId: string
): Promise<Bill | null> => {
  try {
    const result = await billApi.updateBill(billId, {
      status: BillStatus.COMPLETED,
    });

    // 清除缓存，确保下次获取最新数据
    clearBillsCache();

    return result;
  } catch (error) {
    console.error("更新账单状态失败:", error);
    return null;
  }
};

// 将分账标记为已支付
export const markShareAsPaid = async (
  billId: string,
  userId: string
): Promise<Bill | null> => {
  try {
    const bill = (await getBills()).find((b) => b.id === billId);
    if (!bill) return null;

    const shares = bill.shares.map((share) => {
      if (share.userId === userId) {
        return { ...share, paid: true };
      }
      return share;
    });

    const result = await billApi.updateBill(billId, { shares });

    // 清除缓存，确保下次获取最新数据
    clearBillsCache();

    return result;
  } catch (error) {
    console.error("更新分账状态失败:", error);
    return null;
  }
};

// 将账单标记为待付款
export const markBillAsPending = async (
  billId: string
): Promise<Bill | null> => {
  try {
    const result = await billApi.updateBill(billId, {
      status: BillStatus.PENDING,
    });

    // 清除缓存，确保下次获取最新数据
    clearBillsCache();

    return result;
  } catch (error) {
    console.error("更新账单状态失败:", error);
    return null;
  }
};

// 删除账单
export const deleteBill = async (billId: string): Promise<boolean> => {
  try {
    const result = await billApi.deleteBill(billId);

    // 清除缓存，确保下次获取最新数据
    clearBillsCache();

    return result;
  } catch (error) {
    console.error("删除账单失败:", error);
    return false;
  }
};

// 获取用户名
export const getUserName = async (userId: string): Promise<string> => {
  const users = await getUsers();
  const user = users.find((u) => u.id === userId);
  return user ? user.name : "未知用户";
};

// 合并账单按货币类型
export const mergeBillsByCurrency = async (): Promise<{
  [key in CurrencyType]?: Bill[];
}> => {
  // 获取所有账单和用户
  const bills = await getBills();
  const users = await getUsers();
  const result: { [key in CurrencyType]?: Bill[] } = {};

  // 按货币类型分组
  for (const currency of Object.values(CurrencyType)) {
    // 只考虑待付款状态的账单
    const pendingBills = bills.filter(
      (bill) =>
        bill.status.toString() === BillStatus.PENDING.toString() &&
        bill.currency === currency
    );

    if (pendingBills.length < 2) {
      continue;
    }

    // 确保至少有两个可合并的账单
    try {
      // 按创建者（收款人）分组账单
      const billsByCreator: Record<string, Bill[]> = {};
      pendingBills.forEach((bill) => {
        if (!billsByCreator[bill.createdBy]) {
          billsByCreator[bill.createdBy] = [];
        }
        billsByCreator[bill.createdBy].push(bill);
      });

      // 为每个收款人创建一个合并账单
      const newBillsForCurrency: Bill[] = [];

      for (const [creatorId, creatorBills] of Object.entries(billsByCreator)) {
        // 1. 按用户组织需要支付的金额
        const mergedShares: Record<string, { amount: number; paid: boolean }> =
          {};

        // 收集所有账单中的分账信息
        creatorBills.forEach((bill) => {
          bill.shares.forEach((share) => {
            // 如果尚未支付，则计入合并账单
            if (!share.paid) {
              if (!mergedShares[share.userId]) {
                mergedShares[share.userId] = { amount: 0, paid: false };
              }
              mergedShares[share.userId].amount += share.amount;
            }
          });
        });

        // 2. 创建合并账单
        const totalAmount = Object.values(mergedShares).reduce(
          (sum, share) => sum + share.amount,
          0
        );

        // 如果没有需要支付的金额，则跳过
        if (totalAmount <= 0) {
          continue;
        }

        // 获取创建者名称用于账单标题
        const creatorName =
          users.find((u) => u.id === creatorId)?.name || "未知用户";

        // 创建合并账单对象
        const mergedBill = {
          title: `合并账单 - ${creatorName} (${currency})`,
          description: `系统自动合并了 ${creatorBills.length} 个${creatorName}的${currency}账单`,
          totalAmount: totalAmount / 100, // 除以100转换回元，因为API会再乘以100
          createdBy: creatorId, // 使用原始创建者ID
          status: BillStatus.PENDING, // 新生成的合并账单应为待付款状态
          shares: Object.entries(mergedShares).map(([userId, data]) => ({
            userId,
            amount: data.amount / 100, // 除以100转换回元，因为API会再乘以100
            paid: userId === creatorId ? true : data.paid, // 创建者自动标记为已支付
          })),
          currency: currency,
        };

        // 3. 添加合并账单到数据库
        const newBill = await billApi.addBill(mergedBill);

        // 将新创建的合并账单添加到结果中
        if (newBill) {
          newBillsForCurrency.push(newBill);

          // 4. 将原始账单标记为已合并状态
          for (const bill of creatorBills) {
            await billApi.updateBill(bill.id, { status: BillStatus.MERGED });
          }
        }
      }

      // 如果有成功创建的合并账单，添加到结果中
      if (newBillsForCurrency.length > 0) {
        result[currency] = newBillsForCurrency;
      }

      // 清除缓存，确保下次获取最新数据
      clearBillsCache();
    } catch (error) {
      console.error(`合并${currency}账单失败:`, error);
    }
  }

  return result;
};

// 批量删除账单
export const batchDeleteBills = async (billIds: string[]): Promise<boolean> => {
  try {
    let success = true;

    for (const id of billIds) {
      const deleted = await billApi.deleteBill(id);
      if (!deleted) {
        success = false;
      }
    }

    // 清除缓存，确保下次获取最新数据
    clearBillsCache();

    return success;
  } catch (error) {
    console.error("批量删除账单失败:", error);
    return false;
  }
};
