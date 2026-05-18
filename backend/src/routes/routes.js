const express = require('express');
const multer = require('multer');
const path = require('path');
const routes = express.Router();
const SystemController = require('../controllers/SystemController');

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, path.join(__dirname, '..', '..', 'uploads'));
	},
	filename: (req, file, cb) => {
		const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
		cb(null, `${unique}-${file.originalname.replace(/\s+/g, '_')}`);
	}
});

const upload = multer({
	storage,
	fileFilter: (req, file, cb) => {
		const allowed = ['application/pdf', 'image/png'];
		if (!allowed.includes(file.mimetype)) {
			return cb(new Error('Somente PDF e PNG sao permitidos'));
		}
		cb(null, true);
	}
});

// Rota de teste
routes.get('/health', (req, res) => res.send('API PontoSeguro Rodando!'));

routes.post('/login', SystemController.login);
routes.post('/colaboradores/register', SystemController.registerColaborador);

routes.get('/me', SystemController.authenticate, SystemController.me);

routes.post('/colaborador/pontos', SystemController.authenticate, SystemController.registrarPonto);
routes.get('/colaborador/pontos', SystemController.authenticate, SystemController.meusPontos);
routes.get('/colaborador/resumo-mensal', SystemController.authenticate, SystemController.resumoMensalColaborador);

routes.post('/colaborador/solicitacoes', SystemController.authenticate, SystemController.criarSolicitacao);
routes.get('/colaborador/solicitacoes', SystemController.authenticate, SystemController.minhasSolicitacoes);

routes.post('/colaborador/atestados', SystemController.authenticate, upload.single('arquivo'), SystemController.uploadAtestado);
routes.get('/colaborador/atestados', SystemController.authenticate, SystemController.meusAtestados);

routes.get('/rh/dashboard', SystemController.authenticate, SystemController.requireRh, SystemController.rhDashboard);
routes.get('/rh/funcionarios/:id/pontos-dia', SystemController.authenticate, SystemController.requireRh, SystemController.rhPontosDiaFuncionario);
routes.post('/rh/funcionarios/:id/pontos-manual', SystemController.authenticate, SystemController.requireRh, SystemController.rhAdicionarPontoManual);
routes.delete('/rh/pontos/:id', SystemController.authenticate, SystemController.requireRh, SystemController.rhRemoverPonto);
routes.put('/rh/pontos/:id/horario', SystemController.authenticate, SystemController.requireRh, SystemController.rhEditarPontoHorario);
routes.get('/rh/funcionarios', SystemController.authenticate, SystemController.requireRh, SystemController.rhFuncionarios);
routes.post('/rh/funcionarios', SystemController.authenticate, SystemController.requireRh, SystemController.rhCriarFuncionario);
routes.put('/rh/funcionarios/:id', SystemController.authenticate, SystemController.requireRh, SystemController.rhAtualizarFuncionario);

routes.get('/rh/solicitacoes', SystemController.authenticate, SystemController.requireRh, SystemController.rhSolicitacoes);
routes.put('/rh/solicitacoes/:id', SystemController.authenticate, SystemController.requireRh, SystemController.rhAtualizarSolicitacao);

routes.get('/rh/atestados', SystemController.authenticate, SystemController.requireRh, SystemController.rhAtestados);
routes.put('/rh/atestados/:id', SystemController.authenticate, SystemController.requireRh, SystemController.rhAtualizarAtestado);
routes.get('/rh/banco-horas', SystemController.authenticate, SystemController.requireRh, SystemController.rhBancoHoras);
routes.get('/rh/banco-horas/:id/detalhes', SystemController.authenticate, SystemController.requireRh, SystemController.rhBancoHorasDetalhe);

routes.get('/reports/solicitacoes.pdf', SystemController.authenticate, SystemController.requireRh, SystemController.reportSolicitacoesPdf);
routes.get('/reports/pontos.pdf', SystemController.authenticate, SystemController.requireRh, SystemController.reportPontosPdf);
routes.get('/reports/atestados.pdf', SystemController.authenticate, SystemController.requireRh, SystemController.reportAtestadosPdf);

module.exports = routes;