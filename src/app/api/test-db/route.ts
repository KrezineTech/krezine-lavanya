import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Test basic connection
    const result = await prisma.$queryRaw`SELECT NOW() as now, version() as version`;
    
    return NextResponse.json({ 
      ok: true, 
      message: "Database connected successfully",
      data: result 
    });
  } catch (error: any) {
    console.error("Database connection error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }
}