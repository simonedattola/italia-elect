import type { SimulationViewData } from "@/components/simulation/results-view";

/** Export PDF client-side via jsPDF */
export async function exportResultsPdf(data: SimulationViewData) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const party = data.candidate.partySlug;
  let y = 20;

  doc.setFontSize(18);
  doc.text("Italia Elect — Report simulazione", 14, y);
  y += 10;
  doc.setFontSize(11);
  doc.text(
    `${data.candidate.firstName} ${data.candidate.lastName} · ${party}`,
    14,
    y
  );
  y += 8;
  doc.setFontSize(10);
  doc.text(
    `Probabilità vittoria: ${data.winProbability}% | IC: ${data.confidenceLow}%–${data.confidenceHigh}%`,
    14,
    y
  );
  y += 8;
  doc.text(`Generato: ${new Date(data.createdAt).toLocaleString("it-IT")}`, 14, y);
  y += 12;

  doc.setFontSize(12);
  doc.text("Risultati nazionali", 14, y);
  y += 8;
  doc.setFontSize(9);
  for (const r of data.nationalResults.slice(0, 9)) {
    doc.text(
      `${r.shortName}: ${r.percentage}% (IC ${r.percentageLow}–${r.percentageHigh}) | Camera ${r.seatsChamber} | Senato ${r.seatsSenate}`,
      14,
      y
    );
    y += 6;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  }

  y += 8;
  doc.setFontSize(12);
  doc.text("Disclaimer", 14, y);
  y += 7;
  doc.setFontSize(8);
  const disc = doc.splitTextToSize(data.modelMeta.disclaimer, 180);
  doc.text(disc, 14, y);
  y += disc.length * 4 + 8;

  if (data.analysis) {
    doc.setFontSize(12);
    doc.text("Analisi (estratto)", 14, y);
    y += 7;
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(data.analysis.replace(/[#*]/g, "").slice(0, 1800), 180);
    for (const line of lines) {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 14, y);
      y += 4;
    }
  }

  doc.save(`italia-elect-${data.slug}.pdf`);
}
