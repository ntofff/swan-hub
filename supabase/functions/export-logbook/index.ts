import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
const strip = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function buildTablePdf(entries: any[], userName: string): Uint8Array {
  const W = 595, H = 842, M = 40;
  const colWidths = [45, 100, 60, W - 2 * M - 45 - 100 - 60]; // # | Date | Priorité | Contenu
  const headerH = 22, rowPad = 8, fontSize = 9, headerFontSize = 9;
  const lineH = 12;

  // Approximate char width
  const charW = (fs: number) => fs * 0.48;
  const wrapText = (text: string, maxW: number, fs: number): string[] => {
    const cw = charW(fs);
    const maxChars = Math.floor(maxW / cw);
    const words = text.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const word of words) {
      const test = cur ? cur + " " + word : word;
      if (test.length > maxChars && cur) { lines.push(cur); cur = word; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [""];
  };

  // Pre-calculate row heights
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const rowsData = entries.map((e: any, i: number) => {
    const num = e.seq_number || String(i + 1).padStart(3, "0");
    const d = new Date(e.entry_date || e.created_at);
    const dateStr = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
    const timeStr = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    const prio = e.priority && e.priority !== "normale" ? strip(e.priority.charAt(0).toUpperCase() + e.priority.slice(1)) : "-";
    const textLines = wrapText(strip(e.text), colWidths[3] - 10, fontSize);
    const rowH = Math.max(headerH, textLines.length * lineH + 2 * rowPad);
    return { num, dateStr, timeStr, prio, textLines, rowH };
  });

  // Build pages
  const pages: string[] = [];
  let stream = "";
  let y = H - M;

  const drawHeader = () => {
    // Title
    stream += `BT /F2 14 Tf ${M} ${y} Td (${esc(strip("Journal de bord"))}) Tj ET\n`;
    y -= 8;
    const now = new Date();
    const months = ["janvier","fevrier","mars","avril","mai","juin","juillet","aout","septembre","octobre","novembre","decembre"];
    const dateExp = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    const timeExp = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    stream += `BT /F1 8 Tf 0.5 0.5 0.5 rg ${M} ${y} Td (${esc(`Exporte le ${dateExp} a ${timeExp}`)}) Tj 0 0 0 rg ET\n`;
    y -= 12;
    stream += `BT /F1 8 Tf 0.5 0.5 0.5 rg ${M} ${y} Td (${esc(`Certifie par : ${userName}`)}) Tj 0 0 0 rg ET\n`;
    y -= 20;
    drawTableHeader();
  };

  const drawTableHeader = () => {
    // Header background
    stream += `0.15 0.15 0.18 rg ${M} ${y - headerH} ${W - 2 * M} ${headerH} re f 0 0 0 rg\n`;
    const headers = ["#", "Date", "Priorite", "Contenu"];
    let x = M;
    for (let c = 0; c < 4; c++) {
      stream += `BT /F2 ${headerFontSize} Tf 1 1 1 rg ${x + 5} ${y - headerH + 7} Td (${esc(headers[c])}) Tj 0 0 0 rg ET\n`;
      x += colWidths[c];
    }
    y -= headerH;
  };

  const finishPage = () => { pages.push(stream); stream = ""; };

  const startPage = () => {
    stream = "";
    y = H - M;
    if (pages.length === 0) drawHeader();
    else drawTableHeader();
  };

  startPage();

  for (let i = 0; i < rowsData.length; i++) {
    const r = rowsData[i];
    if (y - r.rowH < M) { finishPage(); startPage(); }

    // Alternate row bg
    if (i % 2 === 0) {
      stream += `0.96 0.96 0.97 rg ${M} ${y - r.rowH} ${W - 2 * M} ${r.rowH} re f 0 0 0 rg\n`;
    }

    // Row borders
    stream += `0.85 0.85 0.85 RG 0.5 w ${M} ${y - r.rowH} ${W - 2 * M} ${r.rowH} re S\n`;

    // Vertical lines
    let x = M;
    for (let c = 0; c < 3; c++) {
      x += colWidths[c];
      stream += `${x} ${y} m ${x} ${y - r.rowH} l S\n`;
    }

    // Cell content
    const textY = y - rowPad - fontSize;
    x = M;

    // Col 0: #
    stream += `BT /F2 ${fontSize} Tf 0.3 0.3 0.3 rg ${x + 5} ${textY} Td (${esc(r.num)}) Tj 0 0 0 rg ET\n`;
    x += colWidths[0];

    // Col 1: Date
    stream += `BT /F1 ${fontSize} Tf ${x + 5} ${textY} Td (${esc(r.dateStr)}) Tj ET\n`;
    stream += `BT /F1 7 Tf 0.5 0.5 0.5 rg ${x + 5} ${textY - lineH} Td (${esc(r.timeStr)}) Tj 0 0 0 rg ET\n`;
    x += colWidths[1];

    // Col 2: Priorité with color
    if (r.prio === "Urgent") stream += "0.85 0.2 0.2 rg\n";
    else if (r.prio === "Important") stream += "0.9 0.6 0.1 rg\n";
    stream += `BT /F2 ${fontSize} Tf ${x + 5} ${textY} Td (${esc(r.prio)}) Tj ET\n`;
    stream += "0 0 0 rg\n";
    x += colWidths[2];

    // Col 3: Contenu (wrapped)
    for (let l = 0; l < r.textLines.length; l++) {
      const ly = textY - l * lineH;
      if (ly < y - r.rowH + 2) break;
      stream += `BT /F1 ${fontSize} Tf ${x + 5} ${ly} Td (${esc(r.textLines[l])}) Tj ET\n`;
    }

    // Reset stroke
    stream += "0 0 0 RG\n";
    y -= r.rowH;
  }

  // Footer
  stream += `BT /F1 7 Tf 0.5 0.5 0.5 rg ${M} ${M - 15} Td (${esc(strip(`SWAN - ${entries.length} entree(s)`))}) Tj 0 0 0 rg ET\n`;
  finishPage();

  // Assemble PDF
  const objs: string[] = [];
  let oc = 0;
  const addObj = (c: string) => { oc++; objs.push(`${oc} 0 obj\n${c}\nendobj`); return oc; };

  addObj("<< /Type /Catalog /Pages 2 0 R >>");
  addObj(""); // pages placeholder
  addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  const pageRefs: number[] = [];
  for (const s of pages) {
    const sId = addObj(`<< /Length ${s.length} >>\nstream\n${s}\nendstream`);
    const pId = addObj(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${sId} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`);
    pageRefs.push(pId);
  }

  objs[1] = `2 0 obj\n<< /Type /Pages /Kids [${pageRefs.map(r => `${r} 0 R`).join(" ")}] /Count ${pageRefs.length} >>\nendobj`;

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const o of objs) {
    offsets.push(pdf.length);
    pdf += o + "\n";
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${oc + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${oc + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { entries, userName: rawUserName } = await req.json();
    const userName = strip(String(rawUserName || "Utilisateur"));
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return new Response(JSON.stringify({ error: "Aucune entrée fournie" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sort entries chronologically ascending
    entries.sort((a: any, b: any) => {
      const da = new Date(a.entry_date || a.created_at).getTime();
      const db = new Date(b.entry_date || b.created_at).getTime();
      return da - db;
    });

    const pdfBytes = buildTablePdf(entries);
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
