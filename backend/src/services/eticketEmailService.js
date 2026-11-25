const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const db = require("../config/database");

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new Error("Konfigurasi SMTP belum lengkap.");
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
    auth: { user, pass },
  });
  return transporter;
}

function createTicketPdf(ticket) {
  return new Promise(async (resolve, reject) => {
    try {
      const qr = await QRCode.toBuffer(String(ticket.qr_token), {
        type: "png", errorCorrectionLevel: "H", margin: 2, width: 360,
      });
      const doc = new PDFDocument({ size: "A5", margin: 36 });
      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      doc.fontSize(22).fillColor("#764ED1").text("LYNORA", { align: "center" });
      doc.moveDown(0.5).fontSize(17).fillColor("#111827").text("E-TICKET", { align: "center" });
      doc.moveDown(1).fontSize(15).text(ticket.event_name || "Concert", { align: "center" });
      doc.moveDown(1).fontSize(10).fillColor("#374151");
      doc.text(`Attendee: ${ticket.attendee_name}`);
      doc.text(`Ticket code: ${ticket.ticket_code}`);
      doc.text(`Category: ${ticket.category_name || "General Admission"}`);
      doc.text(`Date: ${ticket.start_date ? new Date(ticket.start_date).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "See event details"}`);
      doc.text(`Venue: ${ticket.venue_name || "See event details"}`);
      doc.moveDown(1).image(qr, { fit: [190, 190], align: "center" });
      doc.moveDown(0.5).fontSize(8).fillColor("#6B7280").text("Show this QR code to the event organizer at check-in.", { align: "center" });
      doc.end();
    } catch (error) { reject(error); }
  });
}

async function deliverOrderEtickets(orderId) {
  const [rows] = await db.execute(
    `SELECT t.id AS ticket_id, t.ticket_code, t.qr_token,
            COALESCE(ta.full_name, u.name) AS attendee_name, COALESCE(NULLIF(ta.email, ''), u.email) AS recipient_email,
            tc.name AS category_name, e.name AS event_name, e.start_date,
            v.name AS venue_name, o.order_code
     FROM tickets t
     JOIN order_items oi ON oi.id = t.order_item_id
     JOIN orders o ON o.id = oi.order_id
     JOIN users u ON u.id = o.customer_id
     JOIN ticket_categories tc ON tc.id = oi.ticket_category_id
     JOIN events e ON e.id = tc.event_id
     LEFT JOIN venues v ON v.id = e.venue_id
     LEFT JOIN ticket_attendees ta ON ta.id = t.attendee_id
     WHERE o.id = ? AND o.status = 'paid'
     ORDER BY t.id ASC`, [orderId]
  );
  if (!rows.length) return { sent: 0, skipped: true };

  const groups = new Map();
  for (const ticket of rows) {
    const email = String(ticket.recipient_email || "").trim().toLowerCase();
    if (!email) {
      console.error(`[eticket-email] Ticket ${ticket.ticket_id} has no recipient email.`);
      continue;
    }
    if (!groups.has(email)) groups.set(email, []);
    groups.get(email).push(ticket);
  }

  let sent = 0;
  for (const [email, tickets] of groups) {
    const [logs] = await db.execute(
      "SELECT id, status FROM eticket_email_deliveries WHERE order_id = ? AND recipient_email = ? LIMIT 1",
      [orderId, email]
    );
    let logId = logs[0]?.id;
    if (logs[0]?.status === "sent") continue;
    if (!logId) {
      const [insert] = await db.execute(
        `INSERT INTO eticket_email_deliveries (order_id, recipient_email, status, attempts)
         VALUES (?, ?, 'pending', 0)`, [orderId, email]
      );
      logId = insert.insertId;
    }

    try {
      const attachments = [];
      for (const ticket of tickets) {
        const pdf = await createTicketPdf(ticket);
        attachments.push({ filename: `LYNORA-${ticket.ticket_code}.pdf`, content: pdf, contentType: "application/pdf" });
      }
      await getTransporter().sendMail({
        from: { name: process.env.SMTP_FROM_NAME || "LYNORA", address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER },
        to: email,
        subject: `Your LYNORA e-ticket - ${tickets[0].event_name || "Concert"}`,
        text: `Thank you for purchasing with LYNORA. Your e-ticket${tickets.length > 1 ? "s are" : " is"} attached. Order: ${tickets[0].order_code}. Please keep the QR code private and present it at check-in.`,
        attachments,
      });
      await db.execute(
        `UPDATE eticket_email_deliveries SET status = 'sent', attempts = attempts + 1,
         sent_at = NOW(), last_error = NULL WHERE id = ?`, [logId]
      );
      sent += tickets.length;
    } catch (error) {
      await db.execute(
        `UPDATE eticket_email_deliveries SET status = 'failed', attempts = attempts + 1,
         last_error = ? WHERE id = ?`, [String(error.message || error).slice(0, 1000), logId]
      );
      console.error(`[eticket-email] Failed sending to ${email}:`, error.message);
    }
  }
  return { sent };
}

module.exports = { deliverOrderEtickets };
