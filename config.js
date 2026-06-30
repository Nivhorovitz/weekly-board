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
  supabaseAnonKey: '',
  defaultRoomUrl: '',
  rtl: true,

  // Optional labels per community. Data is separated by the URL parameter: ?community=...
  communities: {
    sparkco: {
      communityName: 'קהילת Sparkco',
      communitySubtitle: 'לוח האירועים הקרובים של הקהילה'
    },
    'spiritual-gym': {
      communityName: 'Our Community',
      communitySubtitle: 'מפגשים, תרגולים ואירועי קהילה קרובים'
    }
  }
};
