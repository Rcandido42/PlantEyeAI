import jsPDF from 'jspdf';
import { HistoryItem } from '../types';

const translateStatus = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'HEALTHY': return 'Talhão Saudável';
    case 'THIRSTY': return 'Deficit Hídrico';
    case 'SICK': return 'Anomalia Detetada';
    default: return 'Inconclusivo';
  }
};

const translateLight = (level: string) => {
  switch (level?.toUpperCase()) {
    case 'HIGH': return 'Exposição Alta';
    case 'ADEQUATE': return 'Exposição Adequada';
    case 'LOW': return 'Exposição Baixa';
    default: return 'Desconhecida';
  }
};

const formatDate = (timestamp: number) => {
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(timestamp));
};

export const exportSinglePDF = async (item: HistoryItem) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = 20;

  doc.setFillColor(6, 78, 59);
  doc.rect(0, 0, pageW, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('PLANTEYE', margin, 18);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Relatório de Campo — Eucalyptus spp.', margin, 26);
  doc.text(`Gerado em ${formatDate(Date.now())}`, margin, 33);

  y = 55;

  if (item.imageUrl) {
    try {
      doc.addImage(item.imageUrl, 'JPEG', margin, y, contentW, 60);
      y += 68;
    } catch {}
  }

  doc.setTextColor(6, 78, 59);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(item.species, margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Eucalyptus spp. — ${formatDate(item.timestamp)}`, margin, y);
  y += 12;

  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(209, 250, 229);
  doc.roundedRect(margin, y, contentW / 2 - 3, 24, 3, 3, 'FD');
  doc.setTextColor(6, 78, 59);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('ESTADO FITOSSANITÁRIO', margin + 4, y + 7);
  doc.setFontSize(10);
  doc.text(translateStatus(item.status), margin + 4, y + 17);

  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(209, 250, 229);
  doc.roundedRect(margin + contentW / 2 + 3, y, contentW / 2 - 3, 24, 3, 3, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('RADIAÇÃO SOLAR', margin + contentW / 2 + 7, y + 7);
  doc.setFontSize(10);
  doc.text(translateLight(item.lightLevel), margin + contentW / 2 + 7, y + 17);
  y += 32;

  doc.setFillColor(248, 250, 248);
  doc.setDrawColor(220, 240, 230);
  doc.roundedRect(margin, y, contentW, 30, 3, 3, 'FD');
  doc.setTextColor(6, 78, 59);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('OBSERVAÇÃO TÉCNICA', margin + 4, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  const summaryLines = doc.splitTextToSize(item.summary, contentW - 8);
  doc.text(summaryLines, margin + 4, y + 15);
  y += 38;

  doc.setFillColor(6, 78, 59);
  doc.roundedRect(margin, y, contentW, 30, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('AÇÃO RECOMENDADA', margin + 4, y + 8);
  doc.setFont('helvetica', 'normal');
  const recLines = doc.splitTextToSize(item.recommendation, contentW - 8);
  doc.text(recLines, margin + 4, y + 15);
  y += 38;

  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.text(`Confiança do modelo: ${Math.round((item.confidence ?? 0) * 100)}%`, margin, y);

  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text('PlantEye — Monitorização Florestal de Eucaliptos', margin, 285);
  doc.text(`Página 1 de 1`, pageW - margin - 20, 285);

  doc.save(`planteye-relatorio-${item.species.replace(/\s+/g, '-').toLowerCase()}-${item.id.slice(0, 6)}.pdf`);
};

export const exportAllPDF = async (items: HistoryItem[]) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentW = pageW - margin * 2;

  doc.setFillColor(6, 78, 59);
  doc.rect(0, 0, pageW, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('PLANTEYE', margin, 18);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Relatório Completo de Campo — Eucalyptus spp.', margin, 26);
  doc.text(`Gerado em ${formatDate(Date.now())} — ${items.length} diagnóstico(s)`, margin, 33);

  let y = 55;

  const healthy = items.filter(i => i.status === 'HEALTHY').length;
  const sick = items.filter(i => i.status === 'SICK').length;
  const thirsty = items.filter(i => i.status === 'THIRSTY').length;

  doc.setFillColor(248, 250, 248);
  doc.setDrawColor(220, 240, 230);
  doc.roundedRect(margin, y, contentW, 28, 3, 3, 'FD');
  doc.setTextColor(6, 78, 59);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMO DO TALHÃO', margin + 4, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Saudáveis: ${healthy}   Deficit Hídrico: ${thirsty}   Anomalias: ${sick}   Total: ${items.length}`, margin + 4, y + 18);
  y += 36;

  items.forEach((item, index) => {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    doc.setDrawColor(220, 240, 230);
    doc.setFillColor(252, 254, 252);
    doc.roundedRect(margin, y, contentW, 38, 3, 3, 'FD');

    doc.setTextColor(6, 78, 59);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}. ${item.species}`, margin + 4, y + 9);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(formatDate(item.timestamp), margin + 4, y + 16);

    doc.setTextColor(6, 78, 59);
    doc.setFontSize(8);
    doc.text(`Estado: ${translateStatus(item.status)}   Luz: ${translateLight(item.lightLevel)}   Confiança: ${Math.round((item.confidence ?? 0) * 100)}%`, margin + 4, y + 23);

    const recLines = doc.splitTextToSize(item.recommendation, contentW - 8);
    doc.setTextColor(60, 60, 60);
    doc.text(recLines[0], margin + 4, y + 31);

    y += 44;
  });

  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.text('PlantEye — Monitorização Florestal de Eucaliptos', margin, 285);
    doc.text(`Página ${i} de ${totalPages}`, pageW - margin - 20, 285);
  }

  doc.save(`planteye-relatorio-completo-${new Date().toISOString().slice(0, 10)}.pdf`);
};