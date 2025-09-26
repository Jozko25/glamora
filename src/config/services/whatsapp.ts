import axios from 'axios';

interface WhatsAppMessage {
  to: string;
  message: string;
  customerName?: string;
  customerPhone?: string;
  requestType?: string;
}

class WhatsAppService {
  private businessNumber: string;
  private apiKey: string;
  private apiUrl: string;
  private isEnabled: boolean;

  constructor() {
    this.businessNumber = process.env.WHATSAPP_PHONE_NUMBER || '';
    this.apiKey = process.env.WHATSAPP_API_KEY || '';
    this.apiUrl = process.env.WHATSAPP_API_URL || '';
    this.isEnabled = !!this.apiKey && !!this.businessNumber;
  }

  async sendHumanRequestNotification(
    customerName: string,
    customerPhone: string,
    requestDetails: string
  ): Promise<boolean> {
    try {
      const message = `🚨 NOVÁ ŽIADOSŤ O KONTAKT\n\n` +
        `Meno: ${customerName}\n` +
        `Telefón: ${customerPhone}\n` +
        `Detaily: ${requestDetails}\n\n` +
        `Prosím, zavolajte zákazníčke čo najskôr.`;

      if (!this.isEnabled) {
        // In development, just log the message
        console.log('WhatsApp notification (mock):', message);
        return true;
      }

      // In production, send via WhatsApp API
      const response = await axios.post(
        this.apiUrl,
        {
          to: this.businessNumber,
          type: 'text',
          text: {
            body: message
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.status === 200;
    } catch (error) {
      console.error('Error sending WhatsApp notification:', error);
      return false;
    }
  }

  async sendBookingConfirmation(
    staffName: string,
    customerName: string,
    customerPhone: string,
    serviceName: string,
    date: string,
    time: string
  ): Promise<boolean> {
    try {
      const message = `✅ NOVÁ REZERVÁCIA\n\n` +
        `Personál: ${staffName}\n` +
        `Zákazník: ${customerName}\n` +
        `Telefón: ${customerPhone}\n` +
        `Služba: ${serviceName}\n` +
        `Dátum: ${date}\n` +
        `Čas: ${time}\n\n` +
        `Rezervácia bola automaticky pridaná do kalendára.`;

      if (!this.isEnabled) {
        console.log('WhatsApp confirmation (mock):', message);
        return true;
      }

      const response = await axios.post(
        this.apiUrl,
        {
          to: this.businessNumber,
          type: 'text',
          text: {
            body: message
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.status === 200;
    } catch (error) {
      console.error('Error sending WhatsApp confirmation:', error);
      return false;
    }
  }

  async sendVerificationTimeout(
    customerName: string,
    customerPhone: string,
    serviceName: string
  ): Promise<boolean> {
    try {
      const message = `⏱️ REZERVÁCIA VYPRŠALA\n\n` +
        `Zákazník: ${customerName}\n` +
        `Telefón: ${customerPhone}\n` +
        `Služba: ${serviceName}\n\n` +
        `Zákazník nepotvrdil rezerváciu v časovom limite.`;

      if (!this.isEnabled) {
        console.log('WhatsApp timeout notification (mock):', message);
        return true;
      }

      const response = await axios.post(
        this.apiUrl,
        {
          to: this.businessNumber,
          type: 'text',
          text: {
            body: message
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.status === 200;
    } catch (error) {
      console.error('Error sending WhatsApp timeout notification:', error);
      return false;
    }
  }

  isConfigured(): boolean {
    return this.isEnabled;
  }
}

export const whatsAppService = new WhatsAppService();