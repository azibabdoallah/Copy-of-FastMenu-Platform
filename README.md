# منصة FASTMENU ⚡

مشروع منيو إلكتروني متكامل.

## حل مشكلة ربط GitHub
إذا واجهت مشكلة "المشروع مرتبط بحساب قديم":
1. اذهب إلى إعدادات GitHub الشخصية.
2. اختر **Applications** ثم **Authorized OAuth Apps**.
3. قم بإلغاء صلاحية **Netlify** أو التطبيق المرتبط.
4. اذهب إلى لوحة تحكم Netlify وفك ارتباط GitHub من **Connected Accounts**.

## تعليمات النشر (Deployment)
- **Build Command:** `npm run build`
- **Publish Directory:** `dist`
- **Environment Variables:** تأكد من إضافة `API_KEY` الخاص بـ Gemini في إعدادات المنصة ليعمل الوصف الذكي.

## حل مشكلة الشاشة البيضاء
تم ضبط ملف `netlify.toml` في هذا المشروع ليتعامل مع الروابط (Routing) بشكل صحيح، مما يمنع ظهور صفحة 404 أو شاشة بيضاء عند تحديث الصفحة.