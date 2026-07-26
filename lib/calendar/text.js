"use strict";

function escapeText(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function foldLine(line) {
  const segments = [];
  let current = "";
  let octets = 0;
  for (const ch of line) {
    // iterating a string yields whole code points (surrogate-pair safe)
    const b = Buffer.byteLength(ch, "utf8");
    if (octets + b > 75) {
      segments.push(current);
      current = " " + ch; // leading space counts toward the 75-octet budget
      octets = 1 + b;
    } else {
      current += ch;
      octets += b;
    }
  }
  segments.push(current);
  return segments.join("\r\n");
}

function assemble(lines) {
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

module.exports = { escapeText, foldLine, assemble };
