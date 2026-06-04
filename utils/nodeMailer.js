const nodemailer = require("nodemailer");

module.exports = function () {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // Uses SSL/TLS directly
    auth: {
      user: process.env.NODE_MAILER_GMAIL_USER,
      pass: process.env.NODE_MAILER_GMAIL_PASS, // Your 16-character Google App Password
    },
  });

  return async function sendMail(option) {
    await transporter
      .sendMail({
        from: `"Chattrix App" <${process.env.NODE_MAILER_GMAIL_USER}>`,
        to: option.email,
        subject: option.subject,
        text: option.text,
      })
      .catch((err) => {
        throw new Error(`Email failed: ${err.message}`);
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
