import { watchFile, unwatchFile } from 'fs'
import chalk from 'chalk'
import { fileURLToPath } from 'url'

global.owner = [
'217158512549931', 
'31396932358273',
'50926131896537', 
'128209823764660'
] 

global.mods = []
global.prems = []

global.emoji = '📎'
global.emoji2 = '🏞️'
global.namebot = '𝐂𝐋𝐀𝐍𝐃𝐄𝐒𝐓𝐈𝐍𝐎 𝐁𝐎𝐓'
global.botname = '𝐂𝐋𝐀𝐍𝐃𝐄𝐒𝐓𝐈𝐍𝐎 𝐁𝐎𝐓'
global.banner = 'https://files.catbox.moe/6pjr7q.jpg'
global.packname = '𝐂𝐋𝐀𝐍𝐃𝐄𝐒𝐓𝐈𝐍𝐎 𝐁𝐎𝐓'
global.author = '𝖣𝖾𝗌𝖺𝗋olla𝖽𝗈 𝗉𝗈𝗋 Hernandez'
global.sessions = '𝐂𝐋𝐀𝐍𝐃𝐄𝐒𝐓𝐈𝐍𝐎 𝐁𝐎𝐓'

global.APIs = {
sky: 'https://api-sky.ultraplus.click',
may: 'https://mayapi.ooguy.com'
}

global.APIKeys = {
sky: 'Angxlllll',
may: 'may-0595dca2'
}

const file = fileURLToPath(import.meta.url)
watchFile(file, () => {
unwatchFile(file)
console.log(chalk.redBright("Se actualizó el 'config.js'"))
import(`file://${file}?update=${Date.now()}`)
})