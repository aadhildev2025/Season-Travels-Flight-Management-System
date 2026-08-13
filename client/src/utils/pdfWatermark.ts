import { SEASON_TRAVELS_LOGO_BASE64 } from './logoBase64';

export { SEASON_TRAVELS_LOGO_BASE64 };

export function applySeasonTravelsWatermark(doc: any, title: string) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const logoW = 34;
  const logoH = 10.4;

  const wmWidth = Math.min(pageWidth * 0.55, 140);
  const wmHeight = wmWidth / 3.26;
  const wmX = (pageWidth - wmWidth) / 2;
  const wmY = (pageHeight - wmHeight) / 2;

  const now = new Date();
  const dateStr = now.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  });

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // 1. Watermark logo centered behind page content
    try {
      doc.setGState(new doc.GState({ opacity: 0.13 }));
      doc.addImage(SEASON_TRAVELS_LOGO_BASE64, 'PNG', wmX, wmY, wmWidth, wmHeight);
      doc.setGState(new doc.GState({ opacity: 1.0 }));
    } catch (e) {
      console.warn('Failed to render watermark logo:', e);
    }

    // 2. Top Header Logo & Title
    try {
      doc.addImage(SEASON_TRAVELS_LOGO_BASE64, 'PNG', 14, 7, logoW, logoH);
    } catch (e) {
      doc.setFontSize(13);
      doc.setTextColor(220, 38, 38);
      doc.text('SEASON TRAVELS', 14, 15);
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(title, 52, 14);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${dateStr}`, pageWidth - 14, 14, { align: 'right' });

    // Header Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.15);
    doc.line(14, 19, pageWidth - 14, 19);

    // 3. Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('Season Travels Flight Management System • Confidential', 14, pageHeight - 8);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
  }
}
