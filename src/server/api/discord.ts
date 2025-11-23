import { FlowWithUser } from "~/hooks/flows";

export const callFlowRunDiscordWebhook = async (flow: FlowWithUser) => {
  if (process.env.DISCORD_FLOW_RUN_WEBHOOK_URL != null && flow) {
    const authorName =
      `${flow.user.firstName || ""} ${flow.user.lastName || ""}`.trim() ||
      "Anonymous";
    await fetch(process.env.DISCORD_FLOW_RUN_WEBHOOK_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: "🚀 Flow Run",
            description: `**${flow.name}** created by **${authorName}** was run`,
            color: 0x51a2ff,
            image: {
              url: flow.thumbnail,
            },
            footer: {
              text: `${flow.runs} run${flow.runs === 1 ? "" : "s"}`,
              icon_url: flow.user.imageUrl,
            },
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  }
};
