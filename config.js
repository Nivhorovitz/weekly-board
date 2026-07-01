// Community Events Board configuration
// Demo mode: leave Supabase values empty. The app will use browser localStorage.
// Production: create a Supabase project, run supabase-schema.sql,
// then paste your URL and anon key below.

window.EVENTS_BOARD_CONFIG = {
  defaultCommunityId: 'sparkco',
  communityName: 'קהילת Sparkco',
  communitySubtitle: 'לוח האירועים הקרובים של הקהילה',
  adminPassword: 'sparkco-admin', // Demo password only. Replace before sharing.
  supabaseUrl: '',
  supabaseAnonKey: 'supabaseUrl: 'https://dexaleorkpbwmoefrbii.supabase.co',
supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRleGFsZW9ya3Bid21vZWZyYmlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MjgwNDEsImV4cCI6MjA5ODUwNDA0MX0.M2WoCPw9rbJNovoviwJBYtvuNev42mn7F82Axy5oXEE',',
  defaultRoomUrl: '',
  rtl: true,

  // Optional labels per community. Data is separated by the URL parameter: ?community=...
  communities: {
    sparkco: {
      communityName: 'קהילת Sparkco',
      communitySubtitle: 'לוח האירועים הקרובים של הקהילה'
    },
    'our-community': {
      communityName: 'Our Community',
      communitySubtitle: 'מפגשים, תרגולים ואירועי קהילה קרובים'
    }
  }
};
