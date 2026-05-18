const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const { Op } = require('sequelize');
const { Funcionario, RegistroPonto, Solicitacao, Atestado, Empresa } = require('../models');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function onlyDigits(value = '') {
  return String(value).replace(/\D/g, '');
}

function defaultPasswordFromCpf(cpf = '') {
  const digits = onlyDigits(cpf);
  return digits.slice(0, 5);
}

function isValidCpfDigits(cpf = '') {
  return /^\d{11}$/.test(String(cpf));
}

function getMonthBounds(month, year) {
  const now = new Date();
  const m = Number.isFinite(Number(month)) ? Number(month) : now.getMonth() + 1;
  const y = Number.isFinite(Number(year)) ? Number(year) : now.getFullYear();
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  return { start, end, month: m, year: y };
}

function parseShift(shift = '08:00-17:00') {
  const [start = '08:00', end = '17:00'] = String(shift).split('-');
  return { start, end };
}

function toMinutes(hhmm = '00:00') {
  const [h, m] = String(hhmm).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatMinutes(total) {
  const abs = Math.abs(total);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = total < 0 ? '-' : '';
  return `${sign}${h}h ${String(m).padStart(2, '0')}m`;
}

function normalizeDateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseLocalDateInput(value) {
  if (!value) return new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }
  return new Date(value);
}

function classifyPunchStatus(timeString, shiftStart) {
  const punchMinutes = toMinutes(timeString.slice(0, 5));
  const expected = toMinutes(shiftStart);
  if (punchMinutes > expected) return 'atraso';
  if (punchMinutes < expected) return 'hora_extra';
  return 'normal';
}

function calcWorkedMinutes(dayRegs = []) {
  const ordered = [...dayRegs].sort((a, b) => new Date(a.batida) - new Date(b.batida));
  const entrada = ordered.find(r => r.tipo === 'entrada');
  const saida = [...ordered].reverse().find(r => r.tipo === 'saida');
  if (!entrada || !saida) return 0;

  let worked = Math.max(0, Math.round((new Date(saida.batida) - new Date(entrada.batida)) / 60000));
  let breakStart = null;
  let breakMinutes = 0;

  ordered.forEach(r => {
    if (r.tipo === 'intervalo_saida') {
      breakStart = new Date(r.batida);
      return;
    }
    if (r.tipo === 'intervalo_retorno' && breakStart) {
      breakMinutes += Math.max(0, Math.round((new Date(r.batida) - breakStart) / 60000));
      breakStart = null;
    }
  });

  worked -= breakMinutes;
  return Math.max(0, worked);
}

async function ensureEmpresa(idEmpresa = 1) {
  const found = await Empresa.findByPk(idEmpresa);
  if (found) return found;

  return Empresa.create({
    id_empresa: idEmpresa,
    razao_social: 'Empresa Padrao PontoSeguro',
    nome_fantasia: 'PontoSeguro',
    cnpj: `0000000000000${idEmpresa}`,
    endereco: 'Endereco nao informado',
    cidade: 'Nao informado',
    estado: 'NA',
    cep: '00000000',
    data_cadastro: new Date()
  });
}

function buildPdf(res, title, rows = []) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${title}.pdf"`);
  doc.pipe(res);

  doc.fontSize(18).text(title, { align: 'left' });
  doc.moveDown();
  doc.fontSize(10).text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`);
  doc.moveDown();

  rows.forEach((row, idx) => {
    doc.fontSize(11).text(`${idx + 1}. ${row}`);
    doc.moveDown(0.4);
  });

  doc.end();
}

async function authenticate(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token ausente' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'pontoseguro-dev-secret');
    const user = await Funcionario.findByPk(payload.id);
    if (!user) return res.status(401).json({ error: 'Token invalido' });
    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalido' });
  }
}

function requireRh(req, res, next) {
  if (isRhUser(req.user)) {
    return next();
  }
  return res.status(403).json({ error: 'Acesso permitido apenas para RH' });
}

function isRhUser(user) {
  const perfil = user?.perfil || '';
  return perfil === 'rh' || String(user?.cargo || '').toLowerCase().includes('rh');
}

function nonRhWhere() {
  return {
    [Op.and]: [
      {
        [Op.or]: [
          { perfil: { [Op.ne]: 'rh' } },
          { perfil: { [Op.is]: null } }
        ]
      },
      {
        [Op.or]: [
          { cargo: { [Op.notLike]: '%rh%' } },
          { cargo: { [Op.is]: null } }
        ]
      }
    ]
  };
}

module.exports = {
  authenticate,
  requireRh,

  async login(req, res) {
    const { identifier, password, role } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Informe CPF/e-mail e senha' });
    }

    const isEmail = String(identifier).includes('@');
    const cpf = onlyDigits(identifier);
    if (!isEmail && !isValidCpfDigits(cpf)) {
      return res.status(400).json({ error: 'CPF deve conter 11 numeros' });
    }
    const where = isEmail ? { email: identifier } : { cpf };

    const user = await Funcionario.findOne({ where });
    if (!user) return res.status(401).json({ error: 'Usuario nao encontrado' });

    let passwordMatch = false;
    if (user.senha && user.senha.startsWith('$2')) {
      passwordMatch = await bcrypt.compare(String(password), user.senha);
    } else {
      passwordMatch = String(user.senha) === String(password);
    }

    if (!passwordMatch) return res.status(401).json({ error: 'Senha incorreta' });

    const perfil = user.perfil || (String(user.cargo || '').toLowerCase().includes('rh') ? 'rh' : 'colaborador');
    if (role && role !== perfil) {
      return res.status(403).json({ error: 'Perfil sem permissao para este login' });
    }

    const token = jwt.sign(
      { id: user.id_funcionario, perfil },
      process.env.JWT_SECRET || 'pontoseguro-dev-secret',
      { expiresIn: '1d' }
    );

    return res.json({
      token,
      user: {
        id: user.id_funcionario,
        name: user.nome,
        email: user.email,
        cpf: user.cpf,
        perfil,
        shift: user.jornada || '08:00-17:00'
      }
    });
  },

  async registerColaborador(req, res) {
    const { nome, cpf, cargo, id_empresa = 1 } = req.body;
    if (!nome || !cpf) {
      return res.status(400).json({ error: 'Nome e CPF sao obrigatorios' });
    }

    const cpfDigits = onlyDigits(cpf);
    if (!isValidCpfDigits(cpfDigits)) {
      return res.status(400).json({ error: 'CPF deve conter 11 numeros' });
    }

    await ensureEmpresa(id_empresa);

    const existing = await Funcionario.findOne({ where: { cpf: cpfDigits } });
    if (existing) {
      return res.status(409).json({ error: 'CPF ja cadastrado' });
    }

    const rawPassword = defaultPasswordFromCpf(cpfDigits);
    const senha = await bcrypt.hash(rawPassword, 8);

    const novo = await Funcionario.create({
      id_empresa,
      nome,
      cpf: cpfDigits,
      contato: null,
      email: null,
      senha,
      cargo: cargo || 'Colaborador',
      perfil: 'colaborador',
      jornada: '08:00-17:00',
      status: 'ativo',
      data_cadastro: new Date(),
      data_atualizacao: new Date()
    });

    return res.status(201).json({
      id: novo.id_funcionario,
      nome: novo.nome,
      cpf: novo.cpf,
      senha_padrao: rawPassword,
      mensagem: 'Cadastro concluido. A senha inicial e os 5 primeiros digitos do CPF.'
    });
  },

  async me(req, res) {
    const u = req.user;
    return res.json({
      id: u.id_funcionario,
      nome: u.nome,
      email: u.email,
      cpf: u.cpf,
      cargo: u.cargo,
      perfil: u.perfil || 'colaborador',
      jornada: u.jornada || '08:00-17:00'
    });
  },

  async registrarPonto(req, res) {
    if (isRhUser(req.user)) {
      return res.status(403).json({ error: 'Perfil RH nao possui registro de ponto' });
    }

    const { tipo, latitude = null, longitude = null } = req.body;
    const tipos = ['entrada', 'intervalo_saida', 'intervalo_retorno', 'saida'];
    if (!tipos.includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de ponto invalido' });
    }

    const registro = await RegistroPonto.create({
      id_funcionario: req.user.id_funcionario,
      id_empresa: req.user.id_empresa,
      tipo,
      batida: new Date(),
      latitude,
      longitude,
      status: 'sincronizado',
      data_cadastro: new Date(),
      data_atualizacao: new Date()
    });

    return res.status(201).json(registro);
  },

  async meusPontos(req, res) {
    if (isRhUser(req.user)) {
      return res.status(403).json({ error: 'Perfil RH nao possui registro de ponto' });
    }

    const { start, end } = getMonthBounds(req.query.month, req.query.year);
    const registros = await RegistroPonto.findAll({
      where: {
        id_funcionario: req.user.id_funcionario,
        batida: { [Op.between]: [start, end] }
      },
      order: [['batida', 'ASC']]
    });

    return res.json(registros);
  },

  async resumoMensalColaborador(req, res) {
    if (isRhUser(req.user)) {
      return res.status(403).json({ error: 'Perfil RH nao possui resumo de ponto' });
    }

    const { start, end } = getMonthBounds(req.query.month, req.query.year);
    const shift = parseShift(req.user.jornada || '08:00-17:00');
    const expectedStart = shift.start;

    const registros = await RegistroPonto.findAll({
      where: {
        id_funcionario: req.user.id_funcionario,
        batida: { [Op.between]: [start, end] }
      },
      order: [['batida', 'ASC']]
    });

    const byDay = {};
    registros.forEach(r => {
      const key = normalizeDateKey(r.batida);
      byDay[key] = byDay[key] || [];
      byDay[key].push(r);
    });

    let worked = 0;
    let extras = 0;
    let delays = 0;

    Object.values(byDay).forEach(dayRegs => {
      const entrada = dayRegs.find(r => r.tipo === 'entrada');
      const saida = [...dayRegs].reverse().find(r => r.tipo === 'saida');
      if (!entrada || !saida) return;

      const total = Math.max(0, Math.round((new Date(saida.batida) - new Date(entrada.batida)) / 60000));
      worked += total;

      const status = classifyPunchStatus(new Date(entrada.batida).toTimeString(), expectedStart);
      if (status === 'hora_extra') extras += Math.abs(toMinutes(expectedStart) - toMinutes(new Date(entrada.batida).toTimeString().slice(0, 5)));
      if (status === 'atraso') delays += Math.abs(toMinutes(expectedStart) - toMinutes(new Date(entrada.batida).toTimeString().slice(0, 5)));
    });

    return res.json({
      horas_mes: formatMinutes(worked),
      horas_extras: formatMinutes(extras),
      atrasos: formatMinutes(delays),
      saldo_extras_total: formatMinutes(extras - delays)
    });
  },

  async criarSolicitacao(req, res) {
    const { tipo, descricao, data_referencia } = req.body;
    if (!tipo || !descricao) {
      return res.status(400).json({ error: 'Tipo e descricao sao obrigatorios' });
    }

    const nova = await Solicitacao.create({
      id_funcionario: req.user.id_funcionario,
      id_empresa: req.user.id_empresa,
      tipo,
      descricao,
      data_referencia: data_referencia ? new Date(data_referencia) : new Date(),
      status: 'pendente',
      data_cadastro: new Date(),
      data_atualizacao: new Date()
    });

    return res.status(201).json(nova);
  },

  async minhasSolicitacoes(req, res) {
    const rows = await Solicitacao.findAll({
      where: { id_funcionario: req.user.id_funcionario },
      order: [['data_cadastro', 'DESC']]
    });
    return res.json(rows);
  },

  async uploadAtestado(req, res) {
    if (!req.file) {
      return res.status(400).json({ error: 'Envie um arquivo PNG ou PDF' });
    }

    const { descricao = 'Atestado medico', data_referencia } = req.body;
    const created = await Atestado.create({
      id_funcionario: req.user.id_funcionario,
      id_empresa: req.user.id_empresa,
      descricao,
      data_referencia: data_referencia ? new Date(data_referencia) : new Date(),
      arquivo_nome: req.file.originalname,
      arquivo_path: `/uploads/${req.file.filename}`,
      status: 'pendente',
      data_cadastro: new Date(),
      data_atualizacao: new Date()
    });

    return res.status(201).json(created);
  },

  async meusAtestados(req, res) {
    const rows = await Atestado.findAll({
      where: { id_funcionario: req.user.id_funcionario },
      order: [['data_cadastro', 'DESC']]
    });
    return res.json(rows);
  },

  async rhFuncionarios(req, res) {
    const rows = await Funcionario.findAll({ where: nonRhWhere(), order: [['nome', 'ASC']] });
    return res.json(rows);
  },

  async rhCriarFuncionario(req, res) {
    const { nome, cpf, email, cargo, departamento, jornada = '08:00-17:00', perfil = 'colaborador', id_empresa = 1 } = req.body;
    if (!nome || !cpf) return res.status(400).json({ error: 'Nome e CPF obrigatorios' });

    const cpfDigits = onlyDigits(cpf);
    if (!isValidCpfDigits(cpfDigits)) {
      return res.status(400).json({ error: 'CPF deve conter 11 numeros' });
    }
    await ensureEmpresa(id_empresa);
    const senha = await bcrypt.hash(defaultPasswordFromCpf(cpfDigits), 8);
    const created = await Funcionario.create({
      id_empresa,
      nome,
      cpf: cpfDigits,
      email,
      cargo,
      departamento,
      jornada,
      perfil,
      senha,
      status: 'ativo',
      data_cadastro: new Date(),
      data_atualizacao: new Date()
    });

    return res.status(201).json(created);
  },

  async rhAtualizarFuncionario(req, res) {
    const { id } = req.params;
    const funcionario = await Funcionario.findByPk(id);
    if (!funcionario) return res.status(404).json({ error: 'Funcionario nao encontrado' });

    const payload = { ...req.body, data_atualizacao: new Date() };
    if (payload.cpf) {
      payload.cpf = onlyDigits(payload.cpf);
      if (!isValidCpfDigits(payload.cpf)) {
        return res.status(400).json({ error: 'CPF deve conter 11 numeros' });
      }
    }

    await funcionario.update(payload);
    return res.json(funcionario);
  },

  async rhSolicitacoes(req, res) {
    const where = {};
    if (req.query.status && req.query.status !== 'all') where.status = req.query.status;

    const rows = await Solicitacao.findAll({
      where,
      include: [{ model: Funcionario, attributes: ['id_funcionario', 'nome'] }],
      order: [['data_cadastro', 'DESC']]
    });
    return res.json(rows);
  },

  async rhAtualizarSolicitacao(req, res) {
    const { id } = req.params;
    const { status } = req.body;
    const permitidos = ['pendente', 'aprovado', 'negado'];
    if (!permitidos.includes(status)) return res.status(400).json({ error: 'Status invalido' });

    const row = await Solicitacao.findByPk(id);
    if (!row) return res.status(404).json({ error: 'Solicitacao nao encontrada' });

    await row.update({ status, data_atualizacao: new Date() });
    return res.json(row);
  },

  async rhAtestados(req, res) {
    const rows = await Atestado.findAll({
      include: [{ model: Funcionario, attributes: ['id_funcionario', 'nome'] }],
      order: [['data_cadastro', 'DESC']]
    });
    return res.json(rows);
  },

  async rhAtualizarAtestado(req, res) {
    const { id } = req.params;
    const { status } = req.body;
    const permitidos = ['pendente', 'aprovado', 'negado'];
    if (!permitidos.includes(status)) return res.status(400).json({ error: 'Status invalido' });

    const row = await Atestado.findByPk(id);
    if (!row) return res.status(404).json({ error: 'Atestado nao encontrado' });

    await row.update({ status, data_atualizacao: new Date() });
    return res.json(row);
  },

  async rhAdicionarPontoManual(req, res) {
    const { id } = req.params;
    const { tipo, data, horario } = req.body;
    const tipos = ['entrada', 'intervalo_saida', 'intervalo_retorno', 'saida'];
    if (!tipos.includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de ponto invalido' });
    }

    const funcionario = await Funcionario.findByPk(id);
    if (!funcionario) return res.status(404).json({ error: 'Funcionario nao encontrado' });
    if (isRhUser(funcionario)) return res.status(400).json({ error: 'Nao e permitido ponto para perfil RH' });

    const dataBase = parseLocalDateInput(data);
    if (Number.isNaN(dataBase.getTime())) {
      return res.status(400).json({ error: 'Data invalida' });
    }

    const horaValida = /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(horario || ''));
    if (!horaValida) {
      return res.status(400).json({ error: 'Horario invalido. Use HH:mm' });
    }

    const [h, m] = String(horario).split(':').map(Number);
    const batida = new Date(dataBase);
    batida.setHours(h, m, 0, 0);

    const registro = await RegistroPonto.create({
      id_funcionario: funcionario.id_funcionario,
      id_empresa: funcionario.id_empresa,
      tipo,
      batida,
      status: 'sincronizado',
      data_cadastro: new Date(),
      data_atualizacao: new Date()
    });

    return res.status(201).json(registro);
  },

  async rhRemoverPonto(req, res) {
    const { id } = req.params;
    const row = await RegistroPonto.findByPk(id);
    if (!row) return res.status(404).json({ error: 'Registro de ponto nao encontrado' });
    await row.destroy();
    return res.json({ ok: true });
  },

  async rhEditarPontoHorario(req, res) {
    const { id } = req.params;
    const { horario, tipo } = req.body;
    const horaValida = /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(horario || ''));
    if (!horaValida) {
      return res.status(400).json({ error: 'Horario invalido. Use HH:mm' });
    }
    if (tipo && !['entrada', 'intervalo_saida', 'intervalo_retorno', 'saida'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de ponto invalido' });
    }

    const row = await RegistroPonto.findByPk(id);
    if (!row) return res.status(404).json({ error: 'Registro de ponto nao encontrado' });

    const [h, m] = String(horario).split(':').map(Number);
    const batida = new Date(row.batida);
    batida.setHours(h, m, 0, 0);

    await row.update({ tipo: tipo || row.tipo, batida, data_atualizacao: new Date() });
    return res.json(row);
  },

  async rhDashboard(req, res) {
    const baseDate = parseLocalDateInput(req.query.date);
    if (Number.isNaN(baseDate.getTime())) {
      return res.status(400).json({ error: 'Data invalida' });
    }

    const funcionarios = await Funcionario.findAll({ where: nonRhWhere(), order: [['nome', 'ASC']] });
    const funcionariosIds = funcionarios.map(f => f.id_funcionario);
    const hojeIni = new Date(baseDate);
    hojeIni.setHours(0, 0, 0, 0);
    const hojeFim = new Date(baseDate);
    hojeFim.setHours(23, 59, 59, 999);

    const pontosHoje = await RegistroPonto.findAll({
      where: {
        id_funcionario: { [Op.in]: funcionariosIds },
        batida: { [Op.between]: [hojeIni, hojeFim] }
      },
      order: [['batida', 'ASC']]
    });

    const ultimaBatidaGlobal = pontosHoje.length ? new Date(pontosHoje[pontosHoje.length - 1].batida) : null;

    const byFunc = {};
    pontosHoje.forEach(p => {
      byFunc[p.id_funcionario] = byFunc[p.id_funcionario] || [];
      byFunc[p.id_funcionario].push(p);
    });

    const rows = funcionarios.map(f => {
      const regs = byFunc[f.id_funcionario] || [];
      const entrada = regs.find(r => r.tipo === 'entrada');
      const intervaloSaida = regs.find(r => r.tipo === 'intervalo_saida');
      const intervaloRetorno = regs.find(r => r.tipo === 'intervalo_retorno');
      const saida = [...regs].reverse().find(r => r.tipo === 'saida');
      const horario = entrada ? new Date(entrada.batida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
      const shiftStart = parseShift(f.jornada || '08:00-16:00').start;
      const shift = parseShift(f.jornada || '08:00-16:00');
      const metaDia = Math.max(0, toMinutes(shift.end) - toMinutes(shift.start));
      const worked = calcWorkedMinutes(regs);
      const typeCount = {};
      regs.forEach(r => {
        typeCount[r.tipo] = (typeCount[r.tipo] || 0) + 1;
      });
      const hasDuplicate = Object.values(typeCount).some(v => v > 1);
      const status = !entrada ? 'ausencia_ponto' : hasDuplicate ? 'ponto_duplicado' : 'em_expediente';
      const entradaMin = entrada ? toMinutes(new Date(entrada.batida).toTimeString().slice(0, 5)) : null;
      const shiftStartMin = toMinutes(shiftStart);
      const atrasoMin = entradaMin !== null && entradaMin > shiftStartMin ? -(entradaMin - shiftStartMin) : 0;
      const horasNormaisMin = Math.max(0, Math.min(worked, metaDia));
      const horasExtrasMin = Math.max(0, worked - metaDia);
      const ultimaBatida = regs.length ? new Date(regs[regs.length - 1].batida) : null;

      return {
        id_funcionario: f.id_funcionario,
        nome: f.nome,
        cargo: f.cargo,
        departamento: f.departamento || 'Geral',
        jornada: f.jornada || '08:00-17:00',
        hora_ponto: horario,
        entrada: entrada ? new Date(entrada.batida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--',
        intervalo_saida: intervaloSaida ? new Date(intervaloSaida.batida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--',
        intervalo_retorno: intervaloRetorno ? new Date(intervaloRetorno.batida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--',
        saida: saida ? new Date(saida.batida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--',
        total_trabalhado: formatMinutes(worked),
        saldo_dia: formatMinutes(worked - metaDia),
        horas_normais: formatMinutes(horasNormaisMin),
        horas_extras: formatMinutes(horasExtrasMin),
        atraso: formatMinutes(atrasoMin),
        ponto_duplicado: hasDuplicate,
        status,
        ultima_batida_iso: ultimaBatida ? ultimaBatida.toISOString() : null
      };
    });

    return res.json({
      data_atual: new Date().toLocaleDateString('pt-BR'),
      hora_atual: new Date().toLocaleTimeString('pt-BR'),
      data_referencia: hojeIni.toISOString().slice(0, 10),
      colaboradores: rows,
      total_batidas: pontosHoje.length,
      ultima_batida_iso: ultimaBatidaGlobal ? ultimaBatidaGlobal.toISOString() : null
    });
  },

  async rhPontosDiaFuncionario(req, res) {
    const { id } = req.params;
    const baseDate = parseLocalDateInput(req.query.data);
    if (Number.isNaN(baseDate.getTime())) {
      return res.status(400).json({ error: 'Data invalida' });
    }

    const ini = new Date(baseDate);
    ini.setHours(0, 0, 0, 0);
    const fim = new Date(baseDate);
    fim.setHours(23, 59, 59, 999);

    const funcionario = await Funcionario.findByPk(id);
    if (!funcionario) return res.status(404).json({ error: 'Funcionario nao encontrado' });
    if (isRhUser(funcionario)) return res.status(400).json({ error: 'Perfil RH nao possui ponto' });

    const regs = await RegistroPonto.findAll({
      where: {
        id_funcionario: id,
        batida: { [Op.between]: [ini, fim] }
      },
      order: [['batida', 'ASC']]
    });

    const worked = calcWorkedMinutes(regs);
    const shift = parseShift(funcionario.jornada || '08:00-17:00');
    const metaDia = Math.max(0, toMinutes(shift.end) - toMinutes(shift.start));
    const labels = {
      entrada: 'Entrada',
      intervalo_saida: 'Intervalo',
      intervalo_retorno: 'Fim do Intervalo',
      saida: 'Saida'
    };

    return res.json({
      funcionario: funcionario.nome,
      data: ini.toISOString().slice(0, 10),
      jornada: funcionario.jornada || '08:00-17:00',
      horas_trabalhadas: formatMinutes(worked),
      saldo_dia: formatMinutes(worked - metaDia),
      registros: regs.map(r => ({
        id_registro: r.id_registro,
        tipo: r.tipo,
        label: labels[r.tipo] || r.tipo,
        horario: new Date(r.batida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        batida_iso: new Date(r.batida).toISOString()
      }))
    });
  },

  async rhBancoHoras(req, res) {
    const { start, end } = getMonthBounds(req.query.month, req.query.year);
    const funcionarios = await Funcionario.findAll({ where: nonRhWhere(), order: [['nome', 'ASC']] });
    const funcionariosIds = funcionarios.map(f => f.id_funcionario);
    const registros = await RegistroPonto.findAll({
      where: {
        id_funcionario: { [Op.in]: funcionariosIds },
        batida: { [Op.between]: [start, end] }
      },
      order: [['batida', 'ASC']]
    });

    const byFunc = {};
    registros.forEach(r => {
      byFunc[r.id_funcionario] = byFunc[r.id_funcionario] || [];
      byFunc[r.id_funcionario].push(r);
    });

    const response = funcionarios.map(f => {
      const shift = parseShift(f.jornada || '08:00-17:00');
      const metaDia = Math.max(0, toMinutes(shift.end) - toMinutes(shift.start));
      const days = {};

      (byFunc[f.id_funcionario] || []).forEach(r => {
        const key = normalizeDateKey(r.batida);
        days[key] = days[key] || [];
        days[key].push(r);
      });

      let worked = 0;
      Object.values(days).forEach(dayRegs => {
        const entrada = dayRegs.find(x => x.tipo === 'entrada');
        const saida = [...dayRegs].reverse().find(x => x.tipo === 'saida');
        if (!entrada || !saida) return;
        worked += Math.max(0, Math.round((new Date(saida.batida) - new Date(entrada.batida)) / 60000));
      });

      const expected = Object.keys(days).length * metaDia;
      const saldo = worked - expected;

      return {
        id_funcionario: f.id_funcionario,
        nome: f.nome,
        cargo: f.cargo,
        horas_mes: formatMinutes(worked),
        meta: formatMinutes(expected),
        saldo: formatMinutes(saldo)
      };
    });

    return res.json(response);
  },

  async rhBancoHorasDetalhe(req, res) {
    const { id } = req.params;
    const { start, end } = getMonthBounds(req.query.month, req.query.year);
    const funcionario = await Funcionario.findByPk(id);
    if (!funcionario) return res.status(404).json({ error: 'Funcionario nao encontrado' });
    if (isRhUser(funcionario)) return res.status(400).json({ error: 'Perfil RH nao possui ponto' });

    const regs = await RegistroPonto.findAll({
      where: {
        id_funcionario: id,
        batida: { [Op.between]: [start, end] }
      },
      order: [['batida', 'ASC']]
    });

    const days = {};
    regs.forEach(r => {
      const key = normalizeDateKey(r.batida);
      days[key] = days[key] || [];
      days[key].push(r);
    });

    const shift = parseShift(funcionario.jornada || '08:00-17:00');
    const metaDia = Math.max(0, toMinutes(shift.end) - toMinutes(shift.start));

    const detalhes = Object.keys(days).sort().map(day => {
      const dayRegs = days[day];
      const entrada = dayRegs.find(x => x.tipo === 'entrada');
      const saida = [...dayRegs].reverse().find(x => x.tipo === 'saida');
      const worked = entrada && saida ? Math.max(0, Math.round((new Date(saida.batida) - new Date(entrada.batida)) / 60000)) : 0;
      return {
        dia: day,
        entrada: entrada ? new Date(entrada.batida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--',
        saida: saida ? new Date(saida.batida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--',
        horas_trabalhadas: formatMinutes(worked),
        saldo_dia: formatMinutes(worked - metaDia)
      };
    });

    return res.json({ funcionario: funcionario.nome, detalhes });
  },

  async reportSolicitacoesPdf(req, res) {
    const rows = await Solicitacao.findAll({ include: [{ model: Funcionario, attributes: ['nome'] }], order: [['data_cadastro', 'DESC']] });
    buildPdf(res, 'solicitacoes-rh', rows.map(r => `${r.Funcionario?.nome || 'N/A'} | ${r.tipo} | ${r.status} | ${new Date(r.data_cadastro).toLocaleDateString('pt-BR')}`));
  },

  async reportPontosPdf(req, res) {
    const { start, end } = getMonthBounds(req.query.month, req.query.year);
    const rows = await RegistroPonto.findAll({
      where: { batida: { [Op.between]: [start, end] } },
      include: [{ model: Funcionario, attributes: ['nome'] }],
      order: [['batida', 'DESC']]
    });
    buildPdf(res, 'espelho-ponto', rows.map(r => `${r.Funcionario?.nome || 'N/A'} | ${r.tipo} | ${new Date(r.batida).toLocaleString('pt-BR')}`));
  },

  async reportAtestadosPdf(req, res) {
    const rows = await Atestado.findAll({ include: [{ model: Funcionario, attributes: ['nome'] }], order: [['data_cadastro', 'DESC']] });
    buildPdf(res, 'atestados', rows.map(r => `${r.Funcionario?.nome || 'N/A'} | ${r.descricao} | ${r.status} | ${new Date(r.data_cadastro).toLocaleDateString('pt-BR')}`));
  }
};