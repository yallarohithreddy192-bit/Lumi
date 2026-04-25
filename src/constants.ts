export const SUPPORTED_LANGUAGES = [
  { name: "English", code: "en-US", native: "English" },
  { name: "Spanish", code: "es-ES", native: "Español" },
  { name: "French", code: "fr-FR", native: "Français" },
  { name: "German", code: "de-DE", native: "Deutsch" },
  { name: "Italian", code: "it-IT", native: "Italiano" },
  { name: "Portuguese", code: "pt-BR", native: "Português" },
  { name: "Japanese", code: "ja-JP", native: "日本語" },
  { name: "Korean", code: "ko-KR", native: "한국어" },
  { name: "Chinese", code: "zh-CN", native: "简体中文" },
  { name: "Arabic", code: "ar-SA", native: "العربية" },
  { name: "Hindi", code: "hi-IN", native: "हिन्दी" },
  { name: "Telugu", code: "te-IN", native: "తెలుగు" },
  { name: "Tamil", code: "ta-IN", native: "தமிழ்" },
  { name: "Bengali", code: "bn-IN", native: "বাংলা" },
  { name: "Kannada", code: "kn-IN", native: "ಕನ್ನಡ" },
  { name: "Malayalam", code: "ml-IN", native: "മലയാളം" },
  { name: "Marathi", code: "mr-IN", native: "मराठी" },
  { name: "Gujarati", code: "gu-IN", native: "ગુજરાતી" },
  { name: "Chinese", code: "zh-CN", native: "中文" },
  { name: "Japanese", code: "ja-JP", native: "日本語" },
  { name: "Korean", code: "ko-KR", native: "한국어" },
  { name: "Arabic", code: "ar-SA", native: "العربية" },
  { name: "Portuguese", code: "pt-BR", native: "Português" },
  { name: "Italian", code: "it-IT", native: "Italiano" },
  { name: "Russian", code: "ru-RU", native: "Русский" },
];

export interface Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  topics: string[];
  level: "Beginner" | "Intermediate" | "Advanced";
}

export const COURSES: Course[] = [
  {
    id: "js-001",
    title: "JavaScript Mastery",
    description: "Learn the language of the web from basics to advanced async patterns.",
    icon: "javascript",
    topics: ["ES6+", "Async/Await", "Closures", "DOM Manipulation"],
    level: "Beginner"
  },
  {
    id: "py-001",
    title: "Python Pro",
    description: "Master Python for automation, data analysis, and AI development.",
    icon: "python",
    topics: ["Data Types", "Pandas", "NumPy", "Web Scraping"],
    level: "Beginner"
  },
  {
    id: "ml-001",
    title: "Machine Learning",
    description: "Learn neural networks, regression, and predictive modeling.",
    icon: "brain",
    topics: ["Supervised Learning", "Deep Learning", "TensorFlow", "Scikit-Learn"],
    level: "Intermediate"
  },
  {
    id: "java-001",
    title: "Java Fundamentals",
    description: "Learn robust, object-oriented programming with Java.",
    icon: "coffee",
    topics: ["OOP", "Spring Boot", "JVM", "Multithreading"],
    level: "Beginner"
  }
];
