require('dotenv').config();
const mongoose     = require('mongoose');
const { Utilizador } = require('./models');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Ligado ao MongoDB');

  // Apagar contas existentes
  await Utilizador.deleteMany({ perfil: { $in: ['gestor','funcionario'] } });

  // Criar gestor
  await Utilizador.create({
    nome:   'Gestor Pedagógico',
    email:  'gestor@studyplan.com',
    senha:  'password',
    perfil: 'gestor'
  });

  // Criar funcionário
  await Utilizador.create({
    nome:   'Serviços Académicos',
    email:  'func@studyplan.com',
    senha:  'password',
    perfil: 'funcionario'
  });

  console.log('✅ Contas criadas!');
  console.log('   Gestor:      gestor@studyplan.com / password');
  console.log('   Funcionário: func@studyplan.com / password');
  mongoose.disconnect();
}

seed().catch(console.error);