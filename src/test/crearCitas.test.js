require('dotenv').config({ path: '.env.test' }); // Cargar variables de entorno de test
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app'); // Importar la app sin levantar el servidor
const Client = require('../models/Cliente');

let mongoServer;

beforeAll(async () => {
  // Iniciar MongoDB en memoria
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('POST /citas/create', () => {
  beforeEach(async () => {
    await Client.deleteMany();
  });

  it('Debe crear una cita correctamente', async () => {
    const response = await request(app).post('/citas/create').send({
      name: 'Juan Pérez',
      email: 'juanmartinarrayago@gmail.com',
      phoneNumber: '+542241563807',
      message:
        'Este es un mensaje de prueba que supera los 200 caracteres. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla condimentum tortor eu libero hendrerit, a suscipit dui maximus. Integer nec neque ipsum.Este es un mensaje de prueba que supera los 200 caracteres. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla condimentum tortor eu libero hendrerit, a suscipit dui maximus. Integer nec neque ipsum.Este es un mensaje de prueba que supera los 200 caracteres. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla condimentum tortor eu libero hendrerit, a suscipit dui maximus. Integer nec neque ipsum.Este es un mensaje de prueba que supera los 200 caracteres. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla condimentum tortor eu libero hendrerit, a suscipit dui maximus. Integer nec neque ipsum.Este es un mensaje de prueba que supera los 200 caracteres. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla condimentum tortor eu libero hendrerit, a suscipit dui maximus. Integer nec neque ipsum.',
      dia: 'Lunes',
      hora: '10:00',
      fecha: '2025-01-01',
      agendarEnGoogle: false,
    });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('message', 'Cita creada correctamente');

    const client = await Client.findOne({ email: 'juanmartinarrayago@gmail.com' });
    expect(client).not.toBeNull();
    expect(client.name).toBe('Juan Pérez');
  });

  it('Debe fallar si falta algún campo obligatorio', async () => {
    const response = await request(app).post('/citas/create').send({
      name: 'Juan Pérez',
      email: 'juanmartinarrayago@gmail.com',
      phoneNumber: '+542241563807',
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message', 'Todos los campos son obligatorios');
  });

  it('Debe fallar si el email es inválido', async () => {
    const response = await request(app).post('/citas/create').send({
      name: 'Juan Pérez',
      email: 'abc123',
      phoneNumber: '+542241563807',
      message:
        'Mensaje válido con más de 200 caracteres. Lorem ipsum dolor sit amet, consectetur adipiscing elit.Este es un mensaje de prueba que supera los 200 caracteres. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla condimentum tortor eu libero hendrerit, a suscipit dui maximus. Integer nec neque ipsum.Este es un mensaje de prueba que supera los 200 caracteres. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla condimentum tortor eu libero hendrerit, a suscipit dui maximus. Integer nec neque ipsum.Este es un mensaje de prueba que supera los 200 caracteres. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla condimentum tortor eu libero hendrerit, a suscipit dui maximus. Integer nec neque ipsum.',
      dia: 'Lunes',
      hora: '10:00',
      fecha: '2025-01-01',
      agendarEnGoogle: false,
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message', 'El email no es válido');
  });

  it('Debe fallar si el número de teléfono es inválido', async () => {
    const response = await request(app).post('/citas/create').send({
      name: 'Juan Pérez',
      email: 'juanmartinarrayago@gmail.com',
      phoneNumber: '5492241563807',
      message:
        'Mensaje válido con más de 200 caracteres. Lorem ipsum dolor sit amet, consectetur adipiscing elit.Este es un mensaje de prueba que supera los 200 caracteres. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla condimentum tortor eu libero hendrerit, a suscipit dui maximus. Integer nec neque ipsum.Este es un mensaje de prueba que supera los 200 caracteres. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla condimentum tortor eu libero hendrerit, a suscipit dui maximus. Integer nec neque ipsum.Este es un mensaje de prueba que supera los 200 caracteres. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla condimentum tortor eu libero hendrerit, a suscipit dui maximus. Integer nec neque ipsum.Este es un mensaje de prueba que supera los 200 caracteres. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla condimentum tortor eu libero hendrerit, a suscipit dui maximus. Integer nec neque ipsum.',
      dia: 'Lunes',
      hora: '10:00',
      fecha: '2025-01-01',
      agendarEnGoogle: false,
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message', 'El número de teléfono no es válido');
  });

  it('Debe fallar si el mensaje tiene menos de 200 caracteres', async () => {
    const response = await request(app).post('/citas/create').send({
      name: 'Juan Pérez',
      email: 'juanmartinarrayago@gmail.com',
      phoneNumber: '+5492241563807',
      message: 'Mensaje corto',
      dia: 'Lunes',
      hora: '10:00',
      fecha: '2025-01-01',
      agendarEnGoogle: false,
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty(
      'message',
      'El mensaje debe tener al menos 200 caracteres'
    );
  });
});
