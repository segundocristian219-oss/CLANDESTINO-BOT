// plugins/id.js
const handler = async (m, { args }) => {
  if (!args[0]) {
    return m.reply('⚠️ Uso: .id <link del canal>')
  }

  const link = args[0].trim()

  // ID real visible (1203...)
  const numeric = link.match(/channel\/(\d{10,})/)
  if (numeric) {
    return m.reply(`${numeric[1]}@newsletter`)
  }

  // Invite code (0029Va...)
  const invite = link.match(/channel\/([A-Za-z0-9]+)/)
  if (invite) {
    return m.reply(
      '❌ Este link es un invite code (0029...).\n' +
      'DS6 Meta no puede resolver el ID real del canal.\n\n' +
      'Pide el link que empiece con números.'
    )
  }

  m.reply('❌ Link de canal inválido')
}

handler.command = ['id']
export default handler