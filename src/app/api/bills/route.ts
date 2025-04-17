import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import BillModel from "@/models/Bill";
import { Bill, BillStatus } from "@/types";

// 获取所有账单
export async function GET() {
  try {
    await dbConnect();
    const bills = await BillModel.find({}, "-_id").lean();
    return NextResponse.json(bills);
  } catch (error) {
    console.error("获取账单错误:", error);
    return NextResponse.json({ error: "获取账单失败" }, { status: 500 });
  }
}

// 创建新账单
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    if (!data.title || !data.totalAmount || !data.createdBy || !data.shares) {
      return NextResponse.json(
        { error: "标题、总金额、创建者和分账信息为必填项" },
        { status: 400 }
      );
    }

    await dbConnect();

    // 转换金额为整数（分）
    const totalAmountInFen = Math.round(data.totalAmount * 100);

    // 生成唯一ID
    const uniqueId = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    // 确保创建者的分账标记为已支付
    const shares = data.shares.map(
      (share: { userId: string; amount?: number; paid?: boolean }) => ({
        ...share,
        amount: share.amount ? Math.round(share.amount * 100) : 0,
        paid: share.userId === data.createdBy ? true : share.paid || false,
      })
    );

    const newBill: Bill = {
      id: uniqueId,
      title: data.title,
      description: data.description || "",
      totalAmount: totalAmountInFen,
      createdBy: data.createdBy,
      createdAt: Date.now(),
      status: data.status || BillStatus.UNPAID,
      shares,
      currency: data.currency,
    };

    const bill = await BillModel.create(newBill);
    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    console.error("创建账单错误:", error);
    return NextResponse.json({ error: "创建账单失败" }, { status: 500 });
  }
}
