/**
 * intentClassifier.ts
 * -------------------
 * Drives the multi-turn conversation state machine.
 *
 * Flow:
 *   idle  ──►  gathering_topic  ──►  gathering_detail  ──►  recommending
 *
 * Only returns a `reviewText` (to call the backend with) once the bot has
 * collected both a topic and extra detail from the user.
 */

import type { ConvState, ConvContext } from '../types'

// ─── Simple intent patterns (for greetings / small-talk at any state) ─────

const GREETING_RE  = /^\s*(hi+|hello+|hey+|howdy|greetings|good\s*(morning|evening|afternoon|day)|yo|sup|what'?s\s*up|hiya|namaste)\s*[!?.]*\s*$/i
const FAREWELL_RE  = /^\s*(bye+|goodbye|see\s*you|see\s*ya|cya|take\s*care|later|peace|good\s*night|gn)\s*[!?.]*\s*$/i
const THANKS_RE    = /^\s*(thanks?|thank\s*you|thx|ty|cheers|appreciated|great\s*job|awesome|nice|cool|perfect|wonderful|brilliant)\s*[!?.]*\s*$/i
const BOT_RE       = /^\s*(who\s*(are|r)\s*(you|u)|what\s*(are|r)\s*(you|u)|are\s*you\s*(a\s*)?(bot|ai|robot|human)|tell\s*me\s*about\s*yourself|introduce\s*yourself|your\s*name|what('?s|\s*is)\s*(your\s*name|this))\s*[!?.]*\s*$/i
const HELP_RE      = /^\s*(help|how\s*(do\s*i|does\s*this|to\s*use|it\s*works?)|what\s*(can\s*you\s*do|should\s*i|do\s*i|to\s*(type|write|say))|usage|instructions?|guide|start)\s*[!?.]*\s*$/i
const MORE_RE      = /^\s*(yes+|yeah+|yep|sure|ok+|okay|go\s*ahead|more|another|new|different|explore\s*more)\s*[!?.]*\s*$/i
const NO_RE        = /^\s*(no+|nah|nope|not\s*now|maybe\s*later|that'?s?\s*(all|fine|good|enough))\s*[!?.]*\s*$/i

// A valid learning topic must have at least one real word that looks like
// a subject/technology (≥3 chars, not pure stopwords).
// This catches "hou r u", "lol", "ok cool", single-letter noise, etc.
const STOPWORDS = new Set([
  'a','an','the','is','it','in','on','at','to','do','be','of','or','and',
  'but','so','if','as','by','up','no','my','we','us','he','she','they',
  'i','am','are','was','were','has','had','have','will','can','may','just',
  'r','u','ur','lol','omg','wtf','idk','tbh','ngl','bruh','bro','sis',
])

/** Returns true if the text looks like a real learning topic */
function isValidTopic(text: string): boolean {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean)
  if (words.length === 0) return false
  const meaningful = words.filter(w => w.length >= 3 && !STOPWORDS.has(w))
  return meaningful.length >= 1
}

// ─── Result shape ─────────────────────────────────────────────────────────

export type StepResult =
  | { type: 'reply';       text: string;  nextState: ConvState; nextContext: ConvContext }
  | { type: 'recommend';   reviewText: string; nextContext: ConvContext }
  | { type: 'reset' }

// ─── Random picker ────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ─── Response banks ───────────────────────────────────────────────────────

const GREET_THEN_ASK = [
  "Hey there! 👋 I'm your **Personalized Learning Path Recommender**.\n\nWhat topic or skill would you like to explore? *(e.g. React, machine learning, SQL, cloud computing…)*",
  "Hello! 😊 Great to have you here. I find the best learning paths tailored just for you.\n\nWhat would you like to learn or get better at?",
  "Hi! I'm your AI learning advisor 🎓\n\nTell me — what topic or skill are you interested in exploring?",
]

const BOT_ANSWERS = [
  "I'm the **Personalized Learning Path Recommender** — an AI that has a short conversation with you to understand what you want to learn, then surfaces your top 10 tailored course recommendations.\n\nSo, what topic would you like to explore?",
  "I'm an AI-powered **learning path advisor** 🤖 I ask you a couple of questions about your interests and goals, then recommend the best-matched courses for your journey.\n\nWhat skill or subject are you curious about?",
]

const HELP_ANSWERS = [
  "Here's how it works:\n\n1. **Tell me what you want to learn** — any topic, skill, or technology.\n2. I'll ask a quick follow-up to understand your level and goals.\n3. I'll find your **top 10 personalised course recommendations**.\n\nReady? What topic interests you?",
  "It's simple and conversational:\n- Just tell me what you want to learn.\n- I'll ask one follow-up question.\n- Then I'll show you **10 hand-picked learning paths** just for you.\n\nWhat would you like to start with?",
]

const FAREWELL_MSGS = [
  "Goodbye! Keep learning and growing. Come back anytime! 👋",
  "See you later! Happy learning! 🚀",
  "Take care! Your next learning milestone is just around the corner. 🎓",
]

const THANKS_MSGS = [
  "You're welcome! 😊 Want to explore another topic?",
  "Glad I could help! Feel free to ask about another skill or topic anytime.",
  "Anytime! Would you like recommendations for a different subject?",
]

const FOLLOW_UP_QUESTIONS = [
  (topic: string) => `Got it — **${topic}**! 🎯\n\nTo find the best paths for you, tell me a bit more:\n- What's your current level? *(beginner / intermediate / advanced)*\n- What's your goal? *(e.g. get a job, build a project, pass an exam, general curiosity)*`,
  (topic: string) => `Nice choice — **${topic}**! 📚\n\nQuick follow-up:\n- How much experience do you already have with this?\n- What are you hoping to achieve?`,
  (topic: string) => `Awesome, **${topic}** it is! ✨\n\nHelp me personalise this further:\n- Are you a beginner, intermediate, or advanced learner?\n- What's your main goal with this topic?`,
]

const BUILDING_MSG = [
  "Perfect! Let me find the best learning paths for you… 🔍",
  "Great, I have everything I need! Searching for your top recommendations… 🚀",
  "On it! Analysing and matching the best courses for you… ✨",
]

const ASK_MORE = [
  "Want to explore a **different topic** or dive deeper into something else?",
  "Would you like recommendations for another skill or subject?",
  "Curious about something else? Just tell me what you'd like to learn next!",
]

// ─── Main step function ───────────────────────────────────────────────────

/**
 * Given the current conversation state, context, and the user's latest message,
 * returns what the bot should do next.
 */
export function step(
  state: ConvState,
  context: ConvContext,
  userText: string,
): StepResult {
  const t = userText.trim()

  // ── Global small-talk overrides (work in any state) ───────────────────
  if (FAREWELL_RE.test(t)) {
    return { type: 'reply', text: pick(FAREWELL_MSGS), nextState: state, nextContext: context }
  }
  if (BOT_RE.test(t)) {
    return { type: 'reply', text: pick(BOT_ANSWERS), nextState: state, nextContext: context }
  }
  if (HELP_RE.test(t)) {
    return { type: 'reply', text: pick(HELP_ANSWERS), nextState: state, nextContext: context }
  }
  if (THANKS_RE.test(t)) {
    return { type: 'reply', text: pick(THANKS_MSGS), nextState: state, nextContext: context }
  }

  // ── State machine ─────────────────────────────────────────────────────

  switch (state) {

    case 'idle': {
      if (GREETING_RE.test(t)) {
        return {
          type: 'reply',
          text: pick(GREET_THEN_ASK),
          nextState: 'gathering_topic',
          nextContext: {},
        }
      }
      // They skipped greeting — only accept as a topic if it looks meaningful
      if (!isValidTopic(t)) {
        return {
          type: 'reply',
          text: "I didn't quite catch that 😅 I specialise in learning path recommendations. What topic or skill would you like to explore? *(e.g. Python, machine learning, React, SQL…)*",
          nextState: 'gathering_topic',
          nextContext: {},
        }
      }
      return {
        type: 'reply',
        text: pick(FOLLOW_UP_QUESTIONS)(t),
        nextState: 'gathering_detail',
        nextContext: { topic: t },
      }
    }

    case 'gathering_topic': {
      // Guard: reject nonsense input as a topic
      if (!isValidTopic(t)) {
        return {
          type: 'reply',
          text: "Hmm, I didn't catch a learning topic there 🤔 Could you tell me what subject or skill you'd like to learn? *(e.g. Python, React, SQL, cloud computing…)*",
          nextState: 'gathering_topic',
          nextContext: context,
        }
      }
      return {
        type: 'reply',
        text: pick(FOLLOW_UP_QUESTIONS)(t),
        nextState: 'gathering_detail',
        nextContext: { ...context, topic: t },
      }
    }

    case 'gathering_detail': {
      // User gave detail → we have enough, call the backend
      const topic  = context.topic ?? t
      const detail = t
      const reviewText = `I want to learn ${topic}. ${detail}`
      return {
        type: 'recommend',
        reviewText,
        nextContext: { ...context, detail },
      }
    }

    case 'recommending': {
      if (MORE_RE.test(t)) {
        return {
          type: 'reply',
          text: "Sure! What topic would you like to explore next? 🎓",
          nextState: 'gathering_topic',
          nextContext: {},
        }
      }
      if (NO_RE.test(t)) {
        return {
          type: 'reply',
          text: "No problem! Come back whenever you're ready to learn something new. 👋",
          nextState: 'idle',
          nextContext: {},
        }
      }
      // They said something new — only treat as topic if it's meaningful
      if (!isValidTopic(t)) {
        return {
          type: 'reply',
          text: "Not sure I caught that 😅 Would you like to explore another learning topic? If so, just tell me the subject!",
          nextState: 'recommending',
          nextContext: context,
        }
      }
      return {
        type: 'reply',
        text: pick(FOLLOW_UP_QUESTIONS)(t),
        nextState: 'gathering_detail',
        nextContext: { topic: t },
      }
    }

    default:
      return {
        type: 'reply',
        text: "What topic would you like to explore? 🎓",
        nextState: 'gathering_topic',
        nextContext: {},
      }
  }
}

/** Short text shown while the backend is loading */
export function getBuildingMessage(): string {
  return pick(BUILDING_MSG)
}

/** Text appended after showing recommendations */
export function getAfterRecommendMessage(): string {
  return pick(ASK_MORE)
}
