import { NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/user";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, password, phone, companyName, taxNumber } = parsed.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Bu e-posta adresi zaten kayıtlı" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcryptjs.hash(password, 12);

    let companyId: string | undefined;

    if (companyName && taxNumber) {
      const existingCompany = await prisma.company.findUnique({
        where: { taxNumber },
      });

      if (existingCompany) {
        companyId = existingCompany.id;
      } else {
        const company = await prisma.company.create({
          data: {
            name: companyName,
            taxNumber,
          },
        });
        companyId = company.id;
      }
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        companyId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
      },
    });

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kayıt sırasında bir hata oluştu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
