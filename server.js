require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Client } = require('@notionhq/client');

const app = express();
const portNumber = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/**
 * Configura el servidor para entregar los archivos estáticos del frontend.
 * @param {Object} expressApp - La instancia de la aplicación Express.
 * @returns {void}
 */
const setupStaticFiles = (expressApp) => {
    const path = require('path');
    expressApp.use(express.static(path.join(__dirname, 'public')));
};

setupStaticFiles(app);

const notionClient = new Client({ auth: process.env.NOTION_SECRET });
const databaseId = process.env.NOTION_DB_ID;

/**
 * Extrae y formatea los datos crudos de Notion, incluyendo el ID único.
 * @param {Array} rawData - Los resultados sin procesar de Notion.
 * @returns {Array} Arreglo de objetos limpios.
 */
const formatExpenses = (rawData) => {
    return rawData.map(item => {
        const props = item.properties;
        return {
            id: item.id, // <-- CLAVE para poder editar/eliminar
            nombre: props.Nombre?.title[0]?.plain_text || 'Sin nombre',
            valor: props.Valor?.number || 0,
            metodoPago: props['Método Pago']?.select?.name || 'No especificado',
            tipo: props.Tipo?.select?.name || 'No especificado',
            fecha: props.Fecha?.date?.start || null
        };
    });
};

/**
 * Obtiene los registros de gastos filtrando dinámicamente.
 * @param {Object} req - Solicitud HTTP.
 * @param {Object} res - Respuesta HTTP.
 * @returns {Promise<void>}
 */
const getExpenses = async (req, res) => {
    try {
        const { start, end } = req.query;
        let queryFilter = undefined;

        if (start && end) {
            queryFilter = { and: [{ property: 'Fecha', date: { on_or_after: start } }, { property: 'Fecha', date: { on_or_before: end } }] };
        } else if (start) {
            queryFilter = { property: 'Fecha', date: { on_or_after: start } };
        } else if (end) {
            queryFilter = { property: 'Fecha', date: { on_or_before: end } };
        }

        const notionResponse = await notionClient.databases.query({
            database_id: databaseId,
            filter: queryFilter,
            sorts: [{ property: 'Fecha', direction: 'descending' }]
        });

        const cleanData = formatExpenses(notionResponse.results);
        res.json({ status: "Éxito", cantidad: cleanData.length, datos: cleanData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Crea un nuevo registro de gasto en Notion.
 * @param {Object} req - Solicitud HTTP.
 * @param {Object} res - Respuesta HTTP.
 * @returns {Promise<void>}
 */
const createExpense = async (req, res) => {
    try {
        const { nombre, valor, metodoPago, tipo } = req.body;
        const currentDate = new Date().toISOString().split('T')[0];

        const response = await notionClient.pages.create({
            parent: { database_id: databaseId },
            properties: {
                'Nombre': { title: [{ text: { content: nombre } }] },
                'Valor': { number: Number(valor) },
                'Método Pago': { select: { name: metodoPago } },
                'Tipo': { select: { name: tipo } },
                'Fecha': { date: { start: currentDate } }
            }
        });
        res.json({ status: "Éxito", data: response });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Actualiza un gasto existente en Notion.
 * @param {Object} req - Solicitud HTTP con el ID en los parámetros.
 * @param {Object} res - Respuesta HTTP.
 * @returns {Promise<void>}
 */
const updateExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, valor, metodoPago, tipo } = req.body;

        const response = await notionClient.pages.update({
            page_id: id,
            properties: {
                'Nombre': { title: [{ text: { content: nombre } }] },
                'Valor': { number: Number(valor) },
                'Método Pago': { select: { name: metodoPago } },
                'Tipo': { select: { name: tipo } }
            }
        });
        res.json({ status: "Éxito", data: response });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Archiva (elimina) un gasto en Notion.
 * @param {Object} req - Solicitud HTTP con el ID.
 * @param {Object} res - Respuesta HTTP.
 * @returns {Promise<void>}
 */
const deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const response = await notionClient.pages.update({
            page_id: id,
            archived: true // Así se elimina en Notion
        });
        res.json({ status: "Éxito", data: response });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

app.get('/api/gastos', getExpenses);
app.post('/api/gastos', createExpense);
app.put('/api/gastos/:id', updateExpense);
app.delete('/api/gastos/:id', deleteExpense);

/**
 * Mantiene el servidor de Render despierto realizando una petición HTTP a sí mismo cada 14 minutos.
 * @param {string} appUrl - La URL pública de tu aplicación en Render.
 * @returns {void}
 */
const preventSleepMode = (appUrl) => {
    const fourteenMinutes = 14 * 60 * 1000; // Convertimos minutos a milisegundos

    setInterval(async () => {
        try {
            const response = await fetch(appUrl);
            console.log(`Ping de mantenimiento enviado. Servidor activo (Status: ${response.status})`);
        } catch (error) {
            console.error('Error en el ping automático:', error.message);
        }
    }, fourteenMinutes);
};

/**
 * Inicia el servidor Express y activa el ping de mantenimiento.
 * @returns {void}
 */
const startServer = () => {
    console.log(`🚀 Servidor corriendo en el puerto ${portNumber}`);

    const renderUrl = 'https://control-gastos-dibm.onrender.com/';
    preventSleepMode(renderUrl);
};

// Levantamos el servidor
app.listen(portNumber, startServer);