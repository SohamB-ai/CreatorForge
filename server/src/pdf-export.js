import PDFDocument from 'pdfkit';

// Deliberately render a small Markdown subset. HTML is printed as literal text.
function inlineRuns(line) {
  const runs = [];
  const link = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let offset = 0;
  for (const match of line.matchAll(link)) {
    if (match.index > offset) runs.push({ text: line.slice(offset, match.index) });
    runs.push({ text: match[1], link: match[2] });
    offset = match.index + match[0].length;
  }
  if (offset < line.length) runs.push({ text: line.slice(offset) });
  return runs.length ? runs : [{ text: line }];
}

export function streamMarkdownPdf(content, response) {
  const doc = new PDFDocument({ margin: 54, bufferPages: true, size: 'A4', info: { Title: 'CreatorForge export' } });
  doc.on('error', error => response.destroy(error));
  doc.pipe(response);
  for (const raw of content.split(/\r?\n/)) {
    const heading = raw.match(/^(#{1,3})\s+(.+)$/);
    const bullet = raw.match(/^\s*[-*+]\s+(.+)$/);
    const numbered = raw.match(/^\s*(\d+)\.\s+(.+)$/);
    if (!raw.trim()) { doc.moveDown(0.4); continue; }
    if (heading) {
      doc.moveDown(0.45).font('Helvetica-Bold').fontSize([20, 16, 13][heading[1].length - 1]).text(heading[2], { paragraphGap: 5 });
      continue;
    }
    const line = bullet?.[1] || numbered?.[2] || raw;
    doc.font('Helvetica').fontSize(10.5);
    if (bullet || numbered) doc.text(bullet ? '• ' : `${numbered[1]}. `, { continued: true, indent: 12 });
    const runs = inlineRuns(line);
    for (let index = 0; index < runs.length; index++) {
      const run = runs[index];
      doc.fillColor(run.link ? '#21518a' : '#20242a').text(run.text, { continued: index < runs.length - 1, link: run.link, underline: Boolean(run.link), paragraphGap: index === runs.length - 1 ? 4 : 0 });
    }
  }
  const pages = doc.bufferedPageRange();
  for (let index = pages.start; index < pages.start + pages.count; index++) {
    doc.switchToPage(index);
    doc.font('Helvetica').fontSize(8).fillColor('#777777').text(`${index + 1} / ${pages.count}`, 54, doc.page.height - 38, { width: doc.page.width - 108, align: 'center' });
  }
  doc.end();
}
