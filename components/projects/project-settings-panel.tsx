"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ProjectSettingsPanelProps = {
  projectId: string;
  projectName: string;
  marketplace: string;
  channels: Array<{
    type: "INBOX" | "FEISHU" | "WECOM" | "EMAIL";
    enabled: boolean;
    webhookUrl: string | null;
    email: string | null;
  }>;
};

function getChannel(
  channels: ProjectSettingsPanelProps["channels"],
  type: ProjectSettingsPanelProps["channels"][number]["type"]
) {
  return channels.find((item) => item.type === type) ?? null;
}

function SettingSection({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-headline text-xl font-semibold text-[var(--md-on-surface)]">{title}</h2>
        {description ? <p className="mt-1 font-label text-sm text-[var(--md-on-surface-variant)]">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function SettingCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)]">
      {children}
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
  bordered = true
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  bordered?: boolean;
}) {
  return (
    <div className={`grid gap-4 px-6 py-5 md:grid-cols-[220px_minmax(0,1fr)] ${bordered ? "border-b border-[var(--md-outline-variant)]" : ""}`}>
      <div>
        <p className="font-label text-sm font-medium text-[var(--md-on-surface)]">{label}</p>
        {description ? <p className="mt-1 font-label text-sm text-[var(--md-on-surface-variant)]">{description}</p> : null}
      </div>
      <div>{children}</div>
    </div>
  );
}

function ChannelToggle({
  enabled,
  onChange
}: {
  enabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative h-7 w-12 rounded-full border transition-colors ${
        enabled
          ? "border-[var(--md-primary)]/40 bg-[var(--md-primary)]/20"
          : "border-[var(--md-outline-variant)] bg-[var(--md-surface-container-high)]"
      }`}
      aria-pressed={enabled}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full transition-transform ${
          enabled
            ? "left-6 bg-[var(--md-primary)]"
            : "left-1 bg-[var(--md-outline)]"
        }`}
      />
    </button>
  );
}

export function ProjectSettingsPanel({
  projectId,
  projectName,
  marketplace,
  channels
}: ProjectSettingsPanelProps) {
  const router = useRouter();
  const [name, setName] = useState(projectName);
  const [feishuEnabled, setFeishuEnabled] = useState(getChannel(channels, "FEISHU")?.enabled ?? false);
  const [feishuWebhookUrl, setFeishuWebhookUrl] = useState(getChannel(channels, "FEISHU")?.webhookUrl ?? "");
  const [wecomEnabled, setWecomEnabled] = useState(getChannel(channels, "WECOM")?.enabled ?? false);
  const [wecomWebhookUrl, setWecomWebhookUrl] = useState(getChannel(channels, "WECOM")?.webhookUrl ?? "");
  const [emailEnabled, setEmailEnabled] = useState(getChannel(channels, "EMAIL")?.enabled ?? false);
  const [emailAddress, setEmailAddress] = useState(getChannel(channels, "EMAIL")?.email ?? "");
  const [savingProjectName, setSavingProjectName] = useState(false);
  const [savingChannel, setSavingChannel] = useState<null | "FEISHU" | "WECOM" | "EMAIL">(null);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function saveProjectName() {
    setSavingProjectName(true);
    setMessage(null);

    const response = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() })
    });

    setSavingProjectName(false);
    if (response.ok) {
      setMessage("项目名称已更新");
      router.refresh();
      return;
    }

    setMessage("项目名称更新失败");
  }

  async function saveChannels(nextState?: {
    feishuEnabled?: boolean;
    wecomEnabled?: boolean;
    emailEnabled?: boolean;
  }) {
    const nextFeishuEnabled = nextState?.feishuEnabled ?? feishuEnabled;
    const nextWecomEnabled = nextState?.wecomEnabled ?? wecomEnabled;
    const nextEmailEnabled = nextState?.emailEnabled ?? emailEnabled;

    const activeType = nextState?.feishuEnabled !== undefined
      ? "FEISHU"
      : nextState?.wecomEnabled !== undefined
        ? "WECOM"
        : "EMAIL";

    setSavingChannel(activeType);
    setMessage(null);

    const response = await fetch(`/api/projects/${projectId}/notification-channels`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channels: [
          { type: "INBOX", enabled: true },
          { type: "FEISHU", enabled: nextFeishuEnabled, webhookUrl: feishuWebhookUrl.trim() || null },
          { type: "WECOM", enabled: nextWecomEnabled, webhookUrl: wecomWebhookUrl.trim() || null },
          { type: "EMAIL", enabled: nextEmailEnabled, email: emailAddress.trim() || null }
        ]
      })
    });

    setSavingChannel(null);
    if (!response.ok) {
      setMessage("渠道更新失败");
      return false;
    }

    setFeishuEnabled(nextFeishuEnabled);
    setWecomEnabled(nextWecomEnabled);
    setEmailEnabled(nextEmailEnabled);
    setMessage("渠道已更新");
    router.refresh();
    return true;
  }

  async function removeProject() {
    if (!window.confirm("删除项目会先解除 Sorftime 订阅，再删除本地历史数据。确认继续吗？")) return;
    setDeleting(true);
    setMessage(null);
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    setDeleting(false);
    if (res.ok) {
      router.push("/projects");
    } else {
      setMessage(data?.error ?? "删除项目失败");
    }
  }

  return (
    <div className="space-y-10">
      <SettingSection
        title="基础设置"
        description="查看项目基本信息，并管理通知与生命周期。"
      >
        <SettingCard>
          <SettingRow label="项目名称" description="显示在项目页和导航中。">
            <div className="flex gap-3">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-dim)] px-4 font-label text-sm text-[var(--md-on-surface)] transition focus:border-[var(--md-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--md-primary)]"
              />
              <button
                type="button"
                onClick={saveProjectName}
                disabled={savingProjectName || name.trim().length < 2 || name.trim() === projectName}
                className="rounded-xl border border-[var(--md-outline-variant)] px-4 font-label text-sm text-[var(--md-on-surface)] transition hover:bg-[var(--md-surface-container-high)] disabled:opacity-50"
              >
                {savingProjectName ? "保存中..." : "更新"}
              </button>
            </div>
          </SettingRow>
          <SettingRow label="站点" description="当前项目关联的市场范围。" bordered={false}>
            <input
              value={marketplace}
              readOnly
              className="h-11 w-full rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-dim)] px-4 font-label text-sm text-[var(--md-on-surface)]"
            />
          </SettingRow>
        </SettingCard>
      </SettingSection>

      <SettingSection
        title="通知渠道"
        description="配置日报和告警要发送到哪里。"
      >
        <SettingCard>
          <SettingRow label="飞书" description="将日报和告警发送到飞书机器人。">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-label text-sm text-[var(--md-on-surface-variant)]">Webhook 投递</p>
                <ChannelToggle
                  enabled={feishuEnabled}
                  onChange={(next) => {
                    void saveChannels({ feishuEnabled: next });
                  }}
                />
              </div>
              <input
                type="url"
                value={feishuWebhookUrl}
                onChange={(e) => setFeishuWebhookUrl(e.target.value)}
                placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                className="h-11 w-full rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-dim)] px-4 font-mono text-sm text-[var(--md-on-surface)] transition focus:border-[var(--md-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--md-primary)]"
              />
              {savingChannel === "FEISHU" ? <p className="font-label text-xs text-[var(--md-on-surface-variant)]">更新中...</p> : null}
            </div>
          </SettingRow>

          <SettingRow label="企业微信" description="将日报和告警发送到企业微信机器人。">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-label text-sm text-[var(--md-on-surface-variant)]">Webhook 投递</p>
                <ChannelToggle
                  enabled={wecomEnabled}
                  onChange={(next) => {
                    void saveChannels({ wecomEnabled: next });
                  }}
                />
              </div>
              <input
                type="url"
                value={wecomWebhookUrl}
                onChange={(e) => setWecomWebhookUrl(e.target.value)}
                placeholder="输入企业微信机器人 Webhook 地址"
                className="h-11 w-full rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-dim)] px-4 font-mono text-sm text-[var(--md-on-surface)] transition focus:border-[var(--md-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--md-primary)]"
              />
              {savingChannel === "WECOM" ? <p className="font-label text-xs text-[var(--md-on-surface-variant)]">更新中...</p> : null}
            </div>
          </SettingRow>

          <SettingRow label="电子邮件" description="将日报发送到指定邮箱。">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-label text-sm text-[var(--md-on-surface-variant)]">邮件投递</p>
                <ChannelToggle
                  enabled={emailEnabled}
                  onChange={(next) => {
                    void saveChannels({ emailEnabled: next });
                  }}
                />
              </div>
              <input
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="director@company.com"
                className="h-11 w-full rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-dim)] px-4 font-mono text-sm text-[var(--md-on-surface)] transition focus:border-[var(--md-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--md-primary)]"
              />
              {savingChannel === "EMAIL" ? <p className="font-label text-xs text-[var(--md-on-surface-variant)]">更新中...</p> : null}
            </div>
          </SettingRow>
        </SettingCard>
      </SettingSection>

      <SettingSection
        title="运行规则"
        description="日报会跟随采集节奏自动生成，并在有可用渠道时发送。"
      >
        <SettingCard>
          <SettingRow label="日报生成" description="系统会在每日采集完成后生成摘要。">
            <div className="rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-dim)] px-4 py-3 font-label text-sm text-[var(--md-on-surface)]">
              UTC+8 06:00
            </div>
          </SettingRow>
          <SettingRow label="外部投递" description="已配置渠道会在生成后立即接收日报。" bordered={false}>
            <div className="rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-dim)] px-4 py-3 font-label text-sm text-[var(--md-on-surface)]">
              UTC+8 07:00
            </div>
          </SettingRow>
        </SettingCard>
      </SettingSection>

      <SettingSection
        title="危险操作"
        description="以下操作不可撤销，请谨慎处理。"
      >
        <SettingCard>
          <SettingRow
            label="删除项目"
            description="删除项目和项目历史数据。"
            bordered={false}
          >
            <div className="flex justify-end">
              <button
                onClick={removeProject}
                disabled={deleting || savingProjectName || savingChannel !== null}
                className="rounded-xl border border-[var(--md-error)]/30 bg-[var(--md-error)]/10 px-5 py-2.5 font-label text-sm font-semibold text-[var(--md-error)] transition hover:bg-[var(--md-error)]/15 disabled:opacity-60"
              >
                {deleting ? "删除中..." : "删除项目"}
              </button>
            </div>
          </SettingRow>
        </SettingCard>
      </SettingSection>

      {message ? <p className="font-label text-sm text-[var(--md-primary)]">{message}</p> : null}
    </div>
  );
}
