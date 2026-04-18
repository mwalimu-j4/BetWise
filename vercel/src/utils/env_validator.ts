export default function validateEnv() {
  const required = [
    "MPESA_CALLBACK_URL",
    "MPESA_CONSUMER_KEY",
    "MPESA_CONSUMER_SECRET",
    "MPESA_SHORTCODE",
    "MPESA_PASSKEY",
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing ENV: ${key}`);
    }else{
        console.log(` ENV variable ${key} is set.`)
    }
  }
}

