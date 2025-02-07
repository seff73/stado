require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs-timezone-iana-plugin');

dayjs.extend(utc);
dayjs.extend(timezone);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
// const keys = require('./credentials.json');

// Configuración de la cuenta de servicio
const auth = new google.auth.JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  // email: keys.client_email,
  // key: keys.private_key.replace(/\\n/g, '\n'),
  key: process.env.GOOGLE_PRIVATE_KEY,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Endpoint para obtener datos
app.get('/api/data', async (req, res) => {
  try {
    await auth.authorize();
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Datos!A:E',
    });
    const rows = response.data.values;
    const headers = rows[0];
    const data = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al obtener los datos');
  }
});

// Endpoint para actualizar datos
app.post('/api/data/:index', async (req, res) => {
  const { index } = req.params;
  const { updatedRow } = req.body;

  try {
    await auth.authorize();
    const sheets = google.sheets({ version: 'v4', auth });
    // Obtener la fecha y hora actuales en el huso horario de Chile
    const timeZone = 'America/Santiago';
    const now = dayjs().tz(timeZone).format('DD/MM/YYYY HH:mm'); // Formato: día/mes/año hora:minutos

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `Datos!A${parseInt(index) + 2}:E${parseInt(index) + 2}`,
      valueInputOption: 'RAW',
      resource: {
        values: [[
          updatedRow.NOMBRE,
          updatedRow.EMAIL,
          updatedRow.HORAS,
          updatedRow.ESTADO,
          now, // Fecha de última actualización
        ]]
      }
    })
    res.send('Datos actualizados correctamente');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al actualizar los datos');
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en Puerto ${PORT}`);
});