const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { Resend } = require("resend");

admin.initializeApp();

const db = admin.firestore();

/*
|--------------------------------------------------------------------------
| CONFIG - REPLACE THESE LATER
|--------------------------------------------------------------------------
| 1) RESEND_API_KEY:
|    Put your Resend API key in Firebase Functions env or replace fallback.
|
| 2) FROM_EMAIL:
|    After buying/verifying your domain in Resend, replace with something like:
|    "PressPlay Nails <hello@yourdomain.com>"
|
| 3) APP_URL:
|    Your live website URL
|--------------------------------------------------------------------------
*/
const RESEND_API_KEY = process.env.RESEND_API_KEY || "PASTE_RESEND_API_KEY_HERE";
const FROM_EMAIL = process.env.FROM_EMAIL || "PressPlay Nails <onboarding@resend.dev>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "workwithwaleed1@gmail.com";
const APP_URL = process.env.APP_URL || "https://your-site-url.com";

const resend = new Resend(RESEND_API_KEY);

/* ==========================================================================
   HELPERS
   ========================================================================== */

function emailSystemReady() {
  const missing = [];

  if (!RESEND_API_KEY || RESEND_API_KEY === "PASTE_RESEND_API_KEY_HERE") {
    missing.push("RESEND_API_KEY");
  }

  if (!FROM_EMAIL) {
    missing.push("FROM_EMAIL");
  }

  if (!APP_URL || APP_URL === "https://your-site-url.com") {
    missing.push("APP_URL");
  }

  if (missing.length) {
    logger.warn("Email system not fully configured yet.", { missing });
    return false;
  }

  return true;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function looksLikeEmail(email) {
  return /^.+@.+\..+$/.test(normalizeEmail(email));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeNumber(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

function formatPKR(value) {
  return `PKR ${safeNumber(value).toLocaleString()}`;
}

function productUrl(productId) {
  return `${APP_URL.replace(/\/$/, "")}/product.html?id=${encodeURIComponent(productId)}`;
}

function isProductVisible(product) {
  return !product?.isHidden;
}

function isProductOnSale(product) {
  const price = safeNumber(product?.price);
  const salePrice = safeNumber(product?.salePrice);

  return salePrice > 0 && price > 0 && salePrice < price;
}

function cleanSubscribers(docs) {
  const map = new Map();

  for (const docSnap of docs) {
    const data = docSnap.data() || {};
    const email = normalizeEmail(data.email || docSnap.id);

    if (!looksLikeEmail(email)) continue;

    map.set(email, {
      id: docSnap.id,
      email,
      ...data,
    });
  }

  return Array.from(map.values());
}

async function getAllSubscribers() {
  const snap = await db.collection("newsletter").get();
  return cleanSubscribers(snap.docs);
}

async function upsertSubscriber(email, extra = {}) {
  const normalized = normalizeEmail(email);
  if (!looksLikeEmail(normalized)) return false;

  await db.collection("newsletter").doc(normalized).set(
    {
      email: normalized,
      source: extra.source || "unknown",
      subscribed: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ...extra,
    },
    { merge: true }
  );

  return true;
}

async function sendEmail({ to, subject, html }) {
  if (!emailSystemReady()) {
    logger.warn("Skipping email because config is incomplete.", { to, subject });
    return { skipped: true };
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    return result;
  } catch (error) {
    logger.error("Resend email error", {
      to,
      subject,
      error: error?.message || error,
    });
    throw error;
  }
}

async function sendBulkEmails({ recipients, subject, htmlBuilder, batchSize = 25 }) {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    logger.info("No recipients found for bulk email.", { subject });
    return;
  }

  const validRecipients = recipients
    .map((r) => normalizeEmail(r.email || r))
    .filter((email) => looksLikeEmail(email));

  if (!validRecipients.length) {
    logger.info("No valid recipients found for bulk email.", { subject });
    return;
  }

  for (let i = 0; i < validRecipients.length; i += batchSize) {
    const chunk = validRecipients.slice(i, i + batchSize);

    await Promise.allSettled(
      chunk.map((email) =>
        sendEmail({
          to: email,
          subject,
          html: htmlBuilder(email),
        })
      )
    );
  }

  logger.info("Bulk email completed.", {
    subject,
    totalRecipients: validRecipients.length,
  });
}

/* ==========================================================================
   EMAIL TEMPLATES
   ========================================================================== */

function buildEmailShell({ title, preview, bodyHtml }) {
  return `
    <div style="margin:0;padding:0;background:#f7f7f8;font-family:Arial,Helvetica,sans-serif;color:#111111;">
      <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
        <div style="background:#ffffff;border:1px solid #eeeeee;border-radius:18px;overflow:hidden;">
          <div style="background:#ff7e8d;padding:18px 24px;color:#ffffff;">
            <div style="font-size:22px;font-weight:800;letter-spacing:0.5px;">PressPlay Nails</div>
            <div style="font-size:12px;opacity:0.95;margin-top:4px;">${escapeHtml(preview || "")}</div>
          </div>

          <div style="padding:28px 24px;">
            <h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;color:#111111;">${escapeHtml(title)}</h1>
            ${bodyHtml}
          </div>

          <div style="padding:18px 24px;border-top:1px solid #f0f0f0;color:#666666;font-size:12px;line-height:1.6;">
            You’re receiving this email from PressPlay Nails because you subscribed or placed an order on our website.
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildProductCard(product, badgeText = "") {
  const image = escapeHtml(
    (Array.isArray(product?.images) && product.images[0]) ||
      product?.image ||
      "https://placehold.co/600x600/ffffff/2b1719?text=PressPlay+Nails"
  );

  const name = escapeHtml(product?.name || "New Product");
  const description = escapeHtml(product?.description || "Now available on PressPlay Nails.");
  const price = formatPKR(product?.price);
  const salePrice = formatPKR(product?.salePrice);
  const onSale = isProductOnSale(product);
  const link = productUrl(product?.id || "");

  return `
    <div style="border:1px solid #f0f0f0;border-radius:16px;overflow:hidden;background:#ffffff;">
      <img src="${image}" alt="${name}" style="width:100%;display:block;aspect-ratio:4/3;object-fit:cover;background:#fafafa;">
      <div style="padding:18px;">
        ${
          badgeText
            ? `<div style="display:inline-block;background:#ffedf0;color:#d93e57;border:1px solid #ffd3da;padding:6px 10px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:0.3px;margin-bottom:12px;">${escapeHtml(
                badgeText
              )}</div>`
            : ""
        }

        <div style="font-size:20px;font-weight:800;color:#111111;margin-bottom:8px;">${name}</div>
        <div style="font-size:14px;line-height:1.7;color:#555555;margin-bottom:16px;">${description}</div>

        <div style="margin-bottom:18px;">
          ${
            onSale
              ? `
                <span style="font-size:20px;font-weight:900;color:#111111;">${salePrice}</span>
                <span style="font-size:14px;color:#888888;text-decoration:line-through;margin-left:8px;">${price}</span>
              `
              : `<span style="font-size:20px;font-weight:900;color:#111111;">${price}</span>`
          }
        </div>

        <a href="${link}" style="display:inline-block;background:#ff7e8d;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-size:13px;font-weight:800;">
          Shop Now
        </a>
      </div>
    </div>
  `;
}

function buildNewProductEmail(product) {
  return buildEmailShell({
    title: "New arrival just dropped ✨",
    preview: "A fresh press-on set is now live.",
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#444444;">
        We just uploaded a brand new product to PressPlay Nails. Be among the first to shop it.
      </p>

      ${buildProductCard(product, "NEW PRODUCT")}
    `,
  });
}

function buildSaleEmail(product) {
  return buildEmailShell({
    title: "A product just went on sale 💅",
    preview: "Limited-time discount now live.",
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#444444;">
        One of our products is now discounted. Grab it before the sale ends.
      </p>

      ${buildProductCard(product, "SALE")}
    `,
  });
}

function buildWeeklyPromoEmail() {
  return buildEmailShell({
    title: "Your weekly PressPlay Nails promo 💖",
    preview: "Fresh styles, weekly reminder, and limited-time savings.",
    bodyHtml: `
      <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#444444;">
        Happy Monday! Here’s your weekly PressPlay Nails reminder to check out our latest designs, best sellers, and active discounts.
      </p>

      <div style="border:1px solid #f0f0f0;border-radius:16px;padding:20px;background:#fffafa;">
        <div style="font-size:18px;font-weight:800;color:#111111;margin-bottom:10px;">Why shop this week?</div>
        <ul style="margin:0;padding-left:18px;color:#444444;font-size:14px;line-height:1.9;">
          <li>New arrivals may already be live on the site</li>
          <li>Selected products may be discounted for a limited time</li>
          <li>Your favorite sets can sell out quickly</li>
        </ul>

        <div style="margin-top:18px;">
          <a href="${APP_URL.replace(/\/$/, "")}/products.html" style="display:inline-block;background:#ff7e8d;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-size:13px;font-weight:800;">
            Browse Products
          </a>
        </div>
      </div>
    `,
  });
}

function buildManualPaymentAlertEmail(orderId, order) {
  const customerName =
    order?.customer?.name ||
    order?.shipping?.name ||
    "Customer";

  const customerEmail =
    order?.customer?.email ||
    order?.shipping?.email ||
    "No email";

  const customerPhone =
    order?.customer?.phone ||
    order?.shipping?.phone ||
    "No phone";

  const paymentMethod = String(order?.paymentMethod || "unknown").toUpperCase();
  const paymentStatus = String(order?.paymentStatus || "pending");
  const total = formatPKR(order?.total || 0);
  const subtotal = formatPKR(order?.subtotal || 0);
  const shippingFee = safeNumber(order?.shippingFee || 0) <= 0 ? "Free" : formatPKR(order?.shippingFee || 0);

  const payerName = order?.paymentProof?.payerName || "Not provided";
  const payerPhone = order?.paymentProof?.payerPhone || "Not provided";
  const referenceId = order?.paymentProof?.referenceId || "Not provided";
  const note = order?.paymentProof?.note || "No note";
  const submittedAt = order?.paymentProof?.submittedAt || "Not available";

  const items = Array.isArray(order?.items) ? order.items : [];
  const itemsHtml = items.length
    ? items
        .map((item) => {
          const itemName = escapeHtml(item?.name || "Item");
          const qty = safeNumber(item?.qty || 0);
          const price = formatPKR(item?.price || 0);
          return `
            <tr>
              <td style="padding:10px;border-bottom:1px solid #f3f3f3;">${itemName}</td>
              <td style="padding:10px;border-bottom:1px solid #f3f3f3;text-align:center;">${qty}</td>
              <td style="padding:10px;border-bottom:1px solid #f3f3f3;text-align:right;">${price}</td>
            </tr>
          `;
        })
        .join("")
    : `
      <tr>
        <td colspan="3" style="padding:10px;text-align:center;color:#777777;">No items found</td>
      </tr>
    `;

  return buildEmailShell({
    title: "New manual payment submitted",
    preview: "A customer placed an Easypaisa / Bank Alfalah order.",
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#444444;">
        A customer has placed a manual payment order and submitted payment details. Please verify it in your admin panel.
      </p>

      <div style="border:1px solid #f0f0f0;border-radius:16px;padding:18px;background:#ffffff;margin-bottom:16px;">
        <div style="font-size:16px;font-weight:800;margin-bottom:10px;">Order Info</div>
        <div style="font-size:14px;line-height:1.9;color:#333333;">
          <div><strong>Order ID:</strong> ${escapeHtml(orderId)}</div>
          <div><strong>Customer:</strong> ${escapeHtml(customerName)}</div>
          <div><strong>Email:</strong> ${escapeHtml(customerEmail)}</div>
          <div><strong>Phone:</strong> ${escapeHtml(customerPhone)}</div>
          <div><strong>Payment Method:</strong> ${escapeHtml(paymentMethod)}</div>
          <div><strong>Payment Status:</strong> ${escapeHtml(paymentStatus)}</div>
          <div><strong>Subtotal:</strong> ${escapeHtml(subtotal)}</div>
          <div><strong>Shipping:</strong> ${escapeHtml(shippingFee)}</div>
          <div><strong>Total:</strong> ${escapeHtml(total)}</div>
        </div>
      </div>

      <div style="border:1px solid #f0f0f0;border-radius:16px;padding:18px;background:#fffafa;margin-bottom:16px;">
        <div style="font-size:16px;font-weight:800;margin-bottom:10px;">Payment Proof</div>
        <div style="font-size:14px;line-height:1.9;color:#333333;">
          <div><strong>Sender Name:</strong> ${escapeHtml(payerName)}</div>
          <div><strong>Sender Phone:</strong> ${escapeHtml(payerPhone)}</div>
          <div><strong>Reference ID:</strong> ${escapeHtml(referenceId)}</div>
          <div><strong>Submitted At:</strong> ${escapeHtml(submittedAt)}</div>
          <div><strong>Note:</strong> ${escapeHtml(note)}</div>
        </div>
      </div>

      <div style="border:1px solid #f0f0f0;border-radius:16px;overflow:hidden;background:#ffffff;margin-bottom:16px;">
        <div style="padding:14px 16px;font-size:16px;font-weight:800;border-bottom:1px solid #f0f0f0;">Order Items</div>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#333333;">
          <thead>
            <tr>
              <th style="padding:10px;text-align:left;background:#fafafa;border-bottom:1px solid #f0f0f0;">Item</th>
              <th style="padding:10px;text-align:center;background:#fafafa;border-bottom:1px solid #f0f0f0;">Qty</th>
              <th style="padding:10px;text-align:right;background:#fafafa;border-bottom:1px solid #f0f0f0;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>
    `,
  });
}

/* ==========================================================================
   FIRESTORE / SCHEDULED FUNCTIONS
   ========================================================================== */

/**
 * 1) AUTO-ADD BUYERS TO NEWSLETTER
 * When an order is created, checkout email is automatically added to subscribers.
 */
exports.autoSubscribeBuyerOnOrder = onDocumentCreated("orders/{orderId}", async (event) => {
  try {
    const order = event.data?.data();
    if (!order) return;

    const email =
      normalizeEmail(order?.customer?.email) ||
      normalizeEmail(order?.shipping?.email) ||
      normalizeEmail(order?.email);

    if (!looksLikeEmail(email)) {
      logger.warn("Order created without valid customer email.", {
        orderId: event.params.orderId,
      });
      return;
    }

    await upsertSubscriber(email, {
      source: "checkout_order",
      subscribedFromOrder: true,
      lastOrderId: event.params.orderId,
    });

    logger.info("Buyer auto-added to newsletter.", {
      orderId: event.params.orderId,
      email,
    });
  } catch (error) {
    logger.error("autoSubscribeBuyerOnOrder failed", {
      error: error?.message || error,
      orderId: event.params.orderId,
    });
  }
});

/**
 * 2) SEND ADMIN EMAIL FOR MANUAL PAYMENT ORDERS
 * Fires when a new order is created with Easypaisa / Alfalah
 */
exports.sendManualPaymentAdminAlert = onDocumentCreated("orders/{orderId}", async (event) => {
  try {
    const order = event.data?.data();
    if (!order) return;

    const paymentMethod = String(order?.paymentMethod || "").toLowerCase();
    const paymentStatus = String(order?.paymentStatus || "").toLowerCase();

    const isManualPayment =
      paymentMethod === "easypaisa" || paymentMethod === "alfalah";

    if (!isManualPayment) {
      return;
    }

    if (paymentStatus !== "awaiting_verification") {
      return;
    }

    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `New Manual Payment Order - ${event.params.orderId.slice(0, 6)}`,
      html: buildManualPaymentAlertEmail(event.params.orderId, order),
    });

    logger.info("Manual payment admin alert sent.", {
      orderId: event.params.orderId,
      paymentMethod,
      adminEmail: ADMIN_EMAIL,
    });
  } catch (error) {
    logger.error("sendManualPaymentAdminAlert failed", {
      error: error?.message || error,
      orderId: event.params.orderId,
    });
  }
});

/**
 * 3) SEND NEW PRODUCT EMAIL
 * Fires when a new visible product is created.
 */
exports.sendNewProductEmail = onDocumentCreated("products/{productId}", async (event) => {
  try {
    const product = event.data?.data();
    if (!product) return;
    if (!isProductVisible(product)) return;

    const productWithId = {
      id: event.params.productId,
      ...product,
    };

    const subscribers = await getAllSubscribers();
    if (!subscribers.length) {
      logger.info("No subscribers available for new product email.", {
        productId: event.params.productId,
      });
      return;
    }

    await sendBulkEmails({
      recipients: subscribers,
      subject: `New Product: ${productWithId.name || "PressPlay Nails"}`,
      htmlBuilder: () => buildNewProductEmail(productWithId),
    });

    logger.info("New product email campaign sent.", {
      productId: event.params.productId,
      subscriberCount: subscribers.length,
    });
  } catch (error) {
    logger.error("sendNewProductEmail failed", {
      error: error?.message || error,
      productId: event.params.productId,
    });
  }
});

/**
 * 4) SEND SALE EMAIL
 * Fires only when a product enters sale state.
 */
exports.sendSaleEmail = onDocumentUpdated("products/{productId}", async (event) => {
  try {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    if (!before || !after) return;
    if (!isProductVisible(after)) return;

    const wasOnSale = isProductOnSale(before);
    const isNowOnSale = isProductOnSale(after);

    if (!isNowOnSale || wasOnSale) {
      return;
    }

    const productWithId = {
      id: event.params.productId,
      ...after,
    };

    const subscribers = await getAllSubscribers();
    if (!subscribers.length) {
      logger.info("No subscribers available for sale email.", {
        productId: event.params.productId,
      });
      return;
    }

    await sendBulkEmails({
      recipients: subscribers,
      subject: `Sale Alert: ${productWithId.name || "PressPlay Nails"} is now discounted`,
      htmlBuilder: () => buildSaleEmail(productWithId),
    });

    logger.info("Sale email campaign sent.", {
      productId: event.params.productId,
      subscriberCount: subscribers.length,
    });
  } catch (error) {
    logger.error("sendSaleEmail failed", {
      error: error?.message || error,
      productId: event.params.productId,
    });
  }
});

/**
 * 5) WEEKLY PROMOTIONAL EMAIL
 * Sends every Monday at 10:00 AM Pakistan time.
 */
exports.sendWeeklyPromoEmail = onSchedule(
  {
    schedule: "0 10 * * 1",
    timeZone: "Asia/Karachi",
    region: "us-central1",
  },
  async () => {
    try {
      const subscribers = await getAllSubscribers();

      if (!subscribers.length) {
        logger.info("No subscribers found for weekly promo.");
        return;
      }

      await sendBulkEmails({
        recipients: subscribers,
        subject: "Weekly Promo from PressPlay Nails ✨",
        htmlBuilder: () => buildWeeklyPromoEmail(),
      });

      logger.info("Weekly promo email sent.", {
        subscriberCount: subscribers.length,
      });
    } catch (error) {
      logger.error("sendWeeklyPromoEmail failed", {
        error: error?.message || error,
      });
    }
  }
);

/**
 * 6) SEND CUSTOMER EMAIL AFTER PAYMENT CONFIRMATION
 */
exports.notifyCustomerOnPaymentConfirmed = onDocumentUpdated("orders/{orderId}", async (event) => {
  try {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    if (!before || !after) return;

    const oldStatus = String(before?.paymentStatus || "").toLowerCase();
    const newStatus = String(after?.paymentStatus || "").toLowerCase();

    // only trigger when changed TO paid
    if (oldStatus === "paid" || newStatus !== "paid") return;

    const customerEmail =
      after?.customer?.email ||
      after?.shipping?.email ||
      "";

    if (!looksLikeEmail(customerEmail)) return;

    const customerName =
      after?.customer?.name ||
      after?.shipping?.name ||
      "Customer";

    const orderId = event.params.orderId;
    const total = formatPKR(after?.total || 0);

    const html = buildEmailShell({
      title: "Payment Confirmed 💖",
      preview: "Your order is confirmed",
      bodyHtml: `
        <p>Hi ${escapeHtml(customerName)},</p>

        <p>Your payment has been verified successfully.</p>

        <p><strong>Order ID:</strong> ${escapeHtml(orderId)}</p>
        <p><strong>Total:</strong> ${escapeHtml(total)}</p>

        <p>We will process your order soon 💅</p>
      `,
    });

    await sendEmail({
      to: customerEmail,
      subject: "Payment Confirmed - PressPlay Nails",
      html,
    });

    logger.info("Customer email sent", { orderId });
  } catch (error) {
    logger.error("Error sending confirmation email", {
      error: error?.message || error,
      orderId: event.params.orderId,
    });
  }
});