const express = require('express');
const bodyParser = require('body-parser');
const path = require('path')
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, generateForwardMessageContent, prepareWAMessageMedia, generateWAMessageFromContent, generateMessageID, downloadContentFromMessage, makeInMemoryStore, jidDecode, getAggregateVotesInPollMessage, proto } = require("@whiskeysockets/baileys")
const pino = require('pino')
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) })
const { color, bgcolor } = require('./all/color')
const { smsg , createReceipt } = require('./all/functions')
const figlet = require('figlet')
const { Boom } = require('@hapi/boom')

const session = path.join(__dirname, 'session');


let d = new Date
let gmt = new Date(0).getTime() - new Date('8 August 2024').getTime()
const calender = d.toLocaleDateString("id", {
day: 'numeric',
month: 'long',
year: 'numeric'
})


const app = express();
app.use(bodyParser.json());

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(session)
    let { version, isLatest } = await fetchLatestBaileysVersion()
    const kimzz = makeWASocket({
            logger: pino({ level: 'silent' }),
            printQRInTerminal: true,
            browser: ['Kimzz Bot', 'Microsoft', '1.0.0'],
            auth: state,
            version
    })

store.bind(kimzz.ev)

console.log(color(figlet.textSync('KIMZZ-MY', {
            font: 'Standard',
            horizontalLayout: 'default',
            vertivalLayout: 'default',
            width: 80,
            whitespaceBreak: false
}), 'red'))

kimzz.public = true
kimzz.ev.on('creds.update', saveCreds)

kimzz.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
            let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
            if (reason === DisconnectReason.badSession) {
                    console.log(`Bad Session File, Please Delete Session and Scan Again`);
                    process.exit();
            } else if (reason === DisconnectReason.connectionClosed) {
                    console.log("Connection closed, reconnecting....");
                    connectToWhatsApp();
            } else if (reason === DisconnectReason.connectionLost) {
                    console.log("Connection Lost from Server, reconnecting...");
                    connectToWhatsApp();
            } else if (reason === DisconnectReason.connectionReplaced) {
                    console.log("Connection Replaced, Another New Session Opened, Please Restart Bot");
                    process.exit();
            } else if (reason === DisconnectReason.loggedOut) {
                    console.log(`Device Logged Out, Please Delete Folder Session and Scan Again.`);
                    process.exit();
            } else if (reason === DisconnectReason.restartRequired) {
                    console.log("Restart Required, Restarting...");
                    connectToWhatsApp();
            } else if (reason === DisconnectReason.timedOut) {
                    console.log("Connection TimedOut, Reconnecting...");
                    connectToWhatsApp();
            } else {
                    console.log(`Unknown DisconnectReason: ${reason}|${connection}`);
                    connectToWhatsApp();
            }

    } else if (connection === 'connecting') {
            //console.log(`${color(`[`,`white`)+color(`1`,`red`)+color(`]`,`white`)}`,`WA v${version.join('.')}`)
            //await sleep(400)
            console.log(`${color(`[`, `white`) + color(`2`, `red`) + color(`]`, `white`)}`, `${calender}`)
            //await sleep(400)
            console.log(`${color(`[`, `white`) + color(`3`, `red`) + color(`]`, `white`)}`, `Base : Kimzz Developers`)
            //await sleep(400)
            console.log(`${color(`[`, `white`) + color(`4`, `red`) + color(`]`, `white`)}`, "date 5")
            //await sleep(400)
            console.log(color(`─[`, `magenta`), `「`, color(`KimzzDev`, `red`), `」`, color(`]─`, `magenta`))
            console.log(`1`, `Connecting...`)
    } else if (connection === "open") {
            console.log(`1`, `[■■■■■■■■■■■■■■■] Connected`)
    }
});

const sendMessage = (to , teks) => {
    kimzz.sendMessage(`${to}@s.whatsapp.net`, {
        text: teks,
        contextInfo: {
          externalAdReply: {
            showAdAttribution: true,
            body: 'Powered By',
            thumbnailUrl: 'https://telegra.ph/file/3a6b4f1e013fc0368be62.jpg',
            sourceUrl: "https://azmygamingstore.com",
            mediaType: 1,
            renderLargerThumbnail: true
         }
      }
    })
}

// Endpoint API untuk mengirim pesan
app.post('/send-whatsapp', async (req, res) => {
    const { to, message } = req.body;

    try {

    if (!to || !message) {
        return res.status(400).json({ status: 'error', message: 'Missing required parameters' });
    }

  await createReceipt(message)
  await sendMessage(to, message);
  res.status(200).json({
    status: 'success',
    message: 'Message telah di send'
  })
} catch (error) {
    console.error(error);
    res.status(404).json({
        status: 'error',
        message: 'Message gagal di send'
      })
}
});

return kimzz
}

connectToWhatsApp()

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
