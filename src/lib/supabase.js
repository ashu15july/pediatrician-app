import { createClient } from '@supabase/supabase-js';

// For development, provide fallback values if environment variables are not loaded
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://ralwazowulpsgskmrgsy.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhbHdhem93dWxwc2dza21yZ3N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5OTY5MzgsImV4cCI6MjA2NTU3MjkzOH0.wPDNzjQUSxGiHGLKlt3sRMLIfoqUjxp2qiF5OhzGRGM';

if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY) {
  console.warn('Environment variables not loaded, using fallback values for development');
}

console.log('Initializing Supabase client with URL:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

/*
Database Schema:

1. users
   - id (primary key)
   - email
   - role (enum: 'support', 'doctor', 'admin')
   - full_name
   - phone
   - created_at
   - last_login
   - clinic_id (foreign key -> clinics.id)
   - ...
   // NOTE: Doctors are now users with role = 'doctor'.

2. patients
   - id (primary key)
   - name
   - age
   - dob
   - gender
   - guardian_name
   - guardian_phone
   - guardian_email
   - address
   - blood_group
   - allergies
   - medical_history
   - created_at
   - last_visit

3. appointments
   - id (primary key)
   - patient_id (foreign key -> patients.id)
   - doctor_id (foreign key -> users.id, role = 'doctor')
   - date
   - time
   - status (enum: 'scheduled', 'completed', 'cancelled')
   - type (enum: 'checkup', 'followup', 'emergency')
   - reason
   - created_by (foreign key -> users.id)
   - created_at

4. visit_notes
   - id (primary key)
   - patient_id (foreign key -> patients.id)
   - doctor_id (foreign key -> users.id, role = 'doctor')
   - visit_date
   - note
   - diagnosis
   - follow_up_date
   - created_at

5. visit_notes_vitals
   - id (primary key)
   - visit_note_id (foreign key -> visit_notes.id)
   - height
   - weight
   - temperature
   - heart_rate
   - blood_pressure
   - head_circumference
   - created_at

6. growth_records
   - id (primary key)
   - patient_id (foreign key -> patients.id)
   - date
   - height
   - weight
   - head_circumference
   - percentile_height
   - percentile_weight
   - percentile_head
   - created_at

7. test_reports
   - id (primary key)
   - patient_id (foreign key -> patients.id)
   - test_name
   - test_date
   - report_file_url
   - notes
   - uploaded_by (foreign key -> users.id)
   - created_at

8. prescriptions
   - id (primary key)
   - patient_id (foreign key -> patients.id)
   - doctor_id (foreign key -> users.id, role = 'doctor')
   - visit_note_id (foreign key -> visit_notes.id)
   - medication_name
   - dosage
   - frequency
   - duration
   - notes
   - created_at

9. vaccinations
    - id (primary key)
    - patient_id (foreign key -> patients.id)
    - vaccine_name
    - scheduled_date
    - administered_date
    - status (enum: 'scheduled', 'administered', 'missed')
    - administered_by (foreign key -> users.id, role = 'doctor')
    - created_at

10. notifications
    - id (primary key)
    - user_id (foreign key -> users.id)
    - type (enum: 'appointment', 'followup', 'vaccination', 'test_result')
    - message
    - is_read
    - created_at

11. clinic_settings
    - id (primary key)
    - clinic_name
    - address
    - phone
    - email
    - working_hours
    - appointment_duration
    - created_at
    - updated_at
*/

// Helper function to initialize database tables
export const initializeDatabase = async () => {
  try {
    // Check if tables exist and create them if they don't
    const { error } = await supabase.rpc('initialize_database');
    if (error) throw error;
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

// Helper function to check database connection
export const checkDatabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}; 