import fs from 'fs'
import path from 'path'

const jsonPath = path.resolve('./comandos.json')

export async function handler(m, { conn }) {

  if (!m.isGroup) {
    return conn.sendMessage(m.chat, { text: '❌ Solo en grupos.' }, { quoted: m })
  }

  const st =
    m.message?.stickerMessage ||
    m.message?.ephemeralMessage?.message?.stickerMessage ||
    m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage ||
    m.message?.ephemeralMessage?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage

  if (!st) {
    return conn.sendMessage(m.chat, {
      text: '❌ Responde a un sticker.'
    }, { quoted: m })
  }

  const text = m.text?.split(/\s+/).slice(1).join(' ').trim()
  if (!text) {
    return conn.sendMessage(m.chat, {
      text: '❌ Usa: .addco comando'
    }, { quoted: m })
  }

  if (!fs.existsSync(jsonPath)) fs.writeFileSync(jsonPath, '{}')
  const map = JSON.parse(fs.readFileSync(jsonPath, 'utf-8') || '{}')

  const rawSha = st.fileSha256 || st.fileSha256Hash || st.filehash
  if (!rawSha) {
    return conn.sendMessage(m.chat, {
      text: '❌ No se pudo obtener el hash.'
    }, { quoted: m })
  }

  let hash
  if (Buffer.isBuffer(rawSha)) hash = rawSha.toString('base64')
  else if (ArrayBuffer.isView(rawSha)) hash = Buffer.from(rawSha).toString('base64')
  else hash = rawSha.toString()

  map[hash] = {
    command: text.startsWith('.') ? text : '.' + text,
    chat: m.chat
  }

  fs.writeFileSync(jsonPath, JSON.stringify(map, null, 2))

  await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  return conn.sendMessage(m.chat, {
    text: `✅ Sticker vinculado a ${map[hash].command}\n📌 Solo en este grupo`
  }, { quoted: m })
}

handler.command = ['addco']
handler.rowner = true
export default handler