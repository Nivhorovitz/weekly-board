# Community Events Board

לוח אירועים קהילתי קטן ועצמאי להטמעה באייפריים בתוך Sparkco.

## איך זה עובד

זו אפליקציה סטטית אחת, עם תמיכה בהרבה קהילות דרך פרמטר URL:

```txt
index.html?community=spiritual-gym
admin.html?community=spiritual-gym
```

לא צריך לשכפל את הקוד לכל קהילה. כל קהילה מקבלת `community_id` משלה, והאירועים מופרדים לפי המזהה הזה.

## קבצים

- `index.html` – הלוח הציבורי למשתתפים
- `admin.html` – מסך אדמין לעריכת הלו״ז
- `config.js` – הגדרות כלליות ושמות קהילות
- `app.js` – לוגיקת טעינה, הצגה ושמירה
- `admin.js` – לוגיקת אדמין
- `styles.css` – עיצוב RTL
- `supabase-schema.sql` – סכמה ל־Supabase
- `iframe-snippet.html` – דוגמת הטמעה בספארקו

## דמו מקומי

פותחים את `index.html` בדפדפן.

כניסת אדמין:

```txt
admin.html?community=sparkco
```

סיסמת דמו:

```txt
sparkco-admin
```

במצב דמו הנתונים נשמרים ב־localStorage של הדפדפן, ולכן זה טוב לבדיקה בלבד.

## הפעלה אמיתית עם Supabase

1. יוצרים פרויקט Supabase.
2. מריצים את `supabase-schema.sql` ב־SQL Editor.
3. מעדכנים את `config.js`:

```js
supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
supabaseAnonKey: 'YOUR_ANON_KEY'
```

4. יוצרים משתמשי אדמין דרך Supabase Auth.
5. מעלים את הקבצים ל־GitHub Pages, Netlify או Vercel.

## הוספת קהילה חדשה

אין צורך לשכפל קוד. פשוט בוחרים מזהה קהילה חדש, למשל:

```txt
index.html?community=business-women
admin.html?community=business-women
```

אפשר להוסיף שם וכותרת לקהילה בתוך `config.js`:

```js
communities: {
  'business-women': {
    communityName: 'קהילת נשות עסקים',
    communitySubtitle: 'מפגשים, סדנאות ואירועים קרובים'
  }
}
```

## הטמעה בספארקו

```html
<iframe
  src="https://your-domain.com/community-events-board/index.html?community=spiritual-gym"
  width="100%"
  height="720"
  style="border:0; border-radius:20px; overflow:hidden;"
  allowfullscreen>
</iframe>
```

## החלטת מוצר

מומלץ להחזיק אפליקציה אחת מרובת קהילות, ולא לשכפל לכל מוביל קהילה. שכפול קוד מתאים רק אם רוצים עיצוב, דומיין או התנהגות שונה לגמרי לכל לקוח.
