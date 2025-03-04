import { Boom } from '@hapi/boom'
import Baileys, {
  DisconnectReason,
  delay,
  Browsers,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState
} from '@whiskeysockets/baileys'
import cors from 'cors'
import express from 'express'
import fs from 'fs'
import path, { dirname } from 'path'
import pino from 'pino'
import { fileURLToPath } from 'url'
import {upload} from './mega.js'

const app = express()

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')

  res.setHeader('Pragma', 'no-cache')

  res.setHeader('Expires', '0')
  next()
})

app.use(cors())



let PORT = process.env.PORT || 8000
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

app.use(express.static(path.join(__dirname, 'client', 'build')));

function createRandomId() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 10; i++) {
    id += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return id
}

let sessionFolder = `./auth/${createRandomId()}`
if (fs.existsSync(sessionFolder)) {
  try {
    fs.rmdirSync(sessionFolder, { recursive: true })
    console.log('Deleted the "SESSION" folder.')
  } catch (err) {
    console.error('Error deleting the "SESSION" folder:', err)
  }
}

let clearState = () => {
  fs.rmdirSync(sessionFolder, { recursive: true })
}

function deleteSessionFolder() {
  if (!fs.existsSync(sessionFolder)) {
    console.log('The "SESSION" folder does not exist.')
    return
  }

  try {
    fs.rmdirSync(sessionFolder, { recursive: true })
    console.log('Deleted the "SESSION" folder.')
  } catch (err) {
    console.error('Error deleting the "SESSION" folder:', err)
  }
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});

/* app.get('/', async (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'))
})

app.get('/qr', async (req, res) => {
  res.sendFile(path.join(__dirname, 'qr.html'))
})

app.get('/code', async (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
}); */

app.get('/pair', async (req, res) => {
  let phone = req.query.phone

  if (!phone) return res.json({ error: 'Please Provide Phone Number' })

  try {
    const code = await startnigg(phone)
    res.json({ code: code })
  } catch (error) {
    console.error('Error in WhatsApp authentication:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

async function startnigg(phone) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!fs.existsSync(sessionFolder)) {
        await fs.mkdirSync(sessionFolder)
      }

      const { state, saveCreds } = await useMultiFileAuthState(sessionFolder)

      const xlicon = Baileys.makeWASocket({
        version: [2, 3000, 1015901307],
        printQRInTerminal: false,
        logger: pino({
          level: 'silent',
        }),
        browser: Browsers.ubuntu("Chrome"),
         auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(
            state.keys,
            pino().child({
              level: 'fatal',
              stream: 'store',
            })
          ),
        },
      })

      if (!xlicon.authState.creds.registered) {
        let phoneNumber = phone ? phone.replace(/[^0-9]/g, '') : ''
        if (phoneNumber.length < 11) {
          return reject(new Error('Please Enter Your Number With Country Code !!'))
        }
        setTimeout(async () => {
          try {
            let code = await xlicon.requestPairingCode(phoneNumber)
            console.log(`Your Pairing Code : ${code}`)
            resolve(code)
          } catch (requestPairingCodeError) {
            const errorMessage = 'Error requesting pairing code from WhatsApp'
            console.error(errorMessage, requestPairingCodeError)
            return reject(new Error(errorMessage))
          }
        }, 3000)
      }

      xlicon.ev.on('creds.update', saveCreds)

      xlicon.ev.on('connection.update', async update => {
        const { connection, lastDisconnect } = update

        if (connection === 'open') {
          await delay(10000)
          let data1 = fs.createReadStream(`${sessionFolder}/creds.json`);
          const output = await upload(data1, createRandomId() + '.json');
          let sessi = output.includes('https://mega.nz/file/') ? "shinita~" + output.split('https://mega.nz/file/')[1] : 'Error Uploading to Mega';
          await delay(2000)
          let guru = await xlicon.sendMessage(xlicon.user.id, { text: sessi })
          await delay(2000)
          await xlicon.sendMessage(
            xlicon.user.id,
            {
              text: '|---------------------------------------------------------------|
|⠀⠀⠀ 𖤍𝗦𝗛𝗜𝗡𝗜𝗧𝗔 ✍︎𝗧𝗛𝗔☞︎︎︎𝗛𝗘𝗟𝗣𝗘𝗥⠀⠀⠀|
|＿＿＿＿＿＿________________________＿|
(\__/) ||
(•ㅅ•) ||
/ 　 づ ╭────────❒⁠⁠⁠⁠ *𝗦𝗘𝗦𝗦𝗜𝗢𝗡-𝗜𝗡𝗙𝗢* ➣
│➣│▸ ᗪO ᑎOT Տᕼᗩᖇᗴ YOᑌᖇ ՏᗴՏՏIOᑎ Iᗪ ᗯITᕼ OTᕼᗴᖇ
╱╱╱╱╱╱╱╱╱╱╱
│➣│▸ ᑕOᑭY ᗩᑎᗪ ᑭᗩՏTᗴ ՏᗴՏՏIOᑎ_Iᗪ Oᑎ ᑕOᑎᖴIᘜ ᵛᵃʳ
┊┊┊ ┊ ┊┊┊┊┊┊┊┊┊┊┊
┊┊┊┊┊╱▔▔▔▔╲┊┊┊┊┊
┊╭╮┊┊▏╭┛┗╮▕┊┊╭╮┊
╭┛╰┳━▏┈╭╮┈▕━┳╯┗╮GIVE ME A HUG
┃┈┈┃┈╲╰▅▅╯╱┈┃┈┈┃
╰━━┻┓┈╲▂▂╱┈┏┻━━╯
┊┊┊┊┃┈┈┈┈┈┈┃┊┊┊┊
│➣│▸ ᑕᖇᗩᑕKᗴᗪ ᑭᖇᗴᗰIᑌᗰ ᗩᑭᑭ Oᑎ Oᑌᖇ ՏTOᖇᗴ 
│➣│▸ https://woftech.vercel.appp          
│➣│▸ Tᗴᒪᗴᘜᖇᗩᗰ ᑕᕼᗩᑎᑎᗴᒪ
│➣│▸ https://t.me/tcronebhackx
╰────────❍─────❍❍➣ 
 \n',
            },
            { quoted: guru }
          )

          console.log('Connected to WhatsApp Servers')

          try {
            deleteSessionFolder()
          } catch (error) {
            console.error('Error deleting session folder:', error)
          }

          process.send('reset')
        }

        if (connection === 'close') {
          let reason = new Boom(lastDisconnect?.error)?.output.statusCode
          console.log('Connection Closed:', reason)
          if (reason === DisconnectReason.connectionClosed) {
            console.log('[Connection closed, reconnecting....!]')
            process.send('reset')
          } else if (reason === DisconnectReason.connectionLost) {
            console.log('[Connection Lost from Server, reconnecting....!]')
            process.send('reset')
          } else if (reason === DisconnectReason.loggedOut) {
            clearState()
            console.log('[Device Logged Out, Please Try to Login Again....!]')
            process.send('reset')
          } else if (reason === DisconnectReason.restartRequired) {
            console.log('[Server Restarting....!]')
            startnigg()
          } else if (reason === DisconnectReason.timedOut) {
            console.log('[Connection Timed Out, Trying to Reconnect....!]')
            process.send('reset')
          } else if (reason === DisconnectReason.badSession) {
            console.log('[BadSession exists, Trying to Reconnect....!]')
            clearState()
            process.send('reset')
          } else if (reason === DisconnectReason.connectionReplaced) {
            console.log(`[Connection Replaced, Trying to Reconnect....!]`)
            process.send('reset')
          } else {
            console.log('[Server Disconnected: Maybe Your WhatsApp Account got Fucked....!]')
            process.send('reset')
          }
        }
      })

      xlicon.ev.on('messages.upsert', () => {})
    } catch (error) {
      console.error('An Error Occurred:', error)
      throw new Error('An Error Occurred')
    }
  })
}

app.listen(PORT, () => {
  console.log(`API Running on PORT:${PORT}`)
})
