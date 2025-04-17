import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import BillModel from "@/models/Bill";

// 获取单个账单
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await dbConnect();
    const bill = await BillModel.findOne({ id }, "-_id").lean();

    if (!bill) {
      return NextResponse.json({ error: "账单不存在" }, { status: 404 });
    }

    return NextResponse.json(bill);
  } catch (error) {
    console.error("获取账单错误:", error);
    return NextResponse.json({ error: "获取账单失败" }, { status: 500 });
  }
}

// 更新账单
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();

    await dbConnect();

    const bill = await BillModel.findOne({ id });

    if (!bill) {
      return NextResponse.json({ error: "账单不存在" }, { status: 404 });
    }

    // 更新账单字段
    if (data.status) bill.status = data.status;
    if (data.title) bill.title = data.title;
    if (data.description !== undefined) bill.description = data.description;
    if (data.shares) bill.shares = data.shares;

    await bill.save();

    return NextResponse.json(bill);
  } catch (error) {
    console.error("更新账单错误:", error);
    return NextResponse.json({ error: "更新账单失败" }, { status: 500 });
  }
}

// 删除账单
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await dbConnect();

    const result = await BillModel.deleteOne({ id });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "账单不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除账单错误:", error);
    return NextResponse.json({ error: "删除账单失败" }, { status: 500 });
  }
}
