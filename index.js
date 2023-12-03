// modules
import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import PDFDocument from 'pdfkit';
import qrcode from 'qrcode';

// imports
import Customer from './customer.js';
import { Messages } from './script-messages.js';

// Load environment variables from a .env file into process.env
dotenv.config();

const token = process.env.TOKEN;

// Create a new instance of the TelegramBot class
const bot = new TelegramBot(token, {
    // Configure polling options
    polling: {
        // Set the polling interval to 300 milliseconds
        interval: 300,
        // Start polling automatically when the bot is created
        autoStart: true,
    },
});

// Set up an error handler for any errors that may occur during the bot's execution
bot.on('polling_error', (error) => {
    // Log the error message to the console
    console.error(error.message);
});

// Handle the "/start" command from users
bot.onText(/\/start/, async (message) => {
    // Extract the chat ID from the incoming message
    const m_id = message.chat.id;
    // Send a welcome message and event details to the user
    await bot.sendMessage(m_id, Messages.start, {
        // Specify the message format as Markdown
        parse_mode: 'HTML',
        // Add a button for users to participate in the event
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [
                    {
                        text: 'Узнать о меропприятий',
                        url: 'https://instagram.com/saints.battle',
                    },
                ],
                [
                    {
                        text: 'Купить билет',
                        callback_data: 'buy-ticket',
                    },
                ],
            ],
        }),
    });
});


// handling buttons
bot.on('callback_query', (callbackQuery) => {
    if (callbackQuery.data !== 'buy-ticket') return null;

    const chatId = callbackQuery.message.chat.id;

    // Send payment message
    bot.sendMessage(chatId, Messages.payment).then(() => {
        // Listen for a document (PDF) from the user
        const documentListener = (message) => {
            if (message.chat.id !== chatId || !message.document) {
                // Ignore messages from other chats and those without documents
                return;
            }
            if (message.document.mime_type === 'application/pdf') {
                // Valid PDF received
                bot.sendMessage(chatId, Messages.pdf);
                // Additional processing or return if needed
                const destinationChatId = '-1002008383552';
                const customer = new Customer(
                    message.chat.first_name,
                    message.chat.username,
                    chatId
                ).getUser;
                bot.sendMessage(
                    destinationChatId,
                    `
                    [chatId: ${customer.chatID}]
[Serial Number: ${customer.serialNumber}]
[Username: ${customer.username}]
[Name: ${customer.name}]
[Date: ${customer.date}]


[File name: ${message.document.file_name}]
                `,
                    {
                        parse_mode: 'Markdown',
                        reply_markup: JSON.stringify({
                            inline_keyboard: [
                                [
                                    {
                                        text: 'Чек валидный',
                                        callback_data: 'recipe-valid',
                                    },
                                ],
                                [
                                    {
                                        text: 'Чек некорректный',
                                        callback_data: 'recipe-not-valid',
                                    },
                                ],
                            ],
                        }),
                    }
                );
                bot.sendDocument(destinationChatId, message.document.file_id);

                // Additional processing or return if needed

                // Remove the listener after a valid PDF is received
                bot.removeListener('message', documentListener);
            } else {
                // Not a PDF
                bot.sendMessage(chatId, Messages.notpdf);
            }
        };
        // Add the listener for document messages
        bot.on('message', documentListener);
    });
});

bot.on('callback_query', (message) => {
    if (message.data !== 'recipe-not-valid') return null;

    bot.editMessageText(message.message.text + '\nRECIPE IS NOT VALID❌', {
        chat_id: message.message.chat.id,
        message_id: message.message.message_id,
    });

    bot.sendMessage(
        message.message.text.split('\n')[0].split(': ')[1],
        Messages.ban
    );
});

bot.on('callback_query', async (message) => {
    if (message.data !== 'recipe-valid') return null;
    const userId = message.message.text.split('\n')[0].split(': ')[1];

    const customerNumber = message.message.text.split('\n')[1];
    const customerDate = message.message.text.split('\n')[4];

    bot.editMessageText(message.message.text + '\nRECIPE IS VALID✅', {
        chat_id: message.message.chat.id,
        message_id: message.message.message_id,
    });

    const msg_id = (
        await bot.sendMessage('-1001923399192', message.message.text, {
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{ text: 'Билет проверен', callback_data: 'checked' }],
                ],
            }),
        })
    ).message_id;

    console.log(msg_id);

    const WIDTH = 420;
    const HEIGHT = 595;
    const MARGIN = 24;

    const doc = new PDFDocument({
        size: [WIDTH, HEIGHT],
    });

    doc.image('./assets/bg.png', 0, 0, {
        fit: [doc.page.width, doc.page.height],
        align: 'center',
        valign: 'center',
    });

    doc.image('./assets/brandname.png', 104, 31, {
        fit: [114, 18],
    });

    doc.image('./assets/title.png', 24, 84, {
        fit: [352, 82],
    });

    doc.image('./assets/icon.png', 24, 413, {
        fit: [13, 13],
    });

    doc.image('./assets/allsaintslogo.png', 24, 24, {
        fit: [32, 32],
    });

    doc.image('./assets/shadowslogo.png', 64, 24, {
        fit: [32, 32],
    });

    doc.lineJoin('round');
    doc.roundedRect(24, 530, 150, 41, 8);
    doc.roundedRect(204, 379, 192, 192, 12);
    doc.fill('#242424');

    doc.font('./assets/font/Montserrat-Bold.ttf')
        .fillColor('#A3A3A3')
        .fontSize(10);
    doc.text('Билеттің шығарылған күні', MARGIN, MARGIN + 164);
    doc.text('Билеттің сериялық нөмірі', MARGIN, MARGIN + 198);
    doc.text('Жалпы сомасы', MARGIN, MARGIN + 472);
    doc.text('Байланыс ақпараты', MARGIN, MARGIN + 355);

    doc.fontSize(10);
    doc.font('./assets/font/Montserrat-Regular.ttf');
    doc.text('Дата выпуска билета', MARGIN, MARGIN + 176);
    doc.text('Серийный номер билета', MARGIN, MARGIN + 210);
    doc.text('Общая сумма', MARGIN, MARGIN + 484);
    doc.text('Контактная информация', MARGIN, MARGIN + 367);

    doc.font('./assets/font/Montserrat-Regular.ttf');
    doc.fontSize(10);
    doc.fillColor('#565656');
    doc.text('Локация', MARGIN, MARGIN + 244);
    doc.text('Время и дата', MARGIN, MARGIN + 301);

    doc.fillColor('#f6f6f6');
    doc.fontSize(10);
    doc.font('./assets/font/Montserrat-Bold.ttf');
    doc.text('17:00 Сбор', MARGIN + 54, MARGIN + 322);

    doc.font('./assets/font/Montserrat-Regular.ttf');
    doc.fontSize(10);
    doc.fillColor('#f6f6f6');
    doc.text('All Saints Бар,\nЧайковского к-сі, 170', MARGIN, MARGIN + 265);
    // doc.text("All Saints Бар, ул. Чайковского, 170", MARGIN, MARGIN + 265 + 12);
    doc.text('09.12.2023', MARGIN, MARGIN + 322);

    doc.fillColor('#f6f6f6');
    doc.font('./assets/font/Montserrat-Bold.ttf');
    doc.fontSize(15);
    doc.text('Покажите QR-код на входе и наслаждайтесь битвой', 204, 305, {
        width: 192,
    });

    doc.fillColor('#f6f6f6');
    doc.font('./assets/font/Montserrat-Bold.ttf');
    doc.fontSize(10);
    doc.text('saints.battle', 39, 413);
    doc.text('+7 707 870 8135', 24, 428);

    doc.font('./assets/font/JetBrainsMono-Bold.ttf');
    doc.fontSize(20).fillColor('#f6f6f6');
    doc.text('1200.00 KZT', MARGIN + 9, MARGIN + 514, { height: 41 });

    doc.font('./assets/font/JetBrainsMono-Bold.ttf')
        .fillColor('#A3A3A3')
        .fontSize(10);
    doc.text(customerDate.replace(/\/(East Kazakhstan Time)/), MARGIN + 180, MARGIN + 164);
    doc.text(customerNumber, MARGIN + 180, MARGIN + 198);

    const options = {
        errorCorrectionLevel: 'H',
        version: 10, // Размер QR-кода (можно изменить)
        margin: 0,
        color: {
            dark: '#f6f6f6', // Цвет тёмных пикселей
            light: '#242424', // Цвет светлых пикселей
        },
    };
    const QRCodeBuffer = await qrcode.toBuffer(
        `https://t.me/c/1923399192/${msg_id}`,
        options
    );
    doc.image(QRCodeBuffer, 212, 387, {
        fit: [176, 176],
    });

    const buffers = [];
    doc.on('data', (chunk) => {
        buffers.push(chunk);
    });

    doc.on('end', () => {
        // Concatenate the buffers to get the complete PDF content
        const buffer = Buffer.concat(buffers);

        // Send the PDF as a document to the Telegram chat
        bot.sendDocument(userId, buffer, { filename: 'example.pdf', caption: Messages.desc })
            .then(() => console.log('PDF sent successfully'))
            .catch((error) => console.error('Error sending PDF:', error));
    });

    // Finalize the PDF document to trigger the 'end' event
    doc.end();

    bot.sendMessage(userId, Messages.thanks);
});

bot.on('callback_query', (message) => {
    if (message.data !== 'checked') return null;

    bot.editMessageText(`<s>${message.message.text}</s>`, {
        parse_mode: 'HTML',
        chat_id: message.message.chat.id,
        message_id: message.message.message_id,
    });
});
