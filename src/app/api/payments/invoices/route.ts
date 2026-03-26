import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/payments/invoices — User's invoice/payment history
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const sp = request.nextUrl.searchParams;
    const page = parseInt(sp.get("page") || "1");
    const limit = Math.min(parseInt(sp.get("limit") || "20"), 50);

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { userId: user.id, status: "completed" },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          planId: true,
          amount: true,
          currency: true,
          status: true,
          billingPeriod: true,
          installmentCount: true,
          cardLastFour: true,
          invoiceStatus: true,
          parasutInvoiceId: true,
          createdAt: true,
        },
      }),
      prisma.payment.count({ where: { userId: user.id, status: "completed" } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        payments,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Hata";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
