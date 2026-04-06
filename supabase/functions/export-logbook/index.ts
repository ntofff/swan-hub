import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple PDF builder (no external deps)
function buildPdf(entries: any[]): Uint8Array {
  const objects: string[] = [];
  let objCount = 0;
  const offsets: number[] = [];

  const newObj = (content: string) => {
    objCount++;
    objects.push(content);
    return objCount;
  };

  // Catalog, Pages placeholder
  newObj("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
  newObj(""); // placeholder for pages

  // Font
  newObj("3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj");
  newObj("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj");

  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 50;
  const lineHeight = 14;
  const maxTextWidth = pageWidth - 2 * margin;

  // Escape special PDF chars
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

  // Remove accents for PDF Type1 font compatibility
  const removeAccents = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Approximate text width (Helvetica ~0.5 * fontSize per char)
  const approxWidth = (text: string, fontSize: number) => text.length * fontSize * 0.5;

  // Word-wrap
  const wrapText = (text: string, fontSize: number): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const test = current ? current + " " + word : word;
      if (approxWidth(test, fontSize) > maxTextWidth) {
        if (current) lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  // Build content for pages
  const pages: number[] = [];
  const pageContents: number[] = [];

  let y = pageHeight - margin;
  let streamLines: string[] = [];

  const startPage = () => {
    y = pageHeight - margin;
    streamLines = [];
    // Title on first page only
    if (pages.length === 0) {
      streamLines.push("BT");
      streamLines.push("/F2 18 Tf");
      streamLines.push(`${margin} ${y} Td`);
      streamLines.push(`(${esc(removeAccents("Journal de bord"))}) Tj`);
      streamLines.push("ET");
      y -= 10;

      // Date line
      const now = new Date();
      const dateStr = removeAccents(now.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }));
      streamLines.push("BT");
      streamLines.push("/F1 9 Tf");
      streamLines.push("0.5 0.5 0.5 rg");
      streamLines.push(`${margin} ${y} Td`);
      streamLines.push(`(${esc("Exporte le " + dateStr)}) Tj`);
      streamLines.push("0 0 0 rg");
      streamLines.push("ET");
      y -= 25;
    }
  };

  const finishPage = () => {
    const stream = streamLines.join("\n");
    const streamObjId = newObj("");
    const contentObjId = newObj("");
    const pageObjId = newObj("");

    objects[streamObjId - 1] = `${streamObjId} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj`;
    objects[contentObjId - 1] = ""; // unused, we pack into stream
    objects[pageObjId - 1] = ""; // unused

    // Actually, let's simplify: one stream obj per page
    // Reset and redo
    objCount -= 2; // undo extra
    objects.splice(streamObjId - 1, 2);

    const sObjId = newObj(`${objCount} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj`);
    const pObjId = newObj(`${objCount} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${sObjId} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>\nendobj`);

    pages.push(pObjId);
  };

  startPage();

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const priorityLabel = entry.priority && entry.priority !== "normale" ? ` [${removeAccents(entry.priority.toUpperCase())}]` : "";
    const entryDate = entry.entry_date || entry.created_at;
    const dateStr = removeAccents(new Date(entryDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }));
    const idStr = entry.id.slice(0, 6).toUpperCase();

    // Check space needed (approx)
    const textLines = wrapText(removeAccents(entry.text), 10);
    const neededHeight = 30 + textLines.length * lineHeight;

    if (y - neededHeight < margin) {
      finishPage();
      startPage();
    }

    // Separator line
    if (i > 0 || pages.length > 0) {
      streamLines.push("0.85 0.85 0.85 RG");
      streamLines.push(`${margin} ${y} m ${pageWidth - margin} ${y} l S`);
      y -= 10;
    }

    // Header: #ID + date + priority
    streamLines.push("BT");
    streamLines.push("/F2 9 Tf");
    streamLines.push("0.3 0.3 0.3 rg");
    streamLines.push(`${margin} ${y} Td`);
    streamLines.push(`(${esc("#" + idStr + "  " + dateStr + priorityLabel)}) Tj`);
    streamLines.push("0 0 0 rg");
    streamLines.push("ET");
    y -= 18;

    // Body text
    for (const line of textLines) {
      if (y < margin) {
        finishPage();
        startPage();
      }
      streamLines.push("BT");
      streamLines.push("/F1 10 Tf");
      streamLines.push(`${margin} ${y} Td`);
      streamLines.push(`(${esc(line)}) Tj`);
      streamLines.push("ET");
      y -= lineHeight;
    }

    y -= 8;
  }

  finishPage();

  // Fix pages object
  const kids = pages.map(p => `${p} 0 R`).join(" ");
  objects[1] = `2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\nendobj`;

  // Build PDF bytes
  let pdf = "%PDF-1.4\n";
  const finalOffsets: number[] = [];
  for (let i = 0; i < objects.length; i++) {
    if (!objects[i]) continue;
    finalOffsets.push(pdf.length);
    pdf += objects[i] + "\n";
  }

  const xrefOffset = pdf.length;
  pdf += "xref\n";
  pdf += `0 ${objCount + 1}\n`;
  pdf += "0000000000 65535 f \n";
  
  // Simple approach: rebuild
  // Actually let's just use a simpler approach
  const encoder = new TextEncoder();

  // Rebuild properly
  let pdfStr = "%PDF-1.4\n";
  const objOffsets: number[] = [];

  for (let i = 0; i < objects.length; i++) {
    if (!objects[i]) continue;
    objOffsets.push(pdfStr.length);
    // If obj doesn't start with number, wrap it
    if (!objects[i].startsWith(`${i + 1} 0 obj`)) {
      pdfStr += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
    } else {
      pdfStr += objects[i] + "\n";
    }
  }

  const xref = pdfStr.length;
  pdfStr += `xref\n0 ${objCount + 1}\n`;
  pdfStr += "0000000000 65535 f \n";
  for (const off of objOffsets) {
    pdfStr += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  pdfStr += `trailer\n<< /Size ${objCount + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  return encoder.encode(pdfStr);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { entries } = await req.json();
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return new Response(JSON.stringify({ error: "Aucune entrée fournie" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pdfBytes = buildPdf(entries);
    const base64 = btoa(String.fromCharCode(...pdfBytes));

    return new Response(JSON.stringify({ pdf_base64: base64 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("export-logbook error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
