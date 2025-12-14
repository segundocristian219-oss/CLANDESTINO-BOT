import { smsg } from "./lib/simple.js"
import { fileURLToPath } from "url"
import path, { join } from "path"
import fs, { unwatchFile, watchFile } from "fs"
import chalk from "chalk"
import ws from "ws"

const isNumber = x => typeof x === "number" && !isNaN(x)
const delay = ms => isNumber(ms) && new Promise(r => setTimeout(r, ms))

export async function handler(chatUpdate) {
  this.msgqueque ||= []
  this.uptime ||= Date.now()
  if (!chatUpdate?.messages?.length) return

  this.pushMessage(chatUpdate.messages).catch(console.error)
  let m = chatUpdate.messages.at(-1)
  if (!m?.key?.id) return

  global.processedMessages ||= new Set()
  if (global.processedMessages.has(m.key.id)) return
  global.processedMessages.add(m.key.id)
  setTimeout(() => global.processedMessages.delete(m.key.id), 60000)

  if (m.key.fromMe) return
  if (!global.db.data) await global.loadDatabase()

  try {
    m = smsg(this, m)
    if (!m) return
    m.exp = 0

    // ───── Usuario ─────
    let user = global.db.data.users[m.sender]
    if (!user) {
      user = global.db.data.users[m.sender] = {
        name: m.name || "",
        exp: 0,
        premium: false,
        premiumTime: 0,
        banned: false,
        bannedReason: "",
        commands: 0,
        afk: -1,
        afkReason: "",
        warn: 0
      }
    }

    if (m.pushName && m.pushName !== user.name) {
      user.name = m.pushName
    }

    // ───── Chat ─────
    let chat = global.db.data.chats[m.chat]
    if (!chat) {
      chat = global.db.data.chats[m.chat] = {
        isBanned: false,
        isMute: false,
        welcome: false,
        sWelcome: "",
        sBye: "",
        detect: true,
        primaryBot: null,
        modoadmin: false,
        antiLink: true,
        nsfw: false
      }
    }

    // ───── Settings ─────
    let settings = global.db.data.settings[this.user.jid]
    if (!settings) {
      settings = global.db.data.settings[this.user.jid] = {
        self: false,
        restrict: true,
        jadibotmd: true,
        antiPrivate: false,
        gponly: false
      }
    }

    const isROwner = [...global.owner]
      .map(v => v.replace(/\D/g, "") + "@lid")
      .includes(m.sender)

    const isOwner = isROwner || m.fromMe
    const isPrems = isROwner || user.premium

    if (settings.self && !isOwner) return
    if (settings.gponly && !isOwner && !m.isGroup) return
    if (m.isBaileys) return

    let participants = []
    let groupMetadata = {}
    let isAdmin = false
    let isRAdmin = false
    let isBotAdmin = false

    if (m.isGroup) {
      try {
        global.groupCache ||= new Map()
        const cached = global.groupCache.get(m.chat)

        if (cached && Date.now() - cached.time < 60_000) {
          groupMetadata = cached.data
        } else {
          groupMetadata = await this.groupMetadata(m.chat)
          global.groupCache.set(m.chat, { data: groupMetadata, time: Date.now() })
        }

        participants = groupMetadata.participants || []

        let userP, botP
        for (const p of participants) {
          if (p.id === m.sender) userP = p
          else if (p.id === this.user.jid) botP = p
          if (userP && botP) break
        }

        isRAdmin = userP?.admin === "superadmin" || m.sender === groupMetadata.owner
        isAdmin = isRAdmin || userP?.admin === "admin"
        isBotAdmin = botP?.admin === "admin" || botP?.admin === "superadmin"
      } catch (e) {
        console.error("Group error:", e)
      }
    }

    // ───── Plugins ALL ─────
    const __dirname = join(path.dirname(fileURLToPath(import.meta.url)), "plugins")

    for (const name in global.plugins) {
      const plugin = global.plugins[name]
      if (!plugin || plugin.disabled) continue

      if (typeof plugin.all === "function") {
        try {
          await plugin.all.call(this, m, {
            chatUpdate,
            user,
            chat,
            settings
          })
        } catch (e) {
          console.error(e)
        }
      }
    }

    // ───── Plugins COMMAND ─────
    for (const name in global.plugins) {
      const plugin = global.plugins[name]
      if (!plugin || plugin.disabled || typeof plugin !== "function") continue

      if (!plugin._prefixRegex) {
        const p = plugin.customPrefix || global.prefix
        plugin._prefixRegex = p instanceof RegExp ? p : new RegExp("^" + p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      }

      const match = plugin._prefixRegex.exec(m.text)
      if (!match) continue

      let [cmd, ...args] = m.text.slice(match[0].length).trim().split(/\s+/)
      cmd = (cmd || "").toLowerCase()

      const isAccept = plugin.command instanceof RegExp
        ? plugin.command.test(cmd)
        : Array.isArray(plugin.command)
        ? plugin.command.includes(cmd)
        : plugin.command === cmd

      if (!isAccept) continue

      if (chat.modoadmin && m.isGroup && !isAdmin && !isOwner) return
      if (plugin.owner && !isOwner) return global.dfail("owner", m, this)
      if (plugin.premium && !isPrems) return global.dfail("premium", m, this)
      if (plugin.group && !m.isGroup) return global.dfail("group", m, this)
      if (plugin.botAdmin && !isBotAdmin) return global.dfail("botAdmin", m, this)
      if (plugin.admin && !isAdmin) return global.dfail("admin", m, this)
      if (plugin.private && m.isGroup) return global.dfail("private", m, this)

      m.isCommand = true
      m.exp = 1
      user.commands++

      try {
        await plugin.call(this, m, {
          command: cmd,
          args,
          text: args.join(" "),
          conn: this,
          participants,
          groupMetadata,
          isAdmin,
          isBotAdmin,
          isOwner,
          isPrems,
          user,
          chat,
          settings
        })
      } catch (e) {
        console.error(e)
      }
    }

    user.exp += m.exp
    if (!opts.noprint) (await import("./lib/print.js")).default(m, this)

  } catch (e) {
    console.error(e)
  }
}

global.dfail = (type, m, conn) => {
  const msg = {
    rowner: `*𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖯𝗎𝖾𝖽𝖾 𝖲𝖾𝗋 𝖴𝗌𝖺𝖽𝗈 𝖯𝗈𝗋 𝖬𝗂 𝖢𝗋𝖾𝖺𝖽𝗈𝗋*`,

owner: `*𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝖽𝗈 𝖲𝗈𝗅𝗈 𝖯𝗎𝖾𝖽𝖾 𝖲𝖾𝗋 𝖴𝗍𝗂𝗅𝗂𝗓𝖺𝖽𝗈 𝖯𝗈𝗋 𝖬𝗂 𝖢𝗋𝖾𝖺𝖽𝗈𝗋*`,

mods: `*𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖯𝗎𝖾𝖽𝖾 𝖲𝖾𝗋 𝖴𝗍𝗂𝗅𝗂𝗓𝖺𝖽𝗈 𝖯𝗈𝗋 𝖽𝖾𝗌𝖺𝗋𝗋𝗈𝗅𝗅𝖺𝖽𝗈𝗋𝖾𝗌 𝖮𝖿𝗂𝖼𝗂𝖺𝗅𝖾𝗌*`,

premium: `*𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖫𝗈 𝖯𝗎𝖾𝖽𝖾𝗇 𝖴𝗍𝗂𝗅𝗂𝗓𝖺𝗋 𝖴𝗌𝗎𝖺𝗋𝗂𝗈𝗌 𝖯𝗋𝖾𝗆𝗂𝗎𝗆*`,

group: `*𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖥𝗎𝗇𝖼𝗂𝗈𝗇𝖺 𝖤𝗇 𝖦𝗋𝗎𝗉𝗈𝗌*`,

private: `*𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖲𝖾 𝖯𝗎𝖾𝖽𝖾 𝖮𝖼𝗎𝗉𝖺𝗋 𝖤𝗇 𝖤𝗅 𝖯𝗋𝗂𝗏𝖺𝖽𝗈 𝖣𝖾𝗅 𝖡𝗈𝗍*`,

admin: `*𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖯𝗎𝖾𝖽𝖾 𝖲𝖾𝗋 𝖴𝗌𝖺𝖽𝗈 𝖯𝗈𝗋 𝖠𝖽𝗆𝗂𝗇𝗂𝗌𝗍𝗋𝖺𝖽𝗈𝗋𝖾𝗌*`,

botAdmin: `*𝖭𝖾𝖼𝖾𝗌𝗂𝗍𝗈 𝗌𝖾𝗋 𝖠𝖽𝗆𝗂𝗇 𝖯𝖺𝗋𝖺 𝖴𝗌𝖺𝗋 𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈*`,

unreg: `*𝖭𝗈 𝖤𝗌𝗍𝖺𝗌 𝖱𝖾𝗀𝗂𝗌𝗍𝗋𝖺𝖽𝗈, 𝖴𝗌𝖺 .𝗋𝖾𝗀 (𝗇𝖺𝗆𝖾) 19*`,

restrict: `*𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖠𝗁 𝖲𝗂𝖽𝗈 𝖣𝖾𝗌𝖺𝖻𝗂𝗅𝗂𝗍𝖺𝖽𝗈 𝖯𝗈𝗋 𝖬𝗂 𝖢𝗋𝖾𝖺𝖽𝗈𝗋*`

}[type]
if (msg) return conn.reply(m.chat, msg, m, rcanal).then(_ => m.react('✖️'))
}

const file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  console.log(chalk.magenta("Se actualizó handler.js"))
  global.reloadHandler?.()
})