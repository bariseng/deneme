import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  registerUpload,
  getUserDocuments,
  getDocument,
  verifyDocument,
  checkDocumentCompleteness,
  type EDevletDocType,
} from "@/lib/services/edevlet-upload";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = request.nextUrl;
    const action = searchParams.get("action");

    switch (action) {
      case "documents": {
        const docs = await getUserDocuments(user.id);
        return NextResponse.json({ success: true, data: docs });
      }

      case "document": {
        const docType = searchParams.get("docType") as EDevletDocType;
        if (!docType) return NextResponse.json({ error: "docType gerekli" }, { status: 400 });
        const doc = await getDocument(user.id, docType);
        if (!doc) return NextResponse.json({ error: "Belge bulunamadı" }, { status: 404 });
        return NextResponse.json({ success: true, data: doc });
      }

      case "completeness": {
        const result = await checkDocumentCompleteness(user.id);
        return NextResponse.json({ success: true, data: result });
      }

      default:
        return NextResponse.json(
          { error: "Geçersiz action. Geçerli: documents, document, completeness" },
          { status: 400 },
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "e-Devlet hatası";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "upload": {
        const { documentType, fileName, fileUrl, fileSize } = body;
        if (!documentType || !fileName || !fileUrl) {
          return NextResponse.json({ error: "documentType, fileName, fileUrl gerekli" }, { status: 400 });
        }
        const doc = await registerUpload(user.id, documentType, fileName, fileUrl, fileSize || 0);
        return NextResponse.json({ success: true, data: doc }, { status: 201 });
      }

      case "verify": {
        const { userId, docType, status, notes } = body;
        if (!userId || !docType || !status) {
          return NextResponse.json({ error: "userId, docType, status gerekli" }, { status: 400 });
        }
        await verifyDocument(userId, docType, status, notes);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: "Geçersiz action. Geçerli: upload, verify" },
          { status: 400 },
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "e-Devlet hatası";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
