import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout, LegalSection } from "@/components/legal/LegalLayout";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "隐私政策 — Finding." },
      {
        name: "description",
        content: "Finding 隐私政策:我们如何收集、使用和保护你的个人信息。",
      },
      { property: "og:title", content: "隐私政策 — Finding." },
      {
        property: "og:description",
        content: "Finding 隐私政策:我们如何收集、使用和保护你的个人信息。",
      },
    ],
  }),
});

function PrivacyPage() {
  return (
    <LegalLayout
      title="Finding 隐私政策"
      subtitle="我们重视你的隐私。本政策说明 Finding 如何收集、使用与保护你的信息。"
      updatedAt="2026 年 4 月 28 日"
    >
      <LegalSection number="1" title="我们收集哪些信息">
        <p className="font-medium text-foreground">你主动提供的信息:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>邮箱地址(注册时)</li>
          <li>用户名、头像、个人简介</li>
          <li>身份卡内容(技能、兴趣等)</li>
          <li>发布的需求内容</li>
          <li>聊天消息内容</li>
          <li>对匹配和合作的评价</li>
        </ul>
        <p className="mt-3 font-medium text-foreground">自动收集的信息:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>登录时间和频率</li>
          <li>页面访问记录</li>
          <li>设备类型和浏览器信息</li>
          <li>IP 地址和大致地理位置</li>
        </ul>
      </LegalSection>

      <LegalSection number="2" title="我们如何使用你的信息">
        <ul className="ml-5 list-disc space-y-1">
          <li>提供服务:AI 匹配、需求展示、聊天功能</li>
          <li>改善服务:分析使用模式,优化匹配算法</li>
          <li>安全保护:检测和防止违规行为</li>
          <li>通知推送:匹配通知、唤醒通知、系统消息</li>
        </ul>
      </LegalSection>

      <LegalSection number="3" title="AI 匹配与数据处理">
        <p>
          你发布的需求内容会被发送至 Claude AI(Anthropic)进行意图分析和匹配处理。我们不会将你的个人身份信息与 AI 处理过程关联。
        </p>
      </LegalSection>

      <LegalSection number="4" title="信息共享">
        <p>我们不会出售你的个人信息。仅在以下情况共享:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            <strong className="text-foreground">匹配用户之间:</strong>匹配成功后双方可看到对方的公开身份卡信息
          </li>
          <li>
            <strong className="text-foreground">法律要求:</strong>依法律要求或政府机构合法请求
          </li>
          <li>
            <strong className="text-foreground">服务提供商:</strong>Supabase(数据库存储)、Anthropic(AI 处理)
          </li>
        </ul>
      </LegalSection>

      <LegalSection number="5" title="数据存储">
        <p>
          你的数据存储在 Supabase 平台(亚太地区服务器)。我们采取合理的技术措施保护你的数据安全。
        </p>
      </LegalSection>

      <LegalSection number="6" title="数据保留">
        <ul className="ml-5 list-disc space-y-1">
          <li>活跃账号数据:持续保留</li>
          <li>删除账号后:30 天内完全删除</li>
          <li>聊天记录:用户可随时删除</li>
        </ul>
      </LegalSection>

      <LegalSection number="7" title="你的权利">
        <p>你有权:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>访问你的个人数据</li>
          <li>更正不准确的信息</li>
          <li>删除你的账号和数据</li>
          <li>导出你的数据</li>
          <li>撤回对数据处理的同意</li>
        </ul>
        <p className="mt-2">
          行使权利请联系:{" "}
          <a
            className="text-accent underline-offset-2 hover:underline"
            href="mailto:privacy@finding.app"
          >
            privacy@finding.app
          </a>
        </p>
      </LegalSection>

      <LegalSection number="8" title="Cookie">
        <p>
          Finding 使用必要的 Cookie 维持登录状态。我们不使用追踪或广告 Cookie。
        </p>
      </LegalSection>

      <LegalSection number="9" title="未成年人">
        <p>Finding 不面向 18 岁以下用户。如发现未成年人账号,我们将立即删除。</p>
      </LegalSection>

      <LegalSection number="10" title="政策更新">
        <p>隐私政策变更时我们会通过邮件或应用内通知告知用户。</p>
      </LegalSection>

      <LegalSection number="11" title="联系我们">
        <p>
          <a
            className="text-accent underline-offset-2 hover:underline"
            href="mailto:privacy@finding.app"
          >
            privacy@finding.app
          </a>
        </p>
        <p>韩国首尔市 Finding Inc.</p>
      </LegalSection>
    </LegalLayout>
  );
}
