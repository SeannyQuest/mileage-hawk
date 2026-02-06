import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const airlines = await db.airline.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        loyaltyProgram: true,
        loyaltyCurrency: true,
        amexTransferRatio: true,
        alliance: true,
        minimumTransfer: true,
        hasTransferFee: true,
        transferFeeDetail: true,
        logoUrl: true,
        seatsAeroCode: true,
      },
    });

    return NextResponse.json({ data: airlines });
  } catch (error) {
    console.error("[API] Airlines error:", error);
    return NextResponse.json(
      { error: "Failed to fetch airlines" },
      { status: 500 }
    );
  }
}
