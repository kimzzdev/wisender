const { proto, delay, getContentType, areJidsSameUser, generateWAMessage } = require("@whiskeysockets/baileys")
const { createCanvas } = require('canvas');
const fs = require('fs');

exports.createReceipt = (text, filename='receipt.png') => {
    const canvas = createCanvas(400, 600);
    const ctx = canvas.getContext('2d');
    
    // Atur latar belakang putih dengan garis tepi
    ctx.fillStyle = '#FFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Gaya border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Gaya font untuk header
    ctx.font = '24px Arial';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.fillText('Receipt Buying', canvas.width / 2, 40);
    
    // Gaya font untuk isi
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';

    // Tambahkan teks ke gambar
    const lines = text.split('\n');
    lines.forEach((line, index) => {
        ctx.fillText(line, 20, 120 + (index * 30));
    });

    ctx.font = '14px Arial';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center'; // Agar teks berada di tengah lebar gambar
    ctx.fillText('Visit us at: azmygamingstore.com', canvas.width / 2, canvas.height - 30);
    
    // Simpan gambar ke file
    const out = fs.createWriteStream(filename);
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    out.on('finish', () => console.log('Receipt image created.'));
}


/**
 * Serialize Message
 * @param {WAConnection} conn 
 * @param {Object} m 
 * @param {store} store 
 */
exports.smsg = (conn, m, store) => {
    if (!m) return m
    let M = proto.WebMessageInfo
    if (m.key) {
        m.id = m.key.id
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16
        m.chat = m.key.remoteJid
        m.fromMe = m.key.fromMe
        m.isGroup = m.chat.endsWith('@g.us')
        m.sender = conn.decodeJid(m.fromMe && conn.user.id || m.participant || m.key.participant || m.chat || '')
        if (m.isGroup) m.participant = conn.decodeJid(m.key.participant) || ''
    }
    if (m.message) {
        m.mtype = getContentType(m.message)
        m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype])
        m.body = m.message.conversation || m.msg.caption || m.msg.text || (m.mtype == 'listResponseMessage') && m.msg.singleSelectReply.selectedRowId || (m.mtype == 'buttonsResponseMessage') && m.msg.selectedButtonId || (m.mtype == 'viewOnceMessage') && m.msg.caption || m.text
        let quoted = m.quoted = m.msg.contextInfo ? m.msg.contextInfo.quotedMessage : null
        m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
        if (m.quoted) {
            let type = Object.keys(m.quoted)[0]
			m.quoted = m.quoted[type]
            if (['productMessage'].includes(type)) {
				type = Object.keys(m.quoted)[0]
				m.quoted = m.quoted[type]
			}
            if (typeof m.quoted === 'string') m.quoted = {
				text: m.quoted
			}
            m.quoted.mtype = type
            m.quoted.id = m.msg.contextInfo.stanzaId
			m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat
            m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false
			m.quoted.sender = conn.decodeJid(m.msg.contextInfo.participant)
			m.quoted.fromMe = m.quoted.sender === conn.decodeJid(conn.user.id)
            m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || ''
			m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
            m.getQuotedObj = m.getQuotedMessage = async () => {
			if (!m.quoted.id) return false
			let q = await store.loadMessage(m.chat, m.quoted.id, conn)
 			return exports.smsg(conn, q, store)
            }
            let vM = m.quoted.fakeObj = M.fromObject({
                key: {
                    remoteJid: m.quoted.chat,
                    fromMe: m.quoted.fromMe,
                    id: m.quoted.id
                },
                message: quoted,
                ...(m.isGroup ? { participant: m.quoted.sender } : {})
            })

            /**
             * 
             * @returns 
             */
            m.quoted.delete = () => conn.sendMessage(m.quoted.chat, { delete: vM.key })

	   /**
		* 
		* @param {*} jid 
		* @param {*} forceForward 
		* @param {*} options 
		* @returns 
	   */
            m.quoted.copyNForward = (jid, forceForward = false, options = {}) => conn.copyNForward(jid, vM, forceForward, options)

            /**
              *
              * @returns
            */
            m.quoted.download = () => conn.downloadMediaMessage(m.quoted)
        }
    }
    if (m.msg.url) m.download = () => conn.downloadMediaMessage(m.msg)
    m.text = m.msg.text || m.msg.caption || m.message.conversation || m.msg.contentText || m.msg.selectedDisplayText || m.msg.title || ''
    /**
	* Reply to this message
	* @param {String|Object} text 
	* @param {String|false} chatId 
	* @param {Object} options 
	*/
    m.reply = (text, chatId = m.chat, options = {}) => Buffer.isBuffer(text) ? conn.sendMedia(chatId, text, 'file', '', m, { ...options }) : conn.sendText(chatId, text, m, { ...options })
    /**
	* Copy this message
	*/
	m.copy = () => exports.smsg(conn, M.fromObject(M.toObject(m)))

	/**
	 * 
	 * @param {*} jid 
	 * @param {*} forceForward 
	 * @param {*} options 
	 * @returns 
	 */
	m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => conn.copyNForward(jid, m, forceForward, options)

conn.appenTextMessage = async(text, chatUpdate) => {
let messages = await generateWAMessage(m.chat, { text: text, mentions: m.mentionedJid }, {
userJid: conn.user.id,
quoted: m.quoted && m.quoted.fakeObj
})
messages.key.fromMe = areJidsSameUser(m.sender, conn.user.id)
messages.key.id = m.key.id
messages.pushName = m.pushName
if (m.isGroup) messages.participant = m.sender
let msg = {
    ...chatUpdate,
    messages: [proto.WebMessageInfo.fromObject(messages)],
    type: 'append'
}
conn.ev.emit('messages.upsert', msg)
}

    return m
}