// Dependencies
import { Telegraf, ContextMessageUpdate } from 'telegraf'
import { Response } from 'express'
import { User } from '../src/models/user'

declare global {
  namespace Express {
    interface Response {
      bot: Telegraf<ContextMessageUpdate>,
      user: User,
    }
  }
}  