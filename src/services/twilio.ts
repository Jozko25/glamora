import twilio from 'twilio';
import moment from 'moment-timezone';

const TIMEZONE = 'Europe/Bratislava';

class TwilioService {
  private client: twilio.Twilio | null = null;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    const accountSid = process.env.TWILIO_ACTUAL_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.error('Twilio credentials not configured properly');
      return;
    }

    try {
      this.client = twilio(accountSid, authToken);
      console.log('Twilio client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Twilio client:', error);
    }
  }

  /**
   * Send SMS notification when customer wants to speak with a human
   */
  async sendHumanRequestNotification(
    customerName: string,
    customerPhone: string,
    requestedService?: string,
    preferredStaff?: string
  ): Promise<boolean> {
    if (!this.client) {
      console.error('Twilio client not initialized');
      return false;
    }

    try {
      const now = moment.tz(TIMEZONE);
      const timeStr = now.format('HH:mm');
      const dateStr = now.format('DD.MM.YYYY');

      // Format the SMS message
      let message = `🔔 GLAMORA - Zákazník žiada hovor\n`;
      message += `📅 ${dateStr} ${timeStr}\n`;
      message += `👤 ${customerName}\n`;
      message += `📞 ${customerPhone}`;

      if (requestedService) {
        message += `\n💇 Služba: ${requestedService}`;
      }

      if (preferredStaff) {
        message += `\n👩 Preferovaný personál: ${preferredStaff}`;
      }

      message += `\n\nProsím, zavolajte späť čo najskôr.`;

      // Get the recipient phone number from environment or use default
      const toNumber = process.env.NOTIFICATION_PHONE || '+421910223761';

      const result = await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: toNumber
      });

      console.log(`SMS sent successfully: ${result.sid}`);
      return true;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      return false;
    }
  }

  /**
   * Send booking confirmation SMS to customer
   */
  async sendBookingConfirmation(
    customerPhone: string,
    customerName: string,
    serviceName: string,
    date: string,
    time: string,
    staffName: string
  ): Promise<boolean> {
    if (!this.client) {
      console.error('Twilio client not initialized');
      return false;
    }

    try {
      const message = `Dobrý deň ${customerName},\n\n` +
        `Vaša rezervácia v Glamora Beauty Salón bola potvrdená:\n` +
        `📅 ${date} o ${time}\n` +
        `💇 ${serviceName}\n` +
        `👩 ${staffName}\n\n` +
        `Tešíme sa na Vás!\n` +
        `Glamora Beauty Salón`;

      const result = await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: customerPhone
      });

      console.log(`Booking confirmation SMS sent: ${result.sid}`);
      return true;
    } catch (error) {
      console.error('Failed to send booking confirmation:', error);
      return false;
    }
  }
}

export const twilioService = new TwilioService();