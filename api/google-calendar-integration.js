const { google } = require('googleapis');

// Google Calendar API integration
class GoogleCalendarService {
  constructor() {
    this.auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH, // Path to service account JSON
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
  }

  async createCalendarEvent(appointmentData) {
    try {
      const calendar = google.calendar({ version: 'v3', auth: this.auth });
      
      const startDate = new Date(`${appointmentData.appointmentDate}T${appointmentData.appointmentTime}`);
      const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 30 minutes

      const event = {
        summary: `Appointment with Dr. ${appointmentData.doctorName}`,
        description: `Appointment at ${appointmentData.clinicName}\n\nType: ${appointmentData.appointmentType || 'Checkup'}\nReason: ${appointmentData.notes || 'Regular appointment'}\n\nPlease arrive 10 minutes early.`,
        start: {
          dateTime: startDate.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: 'UTC',
        },
        location: appointmentData.clinicAddress || appointmentData.clinicName,
        attendees: [
          { email: appointmentData.patientEmail },
        ],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 15 }, // 15 minutes before
          ],
        },
        conferenceData: {
          createRequest: {
            requestId: `appointment-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        }
      };

      const response = await calendar.events.insert({
        calendarId: 'primary', // or specific calendar ID
        resource: event,
        conferenceDataVersion: 1,
        sendUpdates: 'all', // Send invitations to attendees
      });

      return {
        success: true,
        eventId: response.data.id,
        eventLink: response.data.htmlLink,
        meetLink: response.data.conferenceData?.entryPoints?.[0]?.uri
      };
    } catch (error) {
      console.error('Google Calendar API Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateCalendarEvent(eventId, appointmentData) {
    try {
      const calendar = google.calendar({ version: 'v3', auth: this.auth });
      
      const startDate = new Date(`${appointmentData.appointmentDate}T${appointmentData.appointmentTime}`);
      const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

      const event = {
        summary: `Appointment with Dr. ${appointmentData.doctorName}`,
        description: `Appointment at ${appointmentData.clinicName}\n\nType: ${appointmentData.appointmentType || 'Checkup'}\nReason: ${appointmentData.notes || 'Regular appointment'}\n\nPlease arrive 10 minutes early.`,
        start: {
          dateTime: startDate.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: 'UTC',
        },
        location: appointmentData.clinicAddress || appointmentData.clinicName,
      };

      const response = await calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: event,
        sendUpdates: 'all',
      });

      return {
        success: true,
        eventId: response.data.id,
        eventLink: response.data.htmlLink
      };
    } catch (error) {
      console.error('Google Calendar Update Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteCalendarEvent(eventId) {
    try {
      const calendar = google.calendar({ version: 'v3', auth: this.auth });
      
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
        sendUpdates: 'all',
      });

      return { success: true };
    } catch (error) {
      console.error('Google Calendar Delete Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = GoogleCalendarService; 