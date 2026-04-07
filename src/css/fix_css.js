const fs = require('fs');
let css = fs.readFileSync('c:/gens-ar-celebration-card/src/css/sender.css', 'utf8');

// The block we want to replace starts with:
// input[type="text"],
// input[type="number"],
// textarea,
// select{
//   width:100%;
css = css.replace(/input\[type="text"\],\s*input\[type="number"\],\s*textarea,\s*select\s*{/g, '.studio-page input[type="text"], .studio-page input[type="number"], .studio-page textarea, .studio-page select {');
css = css.replace(/textarea\s*{\s*min-height:108px;/g, '.studio-page textarea { min-height:108px;');
css = css.replace(/input\[type="range"\]\s*{\s*width:100%;/g, '.studio-page input[type="range"] { width:100%;');

// We should also ensure any other unintended global clashing rules in the ported CSS are removed or scoped.
css = css.replace(/\.range-line/g, '.studio-page .range-line');
css = css.replace(/\n\s*\[contenteditable="true"\]/g, '\n.studio-page [contenteditable="true"]');

fs.writeFileSync('c:/gens-ar-celebration-card/src/css/sender.css', css);
console.log('done');
