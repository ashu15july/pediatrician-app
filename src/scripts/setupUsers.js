import { supabase } from '../lib/supabase';

async function setupUsers() {
  const users = [
    {
      email: 'admin@pediatrician.com',
      password: 'admin123',
      role: 'admin'
    },
    {
      email: 'dr.smith@pediatrician.com',
      password: 'doctor123',
      role: 'doctor'
    },
    {
      email: 'support@pediatrician.com',
      password: 'support123',
      role: 'support'
    }
  ];

  for (const user of users) {
    try {
      // First, check if user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();

      if (existingUser) {
        console.log(`User ${user.email} already exists, skipping...`);
        continue;
      }

      // Create the user
      const { data, error } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            role: user.role
          }
        }
      });

      if (error) {
        console.error(`Error creating user ${user.email}:`, error);
      } else {
        console.log(`Successfully created user ${user.email}:`, data);
      }
    } catch (error) {
      console.error(`Unexpected error for user ${user.email}:`, error);
    }
  }
}

// Run the setup
setupUsers().then(() => {
  console.log('User setup completed');
}).catch(error => {
  console.error('Setup failed:', error);
}); 