# Scholarly Changelog

## v1.3 - Multiple Choice & Fill-in-the-Blank (Latest)

### 🎯 Major UI/UX Overhaul

#### 1. **Lesson Mastery Checks: Multiple Choice UI**
**Replaced whiteboard with clean MC interface**

**Before:** Draw/write answer on whiteboard, AI analyzes canvas
**Now:** Click A, B, C, or D buttons - instant feedback!

**Features:**
- Clean, modern button interface
- Selected option highlights in gold
- Instant evaluation (no AI call needed)
- Clear feedback with explanations
- One-click retry

**Example:**
```
Question: What is the derivative of x²?
○ A: x
● B: 2x  ← Selected
○ C: x³
○ D: 2

[Submit Answer] → ✓ Correct! The power rule gives us 2x.
```

---

#### 2. **Workbook Problems: Fill-in-the-Blank**
**Changed from long-form to short-answer format**

**Before:** Multi-step problems with full solutions
**Now:** Short-answer questions you TYPE

**Features:**
- Input field for typing answers
- "Check Answer" button validates instantly
- Automatic comparison (handles spacing/case)
- Shows correct answer + explanation when wrong
- Much faster to complete (30 sec vs 5+ min)

**Example:**
```
Q: What is the powerhouse of the cell?
Your Answer: [mitochondria        ]
            [Check Answer]

✓ Correct! Mitochondria generate ATP through cellular respiration.
```

---

#### 3. **Whiteboard Reserved for Challenges**
**Whiteboard now only appears in Challenge problems**

- ✅ Lessons: Multiple choice (no whiteboard)
- ✅ Workbook: Type short answers (no whiteboard)
- ✅ **Challenges: Full whiteboard with drawing** ← Only place with whiteboard!

This makes lessons faster while keeping challenges complex.

---

### 📊 Before & After Comparison

| Feature | v1.2 | v1.3 |
|---------|------|------|
| **Lesson Check** | Whiteboard drawing | Multiple choice buttons |
| **Evaluation Time** | ~3 seconds (AI) | Instant |
| **Workbook Problems** | Long-form solutions | Short fill-in-the-blank |
| **Answer Method** | Show solution button | Type + check answer |
| **Whiteboard Usage** | Lessons + Challenges | Challenges only |
| **Time per Lesson** | 8-12 min | 5-8 min |

---

### 🔧 Technical Changes

#### Lesson Mastery
```javascript
// Old: Canvas submission → AI vision → Grading
evaluateMastery(canvasDataUrl, visionReport)

// New: Direct answer checking
evaluateMCAnswer() {
  const isCorrect = selectedAnswer === masteryQuestion.correctIndex;
  // Instant feedback!
}
```

#### Workbook Generation
```javascript
// Old format:
{"question": "...", "answer": "Full step-by-step solution..."}

// New format:
{
  "question": "What is...?",
  "correctAnswer": "42",  // Short answer
  "explanation": "Brief explanation"
}
```

---

### 🎮 User Experience

**Old Lesson Flow:**
1. Read lesson (5-10 min)
2. Draw/write on whiteboard (2-3 min)
3. Wait for AI analysis (3 sec)
4. Read feedback
5. Total: **8-13 minutes**

**New Lesson Flow:**
1. Read lesson (5-10 min)
2. Click MC answer (10 sec)
3. Instant feedback
4. Total: **5-10 minutes**

**Time saved: 3-5 minutes per lesson!**

---

### 🐛 Fixes Included from v1.2

- Workbook JSON parsing improvements
- Whiteboard eraser & thin pencils (1-8px)
- Auto-generation of problems on mastery
- Better error handling

---

### 📝 Migration Notes

**For existing users:**
- Old lessons with whiteboard prompts still work
- New lessons automatically use MC format
- Existing workbook problems show solutions as before
- New problems use short-answer format

**Cache behavior:**
- Cached lessons retain old format until regenerated
- New lessons automatically use MC format
- Clear cache to get MC questions for old lessons

---

## v1.2 - Quiz-Style Mastery & Auto-Generation

### Major Changes
- Simplified mastery challenges to quiz-style (MC, T/F, fill-blank, matching)
- Auto-generation of workbook (6 problems) + challenge (1 problem) on lesson completion
- Faster assessment flow

---

## v1.1 - Bug Fixes & Whiteboard Improvements

### Fixed
- Workbook "unexpected format" error
- Thinner pencil sizes (1-8px)
- Visible eraser button

---

Version: 1.3
Date: March 2026
