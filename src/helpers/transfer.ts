// Dependencies
import { Telegraf, ContextMessageUpdate } from 'telegraf'
import { IUser, getUser, getUserInfo } from '../models/user'
import { isReply } from './middleware'

export function setupTransfer(bot: Telegraf<ContextMessageUpdate>) {
  bot.hears(/./g, isReply, checkTransfer)
  bot.on('sticker', isReply, checkTransfer)
}

export class TransferError extends Error {
  type = 'TransferError'
  message = 'Произошла ошибка при переводе Вирускоинов'
}

export class NotEnoughCoinsError extends TransferError {
  type = 'NotEnoughCoinsError'
  message =
    'Прошу прощения, но у пользователя недостаточно Вирускоинов для этого перевода'
}

export class SendSelfError extends TransferError {
  type = 'SendSelfError'
  message = `*Во имя любви*, попробуйте лучше поделиться Вирускоинами с собеседниками!`
}

export async function transfer(sender: IUser, receiver: IUser, amount: number) {
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

function isMinter(user: IUser) {
  // Check if minter
  return [576942226].indexOf(user.chatId) > -1
}

async function mint(user: IUser, amount: number) {
  // Add balance to user
  user.balance += amount
  return user.save()
}

async function checkTransfer(ctx: ContextMessageUpdate) {
  // Check if sticker
  let amount = 0
  if (ctx.message && ctx.message.sticker && ctx.message.sticker.emoji) {
    const allowedEmoji = ['🦠', '☣️', '👑']
    let allowed = false
    allowedEmoji.forEach(e => {
      if (ctx.message.sticker.emoji.indexOf(e) > -1) {
        allowed = true
      }
    })
    if (allowed) {
      amount = 1
    } else {
      return
    }
  } else if (ctx.message && ctx.message.text) {
    // Get number of coins to send
    amount = (ctx.message.text.match(/\+/g) || []).length
    const heartAmount = contains(ctx.message.text, '🦠')
    const emojiAmount = contains(ctx.message.text, '☣️')
    const bowlAmount = contains(ctx.message.text, '👑')

    amount = amount + heartAmount + emojiAmount + bowlAmount
    // Check amount
    if (!amount) return
  } else {
    return
  }
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
    // Check silent
    const chat = await getUser(ctx.chat.id)
    if (chat.silent) {
      return
    }
    // Reply
    const text = senderIsMinter
      ? `*${amount}* Вирускоинов было волшебным образом создано для *${receiverInfo.name}*. Всего у *${receiverInfo.name}* ${receiverInfo.balance} Вирускоинов.`
      : `*${amount}* Вирускоинов было подарено *${receiverInfo.name}*. Всего у *${receiverInfo.name}* ${receiverInfo.balance} Вирускоинов.`
    await ctx.replyWithMarkdown(text, {
      reply_to_message_id: ctx.message.message_id,
    })
  } catch (err) {
    await ctx.replyWithMarkdown(err.message, {
      reply_to_message_id: ctx.message.message_id,
    })
    return
  }
}

function contains(str: string, substr: string) {
  return str.split(substr).length - 1
}
