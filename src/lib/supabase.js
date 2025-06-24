import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
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

2. doctors
   - id (primary key)
   - user_id (foreign key -> users.id)
   - specialization
   - experience_years
   - education
   - availability
   - consultation_fee
   - rating
   - total_patients

3. patients
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

4. appointments
   - id (primary key)
   - patient_id (foreign key -> patients.id)
   - doctor_id (foreign key -> doctors.id)
   - date
   - time
   - status (enum: 'scheduled', 'completed', 'cancelled')
   - type (enum: 'checkup', 'followup', 'emergency')
   - reason
   - created_by (foreign key -> users.id)
   - created_at

5. visit_notes
   - id (primary key)
   - patient_id (foreign key -> patients.id)
   - doctor_id (foreign key -> doctors.id)
   - visit_date
   - note
   - diagnosis
   - follow_up_date
   - created_at

6. visit_notes_vitals
   - id (primary key)
   - visit_note_id (foreign key -> visit_notes.id)
   - height
   - weight
   - temperature
   - heart_rate
   - blood_pressure
   - head_circumference
   - created_at

7. growth_records
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

8. test_reports
   - id (primary key)
   - patient_id (foreign key -> patients.id)
   - test_name
   - test_date
   - report_file_url
   - notes
   - uploaded_by (foreign key -> users.id)
   - created_at

9. prescriptions
   - id (primary key)
   - patient_id (foreign key -> patients.id)
   - doctor_id (foreign key -> doctors.id)
   - visit_note_id (foreign key -> visit_notes.id)
   - medication_name
   - dosage
   - frequency
   - duration
   - notes
   - created_at

10. vaccinations
    - id (primary key)
    - patient_id (foreign key -> patients.id)
    - vaccine_name
    - scheduled_date
    - administered_date
    - status (enum: 'scheduled', 'administered', 'missed')
    - administered_by (foreign key -> doctors.id)
    - created_at

11. notifications
    - id (primary key)
    - user_id (foreign key -> users.id)
    - type (enum: 'appointment', 'followup', 'vaccination', 'test_result')
    - message
    - is_read
    - created_at

12. clinic_settings
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