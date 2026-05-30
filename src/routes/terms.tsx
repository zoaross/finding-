import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout, LegalSection } from "@/components/legal/LegalLayout";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "服务条款 — Finding." },
      {
        name: "description",
        content: "Finding 服务条款:了解使用 Finding 平台的权利、义务与规则。",
      },
      { property: "og:title", content: "服务条款 — Finding." },
      {
        property: "og:description",
        content: "Finding 服务条款:了解使用 Finding 平台的权利、义务与规则。",
      },
    ],
  }),
});

function TermsPage() {
  return (
    <LegalLayout
      title="Finding 服务条款"
      subtitle="使用 Finding 即表示你同意以下条款。"
      updatedAt="2026 年 4 月 28 日"
    >
      <LegalSection number="1" title="接受条款">
        <p>使用 Finding 即表示你同意本服务条款。如不同意,请停止使用本服务。</p>
      </LegalSection>

      <LegalSection number="2" title="服务描述">
        <p>
          Finding 是一个基于 AI 意图匹配的全球供需连接平台。我们帮助用户发布需求并匹配最合适的人,但不介入双方的实际交易、价格或合作内容。
        </p>
      </LegalSection>

      <LegalSection number="3" title="用户资格">
        <ul className="ml-5 list-disc space-y-1">
          <li>年满 18 岁方可注册使用</li>
          <li>每人只能注册一个账号</li>
          <li>必须提供真实有效的邮箱地址</li>
        </ul>
      </LegalSection>

      <LegalSection number="4" title="用户行为准则">
        <p>使用 Finding 时,你不得:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>发布虚假、欺骗性或误导性的需求或身份信息</li>
          <li>骚扰、威胁或伤害其他用户</li>
          <li>发布违法、色情、歧视性内容</li>
          <li>尝试绕过平台的匹配和聊天机制</li>
          <li>未经授权收集其他用户的个人信息</li>
        </ul>
      </LegalSection>

      <LegalSection number="5" title="AI 匹配机制">
        <p>
          Finding 使用 AI 技术理解用户需求并进行匹配。AI 匹配结果仅供参考,Finding 不对匹配结果的准确性或合适性作出保证。
        </p>
      </LegalSection>

      <LegalSection number="6" title="平台角色">
        <p>
          Finding 仅作为连接平台,不参与用户之间的任何交易、合作或协议。用户之间的纠纷由用户自行解决,Finding 不承担责任。
        </p>
      </LegalSection>

      <LegalSection number="7" title="内容所有权">
        <p>
          用户发布的需求和身份信息归用户所有。通过发布内容,用户授权 Finding 在平台内展示和用于 AI 匹配。
        </p>
      </LegalSection>

      <LegalSection number="8" title="账号管理">
        <ul className="ml-5 list-disc space-y-1">
          <li>用户可随时删除账号</li>
          <li>Finding 保留因违反条款封禁账号的权利</li>
          <li>账号不可转让</li>
        </ul>
      </LegalSection>

      <LegalSection number="9" title="服务变更">
        <p>
          Finding 保留随时修改、暂停或终止服务的权利,重大变更将提前通知用户。
        </p>
      </LegalSection>

      <LegalSection number="10" title="免责声明">
        <p>
          Finding 按"现状"提供服务,不对服务的持续可用性、准确性或完整性作出保证。
        </p>
      </LegalSection>

      <LegalSection number="11" title="适用法律">
        <p>本条款受大韩民国法律管辖,争议提交韩国首尔法院解决。</p>
      </LegalSection>

      <LegalSection number="12" title="联系我们">
        <p>
          <a
            className="text-accent underline-offset-2 hover:underline"
            href="mailto:support@finding.app"
          >
            support@finding.app
          </a>
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
