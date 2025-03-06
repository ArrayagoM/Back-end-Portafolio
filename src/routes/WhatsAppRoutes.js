const whatsappService = require('../services/whatsappService');

exports.getWhatsAppQR = async (req, res) => {
  try {
    const status = await whatsappService.getClientStatus();

    if (status.status === 204) {
      return res.sendStatus(204); // Sesión activa
    }

    if (status.status === 200) {
      // Si el QR está disponible, devolvemos el QR
      if (status.qr) {
        return res.status(200).json({ qr: status.qr });
      } else {
        // Si no hay QR pero el cliente está intentando conectarse, devolvemos el mensaje de espera
        return res.status(200).json({ message: status.message });
      }
    }

    return res.status(500).json({ message: status.message }); // Error inesperado
  } catch (error) {
    console.error('Error en getWhatsAppQR:', error.message);
    return res.status(500).json({ message: 'Error al obtener el QR.' });
  }
};
