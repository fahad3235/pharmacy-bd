/* pharmacy-bd — data: categories, sample stock, i18n.
 * Works in Node (module.exports) and in the browser (window.PHARMACY_DATA). */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.PHARMACY_DATA = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CATEGORIES = [
    { id: 'pain', en: 'Pain & Fever', bn: 'ব্যথা ও জ্বর' },
    { id: 'antibiotic', en: 'Antibiotic', bn: 'অ্যান্টিবায়োটিক' },
    { id: 'gastric', en: 'Gastric', bn: 'গ্যাস্ট্রিক' },
    { id: 'allergy', en: 'Allergy', bn: 'অ্যালার্জি' },
    { id: 'vitamin', en: 'Vitamin', bn: 'ভিটামিন' },
    { id: 'diabetes', en: 'Diabetes', bn: 'ডায়াবেটিস' },
    { id: 'skin', en: 'Skin', bn: 'ত্বক' },
    { id: 'other', en: 'Other', bn: 'অন্যান্য' }
  ];

  // Sample stock — EDITABLE EXAMPLES, not real prices or real stock.
  // Expiry is stored as days from first run, so samples never go stale.
  var SAMPLE = [
    { name: 'Napa 500mg', generic: 'Paracetamol', category: 'pain', batch: 'NP-2401', expiryInDays: 240, qty: 120, price: 2, lowAt: 20 },
    { name: 'Seclo 20mg', generic: 'Omeprazole', category: 'gastric', batch: 'SC-1187', expiryInDays: 200, qty: 60, price: 15, lowAt: 10 },
    { name: 'Fexo 120mg', generic: 'Fexofenadine', category: 'allergy', batch: 'FX-0932', expiryInDays: 25, qty: 45, price: 25, lowAt: 10 },
    { name: 'Amoxil 500mg', generic: 'Amoxicillin', category: 'antibiotic', batch: 'AM-5520', expiryInDays: 400, qty: 30, price: 40, lowAt: 10 },
    { name: 'D-Rise 20000', generic: 'Cholecalciferol', category: 'vitamin', batch: 'DR-7710', expiryInDays: 90, qty: 80, price: 60, lowAt: 15 },
    { name: 'Metformin 500mg', generic: 'Metformin', category: 'diabetes', batch: 'MT-3341', expiryInDays: 15, qty: 8, price: 12, lowAt: 10 },
    { name: 'Cetirizine 10mg', generic: 'Cetirizine', category: 'allergy', batch: 'CT-2088', expiryInDays: -10, qty: 5, price: 5, lowAt: 10 }
  ];

  var EXPIRING_SOON_DAYS = 30;

  var I18N = {
    en: {
      appTitle: 'Pharmacy BD',
      appSub: 'Medicine stock & expiry tracker for small pharmacies',
      tabDashboard: 'Dashboard', tabStock: 'Stock', tabSell: 'Sell', tabSales: 'Sales', tabData: 'Data',
      totalMeds: 'Medicines', totalUnits: 'Units in stock', stockValue: 'Stock value',
      lowStock: 'Low stock', expiringSoon: 'Expiring ≤ 30 days', expired: 'Expired',
      todaysSales: "Today's sales", thisMonth: 'This month',
      alertsTitle: 'Needs attention', noAlerts: 'All clear — no expired, expiring or low-stock items.',
      alertExpired: 'expired', alertExpiring: 'expires in', alertLow: 'low stock',
      days: 'days', day: 'day',
      searchPh: 'Search name, generic or batch…',
      filterAll: 'All categories', filterAlerts: 'Alerts only',
      addMed: 'Add medicine', editMed: 'Edit medicine',
      fName: 'Medicine name', fGeneric: 'Generic name', fCategory: 'Category',
      fBatch: 'Batch no.', fExpiry: 'Expiry date', fQty: 'Quantity', fPrice: 'Unit price (৳)',
      fLowAt: 'Low-stock alert at', save: 'Save', cancel: 'Cancel', del: 'Delete',
      confirmDelete: 'Delete this medicine and its record?',
      colMed: 'Medicine', colBatch: 'Batch', colExpiry: 'Expiry', colQty: 'Qty', colPrice: 'Price', colValue: 'Value', colStatus: 'Status', colActions: 'Actions',
      statusOk: 'OK', statusLow: 'Low stock', statusExpiring: 'Expiring soon', statusExpired: 'Expired',
      sellTitle: 'Record a sale', sellMed: 'Medicine', sellQty: 'Quantity', sellTotal: 'Total',
      sellBtn: 'Record sale', sellDone: 'Sale recorded.',
      errQty: 'Quantity must be 1 or more.', errStock: 'Not enough stock.',
      noStock: 'No medicines yet — add your first medicine.',
      noSales: 'No sales yet.', salesTitle: 'Sales log', salesDate: 'Date',
      restoreNote: 'Deleting a sale returns its quantity to stock.',
      exportBtn: 'Export data (JSON)', importBtn: 'Import data (JSON)', eraseBtn: 'Erase all data',
      eraseConfirm: 'Type DELETE to erase everything.',
      importOk: 'Imported. Your old data was replaced.',
      importBad: 'Import failed — file rejected, your data is unchanged.',
      exportNote: 'Backup includes medicines and sales.',
      sampleNote: 'Ships with 7 editable example medicines — example prices, not market prices. Replace them with your real stock.',
      disclaimer: 'Study/demo aid for stock-keeping. Always check the printed expiry date on the pack before selling; this app does not verify medicine authenticity or safety.',
      langBtn: 'বাংলা', empty: '—',
      errName: 'Name is required (2–60 characters).',
      errGeneric: 'Generic name is required.',
      errQtyNum: 'Quantity must be a whole number, 0 or more.',
      errPrice: 'Price must be 0 or more.',
      errExpiry: 'Enter a valid expiry date.',
      errLowAt: 'Low-stock level must be a whole number, 0 or more.',
      errBatch: 'Batch no. is required.',
      total: 'Total'
    },
    bn: {
      appTitle: 'ফার্মেসি বিডি',
      appSub: 'ছোট ফার্মেসির ওষুধের স্টক ও মেয়াদ ট্র্যাকার',
      tabDashboard: 'ড্যাশবোর্ড', tabStock: 'স্টক', tabSell: 'বিক্রি', tabSales: 'বিক্রির হিসাব', tabData: 'ডেটা',
      totalMeds: 'ওষুধ', totalUnits: 'মোট ইউনিট', stockValue: 'স্টকের মূল্য',
      lowStock: 'কম স্টক', expiringSoon: '৩০ দিনে মেয়াদ শেষ', expired: 'মেয়াদোত্তীর্ণ',
      todaysSales: 'আজকের বিক্রি', thisMonth: 'এই মাসে',
      alertsTitle: 'নজর দিন', noAlerts: 'সব ঠিক আছে — মেয়াদোত্তীর্ণ, মেয়াদ-শেষের দিকে বা কম স্টক নেই।',
      alertExpired: 'মেয়াদ শেষ', alertExpiring: 'মেয়াদ শেষ হবে', alertLow: 'কম স্টক',
      days: 'দিন', day: 'দিন',
      searchPh: 'নাম, জেনেরিক বা ব্যাচ খুঁজুন…',
      filterAll: 'সব ক্যাটাগরি', filterAlerts: 'শুধু সতর্কতা',
      addMed: 'ওষুধ যোগ করুন', editMed: 'ওষুধ সম্পাদনা',
      fName: 'ওষুধের নাম', fGeneric: 'জেনেরিক নাম', fCategory: 'ক্যাটাগরি',
      fBatch: 'ব্যাচ নং', fExpiry: 'মেয়াদের তারিখ', fQty: 'পরিমাণ', fPrice: 'একক মূল্য (৳)',
      fLowAt: 'কম স্টক সতর্কতা', save: 'সংরক্ষণ', cancel: 'বাতিল', del: 'মুছুন',
      confirmDelete: 'এই ওষুধটি মুছে ফেলবেন?',
      colMed: 'ওষুধ', colBatch: 'ব্যাচ', colExpiry: 'মেয়াদ', colQty: 'পরিমাণ', colPrice: 'মূল্য', colValue: 'মোট', colStatus: 'অবস্থা', colActions: 'কাজ',
      statusOk: 'ঠিক আছে', statusLow: 'কম স্টক', statusExpiring: 'শীঘ্রই মেয়াদ শেষ', statusExpired: 'মেয়াদোত্তীর্ণ',
      sellTitle: 'বিক্রি লিখুন', sellMed: 'ওষুধ', sellQty: 'পরিমাণ', sellTotal: 'মোট',
      sellBtn: 'বিক্রি সংরক্ষণ', sellDone: 'বিক্রি সংরক্ষিত হয়েছে।',
      errQty: 'পরিমাণ ১ বা তার বেশি হতে হবে।', errStock: 'স্টকে যথেষ্ট নেই।',
      noStock: 'এখনো কোনো ওষুধ নেই — প্রথম ওষুধটি যোগ করুন।',
      noSales: 'এখনো কোনো বিক্রি নেই।', salesTitle: 'বিক্রির তালিকা', salesDate: 'তারিখ',
      restoreNote: 'বিক্রি মুছলে পরিমাণ স্টকে ফিরে যাবে।',
      exportBtn: 'ডেটা এক্সপোর্ট (JSON)', importBtn: 'ডেটা ইমপোর্ট (JSON)', eraseBtn: 'সব ডেটা মুছুন',
      eraseConfirm: 'সব মুছতে DELETE লিখুন।',
      importOk: 'ইমপোর্ট হয়েছে। আগের ডেটা বদলে গেছে।',
      importBad: 'ইমপোর্ট হয়নি — ফাইলটি বাতিল, আপনার ডেটা অপরিবর্তিত আছে।',
      exportNote: 'ব্যাকআপে ওষুধ ও বিক্রি দুটোই থাকে।',
      sampleNote: '৭টি নমুনা ওষুধ দেওয়া আছে — এগুলো উদাহরণ মূল্য, বাজারের দাম নয়। নিজের আসল স্টক দিয়ে বদলে নিন।',
      disclaimer: 'স্টক রাখার সহায়ক অ্যাপ। বিক্রির আগে প্যাকেটে ছাপা মেয়াদের তারিখ অবশ্যই দেখুন; এই অ্যাপ ওষুধের সত্যতা বা নিরাপত্তা যাচাই করে না।',
      langBtn: 'English', empty: '—',
      errName: 'নাম দিতে হবে (২–৬০ অক্ষর)।',
      errGeneric: 'জেনেরিক নাম দিতে হবে।',
      errQtyNum: 'পরিমাণ পূর্ণসংখ্যা হতে হবে, ০ বা বেশি।',
      errPrice: 'মূল্য ০ বা বেশি হতে হবে।',
      errExpiry: 'সঠিক মেয়াদের তারিখ দিন।',
      errLowAt: 'কম স্টকের সীমা পূর্ণসংখ্যা হতে হবে, ০ বা বেশি।',
      errBatch: 'ব্যাচ নং দিতে হবে।',
      total: 'মোট'
    }
  };

  return { CATEGORIES: CATEGORIES, SAMPLE: SAMPLE, EXPIRING_SOON_DAYS: EXPIRING_SOON_DAYS, I18N: I18N };
});
