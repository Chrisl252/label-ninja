// Plain-language messages for the 4x6 converter. Turns pdf.js / browser errors into one
// sentence a seller can act on. Pure: tested in Node.

export class LabelFileError extends Error {
  constructor(code, fileName, detail = '') {
    super(`${fileName}: ${code}${detail ? ` (${detail})` : ''}`);
    this.name = 'LabelFileError';
    this.code = code;
    this.fileName = fileName;
    this.detail = detail;
  }
}

function extOf(name) {
  const m = /\.([a-z0-9]{1,8})$/i.exec(name || '');
  return m ? m[1].toUpperCase() : '';
}

/** One readable sentence for a failure while opening `fileName`. */
export function friendlyError(err, fileName = 'This file') {
  const name = fileName || 'This file';
  const code = err?.code || err?.name || '';
  if (code === 'unsupported') {
    const ext = extOf(name);
    return `${name} is ${ext ? `a ${ext} file` : 'not a file type this tool can read'}. Add a PDF, PNG or JPG label, or take a screenshot of the label and paste it here.`;
  }
  if (code === 'too-big') return `${name} is larger than 80 MB. Split it into smaller PDFs, or download only the label pages.`;
  if (code === 'empty') return `${name} is empty (0 bytes). Download the label again and add the new file.`;
  if (code === 'PasswordException' || /password/i.test(err?.message || '')) {
    return `${name} is password-protected, so the browser cannot open it. Open it in your PDF viewer, print or save it as a new PDF without the password, then add that copy.`;
  }
  if (code === 'InvalidPDFException' || code === 'FormatError' || /invalid pdf|bad xref|structure/i.test(err?.message || '')) {
    return `${name} does not open as a PDF. It may be damaged or only partly downloaded. Download the label again and retry.`;
  }
  if (code === 'image-decode' || code === 'EncodingError' || code === 'InvalidStateError') {
    return `${name} could not be read as an image. Save the label as a PNG or JPG and try again.`;
  }
  return `Could not open ${name}. ${err?.message ? `The browser said: ${err.message}` : 'Try downloading it again.'}`;
}
