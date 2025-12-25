const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
  PermissionFlagsBits,
  REST,
  Routes, 
  SlashCommandBuilder,
  StringSelectMenuBuilder 
} = require('discord.js');


// ================= CONFIG =================
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const DISPLAY_CHANNEL_ID = process.env.DISPLAY_CHANNEL_ID;
const TICKET_CATEGORY_ID = process.env.TICKET_CATEGORY_ID;
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;
const PREMIUM_APPS_CHANNEL_ID = process.env.PREMIUM_APPS_CHANNEL_ID;
const CLOSED_TICKET_CATEGORY_ID = process.env.CLOSED_TICKET_CATEGORY_ID;




const STOCK_FILE = path.join(__dirname, 'stock.json');
let stockEmbedMessageId = null;
const orders = new Map();

// ================= DATABASE =================
let db = { accounts: [] };
if (fs.existsSync(STOCK_FILE)) {
  db = JSON.parse(fs.readFileSync(STOCK_FILE, 'utf-8'));
}

function saveDB() {
  fs.writeFileSync(STOCK_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

// ================= CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});


// ================= CREATE EMBED =================
function createStockEmbed() {
  const inStock = db.accounts.length;
  const color = inStock > 0 ? 0x00ff9c : 0xff0000;
  const status = inStock > 0 ? `✅ **In Stock: ${inStock}**` : `❌ **Out of Stock**`;

  return new EmbedBuilder()
    .setAuthor({ name: '🤖 AUTO ORDER SYSTEM' })
    .setTitle('🟢 ROCKSTAR ACCOUNT | FRESH PRIVATE')
    .setColor(color)
    .setDescription(
      '🚀 **Instant delivery after order**\nKlik tombol di bawah untuk melakukan pembelian otomatis.\n\n' +
      '━━━━━━━━━━━━━━━━━━\n📌 **PRODUCT INFORMATION**\n' +
      '• Private Account (Only You)\n• Email & Password Changeable\n• Fresh Generated Account\n• Safe for Spoofer & Gaming\n\n' +
      '━━━━━━━━━━━━━━━━━━\n📦 **ACCOUNT FORMAT**\n```\nEmail : user@email.com\nPassword : ********\n```\n\n' +
      '🏷️ **PRODUCT CODE**\n`ROCKSTAR`\n\n' +
      '━━━━━━━━━━━━━━━━━━\n📊 **LIVE STOCK STATUS**\n' + status +   '\n\n' +
      '━━━━━━━━━━━━━━━━━━\n💰 **PRICE LIST**\n👤 Normal Buyer   : **Rp13.000**\n💎 Reseller Price : **Rp8.000**\n\n' +
      '━━━━━━━━━━━━━━━━━━\n🛒 **HOW TO ORDER**\n1️⃣ Click **BUY ROCKSTAR**\n2️⃣ Scan QR & Complete payment\n3️⃣ Account sent automatically\n\n' +
      '⏳ *System updates automatically*'
    )
    .setFooter({ text: 'Auto Order by Bagas • 🟢 System Online' })
    .setTimestamp();
}

async function updateStockEmbed() {
  if (!stockEmbedMessageId) return;
  try {
    const channel = await client.channels.fetch(DISPLAY_CHANNEL_ID);
    const message = await channel.messages.fetch(stockEmbedMessageId).catch(() => null);
    if (!message) return;
    const embed = createStockEmbed();
    await message.edit({ embeds: [embed] }).catch(() => {});
  } catch (err) {
    console.error('Failed to update embed:', err);
  }
}

// ================= HELPER DM =================
function createAccountDMEmbed({ account, orderId, jumlah }) {
  return new EmbedBuilder()
    .setAuthor({ name: '🔐 ACCOUNT INFORMATION' })
    .setTitle('ROCKSTAR FRESH PRIVATE')
    .setColor(0x3498db)
    .setDescription(
      `📧 **Email**\n` +
      `\`${account.email}\`\n\n` +

      `🔑 **Password**\n` +
      `\`${account.password}\`\n\n` +

      `━━━━━━━━━━━━━━━━━━\n` +
      `⚠️ **PERHATIAN**\n` +
      `• Wajib ganti email & password **2x24 jam**\n` +
      `• Untuk claim garansi wajib **rating**\n\n` +

      `🌐 **Website Login Webmail**\n` +
      `[Klik di sini](https://mail.google.com)\n\n` +

      `━━━━━━━━━━━━━━━━━━\n` +
      `🏅 **DETAIL TRANSAKSI**\n` +
      `• Status : ✅ Sukses\n` +
      `• Order ID : \`${orderId}\`\n` +
      `• Produk : ROCKSTAR FRESH PRIVATE\n` +
      `• Kode : \`ROCKSTAR\`\n` +
      `• Jumlah : ${jumlah} Item\n` +
      `• Harga / Item : Rp13.000\n` +
      `• Pajak : Rp0\n` +
      `• **Total : Rp${(13_000 * jumlah + 28).toLocaleString('id-ID')}**`
    )
    .setFooter({ text: '777 MARKET • AUTO ORDER SYSTEM' })
    .setTimestamp();
}



function createSuccessEmbed({ orderId, jumlah, total }) {
  return new EmbedBuilder()
    .setTitle('✅ TRANSACTION SUCCESS')
    .setColor(0x2ecc71) // HIJAU
    .setDescription(
      `🎉 **Terima kasih telah melakukan pembelian!**\n` +
      `Transaksi kamu berhasil diproses.\n\n` +

      `━━━━━━━━━━━━━━━━━━\n` +
      `🆔 **ORDER ID**\n` +
      `\`${orderId}\`\n\n` +

      `📦 **DETAIL PEMBELIAN**\n` +
      `• Produk : **ROCKSTAR FRESH PRIVATE**\n` +
      `• Kode   : \`ROCKSTAR\`\n` +
      `• Jumlah : **${jumlah} Item**\n\n` +

      `💰 **PEMBAYARAN**\n` +
      `• Total : **Rp${total.toLocaleString('id-ID')}**\n\n` +

      `📨 **PENGIRIMAN AKUN**\n` +
      `Akun telah **dikirim ke DM kamu**.\n` +
      `Jika belum masuk, pastikan **DM ON**.\n` +

      `━━━━━━━━━━━━━━━━━━\n` +
      `⏳ *Diproses otomatis oleh sistem*`
    )
    .setFooter({ text: 'Auto Order System • Success' })
    .setTimestamp();

    
}

const premiumAppsMenu = new ActionRowBuilder().addComponents(
  new StringSelectMenuBuilder()
    .setCustomId('premium_apps_select')
    .setPlaceholder('Pilih produk premium...')
    .addOptions([
      { label: 'CAPCUT PRO', value: 'capcut', emoji: '🎬' },
      { label: 'CANVA PRO', value: 'canva', emoji: '🎨' },
      { label: 'YOUTUBE PREMIUM', value: 'youtube', emoji: '▶️' },
      { label: 'SPOTIFY PREMIUM', value: 'spotify', emoji: '🎵' },
      { label: 'CHATGPT', value: 'chatgpt', emoji: '🤖' },
      { label: 'NETFLIX', value: 'netflix', emoji: '🎥' },
      { label: 'WETV', value: 'wetv', emoji: '📺' },
      { label: 'VIDIO', value: 'vidio', emoji: '📡' },
      { label: 'GOOGLE ONE 2TB + AI', value: 'google_one', emoji: '☁️' },
      { label: 'GETCONTACT PREMIUM', value: 'getcontact', emoji: '📞' },
      { label: 'APPLE MUSIC', value: 'apple_music', emoji: '🍎' }
    ])
);

function createPremiumAppsEmbed() {
  return new EmbedBuilder()
    .setTitle('🛍️ PREMIUM APPS STORE')
    .setColor(0x5865f2)
    .setDescription(
      `Selamat datang di **LAH MARKET**!\n` +
      `Pilih aplikasi premium untuk mulai order.\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `✨ **Kenapa pilih kami?**\n` +
      `➤ Harga termurah & transparan\n` +
      `➤ Proses instan & support 24/7\n` +
      `➤ Garansi & aftersales\n`
    )
    .setFooter({ text: 'LAH MARKET • PREMIUM APPS' });
}


// ================= READY =================
client.once('ready', async () => {
  console.log(`Bot ONLINE as ${client.user.tag}`);

  const channel = await client.channels.fetch(DISPLAY_CHANNEL_ID);
  const embed = createStockEmbed();
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('buy_rockstar')
      .setLabel('BUY ROCKSTAR')
      .setStyle(ButtonStyle.Success)
  );

  const message = await channel.send({ embeds: [embed], components: [row] });
  stockEmbedMessageId = message.id;

  const premiumChannel = await client.channels.fetch(PREMIUM_APPS_CHANNEL_ID);

const premiumEmbed = createPremiumAppsEmbed();
await premiumChannel.send({
  embeds: [premiumEmbed],
  components: [premiumAppsMenu]
});






  // Deploy slash commands
  const commands = [
    new SlashCommandBuilder()
      .setName('addstock')
      .setDescription('Tambah stock akun')
      .addStringOption(option =>
        option.setName('akun')
              .setDescription('Email akun / bisa banyak, pisah koma atau newline')
              .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName('checkstock')
      .setDescription('Cek stock akun tertentu')
      .addStringOption(option =>
        option.setName('akun')
              .setDescription('Email akun')
              .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName('simulatepay')
      .setDescription('Simulasikan pembayaran untuk order ID')
      .addStringOption(option =>
        option.setName('orderid')
              .setDescription('ID Order yang ingin disimulasikan dibayar')
              .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName('liststock')
      .setDescription('List semua stock akun'),
    new SlashCommandBuilder()
      .setName('delstock')
      .setDescription('Hapus akun dari stock (bisa pakai nomor urut atau email)')
      .addStringOption(option =>
        option.setName('akun')
              .setDescription('Nomor urut atau email, bisa banyak, pisah koma/spasi')
              .setRequired(true)
      )
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    console.log('🔄 Refreshing guild (/) commands...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash commands successfully registered!');
  } catch (err) {
    console.error('❌ Failed to register commands:', err);
  }
});

function createOrderLogEmbed({ user, orderId, jumlah, total }) {
  return new EmbedBuilder()
    .setAuthor({
      name: '🟢 ORDER SUCCESS • AUTO SYSTEM',
      iconURL: user.displayAvatarURL()
    })
    .setColor(0x00ff9c)
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .addFields(
      {
        name: '👤 Buyer',
        value: `<@${user.id}>\n\`${user.tag}\``,
        inline: true
      },
      {
        name: '🆔 Order ID',
        value: `\`${orderId}\``,
        inline: true
      },
      {
        name: '📦 Product',
        value: `ROCKSTAR FRESH PRIVATE\n\`ROCKSTAR\``,
        inline: false
      },
      {
        name: '🔢 Quantity',
        value: `${jumlah} Account`,
        inline: true
      },
      {
        name: '💰 Total Payment',
        value: `Rp${total.toLocaleString('id-ID')}`,
        inline: true
      },
      {
        name: '📅 Time',
        value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
        inline: false
      }
    )
    .setFooter({ text: '777 MARKET • AUTO ORDER LOG' })
    .setTimestamp();
}

function createQrisPaidEmbed({ user, orderId, jumlah, total }) {
  return new EmbedBuilder()
    .setAuthor({
      name: '✅ QRIS PAID',
      iconURL: user.displayAvatarURL({ dynamic: true })
    })
    .setColor(0x00ff9c)
    .addFields(
      {
        name: '👤 Buyer',
        value: `<@${user.id}>\n\`${user.tag}\``,
        inline: true
      },
      {
        name: '🆔 Order ID',
        value: `\`${orderId}\``,
        inline: true
      },
      {
        name: '📦 Product',
        value: 'ROCKSTAR FRESH PRIVATE\n`ROCKSTAR`',
        inline: false
      },
      {
        name: '🔢 Quantity',
        value: `${jumlah} Account`,
        inline: true
      },
      {
        name: '💰 Total',
        value: `Rp${total.toLocaleString('id-ID')}`,
        inline: true
      }
    )
    .setFooter({ text: '777 MARKET • PAYMENT SUCCESS' })
    .setTimestamp();
}
async function paymentSuccess(orderId) {
  if (!orders.has(orderId)) return false;

  const order = orders.get(orderId);
  const { userId, accounts, jumlah, interaction } = order;
  const total = jumlah * 13000 + 28;

  let user;
  try {
    user = await client.users.fetch(userId);
  } catch {
    return false;
  }

  // LOG ORDER
  try {
    const logChannel = await client.channels.fetch('1452763789253677217');
    await logChannel.send({
      embeds: [
        createOrderLogEmbed({
          user,
          orderId,
          jumlah,
          total
        })
      ]
    });
  } catch {}

  // DM AKUN
  for (const account of accounts) {
    try {
      await user.send({
        embeds: [createAccountDMEmbed({ account, orderId, jumlah })]
      });
    } catch {}
  }

  // SUCCESS KE USER
  try {
    await interaction.followUp({
      embeds: [createSuccessEmbed({ orderId, jumlah, total })],
      ephemeral: true
    });
  } catch {}

  // UPDATE STOCK
  db.accounts.splice(0, accounts.length);
  saveDB();
  await updateStockEmbed();

  orders.delete(orderId);
  return true;
}

// ===== EMBED HELPERS =====
function createCloseConfirmationEmbed(admin) {
  return new EmbedBuilder()
    .setAuthor({
      name: '🔒 TICKET CLOSED',
      iconURL: admin.displayAvatarURL()
    })
    .setColor(0xff4d4d)
    .setDescription(
      `Ticket ini telah **ditutup secara resmi** oleh admin.\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🛡️ **Admin**\n` +
      `<@${admin.id}>\n\n` +
      `📌 **Status Ticket**\n` +
      `❌ Closed\n\n` +
      `ℹ️ Silakan buat ticket baru jika masih membutuhkan bantuan.\n` +
      `━━━━━━━━━━━━━━━━━━`
    )
    .setFooter({ text: 'LAH MARKET • Ticket System' })
    .setTimestamp();
}

function createOrderCompletedEmbed({ user, product }) {
  return new EmbedBuilder()
    .setAuthor({
      name: '✅ ORDER COMPLETED',
      iconURL: user.displayAvatarURL()
    })
    .setColor(0x2ecc71)
    .setDescription(
      `Pesanan kamu telah **berhasil diselesaikan** 🎉\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `👤 **Buyer**\n` +
      `<@${user.id}>\n\n` +
      `📦 **Produk**\n` +
      `**${product.toUpperCase()}**\n\n` +
      `📌 **Status**\n` +
      `✅ Selesai\n` +
      `━━━━━━━━━━━━━━━━━━`
    )
    .setFooter({ text: 'LAH MARKET • Order Success' })
    .setTimestamp();
}

// ===== PRODUCT DETAIL EMBEDS =====
const productDetails = {
  capcut: {
    title: '🎬 CAPCUT PRO',
    color: 0x000000,
    description:
      `✨ **Benefit**\n` +
      `• Export tanpa watermark\n` +
      `• Akses semua efek premium\n` +
      `• Update otomatis\n\n` +
      `⏳ **Durasi**\n` +
      `• 1 Bulan / 1 Tahun\n\n` +
      `⚠️ **Catatan**\n` +
      `• Login via akun pembeli\n` +
      `• Dilarang share akun`
  },

  canva: {
    title: '🎨 CANVA PRO',
    color: 0x00c4cc,
    description:
      `✨ **Benefit**\n` +
      `• Semua template premium\n` +
      `• Background remover\n` +
      `• Brand kit\n\n` +
      `⏳ **Durasi**\n` +
      `• 1 Bulan / 1 Tahun\n\n` +
      `⚠️ **Catatan**\n` +
      `• Invite via email\n` +
      `• Jangan leave team`
  },

  youtube: {
    title: '▶️ YOUTUBE PREMIUM',
    color: 0xff0000,
    description:
      `👨‍👩‍👧‍👦 **Family Plan**\n\n` +
      `✨ **Benefit**\n` +
      `• No Ads\n` +
      `• Background play\n` +
      `• YouTube Music\n\n` +
      `⏳ **Durasi**\n` +
      `• 1 Bulan\n\n` +
      `⚠️ **Catatan**\n` +
      `• Wajib akun Gmail sendiri`
  },

  spotify: {
    title: '🎵 SPOTIFY PREMIUM',
    color: 0x1db954,
    description:
      `🎧 **Individual / Family**\n\n` +
      `✨ **Benefit**\n` +
      `• No Ads\n` +
      `• Download lagu\n` +
      `• Skip unlimited\n\n` +
      `⏳ **Durasi**\n` +
      `• 1 Bulan\n\n` +
      `⚠️ **Catatan**\n` +
      `• Login via email pembeli`
  },

  netflix: {
    title: '🎥 NETFLIX PREMIUM',
    color: 0xe50914,
    description:
      `📺 **Shared Profile**\n\n` +
      `✨ **Benefit**\n` +
      `• Full HD / 4K\n` +
      `• Semua film & series\n\n` +
      `⏳ **Durasi**\n` +
      `• 1 Bulan\n\n` +
      `⚠️ **Catatan**\n` +
      `• Jangan ubah email & password`
  },

  wetv: {
    title: '📺 WETV VIP',
    color: 0x00aaff,
    description:
      `✨ **Benefit**\n` +
      `• Drama & anime VIP\n` +
      `• No Ads\n\n` +
      `⏳ **Durasi**\n` +
      `• 1 Bulan\n\n` +
      `⚠️ **Catatan**\n` +
      `• Login via akun pembeli`
  },

  vidio: {
    title: '⚽ VIDIO PREMIER',
    color: 0x6a00ff,
    description:
      `🏆 **Sports & Entertainment**\n\n` +
      `✨ **Benefit**\n` +
      `• Liga bola\n` +
      `• Film & series\n\n` +
      `⏳ **Durasi**\n` +
      `• 1 Bulan\n\n` +
      `⚠️ **Catatan**\n` +
      `• Akun pribadi disarankan`
  },

  chatgpt: {
    title: '🤖 CHATGPT PLUS',
    color: 0x10a37f,
    description:
      `🧠 **AI Premium Access**\n\n` +
      `✨ **Benefit**\n` +
      `• GPT-4 / GPT-4o\n` +
      `• Fast response\n` +
      `• Priority access\n\n` +
      `⏳ **Durasi**\n` +
      `• 1 Bulan\n\n` +
      `⚠️ **Catatan**\n` +
      `• Akun buyer / akun seller`
  },

  google_one: {
    title: '☁️ GOOGLE ONE',
    color: 0x4285f4,
    description:
      `💾 **Cloud Storage**\n\n` +
      `✨ **Benefit**\n` +
      `• Extra Google Drive\n` +
      `• Backup otomatis\n\n` +
      `⏳ **Durasi**\n` +
      `• 1 Bulan\n\n` +
      `⚠️ **Catatan**\n` +
      `• Invite family`
  },

  getcontact: {
    title: '📞 GETCONTACT PREMIUM',
    color: 0xffcc00,
    description:
      `🔍 **Caller ID Premium**\n\n` +
      `✨ **Benefit**\n` +
      `• Lihat tag tanpa limit\n` +
      `• No Ads\n\n` +
      `⏳ **Durasi**\n` +
      `• 1 Bulan\n\n` +
      `⚠️ **Catatan**\n` +
      `• Login via nomor HP`
  },

  apple_music: {
    title: '🍎 APPLE MUSIC',
    color: 0xfa243c,
    description:
      `🎧 **Music Streaming**\n\n` +
      `✨ **Benefit**\n` +
      `• Lossless Audio\n` +
      `• Offline download\n\n` +
      `⏳ **Durasi**\n` +
      `• 1 Bulan\n\n` +
      `⚠️ **Catatan**\n` +
      `• Invite family / akun pribadi`
  }
};

function createProductDetailEmbed(productKey) {
  const product = productDetails[productKey];
  if (!product) return null;

  return new EmbedBuilder()
    .setTitle(product.title)
    .setColor(product.color)
    .setDescription(product.description)
    .setFooter({ text: 'LAH MARKET • Product Detail' })
    .setTimestamp();
}

// ================= INTERACTION =================
client.on('interactionCreate', async interaction => {
  try {

// ===== PREMIUM APPS SELECT MENU =====
if (interaction.isStringSelectMenu() && interaction.customId === 'premium_apps_select') {
  const product = interaction.values[0];
const user = interaction.user;
const guild = interaction.guild;

// CEK TICKET AKTIF
const existing = guild.channels.cache.find(c =>
  c.name === `ticket-${product}-${user.id}` &&
  c.parentId === TICKET_CATEGORY_ID
);

if (existing) {
  return interaction.reply({
    content: '❌ Kamu masih punya ticket yang aktif.',
    ephemeral: true
  });
}

// BUAT CHANNEL
const channel = await guild.channels.create({
  name: `ticket-${product}-${user.id}`,
  parent: TICKET_CATEGORY_ID,
  permissionOverwrites: [
    { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
    {
      id: user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory
      ]
    },
    {
      id: ADMIN_ROLE_ID,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory
      ]
    }
  ]
});

/* ===========================
   DEFINE EMBED & BUTTON DULU
   =========================== */

// ORDER TICKET EMBED
const ticketEmbed = new EmbedBuilder()
  .setAuthor({
    name: '🛍️ LAH MARKET • PREMIUM APPS',
    iconURL: guild.iconURL()
  })
  .setTitle('🎟️ ORDER TICKET')
  .setColor(0x00ff9c)
  .setDescription(
    `Terima kasih telah membuka ticket di **LAH MARKET**.\n` +
    `Silakan lengkapi format order di bawah.\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `👤 **Buyer**\n<@${user.id}>\n\n` +
    `📦 **Produk**\n**${product.toUpperCase()}**\n\n` +
    `📝 **Petunjuk**\n` +
    `• Isi format dengan benar\n` +
    `• Kesalahan data bukan tanggung jawab admin\n` +
    `• Respon ± 1–5 menit\n` +
    `━━━━━━━━━━━━━━━━━━`
  )
  .setFooter({ text: 'LAH MARKET • Ticket System' })
  .setTimestamp();

// BUTTON CLOSE
const closeRow = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId('close_ticket')
    .setLabel('🔒 Close Ticket')
    .setStyle(ButtonStyle.Danger)
);

/* ===========================
   BARU KIRIM KE CHANNEL
   =========================== */

// 1️⃣ PING ADMIN
await channel.send({
  content: `<@&${ADMIN_ROLE_ID}> 🔔 **Ticket baru masuk!**`
});

// 2️⃣ ORDER TICKET
await channel.send({
  embeds: [ticketEmbed],
  components: [closeRow]
});

// 3️⃣ DETAIL PRODUK
const productDetailEmbed = createProductDetailEmbed(product);
if (productDetailEmbed) {
  await channel.send({ embeds: [productDetailEmbed] });
}

// BALAS KE USER
return interaction.reply({
  content: `✅ Ticket berhasil dibuat: ${channel}`,
  ephemeral: true
});

}


if (interaction.isButton() && interaction.customId === 'close_ticket') {

  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: '❌ Hanya admin yang dapat menutup ticket.',
      ephemeral: true
    });
  }

  const channel = interaction.channel;

  await channel.send({
    embeds: [createCloseConfirmationEmbed(interaction.user)]
  });

  // PINDAH KE CLOSED CATEGORY
  await channel.setParent(CLOSED_TICKET_CATEGORY_ID);

  // LOCK BUYER
  const buyerId = channel.name.split('-').pop();
  await channel.permissionOverwrites.edit(buyerId, {
    SendMessages: false
  });

  await interaction.reply({
    content: '✅ Ticket berhasil ditutup.',
    ephemeral: true
  });
}

    // ===== SLASH COMMAND =====
    if (interaction.isChatInputCommand()) {
      const command = interaction.commandName;
      await interaction.deferReply({ ephemeral: true });

      // ===== ADD STOCK =====
      if (command === 'addstock') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
          return interaction.followUp({ content: '❌ Hanya admin yang bisa menambah stock.', ephemeral: true });

        const input = interaction.options.getString('akun').trim();
        const akunList = input.split(/[\s,]+/).map(a => a.trim()).filter(a => a);

        for (const akun of akunList) {
          db.accounts.push({ email: akun, password: 'LuckyD721@', addedAt: Date.now() });
        }
        saveDB();
        await updateStockEmbed();
        return interaction.followUp({ content: `✅ Berhasil menambahkan ${akunList.length} akun!`, ephemeral: true });
      }

      // ===== CHECK STOCK =====
      if (command === 'checkstock') {
        const akunInput = interaction.options.getString('akun').trim();
        const found = db.accounts.find(a => a.email === akunInput);
        return interaction.followUp({ content: found ? `✅ Akun tersedia` : `❌ Akun tidak ada`, ephemeral: true });
      }

      // ===== LIST STOCK =====
      if (command === 'liststock') {
        const stockList = db.accounts.map((a, i) => `${i+1}. ${a.email}`);
        if (stockList.length === 0) return interaction.followUp({ content: '📦 Stock kosong', ephemeral: true });

        const content = stockList.slice(0, 15).join('\n');
        return interaction.followUp({ content: `📦 List Stock (1–15):\n${content}`, ephemeral: true });
      }

      // ===== DELETE STOCK =====
      if (command === 'delstock') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
          return interaction.followUp({ content: '❌ Hanya admin yang bisa menghapus stock.', ephemeral: true });

        const input = interaction.options.getString('akun').trim();
        const akunList = input.split(/[\s,]+/).map(a => a.trim()).filter(a => a);
        let removedCount = 0;
        const removedEmails = [];

        for (const item of akunList) {
          if (/^\d+$/.test(item)) {
            const index = parseInt(item, 10) - 1;
            if (db.accounts[index]) {
              removedEmails.push(db.accounts[index].email);
              db.accounts.splice(index, 1);
              removedCount++;
            }
          } else {
            const index = db.accounts.findIndex(a => a.email === item);
            if (index !== -1) {
              removedEmails.push(db.accounts[index].email);
              db.accounts.splice(index, 1);
              removedCount++;
            }
          }
        }

        saveDB();
        await updateStockEmbed();

        if (removedCount === 0) {
          return interaction.followUp({ content: '⚠️ Tidak ada akun yang berhasil dihapus.', ephemeral: true });
        } else {
          return interaction.followUp({ 
            content: `✅ Berhasil menghapus ${removedCount} akun:\n${removedEmails.join('\n')}`, 
            ephemeral: true 
          });
        }
      }

      // ===== SIMULATE PAYMENT =====
      if (command === 'simulatepay') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
          return interaction.followUp({ content: '❌ Hanya admin yang bisa mensimulasikan pembayaran.', ephemeral: true });

        const orderId = interaction.options.getString('orderid').trim();
        if (!orders.has(orderId)) return interaction.followUp({ content: `❌ Order ID tidak ditemukan: ${orderId}`, ephemeral: true });

        const success = await paymentSuccess(orderId);
        if (success) {
          return interaction.followUp({ content: `✅ Payment berhasil diproses dan akun telah dikirim ke DM user.`, ephemeral: true });
        } else {
          return interaction.followUp({ content: `❌ Gagal mengirim akun ke DM user.`, ephemeral: true });
        }
      }
    }

    // ===== BUTTON BUY =====
    if (interaction.isButton() && interaction.customId === 'buy_rockstar') {
      const modal = new ModalBuilder()
        .setCustomId('buy_modal')
        .setTitle('Beli Rockstar');

      const jumlahInput = new TextInputBuilder()
        .setCustomId('jumlah')
        .setLabel('Jumlah')
        .setPlaceholder('mis: 1 / 2 / 5')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(jumlahInput));
      return interaction.showModal(modal);
    }

    // ===== MODAL BUY =====
    if (interaction.isModalSubmit() && interaction.customId === 'buy_modal') {
      await interaction.deferReply({ ephemeral: true });
      const input = interaction.fields.getTextInputValue('jumlah').trim();
      const jumlah = parseInt(input, 10);
      if (!/^\d+$/.test(input) || jumlah < 1) {
        return interaction.followUp({ content: '❌ Jumlah harus berupa angka minimal 1', ephemeral: true });
      }
      if (jumlah > db.accounts.length) {
        return interaction.followUp({ content: '❌ Stock tidak mencukupi', ephemeral: true });
      }

      const accountsToSend = db.accounts.slice(0, jumlah);
      const orderId = `ORD-${Date.now()}`;

      // Simpan order sementara
      orders.set(orderId, {
  userId: interaction.user.id,
  accounts: accountsToSend,
  jumlah,
  interaction // 👈 SIMPAN INTERACTION
});



      // Kirim embed pembayaran otomatis
      const payEmbed = new EmbedBuilder()
        .setTitle('💳 PEMBAYARAN OTOMATIS')
        .setColor(0xf1c40f)
        .setDescription(
          `📦 Detail Produk\n` +
          `┣━ 🏷️ Kode: ROCKSTAR\n` +
          `┣━ 📝 Nama: ROCKSTAR FRESH PRIVATE\n` +
          `┣━ 💰 Harga: Rp13.000 (💰 Normal Price)\n` +
          `┗━ 🔢 Jumlah: ${jumlah}x\n\n` +
          `🆔 Order ID: \`${orderId}\`\n\n` +
          `💵 Rincian Pembayaran\n` +
          `┣━ Subtotal: Rp${13_000 * jumlah}\n` +
          `┣━ Biaya Admin: +28\n` +
          `┗━ TOTAL: Rp${13_000 * jumlah + 28}\n\n` +
          `⏰ Batas Waktu\n` +
          `┣━ Durasi: 5 Menit\n` +
          `┗━ Expired: ${new Date(Date.now() + 5*60*1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB\n\n` +
          `⚠️ Penting!\nSilakan scan QR code dan transfer sebelum waktu expired.\nGunakan /simulatepay ${orderId} untuk tes pembayaran sukses.`
        );

      await interaction.followUp({ embeds: [payEmbed], ephemeral: true });

      // Timer 5 menit cancel otomatis
      const timer = setTimeout(async () => {
        if (orders.has(orderId)) {
          orders.delete(orderId);
          try {
            const user = await client.users.fetch(interaction.user.id);
            await user.send(`❌ Order ${orderId} dibatalkan karena pembayaran tidak terdeteksi dalam 5 menit.`);
          } catch {}
        }
      }, 5*60*1000);
      orders.get(orderId).timeout = timer;
    }

  } catch (err) {
    console.error('❌ Interaction error:', err.stack || err);
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: '❌ Terjadi error saat memproses.', ephemeral: true });
    } else {
      await interaction.reply({ content: '❌ Terjadi error saat memproses.', ephemeral: true });
    }
  }
});

// ================= LOGIN =================
client.login(TOKEN);
