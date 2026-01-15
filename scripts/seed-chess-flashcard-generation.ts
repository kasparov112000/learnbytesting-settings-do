/**
 * Seed script to create CHESS_FLASHCARD_GENERATION setting
 * Run with: npm run seed:chess-flashcard-generation
 *
 * This setting configures the CHESS-SPECIFIC flashcard generation feature
 * that uses NotebookLM RAG to analyze user's chess game weaknesses and
 * generate personalized flashcards.
 *
 * Note: This is chess-specific. Other subjects (math, languages, etc.)
 * will have their own settings with subject-appropriate prompts.
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

// Chess Flashcard Generation Setting Document
const CHESS_FLASHCARD_GENERATION_SETTING = {
  name: 'CHESS_FLASHCARD_GENERATION',
  description: 'Chess-specific configuration for generating flashcards from NotebookLM game weakness analysis. Controls prompts, card limits, and generation behavior. Other subjects will have their own settings.',
  type: 'Feature',
  category: 'Chess',
  adminOnly: true,
  environment: 'both',
  value: 'Chess Flashcard Generation Configuration',
  subject: 'chess',  // Identifies which subject this setting applies to

  // ========== FEATURE TOGGLE ==========
  enabled: true,

  // ========== RAG QUERY CONFIGURATION ==========
  // Prompt template for querying NotebookLM RAG to identify weaknesses
  // Placeholders: {{maxWeaknesses}}
  ragQueryPrompt: `Analyze all my chess games and identify my top {{maxWeaknesses}} most critical and specific weaknesses that I should work on improving.

For EACH weakness, provide the following in a structured format:
1. **Weakness Name**: A short, descriptive title (e.g., "Weak Endgame Technique with Rooks")
2. **Description**: A clear explanation of what I'm doing wrong and why it's hurting my game
3. **Example Position**: If applicable, provide a FEN notation of a typical position where this weakness occurs
4. **Correct Approach**: The moves or strategy I should use instead (in PGN format if applicable)
5. **Opening Context**: If this weakness relates to a specific opening, name it
6. **Difficulty Level**: Rate 1-5 how complex this concept is to master

Focus on actionable, specific weaknesses rather than general advice like "calculate more" or "study tactics".
Reference specific games or patterns you've observed in my game history.`,

  // ========== FLASHCARD GENERATION CONFIGURATION ==========
  // Prompt template for LLM to generate flashcard JSON from weakness analysis
  // Placeholders: {{maxCards}}, {{weaknessAnalysis}}, {{subcategoryList}}
  flashcardGenerationPrompt: `You are a chess coach creating study flashcards. Based on the following weakness analysis, generate exactly {{maxCards}} flashcards in JSON format.

RULES:
1. Each flashcard should test ONE specific concept from the weakness analysis
2. Questions should be practical and scenario-based when possible
3. Use the chessData.moves array for chess positions (NOT individual fen/pgn fields)
4. Vary difficulty levels based on concept complexity
5. Make hints helpful but not give away the answer
6. Assign each flashcard to a subcategory from the available list
7. CRITICAL: Include hierarchical weakness tags for tracking improvement

AVAILABLE SUBCATEGORIES:
{{subcategoryList}}

=== WEAKNESS TAG FORMAT (REQUIRED) ===
Each flashcard MUST include hierarchical weakness tags in the "weaknessTags" array.
Format: "weakness:{type}:{specific}"

Weakness Types (choose one):
- opening: Opening theory, repertoire, move orders
- middlegame: Middlegame strategy, piece coordination
- endgame: Endgame technique, king activity, pawn endings
- tactics: Tactical patterns, combinations, traps
- strategy: Positional understanding, pawn structure
- calculation: Calculation accuracy, visualization
- time-management: Clock handling, time pressure decisions

Specific: A kebab-case identifier describing the exact weakness (e.g., "rook-endgame-technique", "knight-outpost-usage", "sicilian-najdorf-prep")

FLASHCARD STRUCTURE:
{
  "front": "The question or scenario (be specific and clear)",
  "back": "The answer with explanation (concise but complete)",
  "hint": "A helpful hint without giving away the answer (optional)",
  "difficulty": 1-5 (1=beginner, 5=advanced),
  "tags": ["relevant", "tags"],
  "subcategory": "Name from the available subcategories list",
  "weaknessTags": ["weakness:endgame:rook-technique", "weakness:tactics:back-rank"],
  "weaknessTagData": [
    {
      "fullTag": "weakness:endgame:rook-technique",
      "type": "endgame",
      "specific": "rook-technique",
      "confidence": 0.9
    }
  ],
  "chessData": {
    "moves": ["e4", "e5", "Nf3"],
    "openingName": "Opening name if relevant (optional)",
    "orientation": "white or black (which side to play)"
  }
}

IMPORTANT CHESS DATA RULES:
- Use the "moves" array with standard algebraic notation (SAN): e4, Nf3, O-O, exd5, etc.
- The server will automatically validate moves and compute the FEN position
- The "moves" array should show the position BEFORE the question is asked
- Do NOT provide fen or pgn fields - only use chessData.moves

EXAMPLE FLASHCARD:
{
  "front": "After 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6, what is White's most common response?",
  "back": "6.Be3! The English Attack setup. White prepares f3, Qd2, O-O-O and a kingside pawn storm.",
  "hint": "Develop a piece that supports the knight and prepares long castle",
  "difficulty": 3,
  "tags": ["opening", "sicilian"],
  "subcategory": "Opening Theory",
  "weaknessTags": ["weakness:opening:sicilian-najdorf-prep"],
  "weaknessTagData": [
    {
      "fullTag": "weakness:opening:sicilian-najdorf-prep",
      "type": "opening",
      "specific": "sicilian-najdorf-prep",
      "confidence": 0.85
    }
  ],
  "chessData": {
    "moves": ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"],
    "openingName": "Sicilian Defense: Najdorf Variation",
    "orientation": "white"
  }
}

WEAKNESS ANALYSIS:
{{weaknessAnalysis}}

OUTPUT ONLY VALID JSON (no markdown, no explanation):
{"flashcards": [...], "newSubcategories": []}`,

  // User prompt template - reinforces output format and chess-specific requirements
  // Placeholders: {{maxCards}}
  flashcardUserPrompt: `Based on the weakness analysis above, generate exactly {{maxCards}} flashcards.

=== MANDATORY REQUIREMENTS ===

1. CHESS DATA FORMAT (REQUIRED FOR ALL FLASHCARDS)
   - Use the "chessData" object with a "moves" array in SAN notation
   - The server will automatically compute and validate the FEN position
   - Example moves array: ["e4", "e5", "Nf3", "Nc6", "Bc4"]
   - DO NOT provide FEN - the server computes it from moves
   - Include "openingName" if the position is from a known opening

2. QUESTION AND ANSWER MUST MATCH
   - If the question asks "What should WHITE do?", the answer MUST describe White's moves
   - If the question asks "What should BLACK do?", the answer MUST describe Black's moves
   - NEVER mix up sides - this confuses the learner

3. SPECIFIC SCENARIO-BASED QUESTIONS
   - NEVER use generic questions like "What is a common mistake?"
   - ALWAYS reference the position in the question
   - Good: "After 1.e4 e5 2.Nf3, what is Black's best defensive move?"
   - Bad: "What mistake do you often make in the middlegame?"

4. SUBCATEGORY ASSIGNMENT
   - Every flashcard MUST have a "subcategory" from the provided list

5. WEAKNESS TAGS (REQUIRED)
   - Every flashcard MUST have "weaknessTags" array with hierarchical tags
   - Format: "weakness:{type}:{specific}"
   - Types: opening, middlegame, endgame, tactics, strategy, calculation, time-management
   - Specific: kebab-case identifier (e.g., "rook-endgame-technique", "back-rank-awareness")
   - Every flashcard MUST have "weaknessTagData" array with parsed tag objects

=== OUTPUT FORMAT ===

Return ONLY this JSON structure (no markdown, no explanation):
{
  "flashcards": [
    {
      "front": "After 1.e4 e5 2.Nf3, what is Black's best move to defend the e5 pawn while developing?",
      "back": "Black should play 2...Nc6, developing the knight while defending e5. This is the most common and solid response.",
      "hint": "Develop a piece that also defends",
      "difficulty": 2,
      "tags": ["opening", "defense", "development"],
      "subcategory": "Opening Theory",
      "weaknessTags": ["weakness:opening:development-principles"],
      "weaknessTagData": [
        {
          "fullTag": "weakness:opening:development-principles",
          "type": "opening",
          "specific": "development-principles",
          "confidence": 0.85
        }
      ],
      "chessData": {
        "moves": ["e4", "e5", "Nf3"],
        "openingName": "King's Knight Opening",
        "orientation": "white"
      }
    }
  ],
  "newSubcategories": []
}

IMPORTANT:
- The "moves" array should show the position BEFORE the question is asked
- Use standard algebraic notation (SAN): e4, Nf3, O-O, exd5, etc.
- The server will validate moves and compute the final FEN automatically
- Each flashcard MUST include weaknessTags and weaknessTagData arrays`,

  // ========== GENERATION LIMITS ==========
  maxCards: 10,
  maxWeaknesses: 5,
  defaultDifficulty: 3,

  // ========== CHESS POSITION OPTIONS ==========
  includeChessPositions: true,
  includePracticeMode: true,

  // ========== FLASHCARD DEFAULTS ==========
  // Default values applied to all generated flashcards
  flashcardDefaults: {
    sourceType: 'ai-generated',
    tags: ['weakness', 'notebooklm-generated', 'personalized'],
    canBeQuizzed: true
  },

  // ========== CATEGORY CONFIGURATION ==========
  // Category to assign generated flashcards to
  defaultCategoryName: 'My Weaknesses',
  createCategoryIfMissing: true,

  // ========== RATE LIMITING ==========
  maxGenerationsPerDay: 5,
  cooldownMinutes: 10,

  // ========== N8N WORKFLOW ==========
  n8nWebhookPath: '/webhook/notebooklm-generate-flashcards',

  // ========== LOGGING ==========
  logGenerations: true,
  logPrompts: false  // Set to true for debugging
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
    const existing = await Setting.findOne({ name: CHESS_FLASHCARD_GENERATION_SETTING.name });

    if (existing) {
      console.log('Setting already exists. Updating...');
      await Setting.findByIdAndUpdate(existing._id, CHESS_FLASHCARD_GENERATION_SETTING, { new: true });
      console.log('Setting updated successfully:', CHESS_FLASHCARD_GENERATION_SETTING.name);
    } else {
      console.log('Creating new setting...');
      await Setting.create(CHESS_FLASHCARD_GENERATION_SETTING);
      console.log('Setting created successfully:', CHESS_FLASHCARD_GENERATION_SETTING.name);
    }

    console.log('\nSeed completed successfully!');
    console.log('\nSetting structure:');
    console.log(JSON.stringify(CHESS_FLASHCARD_GENERATION_SETTING, null, 2));

  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seed();
