import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

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

export async function exportInvoicePdf(order) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { font-family: Arial, sans-serif; color: #080D1C; padding: 32px; }
          h1 { color: #6527C8; }
          .row { border-bottom: 1px solid #D9DEEA; padding: 12px 0; }
          .label { color: #68748C; font-size: 12px; }
          .value { font-size: 15px; font-weight: bold; margin-top: 5px; }
        </style>
      </head>
      <body>
        <h1>LYNORA INVOICE</h1>
        <div class="row"><div class="label">NOMOR PESANAN</div><div class="value">#ORD-${escapeHtml(order.id)}</div></div>
        <div class="row"><div class="label">ACARA</div><div class="value">${escapeHtml(order.event)}</div></div>
        <div class="row"><div class="label">TANGGAL PESANAN</div><div class="value">${escapeHtml(order.date)}</div></div>
        <div class="row"><div class="label">LOKASI</div><div class="value">${escapeHtml(order.location)}</div></div>
        <div class="row"><div class="label">KATEGORI</div><div class="value">${escapeHtml(order.category)} (x${escapeHtml(order.quantity)})</div></div>
        <div class="row"><div class="label">STATUS</div><div class="value">${escapeHtml(order.statusDetail || order.status)}</div></div>
        <div class="row"><div class="label">METODE PEMBAYARAN</div><div class="value">${escapeHtml(order.paymentMethod || 'QRIS')}</div></div>
        <div class="row"><div class="label">TOTAL PEMBAYARAN</div><div class="value">${escapeHtml(order.price)}</div></div>
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
    dialogTitle: 'Simpan atau bagikan invoice',
    UTI: 'com.adobe.pdf',
  });
}
