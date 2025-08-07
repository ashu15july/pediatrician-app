# PediaCircle - Pediatric Practice Management System

A comprehensive, modern web application designed to streamline pediatric practice management with advanced features for clinics, doctors, and patients.

![PediaCircle Logo](https://img.shields.io/badge/PediaCircle-Pediatric%20Practice%20Management-blue?style=for-the-badge&logo=heart)

## 🏥 Overview

PediaCircle is a full-featured pediatric practice management system that provides separate interfaces for clinics, doctors, and patients. Built with React and Supabase, it offers a complete solution for appointment scheduling, patient management, vaccination tracking, and health monitoring.

## ✨ Key Features

### 🏥 For Clinics & Doctors
- **Smart Calendar System** - Interactive appointment scheduling with drag-and-drop functionality
- **Patient Management** - Comprehensive patient records with medical history
- **Vaccination Tracking** - Automated IAP (Immunization Action Plan) schedule management
- **Billing System** - Integrated billing and payment tracking
- **Document Management** - Secure storage and management of medical documents
- **AI-Powered Insights** - AI doctor feedback and assessment tools
- **Multi-Doctor Support** - Manage multiple doctors and their schedules
- **Google Calendar Integration** - Sync appointments with external calendars

### 👨‍⚕️ For Patients
- **Patient Dashboard** - Personalized health overview and appointment management
- **Appointment Scheduling** - Self-service appointment booking
- **Vaccination Portal** - Track vaccination schedules and due dates
- **Health Tracker** - Monitor growth charts and health metrics
- **Milestone Tracking** - Track developmental milestones
- **Document Access** - Secure access to medical records and reports
- **Communication Tools** - Direct messaging with healthcare providers

### 🔧 Technical Features
- **Multi-tenant Architecture** - Subdomain-based clinic isolation
- **Real-time Updates** - Live appointment and data synchronization
- **Responsive Design** - Mobile-first approach with Tailwind CSS
- **Secure Authentication** - Role-based access control
- **Email Integration** - Automated appointment confirmations and reminders
- **Telegram Bot Integration** - Automated notifications and updates
- **Voice Recording** - Audio note-taking capabilities

## 🚀 Tech Stack

### Frontend
- **React 19** - Modern React with hooks and functional components
- **React Router DOM** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **Recharts** - Data visualization and charts
- **AOS** - Animate On Scroll library

### Backend & Database
- **Supabase** - Backend-as-a-Service with PostgreSQL
- **Node.js** - Server-side JavaScript runtime
- **Vercel** - Deployment platform

### Additional Libraries
- **jsPDF** - PDF generation for reports
- **SendGrid** - Email service integration
- **Google APIs** - Calendar integration
- **Nodemailer** - Email functionality
- **bcryptjs** - Password hashing

## 📋 Prerequisites

Before running this project, make sure you have:

- **Node.js** (v16 or higher)
- **npm** or **yarn** package manager
- **Supabase** account and project
- **Vercel** account (for deployment)

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/pediatrician-app.git
cd pediatrician-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key

# Email Service (SendGrid)
REACT_APP_SENDGRID_API_KEY=your_sendgrid_api_key
REACT_APP_FROM_EMAIL=your_verified_sender_email

# Google Calendar Integration
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
REACT_APP_GOOGLE_CLIENT_SECRET=your_google_client_secret

# Telegram Bot (Optional)
REACT_APP_TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

### 4. Database Setup

1. Create a new Supabase project
2. Set up the following tables in your Supabase database:
   - `users` - Clinic staff and doctors
   - `clinics` - Clinic information
   - `patients` - Patient records
   - `appointments` - Appointment scheduling
   - `vaccinations` - Vaccination records
   - `vitals` - Patient vital signs
   - `bills` - Billing information
   - `documents` - Document storage

### 5. Start Development Server

```bash
npm start
```

The application will be available at `http://localhost:3000`

## 🏗️ Project Structure

```
pediatrician-app/
├── api/                    # API endpoints and serverless functions
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable React components
│   ├── contexts/           # React context providers
│   ├── data/              # Static data files (vaccination schedules, milestones)
│   ├── layouts/           # Layout components
│   ├── lib/               # Utility libraries (Supabase client)
│   ├── pages/             # Page components
│   ├── services/          # API service functions
│   └── utils/             # Utility functions
├── telegram-bot/          # Telegram bot implementation
└── package.json
```

## 🔐 Authentication & Authorization

The application implements a multi-level authentication system:

- **Super Admin** - System-wide administration
- **Clinic Admin** - Clinic-level management
- **Doctor** - Individual doctor access
- **Patient** - Patient portal access

Each role has specific permissions and access levels to different features.

## 📱 Key Components

### Calendar System
- Interactive monthly/weekly views
- Appointment scheduling and management
- Drag-and-drop functionality
- Status filtering and color coding

### Patient Management
- Comprehensive patient profiles
- Medical history tracking
- Document upload and management
- Growth chart visualization

### Vaccination Portal
- IAP schedule compliance
- Due date calculations
- Vaccination history tracking
- Automated reminders

### Health Tracker
- Growth monitoring
- Milestone tracking
- Vital signs recording
- Health trend analysis

## 🚀 Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

```bash
# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

### Environment Variables for Production

Make sure to set all required environment variables in your Vercel project settings.

## 🤖 Telegram Bot Integration

The application includes a Telegram bot for automated notifications:

```bash
cd telegram-bot
npm install
npm start
```

Configure the bot token in your environment variables.

## 📊 Data Management

### Vaccination Schedules
The application includes comprehensive IAP (Immunization Action Plan) schedules for:
- Birth to 5 years
- Standard vaccination protocols
- Booster schedules
- Catch-up vaccination planning

### Developmental Milestones
Track child development across:
- Cognitive development
- Gross motor skills
- Fine motor skills
- Communication and social skills

## 🔒 Security Features

- **Role-based Access Control** - Granular permissions system
- **Data Encryption** - Secure data transmission and storage
- **Multi-tenant Isolation** - Clinic data separation
- **Audit Logging** - Track all system activities
- **Secure File Upload** - Protected document storage

## 📈 Monitoring & Analytics

- **Appointment Analytics** - Track scheduling patterns
- **Patient Demographics** - Population health insights
- **Vaccination Compliance** - Monitor immunization rates
- **Performance Metrics** - System usage statistics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- 📧 Email: support@pediacircle.com
- 📱 Telegram: @PediaCircleSupport
- 📖 Documentation: [docs.pediacircle.com](https://docs.pediacircle.com)

## 🙏 Acknowledgments

- **Supabase** for the excellent backend-as-a-service platform
- **Vercel** for seamless deployment and hosting
- **Tailwind CSS** for the beautiful UI framework
- **React Team** for the amazing frontend framework

---

**Built with ❤️ for pediatric healthcare providers and families**

*PediaCircle - Empowering Pediatric Care Through Technology*
