const nodemailer = require("nodemailer");
const brevoTransport = require("nodemailer-brevo-transport");

module.exports = function () {
  // Configures Nodemailer to send via Brevo's HTTPS API, bypassing Render's firewall
  const transporter = nodemailer.createTransport(
    new brevoTransport({
      apiKey: process.env.BREVO_API_KEY, // The long key you just copied from image_4d7a80.jpg
    }),
  );

  return async function sendMail(option) {
    await transporter
      .sendMail({
        // Make sure this email is exactly the one you used to register your Brevo account!
        from: `"Chattrix App" <${process.env.BREVO_SENDER_EMAIL}>`,
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
