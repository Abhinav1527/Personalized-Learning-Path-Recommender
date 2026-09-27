// Maps course name keywords → Tailwind bg + text colour classes
// Falls back to a default purple when no keyword matches.

const COURSE_COLORS: Array<[RegExp, string]> = [
  [/python|django|flask/i,            'bg-blue-900/40 text-blue-300'],
  [/react|angular|vue|javascript|typescript|node/i, 'bg-cyan-900/40 text-cyan-300'],
  [/machine learning|deep learning|neural|tensorflow|pytorch|supervised|unsupervised|reinforcement/i, 'bg-fuchsia-900/40 text-fuchsia-300'],
  [/data|pandas|sql|excel|tableau|power bi|visualization|warehouse|etl/i, 'bg-teal-900/40 text-teal-300'],
  [/aws|azure|google cloud|kubernetes|docker|devops|ci cd|mlops/i, 'bg-orange-900/40 text-orange-300'],
  [/cybersecurity|hacking|ethical/i,  'bg-red-900/40 text-red-300'],
  [/blockchain|smart contract|solidity/i, 'bg-yellow-900/40 text-yellow-300'],
  [/java|spring|android|kotlin/i,     'bg-amber-900/40 text-amber-300'],
  [/ios|swift|flutter|mobile/i,       'bg-pink-900/40 text-pink-300'],
  [/git|linux|bash/i,                 'bg-slate-700/40 text-slate-300'],
  [/nlp|natural language|generative|prompt/i, 'bg-violet-900/40 text-violet-300'],
  [/statistics|probability|calculus|algebra|bayesian/i, 'bg-emerald-900/40 text-emerald-300'],
]

export function courseColor(course: string): string {
  for (const [re, cls] of COURSE_COLORS) {
    if (re.test(course)) return cls
  }
  return 'bg-purple-900/40 text-purple-300'
}

// Course → single emoji icon
const COURSE_ICONS: Array<[RegExp, string]> = [
  [/python/i, '🐍'],
  [/react|angular|vue/i, '⚛️'],
  [/machine learning|supervised|unsupervised/i, '🤖'],
  [/deep learning|neural|tensorflow|pytorch/i, '🧠'],
  [/data|pandas|visualization/i, '📊'],
  [/sql|database|postgresql|mongodb|redis/i, '🗄️'],
  [/aws|azure|google cloud/i, '☁️'],
  [/docker|kubernetes/i, '🐳'],
  [/devops|ci cd|git/i, '⚙️'],
  [/cybersecurity|hacking/i, '🔒'],
  [/blockchain|solidity/i, '⛓️'],
  [/java|spring/i, '☕'],
  [/android|ios|flutter|mobile/i, '📱'],
  [/nlp|natural language|generative/i, '💬'],
  [/statistics|probability|calculus/i, '📐'],
  [/linux|bash/i, '🐧'],
  [/javascript|typescript|node/i, '🟨'],
  [/web|html|css|responsive/i, '🌐'],
  [/excel|tableau|power bi/i, '📈'],
]

export function courseIcon(course: string): string {
  for (const [re, icon] of COURSE_ICONS) {
    if (re.test(course)) return icon
  }
  return '🎓'
}
