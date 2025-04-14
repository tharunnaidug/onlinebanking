import nodemailer from 'nodemailer';

export const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your_email@gmail.com',
    pass: 'your_app_password', 
  },
});

export const sendOtpEmail = async (toEmail, otp) => {
  const mailOptions = {
    from: 'your_email@gmail.com',
    to: toEmail,
    subject: 'Your OTP for Online Banking',
    html: `<h2>Your OTP is: <strong>${otp}</strong></h2><p>This OTP is valid for 10 minutes.</p>`,
  };

  await transporter.sendMail(mailOptions);
};
export const sendOtp = async (req, res) => {
    const { email } = req.body;
  
    const otp = generateOtp();
  
    try {
      await sendOtpEmail(email, otp);
  
      // Store the OTP in memory, Redis, or DB (you can implement expiry too)
      res.status(200).json({ message: 'OTP sent successfully', otp });
  
    } catch (err) {
      console.error('OTP error:', err);
      res.status(500).json({ message: 'Error sending OTP' });
    }
  };