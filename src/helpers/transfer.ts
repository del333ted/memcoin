// Dependencies
import { Telegraf, ContextMessageUpdate } from 'telegraf'
import { User, getUser, getUserInfo } from '../models/user'
import { getName } from './name'
import { isReply } from './middleware'

export function setupTransfer(bot: Telegraf<ContextMessageUpdate>) {
  bot.hears(/\+/g, isReply, checkTransfer)
}

export class TransferError extends Error {
  type = 'TransferError'
  message = 'Произошла ошибка при переводе мемкоинов'
}

export class NotEnoughCoinsError extends TransferError {
  type = 'NotEnoughCoinsError'
  message = 'Сорямба, у пользователя недостаточно Мемкоинов для этого перевода'
}

export class SendSelfError extends TransferError {
  type = 'SendSelfError'
  message = `*Во имя Мемриарха*, астанавись! Сами себе коины тут кидают, мне работать нужно, а ведь у меня обед скоро! А ну, *пшел вон, пес*!`
}

export async function transfer(sender: User, receiver: User, amount: number) {
  // Check if receiver is not the same as sender
  if (receiver.chatId === sender.chatId) throw new SendSelfError()
  // Check if enough balance
  if (sender.balance < amount) throw new NotEnoughCoinsError()
  // Remove balance from sender
  sender.balance -= amount
  sender = await sender.save()
  // Add balance to receiver
  receiver.balance += amount
  receiver = await receiver.save()
}

function isMinter(user: User) {
  // Check if minter
  return [249626104, 76104711, 80523220].indexOf(user.chatId) > -1
}

async function mint(user: User, amount: number) {
  // Add balance to user
  user.balance += amount
  return user.save()
}

async function checkTransfer(ctx: ContextMessageUpdate) {
  // Get number of coins to send
  const amount = (ctx.message.text.match(/\+/g) || []).length
  // Check amount
  if (!amount) return
  // Get sender
  let sender = await getUser(ctx.from.id)
  // Get receiver
  const receiver = await getUser(ctx.message.reply_to_message.from.id)
  try {
    // If minter, mint the coins first
    const senderIsMinter = isMinter(sender)
    if (senderIsMinter) {
      sender = await mint(sender, amount)
    }
    // Transfer coins
    await transfer(sender, receiver, amount)
    // Get receiver info
    const receiverInfo = await getUserInfo(ctx.telegram, receiver)
    // Reply
    const text = senderIsMinter ?
      `*${amount}* Мемкоинов было выдано гаражанину *${receiverInfo.name}*` :
      `*${amount}* Мемкоинов было переведено гаражанину *${receiverInfo.name}*`
    await ctx.replyWithMarkdown(text, {
      reply_to_message_id: ctx.message.message_id,
    })
  } catch (err) {
    await ctx.reply(err.message, {
      reply_to_message_id: ctx.message.message_id,
    })
    return
  }
}