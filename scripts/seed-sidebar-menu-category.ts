/**
 * Seed script to create SIDEBAR_MENU_CATEGORY_CONFIG setting
 * Run with: npm run seed:sidebar-menu-category
 *
 * This setting controls which sidebar menu items are visible based on the user's
 * main category. For example, the Chess Play menu item should only be visible
 * for users in the Chess category.
 *
 * Configuration Structure:
 * {
 *   menuCategoryMapping: {
 *     "/menu-path": ["category-id-1", "category-id-2"]  // Menu item only visible for these categories
 *   },
 *   defaultBehavior: "show" | "hide"  // For menu items not in the mapping
 * }
 *
 * Menu paths available:
 * - /chess-play      - Chess Play (AI opponent)
 * - /chess           - Chess module
 * - /quiz            - Quiz module
 * - /flashcards      - Flashcards
 * - /exams           - Exams
 * - /categories      - Categories
 * - /documents       - Documents (admin)
 * - /questions       - Questions (admin)
 * - /users           - Users (admin)
 * - /settings/list   - Settings (admin)
 * - etc.
 */

import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

// MongoDB connection configuration
const MONGO_HOST = process.env.MONGO_HOST || 'localhost';
const MONGO_PORT = process.env.MONGO_PORT || '27017';
const MONGO_NAME = process.env.MONGO_NAME || 'mdr-settings';
const MONGO_USER = process.env.MONGO_USER;
const MONGO_PASSWORD = process.env.MONGO_PASSWORD;

let mongoUri: string;
if (MONGO_USER && MONGO_PASSWORD) {
  mongoUri = `mongodb://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_NAME}?authSource=admin`;
} else {
  mongoUri = `mongodb://${MONGO_HOST}:${MONGO_PORT}/${MONGO_NAME}`;
}

// Settings schema
const SettingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    value: mongoose.Schema.Types.Mixed,
    description: String,
    type: String,
    category: String,
    adminOnly: { type: Boolean, default: false },
    environment: { type: String, enum: ['prod', 'local', 'both'], default: 'both' }
  },
  { timestamps: true, strict: false }
);

const Setting = mongoose.model('Settings', SettingSchema);

// Sidebar Menu Category Configuration
// IMPORTANT: Replace the placeholder category IDs with actual MongoDB ObjectIds from your categories collection
// Uses top-level custom fields for UI editability in the settings admin panel
const SIDEBAR_MENU_CATEGORY_SETTING = {
  name: 'SIDEBAR_MENU_CATEGORY_CONFIG',
  description: 'Configuration for category-based sidebar menu filtering. Maps menu paths to allowed category IDs. Menu items in the mapping will only be visible to users whose main category is in the allowed list.',
  type: 'Site',
  category: 'UI',
  adminOnly: true,
  environment: 'both',

  // Simple display value for the UI
  value: 'Sidebar Menu Category Configuration',

  // ========== CUSTOM FIELDS (editable in UI) ==========

  // Map menu paths to arrays of allowed category IDs
  // Users must have one of these categories as their main category to see the menu item
  // Replace 'YOUR_CHESS_CATEGORY_ID' with the actual ObjectId of your Chess category
  menuCategoryMapping: {
    '/chess-play': ['YOUR_CHESS_CATEGORY_ID'],
    '/chess': ['YOUR_CHESS_CATEGORY_ID']
    // Add more mappings as needed:
    // '/some-menu-path': ['category-id-1', 'category-id-2'],
  },

  // Default behavior for menu items NOT in the mapping:
  // - 'show': Items without a mapping are shown to all users (recommended)
  // - 'hide': Items without a mapping are hidden by default
  defaultBehavior: 'show'
};

async function seed() {
  try {
    console.log('Connecting to MongoDB:', mongoUri.replace(/:[^:@]+@/, ':***@'));
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true
    } as any);

    console.log('Connected to MongoDB');

    // Check if setting already exists
    const existing = await Setting.findOne({ name: SIDEBAR_MENU_CATEGORY_SETTING.name });

    if (existing) {
      console.log('Setting already exists. Updating...');
      await Setting.findByIdAndUpdate(existing._id, SIDEBAR_MENU_CATEGORY_SETTING, { new: true });
      console.log('Setting updated successfully:', SIDEBAR_MENU_CATEGORY_SETTING.name);
    } else {
      console.log('Creating new setting...');
      await Setting.create(SIDEBAR_MENU_CATEGORY_SETTING);
      console.log('Setting created successfully:', SIDEBAR_MENU_CATEGORY_SETTING.name);
    }

    console.log('\n========================================');
    console.log('IMPORTANT: Update the Category IDs!');
    console.log('========================================');
    console.log('\nThe setting has been created with placeholder category IDs.');
    console.log('You need to update the menuCategoryMapping with actual category IDs from your database.');
    console.log('\nTo find your category IDs:');
    console.log('1. Go to the Settings page in the admin panel');
    console.log('2. Find the SIDEBAR_MENU_CATEGORY_CONFIG setting');
    console.log('3. Edit the value.menuCategoryMapping object');
    console.log('4. Replace "YOUR_CHESS_CATEGORY_ID" with actual MongoDB ObjectIds');
    console.log('\nExample after update:');
    console.log(JSON.stringify({
      menuCategoryMapping: {
        '/chess-play': ['507f1f77bcf86cd799439011'],  // Chess category ID
        '/chess': ['507f1f77bcf86cd799439011']
      },
      defaultBehavior: 'show'
    }, null, 2));

    console.log('\n\nSetting structure created:');
    console.log(JSON.stringify(SIDEBAR_MENU_CATEGORY_SETTING, null, 2));

  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

seed();
