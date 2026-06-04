import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type LandingLanguage = "en" | "zh" | "ko";

export const LANDING_LANGUAGE_KEY = "findingLandingLanguage";
export const LANDING_LANGUAGE_CHANGED_EVENT = "finding:landing-language-changed";

const labels: Record<LandingLanguage, string> = {
  en: "English",
  zh: "中文",
  ko: "한국어",
};

const validLanguages: LandingLanguage[] = ["en", "zh", "ko"];

export function sanitizeLandingLanguage(value: unknown): LandingLanguage {
  return validLanguages.includes(value as LandingLanguage) ? (value as LandingLanguage) : "en";
}

export function readLandingLanguage(): LandingLanguage {
  if (typeof window === "undefined") return "en";
  return sanitizeLandingLanguage(window.localStorage.getItem(LANDING_LANGUAGE_KEY));
}

const copy = {
  en: {
    meta: {
      title: "Finding — AI-native social matching",
      description:
        "Finding is a social network where AI understands what people need and connects them with people who can help.",
      ogDescription:
        "A global AI-native social network for demand and supply matching across people, languages, and contexts.",
    },
    nav: {
      how: "How it works",
      features: "Features",
      stories: "Stories",
      about: "About",
      signIn: "Sign in",
      start: "Start now",
      language: "Landing language",
    },
    hero: {
      livePrefix: "Across the world,",
      liveSuffix: "needs are being matched right now",
      titleA: "No human need",
      titleB: "should disappear",
      bodyA: "Finding is an intent-based social network for human demand and supply.",
      bodyB: "Say what you need. AI understands the context and finds compatible people.",
      primary: "Start now",
      secondary: "See how it works",
      stats: ["active people", "match satisfaction", "supported languages", "needs left behind"],
    },
    features: [
      ["AI social matching", "Understands natural human intent"],
      ["Cross-language context", "Translation for global connection"],
      ["Needs keep living", "If not today, future matches can still find you"],
      ["Safer connection", "Chat starts from social context"],
    ],
    how: {
      eyebrow: "How it works",
      titleA: "Three steps to",
      titleB: "find the right person",
      desc: "Describe what you need. AI understands the intent and connects you with compatible people.",
      steps: [
        ["Describe what you need", "Write naturally. No rigid categories, filters, or forms."],
        ["AI reads the social context", "Finding compares needs with people, cards, languages, and signals."],
        ["Start the conversation", "Open a profile, understand compatibility, and message with context."],
      ],
    },
    global: {
      eyebrow: "Live global activity",
      titleA: "The world is",
      titleB: "matching right now",
      stats: ["active needs", "countries", "% match success"],
    },
    useCases: {
      eyebrow: "Use cases",
      titleA: "Who uses",
      cases: [
        [
          "Creative people",
          "Find illustrators, photographers, music producers",
          "Instead of digging through groups, describe the collaborator you need and let AI find people whose cards fit the request.",
        ],
        [
          "Social connection",
          "Find dinner friends, travel partners, people to talk with",
          "Finding makes connection happen at the moment of need, with compatibility and translation built into the social flow.",
        ],
        [
          "Startup teams",
          "Find builders, designers, and collaborators",
          "Write the real need in plain language. AI matches the demand with people whose visible supply cards make sense.",
        ],
      ],
      preview: {
        need: "Need #2841",
        matches: "Real matches",
        said: "You just said",
        socialNeed: "I want someone near Jing'an Temple for sushi tonight 🍣",
        socialReply: "Finding will keep searching for compatible people and prepare warm intros.",
        scanning: "Scanning globally...",
        candidates: "candidates",
        joining: "New compatible people are joining in real time...",
      },
    },
    voices: {
      eyebrow: "People say",
      titleA: "Real signals",
      titleB: "from around the world",
      items: [
        ["Real saved data", "Supabase only", "Production surfaces show records created or saved by real authenticated users."],
        ["No seed profiles", "Filtered output", "Simulated profiles are hidden unless test mode is explicitly enabled."],
        ["Supply cards", "Identity layer", "Cards describe what someone can offer, not what they are requesting."],
        ["Demand posts", "Find layer", "Needs remain lightweight intent posts that can receive real matches later."],
        ["Messages", "Relationship layer", "Conversations are created through one shared Supabase chat flow."],
        ["Debug labels", "Temporary QA", "Counts show real source and filtered seed totals during stabilization."],
      ],
    },
    cta: {
      titleA: "Ready to",
      titleB: "be found?",
      desc: "Say what you need. AI understands the context and finds compatible people.",
      primary: "Start for free",
      secondary: "See how it works",
    },
    footer: {
      desc: "An intent-based social network for human demand and supply. No human need should disappear.",
      cols: [
        ["Product", ["Features", "Pricing", "Changelog", "Roadmap"]],
        ["Features", ["AI matching", "Translation", "Global network", "Safe connection"]],
        ["Company", ["About", "Blog", "Careers", "Press"]],
        ["Support", ["Help center", "Contact", "Privacy policy", "Terms"]],
      ],
      privacy: "Privacy policy",
      terms: "Terms",
    },
  },
  zh: {
    meta: {
      title: "Finding — AI 原生社交匹配",
      description: "Finding 是一个让 AI 理解人的需求，并连接能提供帮助的人的社交网络。",
      ogDescription: "面向全球的 AI 原生社交网络，用自然语言连接人的需求与供给。",
    },
    nav: {
      how: "工作原理",
      features: "功能",
      stories: "故事",
      about: "关于",
      signIn: "登录",
      start: "立即开始",
      language: "落地页语言",
    },
    hero: {
      livePrefix: "全球",
      liveSuffix: "个需求正在被匹配",
      titleA: "让每一个需求",
      titleB: "都不被冷落",
      bodyA: "Finding 是基于意图的供需连接社交网络。",
      bodyB: "说出你需要什么，AI 理解语境并找到合适的人。",
      primary: "立即开始",
      secondary: "了解工作原理",
      stats: ["活跃用户", "匹配满意度", "支持语言", "需求不丢失"],
    },
    features: [
      ["AI 社交匹配", "理解自然语言意图"],
      ["跨语言语境", "帮助全球连接"],
      ["需求持续存在", "今天没有，未来也可能被找到"],
      ["安全连接", "聊天从真实社交语境开始"],
    ],
    how: {
      eyebrow: "How it works",
      titleA: "三步，",
      titleB: "找到你需要的人",
      desc: "描述你的需求，AI 自动理解意图并匹配合适的人。",
      steps: [
        ["描述你的需求", "用自然语言说出你想找什么，不必分类，不用填表单。"],
        ["AI 理解社交语境", "Finding 比对需求、个人卡片、语言和社交信号。"],
        ["带着语境开始对话", "打开资料，理解匹配原因，再开始聊天。"],
      ],
    },
    global: {
      eyebrow: "全球实时数据",
      titleA: "此刻，",
      titleB: "全世界都在被匹配",
      stats: ["个活跃需求", "个国家", "% 匹配成功率"],
    },
    useCases: {
      eyebrow: "Use cases",
      titleA: "谁在用",
      cases: [
        ["创意工作者", "找画师、摄影师、音乐制作人", "无需翻遍社群。描述你需要的合作对象，AI 会寻找卡片与需求匹配的人。"],
        ["社交连接", "找约饭搭子、旅伴、聊天对象", "Finding 让连接发生在想要的瞬间，并把匹配度和翻译放进社交流程。"],
        ["创业团队", "找开发者、设计师、合作者", "用自然语言写真实需求，AI 匹配那些公开供给卡片真正合适的人。"],
      ],
      preview: {
        need: "需求 #2841",
        matches: "真实匹配",
        said: "你刚才说",
        socialNeed: "今晚 7 点在静安寺附近想找人一起吃日料 🍣",
        socialReply: "Finding 会持续寻找契合的人，并准备自然开场。",
        scanning: "全球扫描中…",
        candidates: "候选",
        joining: "实时新候选人加入中…",
      },
    },
    voices: {
      eyebrow: "用户说",
      titleA: "来自全球的",
      titleB: "真实回声",
      items: [
        ["真实保存数据", "仅 Supabase", "生产界面只显示真实登录用户创建或保存的记录。"],
        ["隐藏种子资料", "过滤输出", "除非显式开启测试模式，否则模拟资料不会出现在生产 UI。"],
        ["供给卡片", "身份层", "卡片描述一个人能提供什么，而不是他正在寻找什么。"],
        ["需求发布", "Find 层", "需求保持轻量自然，后续只接收真实匹配。"],
        ["消息系统", "关系层", "所有对话都通过统一的 Supabase 聊天流程创建。"],
        ["调试标签", "临时 QA", "稳定期显示真实来源与过滤种子数量，方便排查。"],
      ],
    },
    cta: {
      titleA: "准备好",
      titleB: "被找到了吗？",
      desc: "说出你的需求，AI 理解语境并找到合适的人。",
      primary: "免费开始使用",
      secondary: "了解工作原理",
    },
    footer: {
      desc: "基于意图的供需连接社交网络。让每一个需求都不被冷落。",
      cols: [
        ["产品", ["功能", "定价", "更新日志", "路线图"]],
        ["功能", ["AI 匹配", "跨语言翻译", "全球网络", "安全连接"]],
        ["公司", ["关于我们", "博客", "招聘", "媒体资源"]],
        ["支持", ["帮助中心", "联系我们", "隐私政策", "服务条款"]],
      ],
      privacy: "隐私政策",
      terms: "服务条款",
    },
  },
  ko: {
    meta: {
      title: "Finding — AI 기반 소셜 매칭",
      description: "Finding은 AI가 사람의 요청을 이해하고 도울 수 있는 사람과 연결해 주는 소셜 네트워크입니다.",
      ogDescription: "사람의 요청과 제공할 수 있는 가치를 자연어로 연결하는 글로벌 AI 소셜 네트워크.",
    },
    nav: {
      how: "작동 방식",
      features: "기능",
      stories: "이야기",
      about: "소개",
      signIn: "로그인",
      start: "시작하기",
      language: "랜딩 언어",
    },
    hero: {
      livePrefix: "전 세계에서",
      liveSuffix: "개의 요청이 지금 매칭되고 있습니다",
      titleA: "어떤 요청도",
      titleB: "그냥 흘러가지 않도록",
      bodyA: "Finding은 사람의 요청과 제공할 수 있는 가치를 연결하는 의도 기반 소셜 네트워크입니다.",
      bodyB: "필요한 것을 자연스럽게 말하면 AI가 맥락을 이해하고 잘 맞는 사람을 찾아줍니다.",
      primary: "시작하기",
      secondary: "작동 방식 보기",
      stats: ["활성 사용자", "매칭 만족도", "지원 언어", "놓친 요청"],
    },
    features: [
      ["AI 소셜 매칭", "자연스러운 의도를 이해합니다"],
      ["다국어 맥락", "글로벌 연결을 돕습니다"],
      ["요청이 계속 살아 있음", "오늘이 아니어도 나중에 발견될 수 있습니다"],
      ["안전한 연결", "대화는 사회적 맥락에서 시작됩니다"],
    ],
    how: {
      eyebrow: "작동 방식",
      titleA: "세 단계로",
      titleB: "맞는 사람 찾기",
      desc: "요청을 설명하면 AI가 의도를 이해하고 어울리는 사람을 연결합니다.",
      steps: [
        ["요청을 설명하세요", "분류나 필터 없이 자연스럽게 말하면 됩니다."],
        ["AI가 사회적 맥락을 읽습니다", "요청, 카드, 언어, 신호를 함께 비교합니다."],
        ["맥락 있는 대화를 시작하세요", "프로필과 호환성을 확인한 뒤 메시지를 보냅니다."],
      ],
    },
    global: {
      eyebrow: "실시간 글로벌 활동",
      titleA: "지금 전 세계가",
      titleB: "매칭되고 있습니다",
      stats: ["활성 요청", "국가", "% 매칭 성공률"],
    },
    useCases: {
      eyebrow: "활용 사례",
      titleA: "누가",
      cases: [
        ["크리에이터", "일러스트레이터, 사진가, 음악 프로듀서 찾기", "커뮤니티를 뒤질 필요 없이 필요한 협업자를 말하면 AI가 맞는 카드를 가진 사람을 찾습니다."],
        ["소셜 연결", "식사 친구, 여행 동행, 대화 상대 찾기", "요청이 생긴 순간 연결이 일어나고, 호환성과 번역이 흐름 안에 들어옵니다."],
        ["스타트업 팀", "개발자, 디자이너, 협업자 찾기", "진짜 요청을 자연어로 쓰면 AI가 공개된 아이덴티티 카드와 맞는 사람을 연결합니다."],
      ],
      preview: {
        need: "요청 #2841",
        matches: "실제 매칭",
        said: "방금 이렇게 말했어요",
        socialNeed: "오늘 저녁 7시 징안쓰 근처에서 초밥 같이 먹을 사람을 찾고 있어요 🍣",
        socialReply: "Finding이 잘 맞는 사람을 계속 찾고 자연스러운 소개를 준비합니다.",
        scanning: "전 세계를 확인하는 중...",
        candidates: "후보",
        joining: "잘 맞는 사람들이 실시간으로 들어오고 있습니다...",
      },
    },
    voices: {
      eyebrow: "사용자 이야기",
      titleA: "전 세계에서 온",
      titleB: "진짜 반응",
      items: [
        ["실제 저장 데이터", "Supabase 전용", "프로덕션 화면에는 실제 로그인 사용자가 만들거나 저장한 기록만 표시됩니다."],
        ["시드 프로필 숨김", "출력 필터링", "테스트 모드를 명시적으로 켜지 않으면 시뮬레이션 자료는 보이지 않습니다."],
        ["공급 카드", "아이덴티티 계층", "카드는 사용자가 무엇을 찾는지가 아니라 무엇을 제공할 수 있는지 설명합니다."],
        ["요청 게시", "Find 계층", "요청은 가볍고 자연스럽게 유지되며, 이후 실제 매칭만 받습니다."],
        ["메시지", "관계 계층", "모든 대화는 하나의 Supabase 채팅 흐름으로 생성됩니다."],
        ["디버그 라벨", "임시 QA", "안정화 중에는 실제 소스와 필터링된 시드 수를 표시합니다."],
      ],
    },
    cta: {
      titleA: "이제",
      titleB: "발견될 준비가 됐나요?",
      desc: "필요한 것을 말하면 AI가 맥락을 이해하고 잘 맞는 사람을 찾아줍니다.",
      primary: "무료로 시작하기",
      secondary: "작동 방식 보기",
    },
    footer: {
      desc: "사람의 요청과 제공할 수 있는 가치를 연결하는 의도 기반 소셜 네트워크입니다.",
      cols: [
        ["제품", ["기능", "가격", "변경 내역", "로드맵"]],
        ["기능", ["AI 매칭", "번역", "글로벌 네트워크", "안전한 연결"]],
        ["회사", ["소개", "블로그", "채용", "보도자료"]],
        ["지원", ["도움말", "문의", "개인정보 처리방침", "약관"]],
      ],
      privacy: "개인정보 처리방침",
      terms: "약관",
    },
  },
} as const;

type LandingCopy = typeof copy.en;

type LandingLanguageContextValue = {
  language: LandingLanguage;
  setLanguage: (language: LandingLanguage) => void;
  labels: Record<LandingLanguage, string>;
  copy: LandingCopy;
};

const LandingLanguageContext = createContext<LandingLanguageContextValue | null>(null);

export function LandingLanguageProvider({ children }: { children: ReactNode }) {
  const { language, setLanguage } = useStandaloneLandingLanguage();

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      labels,
      copy: copy[language] as LandingCopy,
    }),
    [language],
  );

  return (
    <LandingLanguageContext.Provider value={value}>{children}</LandingLanguageContext.Provider>
  );
}

export function useStandaloneLandingLanguage() {
  const [language, setLanguageState] = useState<LandingLanguage>(readLandingLanguage);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === LANDING_LANGUAGE_KEY) {
        setLanguageState(sanitizeLandingLanguage(event.newValue));
      }
    };
    const onCustom = (event: Event) => {
      setLanguageState(sanitizeLandingLanguage((event as CustomEvent<string>).detail));
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(LANDING_LANGUAGE_CHANGED_EVENT, onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LANDING_LANGUAGE_CHANGED_EVENT, onCustom as EventListener);
    };
  }, []);

  const setLanguage = (next: LandingLanguage) => {
    const normalized = sanitizeLandingLanguage(next);
    setLanguageState(normalized);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANDING_LANGUAGE_KEY, normalized);
      window.dispatchEvent(new CustomEvent(LANDING_LANGUAGE_CHANGED_EVENT, { detail: normalized }));
    }
  };

  return { language, setLanguage, labels, copy: copy[language] as LandingCopy };
}

export function useLandingLanguage() {
  const ctx = useContext(LandingLanguageContext);
  if (!ctx) {
    return {
      language: "en" as LandingLanguage,
      setLanguage: () => {},
      labels,
      copy: copy.en as LandingCopy,
    };
  }
  return ctx;
}
