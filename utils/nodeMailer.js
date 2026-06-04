const nodemailer = require("nodemailer");

module.exports = function () {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.NODE_MAILER_GMAIL_USER,
      pass: process.env.NODE_MAILER_GMAIL_PASS, // Make sure this is a 16-character App Password, not your normal password!
    },
    /* Stops Render from hanging indefinitely if connection drops */
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  return async function sendMail(option) {
    await transporter
      .sendMail({
        // Fixed: Wrapped the email environment variable in angle brackets < >
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
