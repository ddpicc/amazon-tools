import Link from "next/link";
import { Surface } from "@/components/projects/project-workspace-shell";

function StepList({ items }: { items: string[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item, index) => (
        <li key={item} className="flex gap-3 text-sm leading-6 text-[var(--md-on-surface)]">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--md-primary)]/15 font-label text-xs font-semibold text-[var(--md-primary)]">
            {index + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

export default function WebhookGuidePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className="font-label text-xs uppercase tracking-[0.2em] text-[var(--md-primary)]">Notification setup</p>
        <h1 className="font-headline mt-3 text-3xl font-bold tracking-tight text-[var(--md-on-surface)]">
          Webhook 获取指南
        </h1>
        <p className="mt-2 max-w-3xl font-label text-sm text-[var(--md-on-surface-variant)]">
          这里说明如何获取飞书和企业微信机器人 Webhook 地址，并填写到 Sellumio 的通知渠道设置中。
        </p>
      </div>

      <Surface>
        <h2 className="font-headline text-xl font-semibold text-[var(--md-on-surface)]">填写前先确认</h2>
        <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--md-on-surface)]">
          <p>Sellumio 目前使用的是群机器人 Webhook，用于把日报和告警直接推送到群聊。</p>
          <p>你需要准备一个能接收通知的群，然后在群里添加机器人，并复制对应的 Webhook 地址。</p>
          <p>复制后回到项目设置页，粘贴到“飞书”或“企业微信”的 Webhook 输入框中，再打开开关即可。</p>
        </div>
      </Surface>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Surface>
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-headline text-xl font-semibold text-[var(--md-on-surface)]">飞书 Webhook</h2>
            <Link
              href="https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot"
              target="_blank"
              rel="noreferrer"
              className="font-label text-sm text-[var(--md-primary)] hover:underline"
            >
              官方文档
            </Link>
          </div>
          <div className="mt-5">
            <StepList
              items={[
                "打开一个需要接收通知的飞书群聊，点击群设置或群管理入口。",
                "在群机器人相关入口中添加自定义机器人；如果页面提示配置安全策略，可以按需设置关键词、IP 白名单或签名。",
                "创建完成后，复制机器人提供的 Webhook 地址。常见格式是 https://open.feishu.cn/open-apis/bot/v2/hook/...",
                "回到 Sellumio 项目设置页，在“通知渠道 > 飞书”中粘贴该地址，并打开开关。"
              ]}
            />
          </div>
          <div className="mt-5 rounded-2xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
            <p className="font-label text-sm font-medium text-[var(--md-on-surface)]">注意事项</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--md-on-surface-variant)]">
              <li>建议优先使用 `v2` 版本 Webhook。</li>
              <li>如果开启了关键词校验，需要确保机器人允许接收你要发送的告警或日报内容。</li>
              <li>如果机器人被移出群，之前复制的地址会失效，需要重新生成并更新。</li>
            </ul>
          </div>
        </Surface>

        <Surface>
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-headline text-xl font-semibold text-[var(--md-on-surface)]">企业微信 Webhook</h2>
          </div>
          <div className="mt-5">
            <StepList
              items={[
                "打开一个需要接收通知的企业微信群，进入群管理或聊天信息页面。",
                "找到“添加群机器人”或“群机器人”入口，新建一个机器人并设置名称。",
                "创建完成后复制机器人提供的 Webhook 地址。常见格式包含 key 参数，例如 https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...",
                "回到 Sellumio 项目设置页，在“通知渠道 > 企业微信”中粘贴该地址，并打开开关。"
              ]}
            />
          </div>
          <div className="mt-5 rounded-2xl border border-[var(--md-outline-variant)]/50 bg-[var(--md-surface-container-lowest)] p-4">
            <p className="font-label text-sm font-medium text-[var(--md-on-surface)]">注意事项</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--md-on-surface-variant)]">
              <li>通常只有该群的成员才能添加或查看群机器人。</li>
              <li>Webhook 地址里带有唯一 key，不要公开发到外部文档或聊天群。</li>
              <li>如果机器人被删除或群被解散，需要重新创建并更新地址。</li>
            </ul>
          </div>
        </Surface>
      </div>

      <Surface>
        <h2 className="font-headline text-xl font-semibold text-[var(--md-on-surface)]">回到 Sellumio 如何填写</h2>
        <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--md-on-surface)]">
          <p>1. 进入对应项目的 <span className="font-semibold">Settings</span> 页面。</p>
          <p>2. 在 <span className="font-semibold">通知渠道</span> 区块找到飞书或企业微信输入框。</p>
          <p>3. 粘贴 Webhook 地址。</p>
          <p>4. 打开右侧开关保存。</p>
          <p>5. 后续日报和告警会按项目配置推送到对应群聊。</p>
        </div>
      </Surface>
    </div>
  );
}
