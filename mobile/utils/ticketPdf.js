import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import QRCode from 'qrcode';

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

export async function exportTicketPdf(ticket) {
  const qrSvg = await QRCode.toString(ticket.qrValue, {
    type: 'svg',
    margin: 1,
    width: 220,
    color: {
      dark: '#080D1C',
      light: '#FFFFFF',
    },
  });
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { font-family: Arial, sans-serif; color: #080D1C; padding: 32px; }
          h1 { color: #6527C8; margin-bottom: 8px; }
          .label { color: #68748C; font-size: 12px; margin-top: 20px; }
          .value { font-size: 16px; font-weight: bold; margin-top: 4px; }
          .code { border: 1px dashed #914DFF; padding: 16px; margin-top: 24px; }
          .qr { margin: 24px auto; text-align: center; }
          .qr svg { width: 220px; height: 220px; }
        </style>
      </head>
      <body>
        <h1>LYNORA E-TICKET</h1>
        <div class="label">ACARA</div>
        <div class="value">${escapeHtml(ticket.title)}</div>
        <div class="label">TANGGAL</div>
        <div class="value">${escapeHtml(ticket.date)}</div>
        <div class="label">VENUE</div>
        <div class="value">${escapeHtml(ticket.venue)}</div>
        <div class="qr">${qrSvg}</div>
        <div class="code">
          <div class="label">KODE TIKET</div>
          <div class="value">${escapeHtml(ticket.qrValue)}</div>
        </div>
        <p>Gunakan kode tiket ini saat memasuki venue.</p>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  if (Platform.OS === 'web') {
    return;
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Fitur berbagi file tidak tersedia di perangkat ini.');
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Simpan atau bagikan e-ticket',
    UTI: 'com.adobe.pdf',
  });
}
