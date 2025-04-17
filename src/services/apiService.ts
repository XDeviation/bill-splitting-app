import { User, Bill } from "../types";

const API_BASE = "/api";

// 用户相关API
export const userApi = {
  // 获取所有用户
  async getUsers(): Promise<User[]> {
    const response = await fetch(`${API_BASE}/users`);
    if (!response.ok) {
      throw new Error("获取用户失败");
    }
    return response.json();
  },

  // 添加用户
  async addUser(name: string): Promise<User> {
    const response = await fetch(`${API_BASE}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      throw new Error("添加用户失败");
    }
    return response.json();
  },
};

// 账单相关API
export const billApi = {
  // 获取所有账单
  async getBills(): Promise<Bill[]> {
    const response = await fetch(`${API_BASE}/bills`);
    if (!response.ok) {
      throw new Error("获取账单失败");
    }
    return response.json();
  },

  // 获取单个账单
  async getBill(id: string): Promise<Bill> {
    const response = await fetch(`${API_BASE}/bills/${id}`);
    if (!response.ok) {
      throw new Error("获取账单失败");
    }
    return response.json();
  },

  // 添加账单
  async addBill(bill: Omit<Bill, "id" | "createdAt">): Promise<Bill> {
    const response = await fetch(`${API_BASE}/bills`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bill),
    });

    if (!response.ok) {
      throw new Error("添加账单失败");
    }
    return response.json();
  },

  // 更新账单
  async updateBill(id: string, data: Partial<Bill>): Promise<Bill> {
    const response = await fetch(`${API_BASE}/bills/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("更新账单失败");
    }
    return response.json();
  },

  // 删除账单
  async deleteBill(id: string): Promise<boolean> {
    const response = await fetch(`${API_BASE}/bills/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("删除账单失败");
    }
    const result = await response.json();
    return result.success;
  },
};
