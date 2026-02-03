/**
 * Push notifications via Firebase Cloud Messaging (FCM).
 * Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON (base64) to enable.
 */

let admin = null;

function getMessaging() {
  if (admin) return admin.messaging();
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!path && !json) return null;
  try {
    const firebaseAdmin = require("firebase-admin");
    if (!firebaseAdmin.apps?.length) {
      let cred;
      if (json) {
        const key = Buffer.from(json, "base64").toString("utf8");
        cred = firebaseAdmin.credential.cert(JSON.parse(key));
      } else {
        const fs = require("fs");
        const p = require("path");
        const fullPath = p.isAbsolute(path)
          ? path
          : p.resolve(process.cwd(), path);
        cred = firebaseAdmin.credential.cert(
          JSON.parse(fs.readFileSync(fullPath, "utf8"))
        );
      }
      firebaseAdmin.initializeApp({ credential: cred });
    }
    admin = firebaseAdmin;
    return admin.messaging();
  } catch (err) {
    console.warn("Push service: FCM init failed", err.message);
    return null;
  }
}

/**
 * Send a push notification to a device token.
 * @param {string} deviceToken - FCM device token
 * @param {object} notification - { title, body }
 * @param {object} data - optional payload
 * @returns {Promise<boolean>} - true if sent
 */
async function sendPush(deviceToken, notification, data = {}) {
  const messaging = getMessaging();
  if (!messaging || !deviceToken) return false;
  try {
    await messaging.send({
      token: deviceToken,
      notification: {
        title: notification.title || "New enrollment",
        body: notification.body || "",
      },
      data: { ...data },
    });
    return true;
  } catch (err) {
    console.warn("Push send failed:", err.message);
    return false;
  }
}

module.exports = { sendPush, getMessaging };
