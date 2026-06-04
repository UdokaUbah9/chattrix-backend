const https = require("https");

module.exports = function () {
  const userEmail = process.env.NODE_MAILER_GMAIL_USER;
  const appPassword = process.env.NODE_MAILER_GMAIL_PASS;

  return async function sendMail(option) {
    // We convert the username and App Password into a secure base64 string for Google
    const authString = Buffer.from(`${userEmail}:${appPassword}`).toString(
      "base64",
    );

    const emailData = JSON.stringify({
      raw: Buffer.from(
        `From: "Chattrix App" <${userEmail}>\n` +
          `To: ${option.email}\n` +
          `Subject: ${option.subject}\n` +
          `MIME-Version: 1.0\n` +
          `Content-Type: text/plain; charset=UTF-8\n\n` +
          `${option.text}`,
      ).toString("base64url"), // Formats perfectly for safe web transmission
    });

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: "gmail.googleapis.com",
          path: "/upload/gmail/v1/users/me/messages/send",
          method: "POST",
          headers: {
            Authorization: `Basic ${authString}`,
            "Content-Type": "application/json",
            "Content-Length": emailData.length,
          },
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              console.log("🚀 Code sent seamlessly via native web channels!");
              resolve(JSON.parse(body));
            } else {
              reject(new Error(`Google API Rejected: ${body}`));
            }
          });
        },
      );

      req.on("error", (err) => reject(err));
      req.write(emailData);
      req.end();
    });
  };
};
// const { Resend } = require("resend");

// module.exports = function () {
//   const resend = new Resend(process.env.RESEND_API_KEY);

//   return async function sendMail(option) {
//     try {
//       await resend.emails.send({
//         from: "Chattrix App <onboarding@resend.dev>",
//         to: option.email,
//         subject: option.subject,
//         text: option.text,
//       });
//     } catch (err) {
//       throw new Error(`Email failed: ${err.message}`);
//     }
//   };
// };
