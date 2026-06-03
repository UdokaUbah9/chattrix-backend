const nodemailer = require("nodemailer");

module.exports = function () {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    port: 587,
    secure: false,
    auth: {
      user: process.env.NODE_MAILER_GMAIL_USER,
      pass: process.env.NODE_MAILER_GMAIL_PASS,
    },
  });

  return async function sendMail(option) {
    await transporter
      .sendMail({
        from: `"Chattrix App" ${process.env.NODE_MAILER_GMAIL_USER}`,
        to: option.email,
        subject: option.subject,
        text: option.text,
      })
      .catch((err) => {
        throw new Error(`Email failed: ${err.message}`);
      });
  };
};
