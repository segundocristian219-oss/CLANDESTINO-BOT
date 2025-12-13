let handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply(`⚠️ Ingresa un número.\nEjemplo: .add 5900665488`)

  // limpia caracteres no numéricos (acepta con o sin '+')
  let number = args[0].replace(/\D/g, '') 
  if (!number) return m.reply('❌ Número inválido')

  let jid = number + '@s.whatsapp.net'

  try {
    await m.react('🕓') // reacción de cargando
    await conn.groupParticipantsUpdate(m.chat, [jid], 'add')
    await m.react('✅')
  } catch (e) {
    console.error(e)
    await m.react('❌')
    m.reply(`❌ Error: ${e.message}`)
  }
}

handler.help = ['add <número>']
handler.tags = ['']
handler.command = /^add$/i
handler.group = true
handler.admin = true

export default handler