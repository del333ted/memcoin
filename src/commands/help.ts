// Dependencies
import { Telegraf, ContextMessageUpdate } from 'telegraf'

// Help command
export function setupHelp(bot: Telegraf<ContextMessageUpdate>) {
  bot.command(['start', 'help'], (ctx: any) => {
    // Prepare text
    const text = `Здравствуйте! Это бот, наполненный вирусами.\n\n/help — это сообщение\n/balance — сколько у вас вирусов\n/leaderboard — топ вирусов\n/silent — включить или выключить сообщения о переводах в этом чате\n\nЕсли вы хотите отправить кому-то свои вирусы, просто ответьте на сообщение человеку плюсом или вирусом, сколько будет плюсов или вирусов, столько вирусов и придет получателю.\n\n*All you need is virus!*`
    // Reply
    ctx.replyWithMarkdown(text)
  })
}
