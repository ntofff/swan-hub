import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
const removeAccents = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const fmt = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function buildPdf(items: any[], title: string): Uint8Array {
  const objects: string[] = [];
  let objCount = 0;
  const newObj = (c: string) => { objCount++; objects.push(c); return objCount; };

  newObj("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
  newObj("");
  newObj("3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj");
  newObj("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj");

  const W = 595, H = 842, M = 40, LH = 14;
  const pages: number[] = [];
  let y = H - M;
  let sl: string[] = [];

  const startPage = () => {
    y = H - M; sl = [];
    if (pages.length === 0) {
      sl.push("BT", "/F2 16 Tf", `${M} ${y} Td`, `(${esc(removeAccents(title))}) Tj`, "ET");
      y -= 10;
      const now = removeAccents(new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }));
      sl.push("BT", "/F1 8 Tf", "0.5 0.5 0.5 rg", `${M} ${y} Td`, `(${esc("Exporte le " + now)}) Tj`, "0 0 0 rg", "ET");
      y -= 25;
    }
  };

  const finishPage = () => {
    const stream = sl.join("\n");
    const sId = newObj(`${objCount + 1} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj`);
    const pId = newObj(`${objCount + 1} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${sId} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>\nendobj`);
    pages.push(pId);
  };

  startPage();

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (y < M + 80) { finishPage(); startPage(); }

    if (i > 0) {
      sl.push("0.85 0.85 0.85 RG", `${M} ${y} m ${W - M} ${y} l S`);
      y -= 8;
    }

    // Number + title
    const num = it.quote_number || it.invoice_number || "";
    sl.push("BT", "/F2 10 Tf", `${M} ${y} Td`, `(${esc(removeAccents(num + "  " + (it.title || "")))}) Tj`, "ET");
    y -= LH;

    // Status + client
    const status = it.status || "";
    const client = it.client_name || it.client || "";
    sl.push("BT", "/F1 9 Tf", "0.4 0.4 0.4 rg", `${M} ${y} Td`,
      `(${esc(removeAccents("Statut: " + status + (client ? "  |  Client: " + client : "")))}) Tj`, "0 0 0 rg", "ET");
    y -= LH;

    // Amount + date
    const amount = it.amount ? fmt(Number(it.amount)) + " EUR" : "-";
    const date = it.created_at ? removeAccents(new Date(it.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })) : "";
    sl.push("BT", "/F1 9 Tf", `${M} ${y} Td`,
      `(${esc("Montant: " + amount + "  |  Date: " + date)}) Tj`, "ET");
    y -= LH;

    // SIRET + address if present
    if (it.siret || it.address) {
      const extra = [it.siret ? "SIRET: " + it.siret : "", it.address ? "Adresse: " + it.address : ""].filter(Boolean).join("  |  ");
      sl.push("BT", "/F1 8 Tf", "0.5 0.5 0.5 rg", `${M} ${y} Td`, `(${esc(removeAccents(extra))}) Tj`, "0 0 0 rg", "ET");
      y -= LH;
    }

    y -= 6;
  }

  // Total
  const total = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
  if (y < M + 30) { finishPage(); startPage(); }
  sl.push("0.85 0.85 0.85 RG", `${M} ${y} m ${W - M} ${y} l S`);
  y -= 15;
  sl.push("BT", "/F2 11 Tf", `${M} ${y} Td`, `(${esc("Total: " + fmt(total) + " EUR")}) Tj`, "ET");

  finishPage();

  const kids = pages.map(p => `${p} 0 R`).join(" ");
  objects[1] = `2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\nendobj`;

  let pdfStr = "%PDF-1.4\n";
  const objOffsets: number[] = [];
  for (let i = 0; i < objects.length; i++) {
    if (!objects[i]) continue;
    objOffsets.push(pdfStr.length);
    if (!objects[i].startsWith(`${i + 1} 0 obj`)) {
      pdfStr += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
    } else {
      pdfStr += objects[i] + "\n";
    }
  }
  const xref = pdfStr.length;
  pdfStr += `xref\n0 ${objCount + 1}\n0000000000 65535 f \n`;
  for (const off of objOffsets) pdfStr += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdfStr += `trailer\n<< /Size ${objCount + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  return new TextEncoder().encode(pdfStr);
}

function buildCsv(items: any[]): string {
  const headers = ["Numero", "Titre", "Client", "SIRET", "Montant", "Statut", "Date"];
  const rows = items.map(it => [
    it.quote_number || it.invoice_number || "",
    `"${(it.title || "").replace(/"/g, '""')}"`,
    `"${(it.client_name || it.client || "").replace(/"/g, '""')}"`,
    it.siret || "",
    it.amount || "",
    it.status || "",
    it.created_at ? new Date(it.created_at).toLocaleDateString("fr-FR") : "",
  ].join(";"));
  return [headers.join(";"), ...rows].join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { items, title, format } = await req.json();
    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "Aucune donnée" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (format === "csv") {
      const csv = buildCsv(items);
      const base64 = btoa(unescape(encodeURIComponent(csv)));
      return new Response(JSON.stringify({ csv_base64: base64 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pdfBytes = buildPdf(items, title || "Export");
    const base64 = btoa(String.fromCharCode(...pdfBytes));
    return new Response(JSON.stringify({ pdf_base64: base64 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("export-quotes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
