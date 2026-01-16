/**
 * Seed script to create job configuration settings
 * Run with: npx ts-node scripts/seed-job-settings.ts
 *
 * Creates admin-only settings for controlling scheduled jobs in the jobs microservice.
 * Each job setting allows admins to:
 * - Enable/disable jobs without code changes
 * - Configure job intervals dynamically
 * - View job purpose/description
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

// Job settings definitions
const JOB_SETTINGS = [
  {
    name: 'JOB_CREATE_STATUS',
    description: 'Legacy PwC ping check job. Checks if external CREATE system is available. Currently deprecated and should remain disabled.',
    type: 'Site',
    category: 'Jobs',
    adminOnly: true,
    environment: 'both',
    value: {
      enabled: false,
      interval: '30 seconds',
      description: 'Legacy PwC ping check - checks external CREATE system availability'
    },
    // Top-level fields for easier access
    enabled: false,
    interval: '30 seconds',
    jobName: 'createStatus',
    lockLifetime: 120000,
    timeoutIntervalMs: 4950
  },
  {
    name: 'JOB_ANDROID_SYNC',
    description: 'Android mobile app sync job. Triggers synchronization of data between the server and Android mobile application.',
    type: 'Site',
    category: 'Jobs',
    adminOnly: true,
    environment: 'both',
    value: {
      enabled: true,
      interval: '1 minute',
      description: 'Syncs data with Android mobile app'
    },
    // Top-level fields for easier access
    enabled: true,
    interval: '1 minute',
    jobName: 'androidSync',
    lockLifetime: 300000,
    timeoutIntervalMs: 10000
  },
  {
    name: 'JOB_TRANSCRIPTION_POLL',
    description: 'Video transcription polling job. Polls for pending video transcriptions and triggers download/processing of completed transcriptions.',
    type: 'Site',
    category: 'Jobs',
    adminOnly: true,
    environment: 'both',
    value: {
      enabled: true,
      interval: '30 seconds',
      description: 'Polls for pending video transcriptions'
    },
    // Top-level fields for easier access
    enabled: true,
    interval: '30 seconds',
    jobName: 'transcriptionPoll',
    lockLifetime: 60000,
    timeoutIntervalMs: 10000
  }
];

async function seed() {
  try {
    console.log('Connecting to MongoDB:', mongoUri.replace(/:[^:@]+@/, ':***@'));
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true
    } as any);

    console.log('Connected to MongoDB');
    console.log('\nSeeding job settings...\n');

    for (const jobSetting of JOB_SETTINGS) {
      const existing = await Setting.findOne({ name: jobSetting.name });

      if (existing) {
        console.log(`[UPDATE] ${jobSetting.name} already exists. Updating...`);
        await Setting.findByIdAndUpdate(existing._id, jobSetting, { new: true });
        console.log(`  ✓ Updated successfully`);
      } else {
        console.log(`[CREATE] Creating ${jobSetting.name}...`);
        await Setting.create(jobSetting);
        console.log(`  ✓ Created successfully`);
      }

      console.log(`  - Enabled: ${jobSetting.enabled}`);
      console.log(`  - Interval: ${jobSetting.interval}`);
      console.log(`  - Job Name: ${jobSetting.jobName}`);
      console.log('');
    }

    console.log('\n========================================');
    console.log('Seed completed successfully!');
    console.log('========================================\n');

    console.log('Created settings:');
    JOB_SETTINGS.forEach(s => {
      console.log(`  - ${s.name} (${s.enabled ? 'enabled' : 'disabled'}, ${s.interval})`);
    });

    console.log('\nTo view in API:');
    console.log('  GET /settings?category=Jobs');
    console.log('\nTo update a job setting:');
    console.log('  PUT /settings/:id { "enabled": true, "interval": "1 minute" }');

  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

seed();
