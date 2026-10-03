// Print each slide on a page of its own shape so no paper is wasted. The print dialog's
// "pages per sheet" can then place several slides on one sheet of paper.
// Each .page gets a named @page sized from its slide ratio, the visible notes strip and any printed links.
window.LecturePrint = (() => {
  const WIDTH = 297; // mm; the printer scales the page to the paper
  let style = null;
  const visible = el => !!el && getComputedStyle(el).display !== 'none';
  function prepare(root = document) {
    if (!style) { style = document.createElement('style'); style.id = 'printPageSizes'; document.head.append(style); }
    const rules = new Map();
    const linksShown = !document.body.classList.contains('links-hidden');
    root.querySelectorAll('.page').forEach(page => {
      const sheet = page.querySelector('.sheet');
      if (!sheet) return;
      const ratio = parseFloat(sheet.style.getPropertyValue('--slide-ratio')) || 16 / 9;
      const side = [...sheet.querySelectorAll('.note, .private-side')].some(visible);
      const sheetRatio = side ? (parseFloat(sheet.style.getPropertyValue('--sheet-ratio')) || ratio * 1.42) : ratio;
      const links = linksShown ? page.querySelectorAll('.resource-item').length : 0;
      const height = WIDTH / sheetRatio + (links ? 14 + 12 * links : 0) + 0.5;
      const name = 'slide' + Math.round(height * 10);
      rules.set(name, `@page ${name}{size:${WIDTH}mm ${height.toFixed(1)}mm;margin:0}`);
      page.style.page = name;
    });
    style.textContent = [...rules.values()].join('\n');
  }
  addEventListener('beforeprint', () => prepare());
  return { prepare };
})();
