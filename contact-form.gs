// Add this file in the response spreadsheet's Apps Script project, deploy it as a web app,
// then paste the deployed /exec URL into contactFormEndpoint in contact.html.
const CONTACT_SPREADSHEET_ID = "1xKNHjr-Jh6IVHs_ajZwW4pQU1fZtRw1P0-ipUKgjVT0";
const CONTACT_SHEET_NAME = "Contact Responses";
const CONTACT_HEADERS = ["Submitted at", "Full name", "Phone number", "Email address", "Message", "Address"];

function doPost(event) {
  const requestId = String(event && event.parameter && event.parameter.requestId || "");

  try {
    if (!event || !event.parameter) {
      throw new Error("The submitted form data is missing.");
    }

    const form = event.parameter;
    if (form.website) {
      throw new Error("The form submission could not be accepted.");
    }

    const submission = {
      name: cleanField_(form.name, 100, "Name"),
      phone: cleanField_(form.phone, 30, "Phone number"),
      email: cleanField_(form.email, 254, "Email address"),
      address: cleanField_(form.address, 300, "Address"),
      message: cleanField_(form.message, 5000, "Message")
    };

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submission.email)) {
      throw new Error("Enter a valid email address.");
    }

    const phoneDigits = submission.phone.replace(/\D/g, "");
    if (phoneDigits.length < 7 || phoneDigits.length > 20) {
      throw new Error("Enter a valid phone number.");
    }

    const emailKey = Utilities.base64EncodeWebSafe(
      Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, submission.email)
    ).slice(0, 32);
    const cache = CacheService.getScriptCache();
    const rateLimitKey = "contact_" + emailKey;
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      if (cache.get(rateLimitKey)) {
        throw new Error("A recent message was already received from this email. Please wait a minute and try again.");
      }

      const spreadsheet = SpreadsheetApp.openById(CONTACT_SPREADSHEET_ID);
      let sheet = spreadsheet.getSheetByName(CONTACT_SHEET_NAME);
      if (!sheet) {
        sheet = spreadsheet.insertSheet(CONTACT_SHEET_NAME);
      }
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(CONTACT_HEADERS);
        sheet.setFrozenRows(1);
      } else {
        const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
        const expectedHeaders = CONTACT_HEADERS.slice(0, 5);
        const hasExpectedHeaders = expectedHeaders.every((header, index) => headers[index] === header);
        if (!hasExpectedHeaders) {
          throw new Error("The contact response sheet headers do not match the expected format.");
        }
        if (!headers[5]) {
          sheet.getRange(1, 6).setValue(CONTACT_HEADERS[5]);
        } else if (headers[5] !== CONTACT_HEADERS[5]) {
          throw new Error("The contact response sheet already uses column F for another field.");
        }
      }
      sheet.appendRow([
        new Date(),
        safeSheetText_(submission.name),
        safeSheetText_(submission.phone),
        safeSheetText_(submission.email),
        safeSheetText_(submission.message),
        safeSheetText_(submission.address)
      ]);
      cache.put(rateLimitKey, "1", 60);
    } finally {
      lock.releaseLock();
    }

    return responsePage_(requestId, true, "Your message has been received.");
  } catch (error) {
    console.error("Contact form submission failed: " + error.message);
    return responsePage_(
      requestId,
      false,
      error && error.message ? error.message : "The message could not be saved. Please try again."
    );
  }
}

function cleanField_(value, maxLength, label) {
  const cleaned = String(value || "").trim();
  if (!cleaned) {
    throw new Error(label + " is required.");
  }
  if (cleaned.length > maxLength) {
    throw new Error(label + " is too long.");
  }
  return cleaned;
}

function safeSheetText_(value) {
  return /^[=+\-@]/.test(value) ? "'" + value : value;
}

function responsePage_(requestId, success, message) {
  const safeRequestId = /^[a-zA-Z0-9_-]{16,100}$/.test(requestId) ? requestId : "";
  const response = JSON.stringify({
    type: "chavara-contact-form",
    requestId: safeRequestId,
    success: success,
    message: message
  }).replace(/</g, "\\u003c");

  return HtmlService.createHtmlOutput(
    "<!doctype html><html><head><meta charset=\"utf-8\"></head><body>" +
      "<script>window.top.postMessage(" + response + ", \"*\");</script>" +
      "</body></html>"
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
