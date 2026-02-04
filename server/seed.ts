import { db } from "./db";
import { users, products, customers, routes } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function seedDatabase() {
  try {
    // Check if data already exists
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      console.log("Database already seeded, skipping...");
      return;
    }

    console.log("Seeding database with initial data...");

    // Seed routes first (customers depend on routes)
    const routesData = [
      { id: '0ba6396a-a5f7-4739-b759-3f63e5fedc39', name: 'حي اليرموك', driverName: 'محمد احمد عطا' },
      { id: '34ddecb7-f9b2-478d-ba69-e228f29349dd', name: 'الجنادرية', driverName: 'علاء الدين' },
      { id: '37da5b83-b890-48b3-b778-d49d6acae5d1', name: 'النهضه - والخليج - الروضه', driverName: 'أحمد المندوب' },
      { id: '5a6c3ec0-6f30-40cc-b606-0565f8b94e44', name: 'حي السلي', driverName: 'محمد حسن' },
      { id: 'a298851e-e9a3-4daf-9954-e120289f2012', name: 'شمال الرياض', driverName: 'أحمد علي' },
      { id: 'a37548df-3fdf-4058-8f48-9d2c62048115', name: 'اشبيليه', driverName: 'محمد احمد عطا' },
      { id: 'f6060c95-7c06-4a08-a874-b9ef324f2d78', name: 'النظيم - الندوه - الجنادريه', driverName: 'محمد احمد عطا' },
    ];
    await db.insert(routes).values(routesData);
    console.log("Routes seeded successfully");

    // Seed products
    const productsData = [
      { id: '4b9ac14c-63ce-49da-9342-24b85e8907bd', name: 'خبز ابيض', sku: 'BG-002', price: '0.80', category: 'Bread', stock: 0, batchCount: 0 },
      { id: '509cacbf-35d5-4a6c-afa5-7b93b5cf6803', name: 'خبز بر', sku: 'SD-001', price: '0.80', category: 'Bread', stock: 990, batchCount: 0 },
      { id: '7d4e2d5f-a938-4894-a7dd-917a4ff1d57d', name: 'مغلف', sku: 'P01', price: '0.35', category: 'خبز', stock: 0, batchCount: 0 },
      { id: 'c356ad39-bcba-4392-9efa-76cbbdffcca8', name: 'شاورما صغير', sku: 'P02', price: '0.80', category: 'خبز', stock: 0, batchCount: 0 },
      { id: 'd8ba7539-ac63-4680-b79c-94a5f2ffa1f2', name: 'وسط', sku: 'P03', price: '0.80', category: 'خبز', stock: 0, batchCount: 0 },
    ];
    await db.insert(products).values(productsData);
    console.log("Products seeded successfully");

    // Seed users
    const usersData = [
      { id: '1eb37079-08c6-43f5-87f5-297182d49811', username: '547010465', password: 'Alsultan123', name: 'علاء حسين', role: 'DRIVER' as const, isActive: true },
      { id: '3e346c9f-e1d0-4745-85b7-8920a40cae3f', username: '577264706', password: 'Alsultan123', name: 'عاصم اليمني', role: 'DRIVER' as const, isActive: true },
      { id: '612acf1b-4568-4883-a5d7-6e9180babdd5', username: 'driver1', password: 'driver123', name: 'أحمد ابو علي', role: 'SALES' as const, isActive: true },
      { id: '73459b1f-a7b7-44bf-be19-ee0d330a717b', username: '508682142', password: 'Alsultan123', name: 'معاذ الحافظ', role: 'DRIVER' as const, isActive: true },
      { id: '907b8109-3ab6-435f-9005-dd446b454c28', username: '576747348', password: 'Alsultan123', name: 'احمد سليمان', role: 'DRIVER' as const, isActive: true },
      { id: '935a238c-ab6d-4bb4-b689-2e2332471f5f', username: 'admin', password: 'admin123', name: 'مدير النظام', role: 'ADMIN' as const, isActive: true },
      { id: '983a78a1-dd22-43ea-b985-48ae187ce2ad', username: '545459084', password: 'Alsultan123', name: 'احمد امام المصري', role: 'DRIVER' as const, isActive: true },
      { id: 'b1fd614b-3143-4552-8894-005a036f3345', username: '544802022', password: 'Alsultan123', name: 'ممدوح المصري', role: 'DRIVER' as const, isActive: true },
      { id: 'dd894019-d8bf-45f7-8305-98d6019cc000', username: '562483076', password: 'Alsultan123', name: 'محمد حسين', role: 'DRIVER' as const, isActive: true },
      { id: 'e6982ec7-235b-4485-ad1c-98c79824853f', username: '562041244', password: 'Alsultan123', name: 'المقداد', role: 'DRIVER' as const, isActive: true },
    ];
    await db.insert(users).values(usersData);
    console.log("Users seeded successfully");

    // Seed customers
    const customersData = [
      { id: '07fcc6a1-ad8d-4d68-8da0-54fe586c61ad', name: 'اسواق سيتي', address: 'النظيم - الندوه - الجنادريه', locationUrl: '', routeId: null, phone: '0' },
      { id: '092651c4-d075-4d1a-99b7-cc306bb975b6', name: 'خضار عربه داكس', address: 'النظيم - الندوه - الجنادريه', locationUrl: '', routeId: null, phone: '0' },
      { id: '09c383b5-5012-42cf-8ff2-422608333de2', name: 'كرم الزيتون', address: 'النسيم الغربي', locationUrl: 'https://maps.app.goo.gl/JJqThKFN2BqFk4z88', routeId: '5a6c3ec0-6f30-40cc-b606-0565f8b94e44', phone: '0550593554' },
      { id: '0be2d89b-3aec-41c7-a767-465714e4a907', name: 'متاجر احد', address: 'النظيم - الندوه - الجنادريه', locationUrl: '', routeId: null, phone: '0' },
      { id: '10e63914-8bc6-4a8a-a84b-95a16f994107', name: 'عالم الغذاء', address: 'النظيم - الندوه - الجنادريه', locationUrl: '', routeId: null, phone: '0' },
      { id: '162554cb-830b-4979-b6e1-e39bb1824b84', name: 'روائع الرابع', address: 'اشبيليه', locationUrl: '', routeId: null, phone: '0' },
      { id: '17865150-8d51-4ce2-acaa-52cd9b512891', name: 'زاد الجنوب', address: 'النهضه - والخليج - الروضه', locationUrl: 'https://maps.google.com/...', routeId: null, phone: '0' },
      { id: '17d79584-d319-4964-b9d0-e18427c7d639', name: 'الدوسر', address: 'النهضه - والخليج - الروضه', locationUrl: '', routeId: null, phone: '0' },
      { id: '21af4d2a-c68b-4c94-8e17-c9eccd53784a', name: 'اسواق السلطان', address: 'النهضه - والخليج - الروضه', locationUrl: '', routeId: null, phone: '0' },
      { id: '2968b124-38f5-4ad5-950f-f926a70df659', name: 'روضه الياسمين', address: 'مجمع الأعمال', locationUrl: 'https://maps.google.com', routeId: '0ba6396a-a5f7-4739-b759-3f63e5fedc39', phone: '555-0103' },
      { id: '3a8118c5-9f96-4b32-8b6e-07596acb0c99', name: 'اسواق الخازمي', address: 'النهضه - والخليج - الروضه', locationUrl: '', routeId: null, phone: '0' },
      { id: '43ca1b13-28b7-4312-ba11-e5ab896992b4', name: 'كبسه البيت (خبز مغلف )', address: 'النهضه - والخليج - الروضه', locationUrl: '', routeId: null, phone: '0' },
      { id: '490c9f06-7d40-4193-9347-e4393c7c197b', name: 'اسواق تانيا', address: 'النهضه - والخليج - الروضه', locationUrl: '', routeId: null, phone: '0' },
      { id: '4b480282-2cf1-4ba0-9cf5-ffd23a71a614', name: 'هاله خلود', address: 'النهضه - والخليج - الروضه', locationUrl: '', routeId: null, phone: '0' },
      { id: '4be090f1-fb19-4703-a5f5-7450bd8db11b', name: 'فصول الاربعه', address: 'النظيم - الندوه - الجنادريه', locationUrl: '', routeId: null, phone: '0' },
      { id: '4e147272-cc5b-462a-9d24-7ba4167efeaa', name: 'ورده عكاظ', address: 'النظيم - الندوه - الجنادريه', locationUrl: '', routeId: null, phone: '0' },
      { id: '6b7faf16-b2a4-4778-b0c6-544206c0f2ff', name: 'وهج النهضه', address: 'النهضه - والخليج - الروضه', locationUrl: '', routeId: null, phone: '0' },
      { id: '6c5b4c31-91a6-43f4-b5b3-4317a57530de', name: 'دروب العروبه', address: 'النهضه - والخليج - الروضه', locationUrl: '', routeId: null, phone: '0' },
      { id: '6cde37f3-f9a6-483f-8b36-2c5bb948b6de', name: 'اسواق العروبه', address: 'النهضه - والخليج - الروضه', locationUrl: '', routeId: null, phone: '0' },
      { id: '7516c803-d445-4822-bb34-48e6352d789a', name: 'رحاب علي', address: 'النظيم - الندوه - الجنادريه', locationUrl: '', routeId: null, phone: '0' },
      { id: '89f675aa-843e-46a7-b9fa-b30d041ac4b4', name: 'خضروات مجد الورود', address: 'النظيم - الندوه - الجنادريه', locationUrl: '', routeId: null, phone: '0' },
      { id: '8dd1dc4a-e870-4070-b344-6994a115d669', name: 'واحه الخليج', address: 'النهضه - والخليج - الروضه', locationUrl: '', routeId: null, phone: '0' },
      { id: '957accc8-efe4-4e63-87b5-d05cef2d90c6', name: 'رحاب ابو احمد', address: 'النظيم - الندوه - الجنادريه', locationUrl: '', routeId: null, phone: '0' },
      { id: 'a421f71d-c1ff-4458-b669-819090d73c7c', name: 'ابو رحاب', address: 'النظيم - الندوه - الجنادريه', locationUrl: '', routeId: null, phone: '0' },
      { id: 'a53a0d24-fc4c-436b-bfbf-4f69ccb966c5', name: 'نجمه الباديه', address: 'النظيم - الندوه - الجنادريه', locationUrl: '', routeId: null, phone: '0' },
      { id: 'af3675cb-9714-484e-b58a-8084c8a21899', name: 'اصوات اليمامه', address: 'اشبيليه', locationUrl: '', routeId: null, phone: '0' },
      { id: 'bf3ba703-f572-4b77-a9b7-2d52298e37ab', name: 'اصداء نجد', address: 'اشبيليه', locationUrl: '', routeId: null, phone: '0' },
      { id: 'c0f09570-e6ef-484d-98a7-136bc00ef745', name: 'اماكن النهضه', address: 'النهضه - والخليج - الروضه', locationUrl: '', routeId: null, phone: '0' },
      { id: 'c1c6d95c-43d2-4eff-96f5-5c17494e152d', name: 'نجم الزاويه', address: 'النظيم - الندوه - الجنادريه', locationUrl: '', routeId: null, phone: '0' },
      { id: 'c9b9d03c-c5df-4468-bc06-0bcc0f67c687', name: 'حقول الشام', address: 'النظيم - الندوه - الجنادريه', locationUrl: '', routeId: null, phone: '0' },
      { id: 'd437605f-0764-47ae-adea-bb5171ce7efd', name: 'سواحل العربيه', address: 'النظيم - الندوه - الجنادريه', locationUrl: '', routeId: null, phone: '0' },
      { id: 'd8693479-2fa5-4e1f-add0-96608c8c7567', name: 'سدره ماركت', address: 'النظيم - الندوه - الجنادريه', locationUrl: '', routeId: null, phone: '0' },
      { id: 'e779420e-3722-40b9-9122-69f977cf3bc0', name: 'جو مارت', address: 'النهضه - والخليج - الروضه', locationUrl: '', routeId: null, phone: '0' },
      { id: 'e8a975b6-99e4-446d-aeeb-050e3147c57b', name: 'اسواق الحربي', address: 'النهضه - والخليج - الروضه', locationUrl: '', routeId: null, phone: '0' },
      { id: 'ec8f423c-3ca5-4a12-a1d4-b4c4d8ebc0fc', name: 'معالم الخير', address: 'النهضه - والخليج - الروضه', locationUrl: '', routeId: null, phone: '0' },
      { id: 'f4417658-f24a-45e6-8c7d-c6f61bf1439f', name: 'لؤلؤه النظيم', address: 'النظيم - الندوه - الجنادريه', locationUrl: '', routeId: null, phone: '0' },
      { id: 'f656f220-a5e4-48c8-b2e0-d49f34b2618b', name: 'نجمه اركان', address: 'النهضه - والخليج - الروضه', locationUrl: '', routeId: null, phone: '0' },
      { id: 'f7cb4870-e277-4a6a-966f-7bd76f66bf61', name: 'شيم العرب', address: 'النظيم - الندوه - الجنادريه', locationUrl: '', routeId: null, phone: '0' },
      { id: 'f8da1c48-8e77-455b-8a21-a237b1bb618b', name: 'اسواق ورده سديم', address: 'طريق الكورنيش', locationUrl: 'https://maps.google.com', routeId: '34ddecb7-f9b2-478d-ba69-e228f29349dd', phone: '555-0102' },
      { id: 'fd25d88b-1100-457f-8678-c56827f00eb0', name: 'معالم الخير', address: 'طريق الجامعة', locationUrl: 'https://maps.google.com', routeId: '0ba6396a-a5f7-4739-b759-3f63e5fedc39', phone: '555-0105' },
    ];
    await db.insert(customers).values(customersData);
    console.log("Customers seeded successfully");

    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
