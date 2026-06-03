// const nodemailer = require("nodemailer");

// module.exports = function () {
//   const transporter = nodemailer.createTransport({
//     service: "Gmail",
//     port: 587,
//     secure: false,
//     auth: {
//       user: process.env.NODE_MAILER_GMAIL_USER,
//       pass: process.env.NODE_MAILER_GMAIL_PASS,
//     },
//   });

//   return async function sendMail(option) {
//     await transporter
//       .sendMail({
//         from: `"Chattrix App" ${process.env.NODE_MAILER_GMAIL_USER}`,
//         to: option.email,
//         subject: option.subject,
//         text: option.text,
//       })
//       .catch((err) => {
//         throw new Error(`Email failed: ${err.message}`);
//       });
//   };
// };

const { Resend } = require("resend");

module.exports = function () {
  const resend = new Resend(process.env.RESEND_API_KEY);

  return async function sendMail(option) {
    try {
      await resend.emails.send({
        from: "onboarding@resend.dev", // Resend provides this default free testing email
        to: option.email,
        subject: option.subject,
        text: option.text,
      });
    } catch (err) {
      throw new Error(`Email failed: ${err.message}`);
    }
  };
};
