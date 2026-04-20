// ========================================
// FIREBASE CONFIGURATION E AUTENTICAÇÃO
// ========================================

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAE1R4fpOoFqacAuew8lN_j4h0qfYtX-Pk",
    authDomain: "gastosmensais-ccd84.firebaseapp.com",
    projectId: "gastosmensais-ccd84",
    storageBucket: "gastosmensais-ccd84.firebasestorage.app",
    messagingSenderId: "229629143546",
    appId: "1:229629143546:web:1c1bc812789eab73e15c43",
    measurementId: "G-Q1SNWH3G8M"
};

// Inicializar Firebase
let firebaseApp = null;
let auth = null;
let db = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const authLoading = document.getElementById('auth-loading');

    if (authContainer) authContainer.style.display = 'none';
    if (appContainer) appContainer.style.display = 'none';
    if (authLoading) authLoading.style.display = 'flex';
});

// Função para inicializar Firebase
function initFirebase() {
    try {
        if (typeof firebase !== 'undefined' && !firebaseApp) {
            firebase.initializeApp(firebaseConfig);

            auth = firebase.auth();

            // ✅ Manter login salvo no celular
            auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                .then(() => {
                    console.log('✅ Persistência ativada');
                })
                .catch((error) => {
                    console.error('Erro persistência:', error);
                });
            db = firebase.firestore();
            console.log('✅ Firebase inicializado com sucesso');

            // ❌ REMOVIDO - NÃO deslogar automaticamente
            // auth.signOut();

            // Observar mudanças no estado de autenticação
            auth.onAuthStateChanged(handleAuthStateChanged);
        }
    } catch (error) {
        console.error('❌ Erro ao inicializar Firebase:', error);
    }
}

// Gerenciar mudanças no estado de autenticação
function handleAuthStateChanged(user) {
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const authLoading = document.getElementById('auth-loading');

    if (authLoading) authLoading.style.display = 'none';

    if (user) {
        // Usuário logado
        console.log('✅ Usuário autenticado:', user.email);
        currentUser = user;

        // Verificar se o email foi verificado
        if (!user.emailVerified) {
            console.log('⚠️ Email não verificado');

            if (authContainer) authContainer.style.display = 'flex';
            if (appContainer) appContainer.style.display = 'none';
            if (authLoading) authLoading.style.display = 'none';

            alert('Verifique seu email antes de entrar');

            return;
        }

        // Mostrar nome do usuário no header
        const userEmailElement = document.getElementById('user-email');
        if (userEmailElement) {
            // Usar displayName se disponível, senão usar email
            const displayName = user.displayName || user.email;
            userEmailElement.textContent = displayName;

            // Se não tem displayName, tentar buscar no Firestore
            if (!user.displayName) {
                loadUserDisplayName(user.uid);
            }
        }

        // Esconder tela de login e mostrar app
        if (authContainer) authContainer.style.display = 'none';
        if (appContainer) appContainer.style.display = 'block';
        if (authLoading) authLoading.style.display = 'none';

        // Inicializar aplicação com dados do usuário
        if (typeof app !== 'undefined' && app) {
            app.userId = user.uid;
            if (!app.isDataLoaded) {
                app.loadUserData();
            }

            // Atualizar status de sincronização
            const syncStatusElement = document.getElementById('sync-status-text');
            if (syncStatusElement) {
                syncStatusElement.textContent = 'Conectado';
            }

            // Habilitar botões de sincronização
            const syncBtn = document.getElementById('sync-now-btn');
            const downloadBtn = document.getElementById('sync-download-btn');
            if (syncBtn) syncBtn.disabled = false;
            if (downloadBtn) downloadBtn.disabled = false;
        }
    } else {
        // Usuário não logado
        console.log('⚠️ Usuário não autenticado');
        currentUser = null;

        // Limpar dados da aplicação quando usuário faz logout
        if (typeof app !== 'undefined' && app) {
            app.userId = null;
            // NÃO apagar dados automaticamente
            console.log('Dados mantidos localmente');
            app.isDataLoaded = false;
            console.log('👋 Usuário deslogado');

            // Limpar localStorage também
            // ❌ NÃO apagar automaticamente
            console.log('Logout realizado - dados preservados');
        }

        // Mostrar tela de login e esconder app
        if (authContainer) authContainer.style.display = 'flex';
        if (appContainer) appContainer.style.display = 'none';
        if (authLoading) authLoading.style.display = 'none';
    }
}

// Alternar entre formulários
function showLogin() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('forgot-password-form').style.display = 'none';
    document.getElementById('verification-form').style.display = 'none';
    clearAuthMessages();
}

function showRegister() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    document.getElementById('forgot-password-form').style.display = 'none';
    document.getElementById('verification-form').style.display = 'none';
    clearAuthMessages();
}

function showForgotPassword() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('forgot-password-form').style.display = 'block';
    document.getElementById('verification-form').style.display = 'none';
    clearAuthMessages();
}

function clearAuthMessages() {
    document.getElementById('login-error').style.display = 'none';
    document.getElementById('register-error').style.display = 'none';
    document.getElementById('forgot-error').style.display = 'none';
    document.getElementById('forgot-success').style.display = 'none';
}

// Função de Login
async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorElement = document.getElementById('login-error');
    const authLoading = document.getElementById('auth-loading');

    // Validações
    if (!email || !password) {
        showError(errorElement, 'Por favor, preencha todos os campos.');
        return;
    }

    try {
        authLoading.style.display = 'block';
        errorElement.style.display = 'none';

        const userCredential = await auth.signInWithEmailAndPassword(email, password);

        // Verificar se o email foi verificado
        if (!userCredential.user.emailVerified) {
            // Fazer logout
            await auth.signOut();

            // Mostrar mensagem para verificar email
            showError(errorElement, 'Por favor, verifique seu email antes de fazer login. Verifique sua caixa de entrada (e spam).');

            // Mostrar opção para reenviar email
            setTimeout(() => {
                const resendLink = document.createElement('div');
                resendLink.innerHTML = '<a href="#" onclick="resendVerificationEmail(\'' + email + '\')" style="color: var(--primary-color); text-decoration: underline; margin-top: 10px; display: block;">Reenviar email de verificação</a>';
                errorElement.parentNode.appendChild(resendLink);
            }, 1000);

            return;
        }

        console.log('✅ Login realizado com sucesso');

    } catch (error) {
        console.error('❌ Erro no login:', error);
        authLoading.style.display = 'none';

        let errorMessage = 'Erro ao fazer login. Tente novamente.';

        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'Usuário não encontrado. Verifique o email ou crie uma conta.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Senha incorreta. Tente novamente.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Email inválido.';
                break;
            case 'auth/user-disabled':
                errorMessage = 'Esta conta foi desativada.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Muitas tentativas. Tente novamente mais tarde.';
                break;
        }

        showError(errorElement, errorMessage);
    }
}

// Função de Registro
async function handleRegister() {
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const passwordConfirm = document.getElementById('register-password-confirm').value;
    const errorElement = document.getElementById('register-error');
    const authLoading = document.getElementById('auth-loading');

    // Validações
    if (!name || !email || !password || !passwordConfirm) {
        showError(errorElement, 'Por favor, preencha todos os campos.');
        return;
    }

    if (password.length < 6) {
        showError(errorElement, 'A senha deve ter pelo menos 6 caracteres.');
        return;
    }

    if (password !== passwordConfirm) {
        showError(errorElement, 'As senhas não coincidem.');
        return;
    }

    try {
        authLoading.style.display = 'block';
        errorElement.style.display = 'none';

        const userCredential = await auth.createUserWithEmailAndPassword(email, password);

        // Enviar email de verificação
        await userCredential.user.sendEmailVerification();

        // Atualizar perfil do usuário com o nome
        await userCredential.user.updateProfile({
            displayName: name
        });

        // Criar documento inicial do usuário no Firestore (com tratamento de erro)
        try {
            await db.collection('users').doc(userCredential.user.uid).set({
                name: name,
                email: email,
                emailVerified: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        } catch (firestoreError) {
            console.warn('⚠️ Erro ao salvar no Firestore, continuando sem Firestore:', firestoreError);
            // Continua sem Firestore se der erro
        }

        console.log('✅ Conta criada com sucesso');

        // Mostrar tela de verificação
        showVerificationScreen(email);

    } catch (error) {
        console.error('❌ Erro no registro:', error);
        authLoading.style.display = 'none';

        let errorMessage = 'Erro ao criar conta. Tente novamente.';

        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'Este email já está em uso. Faça login ou use outro email.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Email inválido.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres.';
                break;
        }

        showError(errorElement, errorMessage);
    }
}

// Função de Recuperação de Senha
async function handleForgotPassword() {
    const email = document.getElementById('forgot-email').value.trim();
    const errorElement = document.getElementById('forgot-error');
    const successElement = document.getElementById('forgot-success');
    const authLoading = document.getElementById('auth-loading');

    if (!email) {
        showError(errorElement, 'Por favor, digite seu email.');
        return;
    }

    try {
        authLoading.style.display = 'block';
        errorElement.style.display = 'none';
        successElement.style.display = 'none';

        await auth.sendPasswordResetEmail(email);

        authLoading.style.display = 'none';
        successElement.textContent = 'Email de recuperação enviado! Verifique sua caixa de entrada.';
        successElement.style.display = 'block';

        console.log('✅ Email de recuperação enviado');

        // Limpar campo
        document.getElementById('forgot-email').value = '';

    } catch (error) {
        console.error('❌ Erro ao enviar email de recuperação:', error);
        authLoading.style.display = 'none';

        let errorMessage = 'Erro ao enviar email. Tente novamente.';

        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'Email não encontrado. Verifique o email digitado.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Email inválido.';
                break;
        }

        showError(errorElement, errorMessage);
    }
}

// Função para reenviar email de verificação
async function resendVerificationEmail(email) {
    try {
        // Criar link temporário para reenviar
        const actionCodeSettings = {
            url: window.location.href,
            handleCodeInApp: true
        };

        await auth.sendSignInLinkToEmail(email, actionCodeSettings);

        alert('Email de verificação reenviado! Verifique sua caixa de entrada.');

    } catch (error) {
        console.error('❌ Erro ao reenviar email:', error);
        alert('Erro ao reenviar email. Tente novamente mais tarde.');
    }
}

// Função de Logout
async function handleLogout() {
    try {
        await auth.signOut();
        console.log('👋 Logout realizado com sucesso');
    } catch (error) {
        console.error('❌ Erro no logout:', error);
        alert('Erro ao sair. Tente novamente.');
    }
}

// Função para carregar o nome do usuário do Firestore
async function loadUserDisplayName(userId) {
    try {
        if (!db) return;

        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData.name) {
                const userEmailElement = document.getElementById('user-email');
                if (userEmailElement) {
                    userEmailElement.textContent = userData.name;
                }
            }
        }
    } catch (error) {
        console.warn('⚠️ Erro ao carregar nome do usuário:', error);
    }
}

// Função auxiliar para mostrar erros
function showError(element, message) {
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}

// Função para mostrar tela de verificação
function showVerificationScreen(email) {
    // Esconder todos os formulários
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('forgot-password-form').style.display = 'none';

    // Mostrar tela de verificação
    const verificationForm = document.getElementById('verification-form');
    verificationForm.style.display = 'block';

    // Preencher email
    document.getElementById('verification-email').textContent = email;

    // Esconder loading
    document.getElementById('auth-loading').style.display = 'none';

    // Limpar campos do registro
    document.getElementById('register-name').value = '';
    document.getElementById('register-email').value = '';
    document.getElementById('register-password').value = '';
    document.getElementById('register-password-confirm').value = '';
}

// Inicializar Firebase quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔄 Iniciando autenticação...');
    initFirebase();
});

// ========================================
// Aplicação de Controle de Gastos Pessoais - Método 50/30/20
// ========================================
class ControleGastos {
    constructor() {
        this.currentMonth = new Date().getMonth() + 1;
        this.currentYear = new Date().getFullYear();

        // Não carregar dados automaticamente - aguardar autenticação
        this.data = {};
        this.isDataLoaded = false;

        this.editingItem = null;
        this.userId = null;
        this.ultimaSincronizacao = null;
        this.sincronizacaoAutomatica = true;
        this.budgetChart = null;

        // Dados da renda familiar (carregados do localStorage)
        this.rendaFamiliar = this.loadRendaFamiliar();

        // Flag para evitar múltiplas execuções de updateAnalysis
        this.isUpdatingAnalysis = false;
        this.analysisTimeout = null;

        // Inicializar filtro de período
        this.periodFilter = {
            startMonth: 1,
            endMonth: 12
        };

        // Inicializar tema
        this.initTheme();

        this.init();
    }

    // Inicializar tema
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);

        // Adicionar event listener para o botão de tema
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
    }

    // Alternar tema
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    init() {
        try {
            this.setupEventListeners();
            this.updateCurrentDate();
            this.updateMonthDisplay(); // Adicionar esta linha
            const quickDateInput = document.getElementById('quick-date');
            if (quickDateInput && !quickDateInput.value) {
                const hoje = new Date();
                const yyyy = hoje.getFullYear();
                const mm = String(hoje.getMonth() + 1).padStart(2, '0');
                const dd = String(hoje.getDate()).padStart(2, '0');
                quickDateInput.value = `${yyyy}-${mm}-${dd}`;
            }
            this.renderAll();
            this.setupMonthNavigation();
            // this.inicializarFirebase(); // Temporariamente desabilitado

            this.renderRendaFamiliar();

            // Forçar atualização dos cálculos após renderização
            setTimeout(() => {
                this.atualizarRendaFamiliar();
            }, 200);

            // Verificar se Chart.js está disponível
            if (typeof Chart === 'undefined') {
                console.error('❌ Chart.js não está disponível na inicialização!');
            }

            // Inicializar dashboard rápido após renderização completa
            setTimeout(() => {
                this.initializeQuickDashboard();
                this.configurarSaldoMesInput();
                this.aplicarLayoutResponsivo();
                window.addEventListener('resize', () => this.aplicarLayoutResponsivo());
            }, 500);

            // Verificar se os elementos canvas existem na inicialização
            setTimeout(() => {
                const essentialCanvas = document.getElementById('essentialChart');
                const desireCanvas = document.getElementById('desireChart');
                const investmentCanvas = document.getElementById('investmentChart');

                // Forçar criação dos gráficos se os elementos existirem
                if (essentialCanvas && desireCanvas && investmentCanvas) {
                    this.renderAll();
                }
            }, 1000);

            // Log para debug
            console.log(`📅 Aplicação inicializada - Mês atual: ${this.currentMonth}, Ano: ${this.currentYear}`);

            // Inicializar resumo anual se necessário
            this.toggleAnnualSummary();

            // Configurar efeitos especiais de sincronização
            setTimeout(() => {
                this.setupSyncEffects();
            }, 500);
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
        }
    }

    // Definir tema
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);

        // Atualizar ícone
        const themeIcon = document.getElementById('theme-icon');
        if (themeIcon) {
            themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }

        // Atualizar título do botão
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.title = theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro';
        }

        // Forçar atualização do CSS
        document.body.style.display = 'none';
        document.body.offsetHeight; // Trigger reflow
        document.body.style.display = '';

        // Atualizar cores dos gráficos se existirem
        this.updateChartColors();
    }

    // Exportar relatório em PDF
    async exportarPDF() {
        try {
            // Mostrar indicador de carregamento
            const pdfBtn = document.querySelector('.btn[onclick="app.exportarPDF()"]');
            if (pdfBtn) {
                const originalText = pdfBtn.innerHTML;
                pdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';
                pdfBtn.disabled = true;

                // Restaurar botão após processamento
                setTimeout(() => {
                    pdfBtn.innerHTML = originalText;
                    pdfBtn.disabled = false;
                }, 3000);
            }

            // Verificar se jsPDF está disponível
            if (typeof window.jsPDF === 'undefined') {
                console.error('❌ jsPDF não está disponível');

                // Tentar recarregar a biblioteca
                await this.loadJsPDFLibrary();

                if (typeof window.jsPDF === 'undefined') {
                    console.log('🔄 Usando método alternativo (HTML)...');
                    this.exportarPDFAlternativo();
                    return;
                }
            }

            const { jsPDF } = window.jsPDF;
            const doc = new jsPDF();

            // Configurações do documento
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 20;
            let yPosition = 20;

            // Título
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text('Relatório de Controle de Gastos', pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 20;

            // Data do relatório
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            const dataAtual = new Date().toLocaleDateString('pt-BR');
            doc.text(`Gerado em: ${dataAtual}`, pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 20;

            // Informações do mês
            const mesAtual = this.getMonthName(this.currentMonth);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(`Mês: ${mesAtual} ${this.currentYear}`, margin, yPosition);
            yPosition += 15;

            // Resumo financeiro
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Resumo Financeiro', margin, yPosition);
            yPosition += 10;

            // Dados do resumo
            const saldoMes = this.extrairValorNumerico(document.getElementById('month-balance-input')?.value || 0);
            const totalRestante = document.getElementById('remaining-total')?.textContent || 'R$ 0,00';
            const gastoDiario = document.getElementById('daily-expense')?.textContent || 'R$ 0,00';

            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text(`Saldo do Mês: ${this.formatarMoeda(saldoMes)}`, margin, yPosition);
            yPosition += 8;
            doc.text(`Total Restante: ${totalRestante}`, margin, yPosition);
            yPosition += 8;
            doc.text(`Gasto Diário: ${gastoDiario}`, margin, yPosition);
            yPosition += 15;

            // Análise 50/30/20
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Análise 50/30/20', margin, yPosition);
            yPosition += 10;

            const essentialIdeal = document.getElementById('essential-ideal')?.textContent || 'R$ 0,00';
            const essentialReal = document.getElementById('essential-real')?.textContent || 'R$ 0,00';
            const desireIdeal = document.getElementById('desire-ideal')?.textContent || 'R$ 0,00';
            const desireReal = document.getElementById('desire-real')?.textContent || 'R$ 0,00';
            const investmentIdeal = document.getElementById('investment-ideal')?.textContent || 'R$ 0,00';
            const investmentReal = document.getElementById('investment-real')?.textContent || 'R$ 0,00';

            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text(`Essencial (50%): ${essentialIdeal} / ${essentialReal}`, margin, yPosition);
            yPosition += 8;
            doc.text(`Desejo (30%): ${desireIdeal} / ${desireReal}`, margin, yPosition);
            yPosition += 8;
            doc.text(`Investimento (20%): ${investmentIdeal} / ${investmentReal}`, margin, yPosition);
            yPosition += 15;

            // Gastos do mês
            if (yPosition > 250) {
                doc.addPage();
                yPosition = 20;
            }

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Gastos do Mês', margin, yPosition);
            yPosition += 10;

            // Tabela de gastos
            const monthData = this.getCurrentMonthData();
            const gastos = monthData.expenses || [];

            if (gastos.length > 0) {
                const tableData = gastos.map(item => [
                    item.description,
                    item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                    this.getCategoryName(item.category),
                    item.paid ? 'Sim' : 'Não'
                ]);

                doc.autoTable({
                    startY: yPosition,
                    head: [['Descrição', 'Valor', 'Categoria', 'Pago']],
                    body: tableData,
                    margin: { left: margin },
                    styles: {
                        fontSize: 10,
                        cellPadding: 3
                    },
                    headStyles: {
                        fillColor: [102, 126, 234],
                        textColor: 255
                    }
                });

                yPosition = doc.lastAutoTable.finalY + 10;
            }

            // Gastos com cartão
            if (yPosition > 250) {
                doc.addPage();
                yPosition = 20;
            }

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Gastos com Cartão de Crédito', margin, yPosition);
            yPosition += 10;

            const gastosCartao = this.data.creditExpenses?.filter(item =>
                item.month === this.currentMonth && item.year === this.currentYear
            ) || [];

            if (gastosCartao.length > 0) {
                const tableData = gastosCartao.map(item => [
                    item.description,
                    item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                    this.getCategoryName(item.category)
                ]);

                doc.autoTable({
                    startY: yPosition,
                    head: [['Descrição', 'Valor', 'Categoria']],
                    body: tableData,
                    margin: { left: margin },
                    styles: {
                        fontSize: 10,
                        cellPadding: 3
                    },
                    headStyles: {
                        fillColor: [102, 126, 234],
                        textColor: 255
                    }
                });
            }

            // Salvar o PDF
            const fileName = `relatorio_gastos_${mesAtual.toLowerCase()}_${this.currentYear}.pdf`;
            doc.save(fileName);

        } catch (error) {
            console.error('❌ Erro ao exportar PDF:', error);

            // Método alternativo mais simples
            try {
                this.exportarPDFAlternativo();
            } catch (altError) {
                console.error('❌ Método alternativo também falhou:', altError);
                alert('❌ Erro ao gerar PDF.\n\n💡 Soluções:\n• Verifique sua conexão com internet\n• Recarregue a página (F5)\n• Tente usar "Imprimir" no navegador\n• Use o modo de impressão alternativo');
            }
        }
    }

    // Carregar biblioteca jsPDF dinamicamente
    async loadJsPDFLibrary() {
        try {
            console.log('🔄 Tentando recarregar jsPDF...');

            // Remover scripts antigos se existirem
            const oldScripts = document.querySelectorAll('script[src*="jspdf"]');
            oldScripts.forEach(script => script.remove());

            // Aguardar um pouco antes de recarregar
            await new Promise(resolve => setTimeout(resolve, 500));

            // Carregar jsPDF
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');

            // Aguardar carregamento
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Carregar plugin autotable se disponível
            try {
                await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.29/jspdf.plugin.autotable.min.js');
            } catch (pluginError) {
                console.warn('⚠️ Plugin autotable não carregado, mas jsPDF básico está disponível');
            }

            console.log('✅ jsPDF recarregado dinamicamente');
        } catch (error) {
            console.error('❌ Erro ao recarregar jsPDF:', error);
        }
    }

    // Função auxiliar para carregar scripts
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                console.log(`✅ Script carregado: ${src}`);
                resolve();
            };
            script.onerror = (error) => {
                console.error(`❌ Erro ao carregar script: ${src}`, error);
                reject(error);
            };
            document.head.appendChild(script);
        });
    }

    // Método alternativo para exportar PDF (HTML otimizado)
    exportarPDFAlternativo() {
        console.log('📄 Gerando relatório HTML para impressão...');

        // Criar conteúdo HTML completo e profissional
        const conteudo = this.criarRelatorioHTML();

        // Abrir janela de impressão com melhor controle
        const janelaImpressao = window.open('', '_blank', 'width=800,height=600');

        if (!janelaImpressao) {
            alert('❌ Pop-up bloqueado!\n\n💡 Solução:\n• Permita pop-ups para este site\n• Ou use Ctrl+P para imprimir esta página');
            return;
        }

        janelaImpressao.document.write(conteudo);
        janelaImpressao.document.close();

        // Aguardar carregamento e focar na janela
        setTimeout(() => {
            janelaImpressao.focus();
            console.log('✅ Relatório HTML gerado com sucesso!');
        }, 500);

    }


    // Criar relatório HTML completo e profissional
    criarRelatorioHTML() {
        const mesAtual = this.getMonthName(this.currentMonth);
        const dataAtual = new Date().toLocaleDateString('pt-BR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const horaAtual = new Date().toLocaleTimeString('pt-BR');

        // Obter dados dos gastos
        const monthData = this.getCurrentMonthData();
        let gastosMensais = monthData.expenses || [];
        const gastosCartao = monthData.creditCard || [];
        const gastosDiarios = monthData.dailyExpenses || [];

        // Adicionar resumos do cartão aos gastos mensais se existirem
        const creditSummaries = this.getCreditSummaries();
        if (creditSummaries.length > 0) {
            gastosMensais = [...gastosMensais, ...creditSummaries];
        }

        // Calcular totais
        const totalMensais = gastosMensais.reduce((sum, item) => sum + item.value, 0);
        const totalCartao = gastosCartao.reduce((sum, item) => sum + item.value, 0);
        const totalDiarios = gastosDiarios.reduce((sum, item) => sum + item.value, 0);
        const totalGeral = totalMensais + totalCartao + totalDiarios;

        return `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Relatório de Gastos - ${mesAtual} ${this.currentYear}</title>
                <style>
                    @media print {
                        body { margin: 0; }
                        .no-print { display: none !important; }
                    }
                    
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 20px;
                        background: white;
                    }
                    
                    .header {
                        text-align: center;
                        border-bottom: 3px solid #667eea;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                    }
                    
                    .titulo {
                        font-size: 2.5em;
                        color: #667eea;
                        margin-bottom: 10px;
                        font-weight: bold;
                    }
                    
                    .subtitulo {
                        font-size: 1.2em;
                        color: #666;
                        margin-bottom: 5px;
                    }
                    
                    .data-geracao {
                        font-size: 0.9em;
                        color: #888;
                    }
                    
                    .secao {
                        margin: 20px 0;
                        padding: 15px;
                        border: 1px solid #e0e0e0;
                        border-radius: 8px;
                        background: #f9f9f9;
                        page-break-inside: avoid;
                    }
                    
                    .secao h3 {
                        color: #667eea;
                        border-bottom: 2px solid #667eea;
                        padding-bottom: 5px;
                        margin-top: 0;
                    }
                    
                    .resumo-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                        gap: 12px;
                        margin: 12px 0;
                    }
                    
                    .item-resumo {
                        padding: 8px 12px;
                        background: white;
                        border-radius: 5px;
                        border-left: 4px solid #667eea;
                    }
                    
                    .label {
                        font-weight: bold;
                        color: #555;
                    }
                    
                    .valor {
                        font-size: 1.2em;
                        color: #667eea;
                        font-weight: bold;
                    }
                    
                    .valor.negativo {
                        color: #e74c3c;
                    }
                    
                    .valor.positivo {
                        color: #27ae60;
                    }
                    
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 10px 0;
                        background: white;
                        font-size: 0.9em;
                    }
                    
                    th, td {
                        padding: 8px 10px;
                        text-align: left;
                        border-bottom: 1px solid #ddd;
                    }
                    
                    th {
                        background: #667eea;
                        color: white;
                        font-weight: bold;
                    }
                    
                    tr:hover {
                        background: #f5f5f5;
                    }
                    
                    .categoria-essential { color: #27ae60; font-weight: bold; }
                    .categoria-desire { color: #f39c12; font-weight: bold; }
                    .categoria-investment { color: #3498db; font-weight: bold; }
                    
                    .rodape {
                        margin-top: 40px;
                        text-align: center;
                        font-size: 0.9em;
                        color: #666;
                        border-top: 1px solid #eee;
                        padding-top: 20px;
                    }
                    
                    .botao-imprimir {
                        background: #667eea;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        font-size: 1em;
                        cursor: pointer;
                        margin: 10px;
                    }
                    
                    .botao-imprimir:hover {
                        background: #5a67d8;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="titulo">📊 Relatório de Gastos</div>
                    <div class="subtitulo">${mesAtual} ${this.currentYear}</div>
                    <div class="data-geracao">Gerado em ${dataAtual} às ${horaAtual}</div>
                </div>
                
                <div class="no-print" style="text-align: center; margin-bottom: 20px;">
                    <button class="botao-imprimir" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
                    <button class="botao-imprimir" onclick="window.close()">❌ Fechar</button>
                </div>
                
                <div class="secao">
                    <h3>🏠 Controle de Renda Familiar</h3>
                    <div class="resumo-grid">
                        <div class="item-resumo">
                            <div class="label">Salário Guilherme:</div>
                            <div class="valor positivo">${this.formatarMoeda(this.rendaFamiliar.meuSalario || 0)}</div>
                        </div>
                        <div class="item-resumo">
                            <div class="label">Salário Joceline:</div>
                            <div class="valor positivo">${this.formatarMoeda(this.rendaFamiliar.salarioJoceline || this.rendaFamiliar.salarioDela || 0)}</div>
                        </div>
                        <div class="item-resumo">
                            <div class="label">Despesas Joceline:</div>
                            <div class="valor negativo">${this.formatarMoeda(((this.rendaFamiliar.salarioJoceline || this.rendaFamiliar.salarioDela || 0) - (this.rendaFamiliar.totalTransferido || 0)))}</div>
                        </div>
                        <div class="item-resumo">
                            <div class="label">Total Transferido:</div>
                            <div class="valor positivo">${this.formatarMoeda(this.rendaFamiliar.totalTransferido || 0)}</div>
                        </div>
                        <div class="item-resumo">
                            <div class="label">Total sob Gestão:</div>
                            <div class="valor positivo">${this.formatarMoeda((this.rendaFamiliar.meuSalario || 0) + (this.rendaFamiliar.totalTransferido || 0))}</div>
                        </div>
                    </div>
                </div>
                
                <div class="secao">
                    <h3>💰 Resumo Financeiro</h3>
                    <div class="resumo-grid">
                        <div class="item-resumo">
                            <div class="label">Saldo do Mês:</div>
                            <div class="valor">${this.formatarMoeda(parseFloat(document.getElementById('month-balance-input')?.value || 0))}</div>
                        </div>
                        <div class="item-resumo">
                            <div class="label">Total Gastos:</div>
                            <div class="valor negativo">${this.formatarMoeda(totalGeral)}</div>
                        </div>
                        <div class="item-resumo">
                            <div class="label">Total Restante:</div>
                            <div class="valor ${parseFloat(document.getElementById('remaining-total')?.textContent?.replace(/[^\d,-]/g, '').replace(',', '.') || 0) >= 0 ? 'positivo' : 'negativo'}">${document.getElementById('remaining-total')?.textContent || 'R$ 0,00'}</div>
                        </div>
                    </div>
                </div>
                
                <div class="secao">
                    <h3>📊 Análise 50/30/20</h3>
                    <div class="resumo-grid">
                        <div class="item-resumo">
                            <div class="label">🏠 Essencial (50%):</div>
                            <div class="valor categoria-essential">
                                Ideal: ${document.getElementById('essential-ideal')?.textContent || 'R$ 0,00'}<br>
                                Real: ${document.getElementById('essential-real')?.textContent || 'R$ 0,00'}
                            </div>
                        </div>
                        <div class="item-resumo">
                            <div class="label">❤️ Desejo (30%):</div>
                            <div class="valor categoria-desire">
                                Ideal: ${document.getElementById('desire-ideal')?.textContent || 'R$ 0,00'}<br>
                                Real: ${document.getElementById('desire-real')?.textContent || 'R$ 0,00'}
                            </div>
                        </div>
                        <div class="item-resumo">
                            <div class="label">📈 Investimento (20%):</div>
                            <div class="valor categoria-investment">
                                Ideal: ${document.getElementById('investment-ideal')?.textContent || 'R$ 0,00'}<br>
                                Real: ${document.getElementById('investment-real')?.textContent || 'R$ 0,00'}
                            </div>
                        </div>
                    </div>
                </div>
                
                ${gastosMensais.length > 0 ? `
                <div class="secao">
                    <h3>📅 Gastos Mensais</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Descrição</th>
                                <th>Valor</th>
                                <th>Categoria</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${gastosMensais.map(item => `
                                <tr>
                                    <td>${item.description}</td>
                                    <td>${this.formatarMoeda(item.value)}</td>
                                    <td class="categoria-${item.category}">${this.getCategoryName(item.category)}</td>
                                    <td>${item.paid ? '✅ Pago' : '⏳ Pendente'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div style="text-align: right; font-weight: bold; margin-top: 10px;">
                        Total: ${this.formatarMoeda(totalMensais)}
                    </div>
                </div>
                ` : ''}
                
                ${gastosCartao.length > 0 ? `
                <div class="secao">
                    <h3>💳 Gastos do Cartão</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Descrição</th>
                                <th>Valor</th>
                                <th>Categoria</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${gastosCartao.map(item => `
                                <tr>
                                    <td>${item.description}</td>
                                    <td>${this.formatarMoeda(item.value)}</td>
                                    <td class="categoria-${item.category}">${this.getCategoryName(item.category)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div style="text-align: right; font-weight: bold; margin-top: 10px;">
                        Total: ${this.formatarMoeda(totalCartao)}
                    </div>
                </div>
                ` : ''}
                
                ${gastosDiarios.length > 0 ? `
                <div class="secao">
                    <h3>🛒 Gastos Diários</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${gastosDiarios.slice(-10).map(item => `
                                <tr>
                                    <td>${this.formatDateSafe(item.date)}</td>
                                    <td>${this.formatarMoeda(item.value)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div style="text-align: right; font-weight: bold; margin-top: 10px;">
                        Total (últimos 10): ${this.formatarMoeda(gastosDiarios.slice(-10).reduce((sum, item) => sum + item.value, 0))}
                    </div>
                </div>
                ` : ''}
                
                <div class="rodape">
                    <p>📱 Relatório gerado pelo Sistema de Controle de Gastos</p>
                    <p>Método 50/30/20 - Gestão Financeira Inteligente</p>
                </div>
            </body>
            </html>
        `;
    }

    // Obter nome do mês
    getMonthName(month) {
        const meses = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        return meses[month - 1] || 'Total';
    }

    // Obter nome da categoria
    getCategoryName(category) {
        const categorias = {
            'essential': 'Essencial',
            'desire': 'Desejo',
            'investment': 'Investimento'
        };
        return categorias[category] || category;
    }



    // Carregar dados do localStorage com suporte a múltiplos meses
    loadData() {
        const saved = localStorage.getItem('controleGastos');
        if (saved) {
            const data = JSON.parse(saved);

            // Verificar se é o formato antigo (sem estrutura por ano/mês)
            if (data.expenses && !data[this.currentYear]) {
                // Migrar dados antigos para o novo formato
                const migratedData = this.migrateOldData(data);
                this.saveData(migratedData);
                return migratedData;
            }

            // Garantir que a estrutura do ano atual existe
            if (!data[this.currentYear]) {
                data[this.currentYear] = {};
            }

            // Garantir que a estrutura do mês atual existe
            if (!data[this.currentYear][this.currentMonth]) {
                data[this.currentYear][this.currentMonth] = this.createMonthData();
            }

            return data;
        }

        // Criar estrutura inicial com dados padrão
        const defaultData = {};
        defaultData[this.currentYear] = {};
        defaultData[this.currentYear][this.currentMonth] = this.createMonthData();

        return defaultData;
    }

    // Migrar dados antigos para o novo formato
    migrateOldData(oldData) {
        const newData = {};

        // Criar estrutura para o ano atual
        newData[this.currentYear] = {};
        newData[this.currentYear][this.currentMonth] = this.createMonthData();

        // Migrar gastos antigos para o mês atual
        if (oldData.expenses) {
            oldData.expenses.forEach(expense => {
                if (expense.status && !expense.hasOwnProperty('paid')) {
                    expense.paid = expense.status === 'paid';
                    delete expense.status;
                }
                if (!expense.hasOwnProperty('source')) {
                    expense.source = 'manual';
                }
                // Adicionar ao mês atual
                newData[this.currentYear][this.currentMonth].expenses.push(expense);
            });
        }

        // Migrar gastos do cartão
        if (oldData.creditCard) {
            newData[this.currentYear][this.currentMonth].creditCard = oldData.creditCard;
        }

        // Migrar gastos diários
        if (oldData.dailyExpenses) {
            newData[this.currentYear][this.currentMonth].dailyExpenses = oldData.dailyExpenses;
        }

        // Migrar configurações
        newData.monthBalance = oldData.monthBalance || {};
        newData.nextPaymentDates = oldData.nextPaymentDates || {};
        newData.creditSummaryStatus = oldData.creditSummaryStatus || {};

        return newData;
    }

    // Criar estrutura de dados para um mês
    createMonthData() {
        // Criar sempre estrutura vazia para novos meses (sem dados de exemplo)
        return {
            expenses: [],
            creditCard: [],
            dailyExpenses: [],
            rendaFamiliar: {
                meuSalario: 0,
                salarioDela: 0,
                totalTransferido: 0
            }
        };
    }

    // Obter dados do mês atual
    getCurrentMonthData() {
        // Verificar se os dados foram carregados
        if (!this.isDataLoaded || !this.data) {
            console.log('⚠️ Dados não carregados ainda, aguardando autenticação...');
            return this.createMonthData();
        }

        if (!this.data[this.currentYear]) {
            this.data[this.currentYear] = {};
        }
        if (!this.data[this.currentYear][this.currentMonth]) {
            this.data[this.currentYear][this.currentMonth] = this.createMonthData();
        }

        const monthData = this.data[this.currentYear][this.currentMonth];
        console.log('🔍 getCurrentMonthData:', {
            currentMonth: this.currentMonth,
            currentYear: this.currentYear,
            path: `${this.currentYear}.${this.currentMonth}`,
            dailyExpensesCount: monthData.dailyExpenses ? monthData.dailyExpenses.length : 0,
            dailyExpensesDetails: monthData.dailyExpenses ? monthData.dailyExpenses.map(e => ({
                date: e.date,
                value: e.value,
                month: e.month,
                year: e.year,
                id: e.id
            })) : []
        });

        return monthData;
    }

    // Carregar dados da renda familiar
    loadRendaFamiliar() {
        // Obter dados do mês atual
        const monthData = this.getCurrentMonthData();

        // Se já existem dados de renda para este mês, usar eles
        if (monthData.rendaFamiliar) {
            return monthData.rendaFamiliar;
        }

        // Caso contrário, verificar se há dados globais antigos para migrar
        const saved = localStorage.getItem('rendaFamiliar');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                const rendaData = {
                    meuSalario: data.meuSalario || 2000.00,
                    salarioDela: data.salarioDela || 2000.00,
                    totalTransferido: data.totalTransferido || 1500.00
                };

                // Salvar nos dados do mês atual
                monthData.rendaFamiliar = rendaData;
                this.saveData();

                return rendaData;
            } catch (error) {
                console.error('❌ Erro ao carregar renda familiar:', error);
            }
        }

        // Retornar valores padrão se não houver dados salvos
        const valoresPadrao = {
            meuSalario: 2000.00,
            salarioDela: 2000.00,
            totalTransferido: 1500.00
        };

        // Salvar valores padrão no mês atual
        monthData.rendaFamiliar = valoresPadrao;
        this.saveData();

        return valoresPadrao;
    }

    // Salvar dados no localStorage
    async saveData() {
        if (!this.data || typeof this.data !== "object" || Object.keys(this.data).length === 0) {
            console.warn("⛔ Salvamento bloqueado: dados inválidos", this.data);
            return;
        }
        // Verificar se os dados foram carregados
        if (!this.isDataLoaded || !this.data) {
            console.log('⚠️ Dados não carregados ainda, não salvando...');
            return;
        }

        console.log('💾 Salvando dados:', this.data);
        localStorage.setItem('controleGastos', JSON.stringify(this.data));
        console.log('✅ Dados salvos com sucesso no localStorage');

        // Também salvar no Firestore se usuário estiver logado (aguardar conclusão)
        if (this.userId && db) {
            await this.saveToFirestore();
        }
    }

    // Carregar dados do usuário do Firestore
    async loadUserData() {
        if (!this.userId || !db) {
            console.log('⚠️ Usuário não autenticado ou Firebase não disponível');
            this.enableSyncButtons();
            return;
        }

        try {
            console.log('🔄 Carregando dados do usuário do Firestore...');

            const userDoc = await db.collection('users').doc(this.userId).collection('data').doc('gastos').get();

            if (userDoc.exists) {
                const firestoreData = userDoc.data();

                this.data = (
                    firestoreData.controleGastos &&
                    typeof firestoreData.controleGastos === "object"
                ) ? firestoreData.controleGastos : {};

                localStorage.setItem('controleGastos', JSON.stringify(this.data));
                console.log('✅ Dados carregados do Firestore');

                // Marcar como carregado
                this.isDataLoaded = true;

                // Garantir estrutura mínima antes de renderizar
                this.ensureMonthDataExists();

                // Recarregar a interface
                this.loadDailyExpenses();
                this.renderRendaFamiliar();
                this.renderAll();
            } else {
                console.log('ℹ️ Nenhum dado encontrado no Firestore para este usuário');

                // Limpar completamente localStorage para novo usuário
                console.log('🧹 Limpando localStorage completamente para novo usuário');
                // ❌ NÃO apagar automaticamente
                console.log('Logout realizado - dados preservados');

                // Criar dados limpos para novo usuário
                console.log('🧹 Criando dados limpos para novo usuário');
                this.data = {};
                this.data[this.currentYear] = {};
                this.data[this.currentYear][this.currentMonth] = this.createMonthData();

                // Marcar como carregado
                this.isDataLoaded = true;

                // Salvar estrutura vazia no localStorage
                localStorage.setItem('controleGastos', JSON.stringify(this.data));

                // Salvar estrutura inicial no Firestore
                await this.saveToFirestore();

                // Recarregar interface com dados limpos
                this.loadDailyExpenses();
                this.renderRendaFamiliar();
                this.renderAll();
            }

            // Sempre habilitar botões após tentar carregar
            this.enableSyncButtons();

        } catch (error) {
            console.error('❌ Erro ao carregar dados do Firestore:', error);
            this.enableSyncButtons();
        }
    }

    // Habilitar botões de sincronização
    enableSyncButtons() {
        const syncStatusElement = document.getElementById('sync-status-text');
        const syncBtn = document.getElementById('sync-now-btn');
        const downloadBtn = document.getElementById('sync-download-btn');

        if (syncStatusElement) {
            syncStatusElement.textContent = 'Conectado';
        }

        if (syncBtn) {
            syncBtn.disabled = false;
            syncBtn.style.opacity = '1';
        }

        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.style.opacity = '1';
        }
    }

    // Salvar dados no Firestore
    async saveToFirestore() {
        if (!this.data || typeof this.data !== "object" || Object.keys(this.data).length === 0) {
            console.warn("⛔ Salvamento bloqueado: dados inválidos", this.data);
            return;
        }
        if (!this.isDataLoaded) {
            console.warn("⛔ Salvamento bloqueado: dados ainda não carregados");
            return;
        }
        if (!this.userId || !db) {
            return;
        }

        try {
            await db.collection('users').doc(this.userId).collection('data').doc('gastos').set({
                controleGastos: this.data,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            console.log('✅ Dados salvos no Firestore');
        } catch (error) {
            console.error('❌ Erro ao salvar no Firestore:', error);
        }
    }

    // Salvar dados da renda familiar
    async saveRendaFamiliar() {
        if (!this.data || typeof this.data !== "object" || Object.keys(this.data).length === 0) {
            console.warn("⛔ Salvamento bloqueado: dados inválidos", this.data);
            return;
        }
        if (!this.isDataLoaded) {
            console.warn("⛔ Salvamento bloqueado: dados ainda não carregados");
            return;
        }
        // Salvar nos dados do mês atual
        const monthData = this.getCurrentMonthData();
        monthData.rendaFamiliar = this.rendaFamiliar;

        // Salvar também globalmente para compatibilidade (pode ser removido depois)
        localStorage.setItem('rendaFamiliar', JSON.stringify(this.rendaFamiliar));

        // Salvar dados principais
        await this.saveData();
    }

    // Configurar event listeners
    setupEventListeners() {
        // Formulário
        document.getElementById('item-form').addEventListener('submit', (e) => {
            console.log('📝 Formulário submetido');
            e.preventDefault();
            this.saveItem();
        });

        // Modal
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal();
            }
        });
    }

    // Configurar navegação de meses
    setupMonthNavigation() {
        const monthBtns = document.querySelectorAll('.month-btn');

        // Primeiro, definir o mês ativo correto na interface
        this.setActiveMonthButton();

        monthBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (!this.isDataLoaded) {
                    console.warn("⚠️ Render bloqueado: dados ainda não carregados");
                    return;
                }
                monthBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const month = parseInt(btn.dataset.month);
                if (isNaN(month) || month < 1 || month > 13) {
                    console.warn('⚠️ Mês inválido selecionado:', btn.dataset.month);
                    return;
                }
                if (month === 13) {
                    // Total do ano
                    this.currentMonth = 'total';
                } else {
                    this.currentMonth = month;
                }

                console.log(`🔄 Navegação de mês: Mudando para ${month === 13 ? 'Total' : this.getMonthName(month)} (${this.currentMonth})`);

                // 1. PRIMEIRO: Limpar interface para evitar dados fantasma
                this.clearInterface();

                // 2. Atualizar display do mês (apenas texto)
                this.updateMonthDisplay();

                // 3. Garantir que os dados do mês existam
                this.ensureMonthDataExists();

                // 4. Mostrar/ocultar resumo anual
                this.toggleAnnualSummary();

                // 5. Recarregar gastos diários do novo mês
                this.loadDailyExpenses();

                // 6. Recarregar renda familiar do mês atual
                this.renderRendaFamiliar();

                // 6.1. Executar cálculos automáticos da renda familiar
                setTimeout(() => {
                    this.atualizarRendaFamiliar();
                }, 100);

                // 7. Atualizar campo de data do formulário rápido
                this.updateQuickDateField();

                // 8. FINALMENTE: Renderizar todos os dados
                this.renderAll();

                // 9. Atualizar estatísticas do mês (controla visibilidade dos cards)
                this.updateMonthStats();
            });
        });
    }

    // Definir o botão do mês ativo correto
    setActiveMonthButton() {
        const monthBtns = document.querySelectorAll('.month-btn');
        monthBtns.forEach(btn => btn.classList.remove('active'));

        if (this.currentMonth === 'total') {
            // Ativar botão Total
            const totalBtn = document.querySelector('.month-btn[data-month="13"]');
            if (totalBtn) totalBtn.classList.add('active');
        } else {
            // Ativar botão do mês atual
            const currentBtn = document.querySelector(`.month-btn[data-month="${this.currentMonth}"]`);
            if (currentBtn) currentBtn.classList.add('active');
        }
    }

    // Garantir que os dados do mês existam
    ensureMonthDataExists() {
        if (!this.data || typeof this.data !== "object") {
            this.data = {};
        }
        if (!this.data[this.currentYear]) {
            this.data[this.currentYear] = {};
            console.log(`📁 Criado estrutura para ano: ${this.currentYear}`);
        }
        if (!this.data[this.currentYear][this.currentMonth]) {
            this.data[this.currentYear][this.currentMonth] = this.createMonthData();
            console.log(`📅 Criado estrutura para mês: ${this.getMonthName(this.currentMonth)} ${this.currentYear}`);
        }
    }

    // Limpar interface antes de carregar novos dados
    clearInterface() {
        console.log('🧹 Limpando interface...');

        // Limpar tabelas
        const expenseTable = document.getElementById('expense-table');
        if (expenseTable) {
            expenseTable.innerHTML = '';
        }

        const creditTable = document.getElementById('credit-table');
        if (creditTable) {
            creditTable.innerHTML = '';
        }

        // Limpar gastos diários
        const dailyExpensesList = document.getElementById('daily-expenses-list');
        if (dailyExpensesList) {
            dailyExpensesList.innerHTML = '<div class="no-expenses"><i class="fas fa-coffee"></i><p>Carregando...</p></div>';
        }

        // Limpar resumos
        const dailyTotal = document.getElementById('daily-total');
        if (dailyTotal) {
            dailyTotal.textContent = 'R$ 0,00';
        }

        const dailyCount = document.getElementById('daily-count');
        if (dailyCount) {
            dailyCount.textContent = '0 gastos';
        }

        // Limpar estatísticas do mês
        const monthExpensesTotal = document.getElementById('month-expenses-total');
        if (monthExpensesTotal) {
            monthExpensesTotal.textContent = 'R$ 0,00';
        }

        const monthRemaining = document.getElementById('month-remaining');
        if (monthRemaining) {
            monthRemaining.textContent = 'R$ 0,00';
        }

        const monthLiquidSurplus = document.getElementById('month-liquid-surplus');
        if (monthLiquidSurplus) {
            monthLiquidSurplus.textContent = 'R$ 0,00';
            monthLiquidSurplus.className = 'stat-value';
        }

        const remainingTotal = document.getElementById('remaining-total');
        if (remainingTotal) {
            remainingTotal.textContent = 'R$ 0,00';
        }

        const dailyExpense = document.getElementById('daily-expense');
        if (dailyExpense) {
            dailyExpense.textContent = 'R$ 0,00';
        }

        console.log('✅ Interface limpa com sucesso');
    }

    // Atualizar exibição do mês atual
    updateMonthDisplay() {
        const monthName = this.getMonthName(this.currentMonth);
        const monthDisplay = document.getElementById('current-month-display');

        // Atualizar texto do mês
        if (monthDisplay) {
            monthDisplay.textContent = `${monthName} ${this.currentYear}`;
        }

        // Atualizar display do ano na navegação
        const yearDisplayNav = document.getElementById('current-year-display');
        if (yearDisplayNav) {
            yearDisplayNav.textContent = this.currentYear;
        }
    }

    // Atualizar estatísticas do mês no banner
    updateMonthStats() {
        // Controlar visibilidade dos cards baseado no modo atual
        const remainingCard = document.querySelector('.stat-item:nth-child(2)'); // Restante a Pagar
        const progressCard = document.querySelector('.stat-item:nth-child(3)'); // Progresso Pagos

        if (this.currentMonth === 'total') {
            // No modo total, esconder cards "Restante a Pagar" e "Progresso Pagos"
            if (remainingCard) remainingCard.style.display = 'none';
            if (progressCard) progressCard.style.display = 'none';
            console.log('📊 updateMonthStats: Modo total - cards de pagamento escondidos');

            // Adicionar classe para CSS específico do modo Total
            document.body.classList.add('total-mode');

            // Calcular valores do ano para exibir no cabeçalho
            this.updateAnnualHeaderStats();
            return;
        } else {
            // No modo mês específico, mostrar todos os cards
            if (remainingCard) remainingCard.style.display = 'block';
            if (progressCard) progressCard.style.display = 'block';

            // Remover classe do modo Total
            document.body.classList.remove('total-mode');
        }

        const monthData = this.getCurrentMonthData();

        // Calcular gastos da seção "Gastos do Mês" (sem cartão de crédito)
        const gastosMensais = monthData.expenses.reduce((sum, item) => sum + item.value, 0);

        // Calcular gastos do cartão de crédito (resumos)
        let gastosCartao = 0;
        if (monthData.creditCard && monthData.creditCard.length > 0) {
            const creditEssential = monthData.creditCard.filter(item => item.category === 'essential').reduce((sum, item) => sum + item.value, 0);
            const creditDesire = monthData.creditCard.filter(item => item.category === 'desire').reduce((sum, item) => sum + item.value, 0);
            const creditInvestment = monthData.creditCard.filter(item => item.category === 'investment').reduce((sum, item) => sum + item.value, 0);
            gastosCartao = creditEssential + creditDesire + creditInvestment;
        }

        // Total geral: gastos mensais + gastos do cartão
        const totalExpenses = gastosMensais + gastosCartao;

        // Calcular restante a pagar baseado no status "pago"
        const totalNaoPagoMensais = monthData.expenses
            .filter(item => !item.paid) // Apenas itens não pagos
            .reduce((sum, item) => sum + item.value, 0);

        // Calcular restante a pagar dos resumos do cartão
        let totalNaoPagoCartao = 0;
        if (this.data.creditSummaryStatus) {
            if (!this.data.creditSummaryStatus['credit-essential'] && monthData.creditCard) {
                const creditEssential = monthData.creditCard.filter(item => item.category === 'essential').reduce((sum, item) => sum + item.value, 0);
                totalNaoPagoCartao += creditEssential;
            }
            if (!this.data.creditSummaryStatus['credit-desire'] && monthData.creditCard) {
                const creditDesire = monthData.creditCard.filter(item => item.category === 'desire').reduce((sum, item) => sum + item.value, 0);
                totalNaoPagoCartao += creditDesire;
            }
            if (!this.data.creditSummaryStatus['credit-investment'] && monthData.creditCard) {
                const creditInvestment = monthData.creditCard.filter(item => item.category === 'investment').reduce((sum, item) => sum + item.value, 0);
                totalNaoPagoCartao += creditInvestment;
            }
        }

        const totalNaoPago = totalNaoPagoMensais + totalNaoPagoCartao;

        // Calcular renda total
        const rendaTotal = (monthData.rendaFamiliar?.meuSalario || 0) + (monthData.rendaFamiliar?.salarioDela || 0);

        // Calcular total sob gestão (meu salário + total transferido)
        const totalSobGestao = (monthData.rendaFamiliar?.meuSalario || 0) + (monthData.rendaFamiliar?.totalTransferido || 0);

        // Calcular sobra líquida (total sob gestão - total de gastos)
        const sobraLiquida = totalSobGestao - totalExpenses;

        // Progresso baseado no que já foi pago vs total de gastos
        const totalPagoMensais = monthData.expenses
            .filter(item => item.paid) // Apenas itens pagos
            .reduce((sum, item) => sum + item.value, 0);

        // Calcular total pago dos resumos do cartão
        let totalPagoCartao = 0;
        if (this.data.creditSummaryStatus) {
            if (this.data.creditSummaryStatus['credit-essential'] && monthData.creditCard) {
                const creditEssential = monthData.creditCard.filter(item => item.category === 'essential').reduce((sum, item) => sum + item.value, 0);
                totalPagoCartao += creditEssential;
            }
            if (this.data.creditSummaryStatus['credit-desire'] && monthData.creditCard) {
                const creditDesire = monthData.creditCard.filter(item => item.category === 'desire').reduce((sum, item) => sum + item.value, 0);
                totalPagoCartao += creditDesire;
            }
            if (this.data.creditSummaryStatus['credit-investment'] && monthData.creditCard) {
                const creditInvestment = monthData.creditCard.filter(item => item.category === 'investment').reduce((sum, item) => sum + item.value, 0);
                totalPagoCartao += creditInvestment;
            }
        }

        const totalPago = totalPagoMensais + totalPagoCartao;
        const progresso = totalExpenses > 0 ? Math.min((totalPago / totalExpenses) * 100, 100) : 0;

        // Atualizar elementos
        const expensesTotalEl = document.getElementById('month-expenses-total');
        const remainingEl = document.getElementById('month-remaining');
        const progressEl = document.getElementById('month-progress');
        const liquidSurplusEl = document.getElementById('month-liquid-surplus');

        if (expensesTotalEl) {
            expensesTotalEl.textContent = this.formatarMoeda(totalExpenses);
        }

        if (remainingEl) {
            remainingEl.textContent = this.formatarMoeda(totalNaoPago);

            // Aplicar cor baseada no progresso (igual à barra)
            let colorClass = 'stat-value';
            if (progresso >= 100) {
                colorClass += ' progress-complete'; // Verde intenso
            } else if (progresso >= 70) {
                colorClass += ' progress-good'; // Verde claro
            } else if (progresso >= 40) {
                colorClass += ' progress-warning'; // Laranja
            } else if (progresso > 0) {
                colorClass += ' progress-danger'; // Vermelho
            } else {
                colorClass += ' progress-none'; // Cinza
            }

            remainingEl.className = colorClass;

            // Aplicar cor APENAS ao valor baseado no restante a pagar (mesma lógica da barra)
            const remainingCard = remainingEl.closest('.stat-item');
            if (remainingCard) {
                console.log(`🔍 Verificando valor Restante: totalNaoPago=${totalNaoPago}, totalExpenses=${totalExpenses}`);

                // Aplicar cor diretamente no valor baseado na mesma lógica da barra
                if (totalNaoPago === 0) {
                    remainingEl.style.color = '#22c55e'; // Verde
                    remainingEl.style.fontWeight = '700';
                    console.log('✅ Valor Restante: Verde (nada restante)');
                } else if (totalNaoPago <= (totalExpenses * 0.1)) {
                    remainingEl.style.color = '#22c55e'; // Verde claro
                    remainingEl.style.fontWeight = '600';
                    console.log('✅ Valor Restante: Verde claro (≤10%)');
                } else if (totalNaoPago <= (totalExpenses * 0.3)) {
                    remainingEl.style.color = '#f59e0b'; // Laranja
                    remainingEl.style.fontWeight = '600';
                    console.log('🟠 Valor Restante: Laranja (≤30%)');
                } else if (totalNaoPago < totalExpenses) {
                    remainingEl.style.color = '#ef4444'; // Vermelho
                    remainingEl.style.fontWeight = '600';
                    console.log('🔴 Valor Restante: Vermelho (>30%)');
                } else {
                    remainingEl.style.color = '#9ca3af'; // Cinza
                    remainingEl.style.fontWeight = '500';
                    console.log('⚪ Valor Restante: Cinza (nada pago)');
                }
            }

            console.log(`💰 Restante a Pagar: ${this.formatarMoeda(totalNaoPago)} - Progresso: ${progresso}% - Classe: ${colorClass}`);
        }

        if (progressEl) {
            progressEl.style.width = `${progresso}%`;

            // Sistema de cores dinâmico baseado no restante a pagar (CORRIGIDO)
            if (totalNaoPago === 0) {
                // Nada restante = Verde (tudo pago!)
                progressEl.style.background = 'linear-gradient(90deg, #22c55e, #16a34a)';
                progressEl.style.boxShadow = '0 0 10px rgba(34, 197, 94, 0.4)';
            } else if (totalNaoPago <= (totalExpenses * 0.1)) {
                // Restante <= 10% = Verde claro (quase tudo pago!)
                progressEl.style.background = 'linear-gradient(90deg, #22c55e, #15803d)';
                progressEl.style.boxShadow = '0 0 8px rgba(34, 197, 94, 0.3)';
            } else if (totalNaoPago <= (totalExpenses * 0.3)) {
                // Restante <= 30% = Laranja (boa parte paga)
                progressEl.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
                progressEl.style.boxShadow = '0 0 8px rgba(245, 158, 11, 0.4)';
            } else if (totalNaoPago < totalExpenses) {
                // Restante < total = Vermelho (muito restante)
                progressEl.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
                progressEl.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.4)';
            } else {
                // Restante >= total = Cinza (nada pago ainda)
                progressEl.style.background = 'linear-gradient(90deg, #9ca3af, #6b7280)';
                progressEl.style.boxShadow = 'none';
            }

            console.log(`📊 Progresso atualizado: ${progresso}% - Cor: ${progresso >= 100 ? 'Verde Total' : progresso >= 70 ? 'Verde Claro' : progresso >= 40 ? 'Laranja' : progresso > 0 ? 'Vermelho' : 'Cinza'}`);

            // Log para debug da barra
            console.log(`📊 Barra Progresso: totalNaoPago=${totalNaoPago}, totalExpenses=${totalExpenses}`);
        }

        // Atualizar sobra líquida
        if (liquidSurplusEl) {
            liquidSurplusEl.textContent = this.formatarMoeda(sobraLiquida);

            // Aplicar cor baseada no valor (verde se positivo, vermelho se negativo)
            let colorClass = 'stat-value';
            if (sobraLiquida > 0) {
                colorClass += ' surplus-positive'; // Verde - sobra positiva
            } else if (sobraLiquida < 0) {
                colorClass += ' surplus-negative'; // Vermelho - déficit
            } else {
                colorClass += ' surplus-neutral'; // Cinza - equilíbrio
            }

            liquidSurplusEl.className = colorClass;
            console.log(`💰 Sobra Líquida: ${this.formatarMoeda(sobraLiquida)} (Total sob gestão: ${this.formatarMoeda(totalSobGestao)} - Total gastos: ${this.formatarMoeda(totalExpenses)}) - Classe: ${colorClass}`);
        }
    }

    // Atualizar estatísticas do cabeçalho para o modo "Total" (ano)
    updateAnnualHeaderStats() {
        console.log('📊 Calculando estatísticas anuais para o cabeçalho...');

        // Inicializar contadores
        let totalExpensesAno = 0;
        let totalSobGestaoAno = 0;

        // Usar meses filtrados se o filtro estiver ativo
        const monthsToInclude = this.periodFilter ? this.getFilteredMonths() : Object.keys(this.data[this.currentYear] || {});

        console.log('📅 Meses incluídos no cálculo:', monthsToInclude);

        // Somar dados dos meses filtrados (igual ao cálculo dos cards mensais)
        monthsToInclude.forEach(month => {
            const monthData = this.data[this.currentYear][month];
            if (monthData) {
                // Calcular gastos do mês (igual ao updateMonthStats)
                let gastosMensais = 0;
                let gastosCartao = 0;

                // Gastos mensais
                if (monthData.expenses) {
                    gastosMensais = monthData.expenses.reduce((sum, item) => sum + item.value, 0);
                }

                // Gastos do cartão
                if (monthData.creditCard && monthData.creditCard.length > 0) {
                    const creditEssential = monthData.creditCard.filter(item => item.category === 'essential').reduce((sum, item) => sum + item.value, 0);
                    const creditDesire = monthData.creditCard.filter(item => item.category === 'desire').reduce((sum, item) => sum + item.value, 0);
                    const creditInvestment = monthData.creditCard.filter(item => item.category === 'investment').reduce((sum, item) => sum + item.value, 0);
                    gastosCartao = creditEssential + creditDesire + creditInvestment;
                }

                // Total de gastos do mês
                const totalGastosMes = gastosMensais + gastosCartao;
                totalExpensesAno += totalGastosMes;

                // Calcular total sob gestão do mês (igual ao updateMonthStats)
                const totalSobGestaoMes = (monthData.rendaFamiliar?.meuSalario || 0) + (monthData.rendaFamiliar?.totalTransferido || 0);
                totalSobGestaoAno += totalSobGestaoMes;

                console.log(`📊 Mês ${month}: Gastos=${this.formatarMoeda(totalGastosMes)}, Sob Gestão=${this.formatarMoeda(totalSobGestaoMes)}`);
            }
        });

        // Calcular sobra líquida do ano (total sob gestão - total de gastos)
        const sobraLiquidaAno = totalSobGestaoAno - totalExpensesAno;

        // Informações sobre o período
        const periodo = this.periodFilter ?
            `${this.getMonthName(this.periodFilter.startMonth)} a ${this.getMonthName(this.periodFilter.endMonth)}` :
            'Ano Todo';

        console.log('💰 Estatísticas anuais calculadas:', {
            periodo,
            mesesIncluidos: monthsToInclude.length,
            totalExpensesAno,
            totalSobGestaoAno,
            sobraLiquidaAno
        });

        // Atualizar elementos do cabeçalho
        const expensesTotalEl = document.getElementById('month-expenses-total');
        const liquidSurplusEl = document.getElementById('month-liquid-surplus');

        if (expensesTotalEl) {
            expensesTotalEl.textContent = this.formatarMoeda(totalExpensesAno);
            console.log('✅ Total Gastos do ano atualizado:', this.formatarMoeda(totalExpensesAno));
        }

        if (liquidSurplusEl) {
            liquidSurplusEl.textContent = this.formatarMoeda(sobraLiquidaAno);

            // Aplicar cor baseada no valor (verde se positivo, vermelho se negativo)
            let colorClass = 'stat-value';
            if (sobraLiquidaAno > 0) {
                colorClass += ' surplus-positive'; // Verde - sobra positiva
            } else if (sobraLiquidaAno < 0) {
                colorClass += ' surplus-negative'; // Vermelho - déficit
            } else {
                colorClass += ' surplus-neutral'; // Cinza - equilíbrio
            }

            liquidSurplusEl.className = colorClass;
            console.log('✅ Sobra Líquida do ano atualizada:', this.formatarMoeda(sobraLiquidaAno));
        }

        console.log('✅ updateAnnualHeaderStats concluído com sucesso');
    }

    // Mudar ano
    changeYear(direction) {
        if (!this.isDataLoaded) {
            console.warn("⚠️ Render bloqueado: dados ainda não carregados");
            return;
        }
        const oldYear = this.currentYear;
        this.currentYear += direction;

        console.log(`🗓️ Mudança de ano: ${oldYear} → ${this.currentYear}`);

        // Garantir que os dados do ano existam
        if (!this.data[this.currentYear]) {
            this.data[this.currentYear] = {};
            console.log(`📁 Criado novo ano: ${this.currentYear}`);
        }

        // Garantir que os dados do mês atual existam no novo ano
        this.ensureMonthDataExists();

        // Log da estrutura de dados
        console.log('🔍 Estrutura de dados após mudança de ano:', {
            anosDisponiveis: Object.keys(this.data),
            anoAtual: this.currentYear,
            mesAtual: this.currentMonth,
            dadosDoMesAtual: this.data[this.currentYear][this.currentMonth],
            mesesDoAnoAtual: Object.keys(this.data[this.currentYear] || {})
        });

        // Atualizar interface
        this.updateMonthDisplay();
        this.renderRendaFamiliar(); // Recarregar renda familiar do mês atual
        this.updateQuickDateField(); // Atualizar campo de data do formulário rápido
        this.loadDailyExpenses(); // Recarregar gastos diários do novo ano/mês
        this.renderAll();

        console.log(`✅ Interface atualizada para ${this.getMonthName(this.currentMonth)} ${this.currentYear}`);
    }

    // Atualizar data atual
    updateCurrentDate() {
        const today = new Date();

        document.getElementById('current-date').textContent = today.toLocaleDateString('pt-BR');

        // Dias restantes são calculados na função updateSummary
        // para usar a data editável do próximo pagamento
    }

    // Renderizar tudo
    renderAll() {
        if (!this.isDataLoaded) {
            console.warn("⚠️ Render bloqueado: dados ainda não carregados");
            return;
        }
        console.log('🎨 renderAll chamado para mês:', this.currentMonth, 'ano:', this.currentYear);
        try {
            // Verificar se os dados do mês existem antes de renderizar
            this.ensureMonthDataExists();

            this.renderExpenses();
            this.renderCreditCard();
            this.updateSummary();
            this.updateMonthStats(); // Atualizar estatísticas do banner

            // Cancelar timeout anterior se existir
            if (this.analysisTimeout) {
                clearTimeout(this.analysisTimeout);
                this.analysisTimeout = null;
            }

            // Aguardar um pouco para garantir que o DOM esteja pronto antes de criar os gráficos
            // Usar flag para evitar múltiplas execuções
            if (!this.isUpdatingAnalysis) {
                console.log('⏰ Agendando updateAnalysis em renderAll...');
                this.analysisTimeout = setTimeout(() => {
                    console.log('🚀 Executando updateAnalysis em renderAll...');
                    this.updateAnalysis();
                }, 1500);
            }

            console.log('✅ renderAll concluído com sucesso');

            // Verificar se o container ainda tem conteúdo após renderAll
            setTimeout(() => {
                const container = document.getElementById('daily-expenses-list');
                if (container) {
                    const hasNoExpensesDiv = container.querySelector('.no-expenses');
                    const hasExpenseItems = container.querySelector('.expense-item');
                    console.log('🔍 Container após renderAll:', {
                        innerHTML: container.innerHTML.substring(0, 200) + '...',
                        hasContent: container.innerHTML.trim().length > 0,
                        children: container.children.length,
                        hasNoExpensesDiv: !!hasNoExpensesDiv,
                        hasExpenseItems: !!hasExpenseItems,
                        currentMonth: this.currentMonth,
                        currentYear: this.currentYear
                    });

                    // Se ainda está mostrando "no-expenses", forçar recarregamento
                    if (hasNoExpensesDiv && !hasExpenseItems) {
                        console.log('⚠️ Container ainda mostra "no-expenses", forçando recarregamento...');
                        this.loadDailyExpenses();
                    }
                }
            }, 200);
        } catch (error) {
            console.error('❌ Erro em renderAll:', error);
        }
    }

    // Renderizar renda familiar
    renderRendaFamiliar() {
        if (!this.isDataLoaded) {
            console.warn("⚠️ Render bloqueado: dados ainda não carregados");
            return;
        }
        try {
            // Recarregar dados do mês atual
            this.rendaFamiliar = this.loadRendaFamiliar();

            const mySalaryEl = document.getElementById('my-salary');
            const herSalaryEl = document.getElementById('her-salary');
            const totalTransferredEl = document.getElementById('total-transferred');

            if (mySalaryEl && herSalaryEl && totalTransferredEl) {
                // Preencher campos com valores salvos formatados como moeda
                mySalaryEl.value = this.formatarMoeda(this.rendaFamiliar.meuSalario || 0);
                herSalaryEl.value = this.formatarMoeda(this.rendaFamiliar.salarioDela || 0);
                totalTransferredEl.value = this.formatarMoeda(this.rendaFamiliar.totalTransferido || 0);





                // Garantir que os valores sejam números antes de salvar
                this.rendaFamiliar.meuSalario = Number(this.rendaFamiliar.meuSalario);
                this.rendaFamiliar.salarioDela = Number(this.rendaFamiliar.salarioDela);
                this.rendaFamiliar.totalTransferido = Number(this.rendaFamiliar.totalTransferido);

                // Salvar os valores no localStorage
                this.saveRendaFamiliar();



                // Configurar formatação automática dos inputs
                this.configurarInputsMoeda();

                // Executar cálculos automaticamente após carregar dados
                this.atualizarRendaFamiliar();
            } else {
                console.error('❌ Elementos não encontrados:', {
                    'my-salary': !!mySalaryEl,
                    'her-salary': !!herSalaryEl,
                    'total-transferred': !!totalTransferredEl
                });
            }
        } catch (error) {
            console.error('❌ Erro ao renderizar renda familiar:', error);
        }
    }



    // Renderizar despesas
    renderExpenses() {
        const tbody = document.getElementById('expense-table');

        // Obter dados do mês atual
        let currentData = [];
        if (this.currentMonth === 'total') {
            // Para total, somar todos os meses do ano
            Object.keys(this.data[this.currentYear] || {}).forEach(month => {
                if (this.data[this.currentYear][month] && this.data[this.currentYear][month].expenses) {
                    currentData = currentData.concat(
                        this.data[this.currentYear][month].expenses.filter(item => item.source !== 'credit')
                    );
                }
            });
        } else {
            // Para mês específico
            const monthData = this.getCurrentMonthData();
            currentData = monthData.expenses.filter(item => item.source !== 'credit');
        }

        console.log('📊 Dados filtrados:', currentData);
        console.log('📅 Mês atual:', this.currentMonth, 'Ano:', this.currentYear);

        // Calcular totais por categoria para gastos do cartão (separado para análise)
        let creditExpenses = [];
        if (this.currentMonth === 'total') {
            // Para total, somar todos os gastos do cartão do ano
            Object.keys(this.data[this.currentYear] || {}).forEach(month => {
                if (this.data[this.currentYear][month] && this.data[this.currentYear][month].creditCard) {
                    creditExpenses = creditExpenses.concat(this.data[this.currentYear][month].creditCard);
                }
            });
        } else {
            // Para mês específico
            const monthData = this.getCurrentMonthData();
            creditExpenses = monthData.creditCard || [];
        }

        const creditEssential = creditExpenses.filter(item => item.category === 'essential').reduce((sum, item) => sum + item.value, 0);
        const creditDesire = creditExpenses.filter(item => item.category === 'desire').reduce((sum, item) => sum + item.value, 0);
        const creditInvestment = creditExpenses.filter(item => item.category === 'investment').reduce((sum, item) => sum + item.value, 0);

        // Calcular total: gastos manuais/mensais + resumos do cartão
        const gastosManuais = currentData.reduce((sum, item) => sum + item.value, 0);
        const gastosCartao = creditEssential + creditDesire + creditInvestment;
        const totalExpense = gastosManuais + gastosCartao;

        console.log('🔍 DEBUG - Gastos manuais/mensais:', gastosManuais);
        console.log('🔍 DEBUG - Gastos do cartão:', gastosCartao);
        console.log('🔍 DEBUG - Total final:', totalExpense);

        // DEBUG: Verificar todos os gastos para entender o problema
        console.log('🔍 DEBUG - Todos os gastos do mês:', this.currentMonth, this.currentYear);
        console.log('🔍 DEBUG - Gastos manuais/mensais (sem cartão):', currentData);
        console.log('🔍 DEBUG - Gastos do cartão (separados):', creditExpenses);
        console.log('🔍 DEBUG - Total calculado:', totalExpense);

        // Verificar se há gastos duplicados ou com valores incorretos
        const allExpenses = [...currentData, ...creditExpenses];
        console.log('🔍 DEBUG - Todos os gastos do mês (sem filtro):', allExpenses);

        // Calcular total manualmente para verificar
        const manualTotal = allExpenses.reduce((sum, item) => sum + item.value, 0);
        console.log('🔍 DEBUG - Total manual (todos os gastos):', manualTotal);

        // Criar linhas de resumo dos gastos do cartão
        let tableContent = '';

        // Adicionar resumo dos gastos do cartão se houver
        console.log('🔍 Verificando resumos do cartão:', { creditEssential, creditDesire, creditInvestment, totalExpense });
        console.log('🔍 Status salvos dos resumos:', this.data.creditSummaryStatus);
        console.log('🔍 Condição para mostrar resumos:', creditEssential > 0 || creditDesire > 0 || creditInvestment > 0);
        if (creditEssential > 0 || creditDesire > 0 || creditInvestment > 0) {
            if (creditEssential > 0) {
                const essentialStatus = this.data.creditSummaryStatus && this.data.creditSummaryStatus['credit-essential'] ? this.data.creditSummaryStatus['credit-essential'] : false;
                console.log('💳 Status do resumo Essencial:', essentialStatus);
                tableContent += `
                    <tr class="credit-summary-row essential">
                        <td>Resumo Cartão - Essencial</td>
                        <td>R$ ${creditEssential.toFixed(2)}</td>
                        <td>${totalExpense > 0 ? ((creditEssential / totalExpense) * 100).toFixed(1) : '0.0'}%</td>
                        <td><span class="category-badge category-essential">Essencial</span></td>
                        <td>
                            <label class="toggle-switch">
                                <input type="checkbox" ${essentialStatus ? 'checked' : ''} onchange="app.togglePaidStatus('credit', 'credit-essential', this.checked)">
                                <span class="toggle-slider"></span>
                            </label>
                        </td>
                        <td><em>Resumo automático</em></td>
                    </tr>
                `;
            }

            if (creditDesire > 0) {
                const desireStatus = this.data.creditSummaryStatus && this.data.creditSummaryStatus['credit-desire'] ? this.data.creditSummaryStatus['credit-desire'] : false;
                console.log('💳 Status do resumo Desejo:', desireStatus);
                tableContent += `
                    <tr class="credit-summary-row desire">
                        <td>Resumo Cartão - Desejo</td>
                        <td>R$ ${creditDesire.toFixed(2)}</td>
                        <td>${totalExpense > 0 ? ((creditDesire / totalExpense) * 100).toFixed(1) : '0.0'}%</td>
                        <td><span class="category-badge category-desire">Desejo</span></td>
                        <td>
                            <label class="toggle-switch">
                                <input type="checkbox" ${desireStatus ? 'checked' : ''} onchange="app.togglePaidStatus('credit', 'credit-desire', this.checked)">
                                <span class="toggle-slider"></span>
                            </label>
                        </td>
                        <td><em>Resumo automático</em></td>
                    </tr>
                `;
            }

            if (creditInvestment > 0) {
                const investmentStatus = this.data.creditSummaryStatus && this.data.creditSummaryStatus['credit-investment'] ? this.data.creditSummaryStatus['credit-investment'] : false;
                console.log('💳 Status do resumo Investimento:', investmentStatus);
                tableContent += `
                    <tr class="credit-summary-row investment">
                        <td>Resumo Cartão - Investimento</td>
                        <td>R$ ${creditInvestment.toFixed(2)}</td>
                        <td>${totalExpense > 0 ? ((creditInvestment / totalExpense) * 100).toFixed(1) : '0.0'}%</td>
                        <td><span class="category-badge category-investment">Investimento</span></td>
                        <td>
                            <label class="toggle-switch">
                                <input type="checkbox" ${investmentStatus ? 'checked' : ''} onchange="app.togglePaidStatus('credit', 'credit-investment', this.checked)">
                                <span class="toggle-slider"></span>
                            </label>
                        </td>
                        <td><em>Resumo automático</em></td>
                    </tr>
                `;
            }


        }

        // Adicionar gastos individuais (ordenados apenas para renderização)
        const listaOrdenada = [...currentData].sort((a, b) =>
            (a.description || "").localeCompare(b.description || "", "pt-BR", { sensitivity: "base" })
        );
        const expenseRows = listaOrdenada.map(item => {
            const percentage = totalExpense > 0 ? ((item.value / totalExpense) * 100).toFixed(1) : '0.0';
            console.log('📝 Renderizando item:', item);
            console.log('📝 Status pago do item:', item.paid, 'Tipo:', typeof item.paid);

            // Garantir que a propriedade paid existe
            if (item.paid === undefined) {
                item.paid = false;
            }

            return `
                <tr class="expense-row ${item.category}">
                    <td>${item.description}</td>
                    <td>R$ ${item.value.toFixed(2)}</td>
                    <td>${percentage}%</td>
                    <td><span class="category-badge category-${item.category}">${this.getCategoryLabel(item.category)}</span></td>
                    <td>
                        <label class="toggle-switch">
                            <input type="checkbox" ${item.paid ? 'checked' : ''} onchange="app.togglePaidStatus('expense', ${item.id}, this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                    </td>
                    <td>
                        <button class="btn btn-edit" onclick="app.editItem('expense', ${item.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger" onclick="app.deleteItem('expense', ${item.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        tableContent += expenseRows.join('');
        console.log('🎯 HTML final da tabela:', tableContent);
        console.log('🎯 HTML de uma linha de exemplo:', expenseRows[0] || 'Nenhuma linha gerada');

        tbody.innerHTML = tableContent;

        // Teste: verificar se os botões foram renderizados
        setTimeout(() => {
            const editButtons = tbody.querySelectorAll('.btn-edit');
            const deleteButtons = tbody.querySelectorAll('.btn-danger');
            console.log('🔍 Botões encontrados:', {
                edit: editButtons.length,
                delete: deleteButtons.length,
                total: editButtons.length + deleteButtons.length
            });

            if (editButtons.length === 0 && deleteButtons.length === 0) {
                console.warn('⚠️ Nenhum botão foi renderizado (normal se não há dados)');
                console.log('🔍 Conteúdo da tabela:', tbody.innerHTML);
                // Removido loop recursivo - não forçar re-renderização
            }
        }, 100);

        // Verificar se a tabela tem todas as colunas
        const headerRow = document.querySelector('#expense-table').closest('table').querySelector('thead tr');
        if (headerRow) {
            const headerCells = headerRow.querySelectorAll('th');
            console.log('📊 Cabeçalho da tabela:', headerCells.length, 'colunas');
            if (headerCells.length !== 6) {
                console.error('❌ Tabela não tem 6 colunas! Tem apenas:', headerCells.length);
            }
        }

        // Verificar se o total está correto
        console.log('🔍 FINAL - Total a ser exibido:', totalExpense);

        // Contar itens: gastos manuais/mensais + resumos do cartão
        const itensManuais = currentData.length;
        const itensCartao = [creditEssential, creditDesire, creditInvestment].filter(valor => valor > 0).length;
        const totalItems = itensManuais + itensCartao;

        console.log('🔍 DEBUG - Itens manuais/mensais:', itensManuais);
        console.log('🔍 DEBUG - Resumos do cartão:', itensCartao);
        console.log('🔍 DEBUG - Total de itens:', totalItems);

        console.log('🔍 FINAL - Quantidade de itens:', totalItems);

        document.getElementById('total-expense').textContent = `R$ ${totalExpense.toFixed(2)}`;
        document.getElementById('total-count').textContent = totalItems;
    }

    // Renderizar gastos diários (atualizado para Dashboard Rápido)
    renderDaily() {
        // Atualizar o Dashboard Rápido com os gastos do mês atual
        if (this.currentMonth !== 'total') {
            const monthData = this.getCurrentMonthData();
            const currentData = monthData.dailyExpenses || [];

            // Atualizar o resumo geral se o elemento existir
            const dailyTotalElement = document.getElementById('daily-total');
            if (dailyTotalElement) {
                const total = currentData.reduce((sum, item) => sum + item.value, 0);
                dailyTotalElement.textContent = `R$ ${total.toFixed(2)}`;
            }

            const dailyCountElement = document.getElementById('daily-count');
            if (dailyCountElement) {
                const count = currentData.length;
                dailyCountElement.textContent = `${count} ${count === 1 ? 'gasto' : 'gastos'}`;
            }

            // Recarregar a lista de gastos diários
            this.loadDailyExpenses();
        }
    }

    // Renderizar gastos com cartão de crédito
    renderCreditCard() {
        const tbody = document.getElementById('credit-table');

        // Obter dados do cartão do mês atual
        let currentData = [];
        if (this.currentMonth === 'total') {
            // Para total, somar todos os gastos do cartão do ano
            Object.keys(this.data[this.currentYear] || {}).forEach(month => {
                if (this.data[this.currentYear][month] && this.data[this.currentYear][month].creditCard) {
                    currentData = currentData.concat(this.data[this.currentYear][month].creditCard);
                }
            });
        } else {
            // Para mês específico
            const monthData = this.getCurrentMonthData();
            currentData = monthData.creditCard || [];
        }

        const totalCredit = currentData.reduce((sum, item) => sum + item.value, 0);

        const listaOrdenada = [...currentData].sort((a, b) =>
            (a.description || "").localeCompare(b.description || "", "pt-BR", { sensitivity: "base" })
        );
        tbody.innerHTML = listaOrdenada.map(item => {
            const percentage = totalCredit > 0 ? ((item.value / totalCredit) * 100).toFixed(1) : '0.0';
            return `
                <tr class="expense-row ${item.category}">
                    <td>${item.description}</td>
                    <td>R$ ${item.value.toFixed(2)}</td>
                    <td>${percentage}%</td>
                    <td><span class="category-badge category-${item.category}">${this.getCategoryLabel(item.category)}</span></td>
                    <td>
                        <button class="btn btn-edit" onclick="app.editItem('credit', ${item.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger" onclick="app.deleteItem('credit', ${item.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        document.getElementById('total-credit').textContent = `R$ ${totalCredit.toFixed(2)}`;
        document.getElementById('total-credit-count').textContent = currentData.length;
    }

    // Atualizar resumo
    updateSummary() {
        try {
            // Obter dados do mês atual
            let monthData;
            if (this.currentMonth === 'total') {
                // Para total, somar todos os meses do ano
                monthData = { dailyExpenses: [] };
                Object.keys(this.data[this.currentYear] || {}).forEach(month => {
                    if (this.data[this.currentYear][month] && this.data[this.currentYear][month].dailyExpenses) {
                        monthData.dailyExpenses = monthData.dailyExpenses.concat(this.data[this.currentYear][month].dailyExpenses);
                    }
                });
            } else {
                monthData = this.getCurrentMonthData();
            }

            // Calcular total de gastos diários
            const totalDailyExpenses = (monthData.dailyExpenses || []).reduce((sum, item) => sum + item.value, 0);

            console.log('🔍 DEBUG updateSummary - Cálculo do total:', {
                currentMonth: this.currentMonth,
                currentYear: this.currentYear,
                isTotal: this.currentMonth === 'total',
                gastosDoMes: monthData.dailyExpenses || [],
                quantidadeGastos: (monthData.dailyExpenses || []).length,
                totalCalculado: totalDailyExpenses,
                gastosDetalhes: (monthData.dailyExpenses || []).map(g => ({ date: g.date, value: g.value, month: g.month, year: g.year }))
            });

            // Usar saldo do mês editável ou calcular automaticamente
            let balance;
            if (this.data.monthBalance && this.data.monthBalance[`${this.currentYear}-${this.currentMonth}`]) {
                // Usar saldo definido manualmente
                balance = this.data.monthBalance[`${this.currentYear}-${this.currentMonth}`];
            } else {
                // Calcular automaticamente baseado na renda familiar
                const meuSalario = this.rendaFamiliar.meuSalario || 0;
                const totalTransferido = this.rendaFamiliar.totalTransferido || 0;
                const disponivelParaMim = meuSalario + totalTransferido;
                balance = disponivelParaMim;
            }

            // Total Geral = apenas gastos diários registrados (não inclui gastos do cartão)
            const totalGeral = totalDailyExpenses;
            console.log('💰 Cálculo Total Geral (apenas gastos diários):', {
                dailyExpenses: this.data.dailyExpenses,
                totalDailyExpenses,
                totalGeral
            });

            // Total restante = Saldo do mês - Total Geral
            const remainingTotal = balance - totalGeral;
            console.log('💰 Cálculo Total Restante:', { balance, totalGeral, remainingTotal });

            // Calcular gasto diário permitido
            let dailyExpense = 0;
            let daysRemaining = 0;
            if (this.currentMonth !== 'total') {
                // Pegar dias restantes até o próximo pagamento (editável ou padrão)
                const today = new Date();
                let nextPayment;

                // Verificar se há data editável salva
                const chave = `${this.currentYear}-${this.currentMonth}`;
                if (this.data.nextPaymentDates && this.data.nextPaymentDates[chave]) {
                    nextPayment = new Date(this.data.nextPaymentDates[chave]);
                } else {
                    // Data padrão (29 do mês)
                    nextPayment = new Date(today.getFullYear(), today.getMonth(), 29);
                }

                daysRemaining = Math.ceil((nextPayment - today) / (1000 * 60 * 60 * 24));

                // Gasto diário = Total restante / Dias restantes
                if (daysRemaining > 0 && remainingTotal > 0) {
                    dailyExpense = remainingTotal / daysRemaining;
                    console.log('💰 Cálculo Gasto Diário:', { remainingTotal, daysRemaining, dailyExpense });
                }
            }

            // Atualizar input do saldo do mês
            const monthBalanceInput = document.getElementById('month-balance-input');
            if (monthBalanceInput) {
                monthBalanceInput.value = this.formatarMoeda(balance);
            }

            // Atualizar próximo pagamento
            const nextPaymentInput = document.getElementById('next-payment-input');
            if (nextPaymentInput) {
                const chave = `${this.currentYear}-${this.currentMonth}`;
                console.log('🔍 Atualizando próximo pagamento:', { chave, nextPaymentDates: this.data.nextPaymentDates });

                if (this.data.nextPaymentDates && this.data.nextPaymentDates[chave]) {
                    // Usar data salva
                    nextPaymentInput.value = this.data.nextPaymentDates[chave];
                    console.log('✅ Próximo pagamento atualizado com data salva:', this.data.nextPaymentDates[chave]);
                } else {
                    // Data padrão (29 do mês)
                    const today = new Date();
                    const defaultDate = new Date(today.getFullYear(), today.getMonth(), 29);
                    nextPaymentInput.value = defaultDate.toISOString().split('T')[0];
                    console.log('✅ Próximo pagamento atualizado com data padrão:', defaultDate.toISOString().split('T')[0]);
                }
            } else {
                console.error('❌ Elemento next-payment-input não encontrado');
            }

            // Atualizar dias restantes
            document.getElementById('days-remaining').textContent = daysRemaining > 0 ? daysRemaining : 0;

            // Atualizar Total Geral no resumo geral
            const dailyTotalElement = document.getElementById('daily-total');
            if (dailyTotalElement) {
                dailyTotalElement.textContent = `R$ ${totalGeral.toFixed(2)}`;
                console.log('✅ Total Geral atualizado:', totalGeral.toFixed(2));
            }

            document.getElementById('remaining-total').textContent = `R$ ${remainingTotal.toFixed(2)}`;

            // Atualizar gasto diário com cores condicionais
            const dailyExpenseElement = document.getElementById('daily-expense');
            if (dailyExpenseElement) {
                dailyExpenseElement.textContent = `R$ ${dailyExpense.toFixed(2)}`;

                // Aplicar classes CSS em vez de cores inline
                if (dailyExpense < 22) {
                    dailyExpenseElement.className = 'value negative';
                } else {
                    dailyExpenseElement.className = 'value positive';
                }
            }



            const remainingElement = document.getElementById('remaining-total');
            remainingElement.className = `value ${remainingTotal >= 0 ? 'positive' : 'negative'}`;

            console.log('✅ updateSummary concluído com sucesso');
        } catch (error) {
            console.error('❌ Erro em updateSummary:', error);
        }
    }

    // Atualizar análise 50/30/20
    updateAnalysis() {
        // Evitar múltiplas execuções simultâneas
        if (this.isUpdatingAnalysis) {
            console.log('⚠️ updateAnalysis já está sendo executado, pulando...');
            return;
        }

        this.isUpdatingAnalysis = true;

        try {
            console.log('🔍 Iniciando updateAnalysis...');

            // Calcular renda baseada no modo atual
            let meuSalario, totalTransferido, disponivelParaMim;

            if (this.currentMonth === 'total') {
                // Para modo total, usar filtro de período se disponível
                meuSalario = 0;
                totalTransferido = 0;

                const monthsToInclude = this.periodFilter ? this.getFilteredMonths() : Object.keys(this.data[this.currentYear] || {});

                monthsToInclude.forEach(month => {
                    const monthData = this.data[this.currentYear][month];
                    if (monthData && monthData.rendaFamiliar) {
                        const renda = monthData.rendaFamiliar;
                        meuSalario += renda.meuSalario || 0;
                        totalTransferido += renda.totalTransferido || 0;
                    }
                });

                disponivelParaMim = meuSalario + totalTransferido;
                console.log('💰 Dados de renda anual:', { meuSalario, totalTransferido, disponivelParaMim });
            } else {
                // Para mês específico, usar dados do mês atual
                meuSalario = this.rendaFamiliar.meuSalario || 0;
                totalTransferido = this.rendaFamiliar.totalTransferido || 0;
                disponivelParaMim = meuSalario + totalTransferido;
                console.log('💰 Dados de renda mensal:', { meuSalario, totalTransferido, disponivelParaMim });
            }

            // Obter todos os gastos do mês atual (manuais + cartão)
            let currentExpenses = [];
            if (this.currentMonth === 'total') {
                // Para total, usar filtro de período
                const period = this.periodFilter ? `${this.getMonthName(this.periodFilter.startMonth)} a ${this.getMonthName(this.periodFilter.endMonth)}` : 'ANO TODO';
                console.log(`📊 Calculando análise 50/30/20 para período: ${period}`);

                const monthsToInclude = this.periodFilter ? this.getFilteredMonths() : Object.keys(this.data[this.currentYear] || {});

                monthsToInclude.forEach(month => {
                    if (this.data[this.currentYear][month]) {
                        const monthData = this.data[this.currentYear][month];
                        if (monthData.expenses) {
                            currentExpenses = currentExpenses.concat(monthData.expenses);
                        }
                        if (monthData.creditCard) {
                            currentExpenses = currentExpenses.concat(monthData.creditCard);
                        }
                    }
                });
                console.log(`📊 Total de gastos do período encontrados: ${currentExpenses.length}`);
            } else {
                console.log(`📊 Calculando análise 50/30/20 para ${this.getMonthName(this.currentMonth)}...`);
                // Para mês específico
                const monthData = this.getCurrentMonthData();
                currentExpenses = [...(monthData.expenses || []), ...(monthData.creditCard || [])];
            }

            // Valores ideais baseados no método 50/30/20
            const idealEssential = disponivelParaMim * 0.5;
            const idealDesire = disponivelParaMim * 0.3;
            const idealInvestment = disponivelParaMim * 0.2;

            // Valores reais
            const realEssential = currentExpenses.filter(item => item.category === 'essential')
                .reduce((sum, item) => sum + item.value, 0);
            const realDesire = currentExpenses.filter(item => item.category === 'desire')
                .reduce((sum, item) => sum + item.value, 0);
            const realInvestment = currentExpenses.filter(item => item.category === 'investment')
                .reduce((sum, item) => sum + item.value, 0);

            console.log('🎯 Valores ideais:', { idealEssential, idealDesire, idealInvestment });
            console.log('📊 Valores reais:', { realEssential, realDesire, realInvestment });
            console.log('📋 Gastos filtrados:', currentExpenses);

            // Atualizar valores
            document.getElementById('essential-ideal').textContent = `R$ ${idealEssential.toFixed(2)}`;
            document.getElementById('essential-real').textContent = `R$ ${realEssential.toFixed(2)}`;
            document.getElementById('desire-ideal').textContent = `R$ ${idealDesire.toFixed(2)}`;
            document.getElementById('desire-real').textContent = `R$ ${realDesire.toFixed(2)}`;
            document.getElementById('investment-ideal').textContent = `R$ ${idealInvestment.toFixed(2)}`;
            document.getElementById('investment-real').textContent = `R$ ${realInvestment.toFixed(2)}`;

            // Calcular e exibir diferenças
            const essentialDiff = idealEssential - realEssential;
            const desireDiff = idealDesire - realDesire;
            const investmentDiff = idealInvestment - realInvestment;

            document.getElementById('essential-difference').innerHTML = `
                <div class="first-line">
                    <span class="label">Diferença:</span>
                    <span class="value ${essentialDiff >= 0 ? 'positive' : 'negative'}">R$ ${Math.abs(essentialDiff).toFixed(2)}</span>
                </div>
            `;

            document.getElementById('desire-difference').innerHTML = `
                <div class="first-line">
                    <span class="label">Diferença:</span>
                    <span class="value ${desireDiff >= 0 ? 'positive' : 'negative'}">R$ ${Math.abs(desireDiff).toFixed(2)}</span>
                </div>
            `;

            document.getElementById('investment-difference').innerHTML = `
                <div class="first-line">
                    <span class="label">Diferença:</span>
                    <span class="value ${investmentDiff >= 0 ? 'negative' : 'positive'}">R$ ${Math.abs(investmentDiff).toFixed(2)}</span>
                </div>
            `;

            // Atualizar status das categorias
            this.updateBudgetStatus('essential', realEssential, idealEssential);
            this.updateBudgetStatus('desire', realDesire, idealDesire);
            this.updateBudgetStatus('investment', realInvestment, idealInvestment);

            // Atualizar gráfico com delay para garantir que o DOM esteja pronto
            console.log('⏰ Agendando criação dos gráficos...');
            setTimeout(() => {
                console.log('🚀 Executando updateBudgetChart...');
                this.updateBudgetChart(idealEssential, idealDesire, idealInvestment, realEssential, realDesire, realInvestment);
            }, 1000);

            // Verificação adicional após 2 segundos
            setTimeout(() => {
                console.log('🔍 Verificação adicional dos gráficos...');
                if (!this.essentialChart || !this.desireChart || !this.investmentChart) {
                    console.log('⚠️ Gráficos não foram criados, tentando novamente...');
                    this.updateBudgetChart(idealEssential, idealDesire, idealInvestment, realEssential, realDesire, realInvestment);
                }
            }, 2000);

        } catch (error) {
            console.error('❌ Erro em updateAnalysis:', error);
        } finally {
            // Resetar flag no final da execução
            this.isUpdatingAnalysis = false;
        }
    }

    // Atualizar status do orçamento
    updateBudgetStatus(category, real, ideal) {
        try {
            const statusElement = document.getElementById(`${category}-status`);
            if (!statusElement) {
                console.warn(`⚠️ Elemento ${category}-status não encontrado`);
                return;
            }

            const statusText = statusElement.querySelector('.status-text');
            if (!statusText) {
                console.warn(`⚠️ Elemento .status-text não encontrado em ${category}-status`);
                return;
            }

            let status, text, icon;

            if (category === 'investment') {
                // Lógica específica para investimento
                if (real >= ideal) {
                    // Investiu o ideal ou mais - ótimo!
                    status = 'within';
                    text = 'Meta atingida! 🎯';
                    icon = '✅';
                } else if (real >= ideal * 0.8) {
                    // Investiu pelo menos 80% do ideal
                    status = 'warning';
                    text = 'Quase lá! 💪';
                    icon = '⚠️';
                } else {
                    // Investiu menos de 80% do ideal
                    status = 'over';
                    text = 'Meta não atingida';
                    icon = '📉';
                }
            } else {
                // Lógica para outras categorias (essencial e desejo)
                if (real <= ideal * 0.9) {
                    // Dentro do orçamento (até 90% do ideal)
                    status = 'within';
                    text = 'Dentro do orçamento';
                    icon = '✅';
                } else if (real <= ideal) {
                    // Aproximando do limite (90% a 100% do ideal)
                    status = 'warning';
                    text = 'Aproximando do limite';
                    icon = '⚠️';
                } else {
                    // Excedendo o orçamento
                    status = 'over';
                    text = 'Excedendo o orçamento';
                    icon = '❌';
                }
            }

            statusElement.className = `budget-status ${status}`;
            statusText.innerHTML = `${icon} ${text}`;
        } catch (error) {
            console.error(`❌ Erro ao atualizar status de ${category}:`, error);
        }
    }

    // Atualizar gráficos de orçamento por categoria
    updateBudgetChart(idealEssential, idealDesire, idealInvestment, realEssential, realDesire, realInvestment) {
        try {
            console.log('📊 Iniciando updateBudgetChart...');
            console.log('📈 Dados para o gráfico:', { idealEssential, idealDesire, idealInvestment, realEssential, realDesire, realInvestment });

            // Verificar se Chart.js está disponível
            if (typeof Chart === 'undefined') {
                console.error('❌ Chart.js não está disponível!');
                return;
            }

            console.log('✅ Chart.js está disponível!');

            // Verificar se os elementos HTML existem
            const essentialCanvas = document.getElementById('essentialChart');
            const desireCanvas = document.getElementById('desireChart');
            const investmentCanvas = document.getElementById('investmentChart');

            console.log('🔍 Verificando elementos HTML:', {
                essentialCanvas: !!essentialCanvas,
                desireCanvas: !!desireCanvas,
                investmentCanvas: !!investmentCanvas
            });

            if (!essentialCanvas || !desireCanvas || !investmentCanvas) {
                console.error('❌ Alguns elementos canvas não foram encontrados!');
                return;
            }

            // Destruir gráficos existentes se houver
            console.log('🗑️ Destruindo gráficos existentes...');
            if (this.essentialChart) {
                console.log('🗑️ Destruindo gráfico Essencial');
                this.essentialChart.destroy();
                this.essentialChart = null;
            }
            if (this.desireChart) {
                console.log('🗑️ Destruindo gráfico Desejo');
                this.desireChart.destroy();
                this.desireChart = null;
            }
            if (this.investmentChart) {
                console.log('🗑️ Destruindo gráfico Investimento');
                this.investmentChart.destroy();
                this.investmentChart = null;
            }

            // Criar gráfico Essencial
            console.log('🎨 Criando gráfico Essencial...');
            this.createCategoryChart('essentialChart', 'Essencial', idealEssential, realEssential);

            // Criar gráfico Desejo
            console.log('🎨 Criando gráfico Desejo...');
            this.createCategoryChart('desireChart', 'Desejo', idealDesire, realDesire);

            // Criar gráfico Investimento
            console.log('🎨 Criando gráfico Investimento...');
            this.createCategoryChart('investmentChart', 'Investimento', idealInvestment, realInvestment);

            console.log('✅ Gráficos criados com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao criar gráficos:', error);
        }
    }

    // Criar gráfico individual para cada categoria
    createCategoryChart(canvasId, categoryName, ideal, real) {
        console.log(`🎨 Criando gráfico para ${categoryName}...`);
        console.log(`🔍 Procurando canvas: ${canvasId}`);

        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`❌ Canvas ${canvasId} não encontrado`);
            return;
        }

        console.log(`✅ Canvas ${canvasId} encontrado, criando gráfico...`);

        console.log(`🎯 Criando Chart.js para ${categoryName} com dados:`, { ideal, real });

        try {
            console.log(`🔍 Contexto do canvas:`, ctx);

            // Verificar se Chart.js está disponível
            if (typeof Chart === 'undefined') {
                console.error('❌ Chart.js não está disponível em createCategoryChart!');
                return;
            }

            const chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Orçado (Ideal)', 'Realizado'],
                    datasets: [{
                        data: [ideal, real],
                        backgroundColor: [
                            'rgba(34, 197, 94, 0.8)', // Verde com transparência
                            'rgba(239, 68, 68, 0.8)'  // Vermelho com transparência
                        ],
                        borderColor: [
                            '#22c55e', // Verde
                            '#ef4444'  // Vermelho
                        ],
                        borderWidth: 2,
                        borderRadius: 6,
                        borderSkipped: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y', // Gráfico horizontal
                    animation: {
                        duration: 1500,
                        easing: 'easeInOutQuart'
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.9)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                            borderWidth: 1,
                            cornerRadius: 8,
                            padding: 12,
                            font: {
                                size: 12,
                                family: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
                            },
                            callbacks: {
                                label: function (context) {
                                    const value = context.parsed.x;
                                    return `R$ ${value.toFixed(2)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            grid: {
                                color: document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                                drawBorder: false
                            },
                            ticks: {
                                font: {
                                    size: 11,
                                    family: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
                                },
                                color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#4a5568',
                                padding: 6,
                                callback: function (value) {
                                    return 'R$ ' + value.toFixed(0);
                                }
                            }
                        },
                        y: {
                            grid: {
                                color: document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                                drawBorder: false
                            },
                            ticks: {
                                font: {
                                    size: 11,
                                    family: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
                                },
                                color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#4a5568',
                                padding: 6
                            }
                        }
                    },
                    elements: {
                        bar: {
                            borderSkipped: false
                        }
                    },
                    layout: {
                        padding: {
                            top: 10, right: 15, bottom: 10, left: 15
                        }
                    }
                }
            });

            // Armazenar referência do gráfico
            if (categoryName === 'Essencial') {
                this.essentialChart = chart;
                console.log('✅ Gráfico Essencial armazenado:', this.essentialChart);
            } else if (categoryName === 'Desejo') {
                this.desireChart = chart;
                console.log('✅ Gráfico Desejo armazenado:', this.desireChart);
            } else if (categoryName === 'Investimento') {
                this.investmentChart = chart;
                console.log('✅ Gráfico Investimento armazenado:', this.investmentChart);
            }

            console.log(`🎉 Gráfico ${categoryName} criado com sucesso!`);

        } catch (error) {
            console.error(`❌ Erro ao criar gráfico ${categoryName}:`, error);
        }
    }

    // Atualizar cores dos gráficos baseado no tema atual
    updateChartColors() {
        const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDarkTheme ? '#ffffff' : '#4a5568';
        const gridColor = isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

        // Atualizar gráfico Essencial
        if (this.essentialChart) {
            this.essentialChart.options.scales.x.ticks.color = textColor;
            this.essentialChart.options.scales.y.ticks.color = textColor;
            this.essentialChart.options.scales.x.grid.color = gridColor;
            this.essentialChart.options.scales.y.grid.color = gridColor;
            this.essentialChart.update();
        }

        // Atualizar gráfico Desejo
        if (this.desireChart) {
            this.desireChart.options.scales.x.ticks.color = textColor;
            this.desireChart.options.scales.y.ticks.color = textColor;
            this.desireChart.options.scales.x.grid.color = gridColor;
            this.desireChart.options.scales.y.grid.color = gridColor;
            this.desireChart.update();
        }

        // Atualizar gráfico Investimento
        if (this.investmentChart) {
            this.investmentChart.options.scales.x.ticks.color = textColor;
            this.investmentChart.options.scales.y.ticks.color = textColor;
            this.investmentChart.options.scales.x.grid.color = gridColor;
            this.investmentChart.options.scales.y.grid.color = gridColor;
            this.investmentChart.update();
        }

        console.log('🎨 Cores dos gráficos atualizadas para o tema:', isDarkTheme ? 'escuro' : 'claro');
    }

    // Atualizar resumos do cartão de crédito
    updateCreditSummaries() {
        console.log('🔄 Atualizando resumos do cartão...');

        // Obter gastos do cartão do mês atual
        let creditExpenses = [];
        if (this.currentMonth === 'total') {
            // Para total, somar todos os gastos do cartão do ano
            Object.keys(this.data[this.currentYear] || {}).forEach(month => {
                if (this.data[this.currentYear][month] && this.data[this.currentYear][month].creditCard) {
                    creditExpenses = creditExpenses.concat(this.data[this.currentYear][month].creditCard);
                }
            });
        } else {
            // Para mês específico
            const monthData = this.getCurrentMonthData();
            creditExpenses = monthData.creditCard || [];
        }

        const creditEssential = creditExpenses.filter(item => item.category === 'essential').reduce((sum, item) => sum + item.value, 0);
        const creditDesire = creditExpenses.filter(item => item.category === 'desire').reduce((sum, item) => sum + item.value, 0);
        const creditInvestment = creditExpenses.filter(item => item.category === 'investment').reduce((sum, item) => sum + item.value, 0);

        console.log('📊 Novos totais do cartão:', { creditEssential, creditDesire, creditInvestment });

        // Se não há mais gastos em uma categoria, remover o status salvo
        if (creditEssential === 0 && this.data.creditSummaryStatus) {
            delete this.data.creditSummaryStatus['credit-essential'];
        }
        if (creditDesire === 0 && this.data.creditSummaryStatus) {
            delete this.data.creditSummaryStatus['credit-desire'];
        }
        if (creditInvestment === 0 && this.data.creditSummaryStatus) {
            delete this.data.creditSummaryStatus['credit-investment'];
        }

        // Salvar dados atualizados
        this.saveData();

        console.log('✅ Resumos do cartão atualizados');
    }

    // Alternar status de pago
    async togglePaidStatus(type, id, paid) {
        console.log('🔄 togglePaidStatus chamado:', { type, id, paid });

        if (type === 'credit') {
            // Salvar o status do resumo do cartão
            if (!this.data.creditSummaryStatus) {
                this.data.creditSummaryStatus = {};
            }
            this.data.creditSummaryStatus[id] = paid;
            console.log('💳 Status do resumo salvo:', this.data.creditSummaryStatus);
            await this.saveData();
            this.renderAll();
            return;
        }

        if (type === 'expense') {
            // Verificar se é um resumo de cartão
            if (id === 'credit-essential' || id === 'credit-desire' || id === 'credit-investment') {
                // Salvar o status do resumo
                if (!this.data.creditSummaryStatus) {
                    this.data.creditSummaryStatus = {};
                }
                this.data.creditSummaryStatus[id] = paid;
                console.log('💳 Status do resumo salvo:', this.data.creditSummaryStatus);
                await this.saveData();
                this.renderAll();
                return;
            }

            // Gasto individual normal - procurar em todos os meses
            let item = null;
            Object.keys(this.data).forEach(year => {
                if (typeof this.data[year] === 'object' && this.data[year] !== null) {
                    Object.keys(this.data[year]).forEach(month => {
                        if (this.data[year][month] && this.data[year][month].expenses) {
                            const foundItem = this.data[year][month].expenses.find(i => i.id === id);
                            if (foundItem) {
                                item = foundItem;
                            }
                        }
                        if (this.data[year][month] && this.data[year][month].creditCard) {
                            const foundItem = this.data[year][month].creditCard.find(i => i.id === id);
                            if (foundItem) {
                                item = foundItem;
                            }
                        }
                    });
                }
            });

            if (item) {
                item.paid = paid;
                console.log('💰 Status do gasto salvo:', item);
                await this.saveData();
                this.renderAll();
            }
        }
    }

    // Abrir modal
    openModal(type) {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modal-title');
        const categoryGroup = document.getElementById('category-group');
        const dateGroup = document.getElementById('date-group');
        const descriptionInput = document.getElementById('description');

        // Configurar campos baseado no tipo
        switch (type) {
            case 'expense':
                modalTitle.textContent = this.editingItem ? 'Editar Despesa' : 'Adicionar Despesa';
                categoryGroup.style.display = 'block';
                dateGroup.style.display = 'none';
                break;
            case 'credit':
                modalTitle.textContent = this.editingItem ? 'Editar Gasto no Cartão' : 'Adicionar Gasto no Cartão';
                categoryGroup.style.display = 'block';
                dateGroup.style.display = 'none';
                break;
            case 'daily':
                modalTitle.textContent = this.editingItem ? 'Editar Gasto Diário' : 'Adicionar Gasto Diário';
                categoryGroup.style.display = 'none';
                dateGroup.style.display = 'block';
                break;
        }

        // Configurar autocomplete no campo descrição (apenas uma vez)
        if (descriptionInput && !descriptionInput.hasAttribute('data-autocomplete-setup')) {
            this.setupAutocomplete(descriptionInput, (suggestion) => {
                // Quando uma sugestão for selecionada, preencher categoria automaticamente
                if (suggestion.category && document.getElementById('category')) {
                    document.getElementById('category').value = suggestion.category;
                }
                console.log('💡 Sugestão selecionada:', suggestion);
            });
            descriptionInput.setAttribute('data-autocomplete-setup', 'true');
            console.log('✅ Autocomplete configurado no modal');
        }

        // Limpar formulário apenas se não estiver editando
        if (!this.editingItem) {
            document.getElementById('item-form').reset();

            // Definir data atual se for gasto diário
            if (type === 'daily') {
                const hoje = new Date();
                const yyyy = hoje.getFullYear();
                const mm = String(hoje.getMonth() + 1).padStart(2, '0');
                const dd = String(hoje.getDate()).padStart(2, '0');
                document.getElementById('date').value = `${yyyy}-${mm}-${dd}`;
            }
        }

        modal.style.display = 'block';
        this.currentModalType = type;

        // Focar no campo de descrição após um pequeno delay
        setTimeout(() => {
            if (descriptionInput) {
                descriptionInput.focus();
            }
        }, 100);
    }

    // Fechar modal
    closeModal() {
        document.getElementById('modal').style.display = 'none';
        this.editingItem = null;
        this.currentModalType = null;
    }

    // Mostrar modal de confirmação
    showConfirmModal(title, message, onConfirm) {
        const confirmModal = document.getElementById('confirm-modal');
        const confirmTitle = document.getElementById('confirm-title');
        const confirmMessage = document.getElementById('confirm-message');
        const confirmOkBtn = document.getElementById('confirm-ok-btn');

        // Configurar conteúdo do modal
        confirmTitle.textContent = title;
        confirmMessage.textContent = message;

        // Configurar botão OK
        confirmOkBtn.onclick = () => {
            closeConfirmModal();
            if (onConfirm) {
                onConfirm();
            }
        };

        // Mostrar modal
        confirmModal.style.display = 'block';
    }

    // Salvar item
    async saveItem() {
        const description = document.getElementById('description').value;
        const value = parseFloat(document.getElementById('value').value);

        console.log('💾 saveItem chamado:', { description, value, editingItem: this.editingItem, currentModalType: this.currentModalType });

        if (!description || isNaN(value)) {
            alert('Por favor, preencha todos os campos corretamente.');
            return;
        }

        if (this.editingItem) {
            console.log('✏️ Editando item existente:', this.editingItem);
            // Editar item existente
            this.updateExistingItem(description, value);
        } else {
            console.log('➕ Adicionando novo item');
            // Adicionar novo item
            this.addNewItem(description, value);
        }

        this.closeModal();
        this.renderAll();
        await this.saveData();
    }

    // Adicionar novo item
    addNewItem(description, value) {
        console.log('🔍 addNewItem chamado:', { description, value, currentModalType: this.currentModalType, currentMonth: this.currentMonth, currentYear: this.currentYear });

        const newId = Date.now();

        // Se estiver no modo "total", não permitir adicionar novos itens
        if (this.currentMonth === 'total') {
            alert('Para adicionar gastos, selecione um mês específico primeiro.');
            return;
        }

        const month = this.currentMonth;
        const year = this.currentYear;

        // Garantir que os dados do mês existam
        this.ensureMonthDataExists();
        const monthData = this.getCurrentMonthData();

        console.log('🔍 Dados do mês obtidos:', monthData);

        switch (this.currentModalType) {
            case 'expense':
                // Gasto manual direto
                const category = document.getElementById('category').value;
                monthData.expenses.push({
                    id: newId,
                    description,
                    value,
                    category,
                    paid: false, // Padrão como não pago
                    month,
                    year,
                    source: 'manual' // Marcar como gasto manual
                });
                break;
            case 'credit':
                // Gasto no cartão de crédito
                const creditCategory = document.getElementById('category').value;

                // Criar item para cartão de crédito (padrão como não pago)
                const creditItem = {
                    id: newId,
                    description,
                    value,
                    category: creditCategory,
                    paid: false, // Padrão como não pago - usuário pode marcar como pago depois
                    month,
                    year,
                    source: 'credit' // Marcar como gasto no cartão
                };

                // Adicionar apenas aos gastos do cartão (não duplicar nos gastos mensais)
                monthData.creditCard.push(creditItem);
                break;
            case 'daily':
                const date = document.getElementById('date').value;
                const parsedDate = this.validarDataInput(date);
                if (!parsedDate) {
                    alert('Data inválida! Por favor, selecione uma data válida.');
                    return;
                }
                monthData.dailyExpenses.push({
                    id: newId,
                    date,
                    value,
                    month: parsedDate.month,
                    year: parsedDate.year
                });
                break;
        }

        console.log('✅ Item adicionado com sucesso. Dados finais do mês:', monthData);
    }

    // Atualizar item existente
    updateExistingItem(description, value) {
        const item = this.editingItem;
        console.log('🔄 updateExistingItem chamado:', { item, description, value, currentModalType: this.currentModalType });

        switch (this.currentModalType) {
            case 'expense':
                item.description = description;
                item.value = value;
                item.category = document.getElementById('category').value;
                console.log('✅ Item de despesa atualizado:', item);
                // item.paid mantém o valor atual (não alterado via modal)
                break;
            case 'credit':
                // Atualizar item do cartão
                item.description = description;
                item.value = value;
                item.category = document.getElementById('category').value;
                console.log('✅ Item do cartão atualizado:', item);
                // item.paid sempre true para cartão
                break;
            case 'daily':
                item.description = description;
                item.value = value;
                item.date = document.getElementById('date').value;
                const parsedDate = this.validarDataInput(item.date);
                if (!parsedDate) {
                    alert('Data inválida! Por favor, selecione uma data válida.');
                    return;
                }
                item.month = parsedDate.month;
                item.year = parsedDate.year;
                console.log('✅ Item diário atualizado:', item);
                break;
        }
    }

    // Editar item
    editItem(type, id) {
        console.log('🔍 editItem chamado:', { type, id });

        let item = null;

        // Procurar item em todos os meses
        Object.keys(this.data).forEach(year => {
            if (typeof this.data[year] === 'object' && this.data[year] !== null) {
                Object.keys(this.data[year]).forEach(month => {
                    if (this.data[year][month]) {
                        switch (type) {
                            case 'expense':
                                if (this.data[year][month].expenses) {
                                    const foundItem = this.data[year][month].expenses.find(i => i.id === id);
                                    if (foundItem) item = foundItem;
                                }
                                break;
                            case 'credit':
                                if (this.data[year][month].creditCard) {
                                    const foundItem = this.data[year][month].creditCard.find(i => i.id === id);
                                    if (foundItem) item = foundItem;
                                }
                                break;
                            case 'daily':
                                if (this.data[year][month].dailyExpenses) {
                                    const foundItem = this.data[year][month].dailyExpenses.find(i => i.id === id);
                                    if (foundItem) item = foundItem;
                                }
                                break;
                        }
                    }
                });
            }
        });

        if (!item) {
            console.error('❌ Item não encontrado:', { type, id });
            return;
        }

        console.log('✅ Item encontrado para edição:', item);
        this.editingItem = item;
        this.openModal(type);

        // Preencher formulário
        document.getElementById('description').value = item.description;
        document.getElementById('value').value = item.value;

        if (type === 'expense') {
            document.getElementById('category').value = item.category;
            // Campo pago não é editado via modal
        } else if (type === 'credit') {
            document.getElementById('category').value = item.category;
            // Não preencher campo pago para cartão
        } else if (type === 'daily') {
            document.getElementById('date').value = item.date;
        }

        console.log('✅ Formulário preenchido com dados do item:', {
            description: item.description,
            value: item.value,
            category: item.category
        });
    }

    // Deletar item
    deleteItem(type, id) {
        this.showConfirmModal(
            'Excluir Item',
            'Tem certeza que deseja excluir este item?',
            async () => {
                // Procurar e remover item em todos os meses
                Object.keys(this.data).forEach(year => {
                    if (typeof this.data[year] === 'object' && this.data[year] !== null) {
                        Object.keys(this.data[year]).forEach(month => {
                            if (this.data[year][month]) {
                                switch (type) {
                                    case 'expense':
                                        if (this.data[year][month].expenses) {
                                            this.data[year][month].expenses = this.data[year][month].expenses.filter(i => i.id !== id);
                                        }
                                        break;
                                    case 'credit':
                                        if (this.data[year][month].creditCard) {
                                            this.data[year][month].creditCard = this.data[year][month].creditCard.filter(i => i.id !== id);
                                        }
                                        break;
                                    case 'daily':
                                        if (this.data[year][month].dailyExpenses) {
                                            this.data[year][month].dailyExpenses = this.data[year][month].dailyExpenses.filter(i => i.id !== id);
                                        }
                                        break;
                                }
                            }
                        });
                    }
                });

                this.renderAll();
                await this.saveData();
            }
        );
    }

    // Utilitários
    getCategoryLabel(category) {
        const labels = {
            'essential': 'Essencial',
            'desire': 'Desejo',
            'investment': 'Investimento'
        };
        return labels[category] || category;
    }

    // Funções de formatação removidas - agora trabalhamos com números simples

    // Configurar inputs numéricos com formatação de moeda
    configurarInputsMoeda() {
        const inputs = ['my-salary', 'her-salary', 'total-transferred'];

        inputs.forEach(id => {
            const input = document.getElementById(id);

            if (input) {
                // Preparar campo para edição ao focar
                input.addEventListener('focus', () => {
                    const valorAtual = this.extrairValorNumerico(input.value);
                    // Mostrar apenas o número sem formatação para edição
                    input.value = valorAtual.toString().replace('.', ',');
                });

                // Formatar como moeda quando perder foco
                input.addEventListener('blur', () => {
                    if (input.value === '' || input.value.trim() === '') {
                        input.value = 'R$ 0,00';
                    } else {
                        const valor = this.extrairValorNumerico(input.value);
                        if (valor > 0) {
                            input.value = this.formatarMoeda(valor);
                        } else {
                            input.value = 'R$ 0,00';
                        }
                    }
                    this.atualizarRendaFamiliar();
                });

                // Formatar em tempo real durante a digitação
                input.addEventListener('input', (e) => {
                    let valor = e.target.value.replace(/[^\d,]/g, '');

                    // Permitir apenas uma vírgula
                    const virgulas = valor.match(/,/g);
                    if (virgulas && virgulas.length > 1) {
                        valor = valor.replace(/,/g, (match, index) => {
                            return index === valor.lastIndexOf(',') ? ',' : '';
                        });
                    }

                    e.target.value = valor;
                });
            }
        });
    }

    // Configurar input de saldo do mês para comportar-se como moeda
    configurarSaldoMesInput() {
        const input = document.getElementById('month-balance-input');
        if (!input) return;

        // Mostrar sempre formatado como moeda ao carregar
        const chave = `${this.currentYear}-${this.currentMonth}`;
        const valorSalvo = (this.data.monthBalance && this.data.monthBalance[chave]) || 0;
        input.value = this.formatarMoeda(valorSalvo);

        // Preparar campo para edição ao focar
        input.addEventListener('focus', () => {
            const valorAtual = this.extrairValorNumerico(input.value);
            input.value = valorAtual.toString().replace('.', ',');
        });

        // Formatar como moeda ao perder foco
        input.addEventListener('blur', () => {
            if (input.value === '' || input.value.trim() === '') {
                input.value = 'R$ 0,00';
            } else {
                const valor = this.extrairValorNumerico(input.value);
                if (valor > 0) {
                    input.value = this.formatarMoeda(valor);
                } else {
                    input.value = 'R$ 0,00';
                }
            }
            this.atualizarSaldoMes();
        });

        // Formatar em tempo real durante a digitação
        input.addEventListener('input', (e) => {
            let valor = e.target.value.replace(/[^\d,]/g, '');

            // Permitir apenas uma vírgula
            const virgulas = valor.match(/,/g);
            if (virgulas && virgulas.length > 1) {
                valor = valor.replace(/,/g, (match, index) => {
                    return index === valor.lastIndexOf(',') ? ',' : '';
                });
            }

            e.target.value = valor;
        });
    }

    // Forçar layout do summary-grid conforme largura da tela
    aplicarLayoutResponsivo() {
        try {
            const summaryGrid = document.querySelector('.month-summary .summary-grid');
            if (!summaryGrid) return;

            const largura = window.innerWidth || document.documentElement.clientWidth;

            if (largura <= 400) {
                summaryGrid.style.display = 'grid';
                summaryGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
                summaryGrid.style.gap = '8px';
            } else if (largura <= 768) {
                summaryGrid.style.display = 'grid';
                summaryGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
                summaryGrid.style.gap = '15px';
            } else {
                // Remover estilos inline para voltar ao CSS padrão em telas maiores
                summaryGrid.style.removeProperty('grid-template-columns');
                summaryGrid.style.removeProperty('gap');
            }
        } catch (e) {
            console.error('Erro ao aplicar layout responsivo:', e);
        }
    }

    // Formatar valor como moeda brasileira sempre com duas casas decimais
    formatarMoeda(valor) {
        console.log('🔍 formatarMoeda - valor recebido:', valor, 'tipo:', typeof valor);

        // Se o valor for 0 ou undefined, retornar R$ 0,00
        if (!valor || valor === 0) {
            console.log('🔍 formatarMoeda - retornando R$ 0,00 para valor vazio/zero');
            return 'R$ 0,00';
        }

        // Garantir que o valor seja um número válido
        const numero = parseFloat(valor);
        console.log('🔍 formatarMoeda - número parseado:', numero);

        if (isNaN(numero)) {
            console.error('❌ formatarMoeda - valor não é um número válido:', valor);
            return 'R$ 0,00';
        }

        // Formatar com duas casas decimais sempre
        const resultado = numero.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        console.log('🔍 formatarMoeda - resultado final:', resultado);
        return resultado;
    }

    // Extrair valor numérico de um campo (aceita números simples e formatados)
    extrairValorNumerico(valor) {
        if (!valor || valor === '') return 0;

        // Se já for um número, retornar diretamente
        if (typeof valor === 'number') return valor;

        // Converter para string e limpar
        let valorString = valor.toString();

        // Remover R$, espaços e outros caracteres
        valorString = valorString.replace(/R\$/g, '').replace(/\s/g, '');

        // Se tem vírgula, converter para formato americano
        if (valorString.includes(',')) {
            // Remover pontos (separadores de milhares) e substituir vírgula por ponto
            valorString = valorString.replace(/\./g, '').replace(',', '.');
        }

        const numero = parseFloat(valorString);

        // Se não é um número válido, retornar 0
        if (isNaN(numero)) {
            console.error('❌ Erro na conversão:', valor, '->', valorString, '->', numero);
            return 0;
        }

        return numero;
    }

    // Atualizar cálculos da renda familiar
    async atualizarRendaFamiliar() {
        try {
            console.log('💰 Atualizando cálculos da renda familiar...');

            // Se estiver no modo "total", não atualizar renda familiar (ela já foi calculada na seção anual)
            if (this.currentMonth === 'total') {
                console.log('📊 Modo Total: Pulando atualização de renda familiar (dados já calculados na seção anual)');
                return;
            }

            // Obter valores dos campos (podem ser números simples ou formatados)
            const valorMySalary = document.getElementById('my-salary')?.value || 'R$ 0,00';
            const valorHerSalary = document.getElementById('her-salary')?.value || 'R$ 0,00';
            const valorTotalTransferred = document.getElementById('total-transferred')?.value || 'R$ 0,00';

            const meuSalario = this.extrairValorNumerico(valorMySalary) || 0;
            const salarioDela = this.extrairValorNumerico(valorHerSalary) || 0;
            const totalTransferido = this.extrairValorNumerico(valorTotalTransferred) || 0;

            console.log('📊 Valores extraídos:', { meuSalario, salarioDela, totalTransferido });



            // Atualizar dados locais
            this.rendaFamiliar.meuSalario = meuSalario;
            this.rendaFamiliar.salarioDela = salarioDela;
            this.rendaFamiliar.totalTransferido = totalTransferido;

            // Salvar no localStorage
            await this.saveRendaFamiliar();

            // LÓGICA DOS CÁLCULOS
            // Despesas Joceline = Salário Joceline - Total Transferido
            const despesasDela = Number(salarioDela) - Number(totalTransferido);
            // Total sob gestão = Salário Guilherme + Total Transferido
            const disponivelParaMim = Number(meuSalario) + Number(totalTransferido);

            console.log('🧮 Cálculos realizados:', {
                despesasDela,
                disponivelParaMim,
                formulaDespesas: `${salarioDela} - ${totalTransferido} = ${despesasDela}`,
                formulaTotal: `${meuSalario} + ${totalTransferido} = ${disponivelParaMim}`
            });





            // Atualizar interface
            const herExpensesEl = document.getElementById('her-expenses');
            const availableForMeEl = document.getElementById('available-for-me');

            console.log('🎯 Elementos encontrados:', {
                herExpensesEl: !!herExpensesEl,
                availableForMeEl: !!availableForMeEl
            });

            if (herExpensesEl && availableForMeEl) {
                // Usar função auxiliar para formatação consistente
                const despesasFormatadas = this.formatarMoeda(despesasDela);
                const disponivelFormatado = this.formatarMoeda(disponivelParaMim);

                // Atualizar a interface
                herExpensesEl.textContent = despesasFormatadas;
                availableForMeEl.textContent = disponivelFormatado;

                console.log('✅ Interface atualizada:', {
                    despesasFormatadas,
                    disponivelFormatado
                });

                // Adicionar classes para cores
                availableForMeEl.className = 'value positive';
                console.log('🔍 Classe aplicada ao available-for-me:', availableForMeEl.className);



                // Salvar no localStorage após atualizar interface
                await this.saveRendaFamiliar();

                // Verificar se os valores foram formatados corretamente
                console.log('🔍 Verificação da formatação:', {
                    'despesasDela original': despesasDela,
                    'disponivelParaMim original': disponivelParaMim,
                    'her-expenses formatado': herExpensesEl.textContent,
                    'available-for-me formatado': availableForMeEl.textContent
                });

                // Verificar se os valores foram salvos corretamente
                console.log('🔍 Verificação dos valores salvos:', this.rendaFamiliar);
            } else {
                console.error('❌ Elementos de resultado não encontrados:', {
                    'her-expenses': !!herExpensesEl,
                    'available-for-me': !!availableForMeEl
                });
            }

            // Log para debug
            console.log('🔍 Valores finais da renda familiar:', this.rendaFamiliar);

            // Salvar dados
            await this.saveRendaFamiliar();

            // Atualizar análise 50/30/20 automaticamente
            setTimeout(() => {
                this.updateAnalysis();
            }, 100);



        } catch (error) {
            console.error('❌ Erro ao atualizar renda familiar:', error);
        }
    }



    // ===== MÉTODOS DE SINCRONIZAÇÃO =====

    async inicializarFirebase() {
        try {
            // Aguardar Firebase carregar
            await this.aguardarFirebase();

            // Fazer login anônimo
            // Usar usuário atual se estiver logado
            this.userId = currentUser ? currentUser.uid : null;

            if (this.userId) {
                this.atualizarStatusSincronizacao('✅ Conectado', 'success');
                this.habilitarBotoesSincronizacao();

                // Verificar se há dados na nuvem
                await this.verificarDadosNuvem();

                // Configurar sincronização automática
                if (this.sincronizacaoAutomatica) {
                    this.configurarSincronizacaoAutomatica();
                }
            } else {
                this.atualizarStatusSincronizacao('❌ Erro de conexão', 'error');
            }
        } catch (error) {
            console.error('Erro ao inicializar Firebase:', error);
            this.atualizarStatusSincronizacao('❌ Erro de conexão', 'error');
        }
    }

    async aguardarFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (auth && db) {
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    async verificarDadosNuvem() {
        try {
            // Usar função que já existe
            const userDoc = await db.collection('users').doc(this.userId).collection('data').doc('gastos').get();
            const dadosNuvem = userDoc.exists ? userDoc.data() : null;

            if (dadosNuvem) {
                // Verificar se os dados da nuvem são mais recentes
                const dadosLocais = this.data;
                const timestampLocal = this.ultimaSincronizacao || new Date(0);

                if (dadosNuvem.ultimaAtualizacao && dadosNuvem.ultimaAtualizacao > timestampLocal) {
                    // Dados da nuvem são mais recentes
                    this.data = (
                        dadosNuvem.dados &&
                        typeof dadosNuvem.dados === "object"
                    ) ? dadosNuvem.dados : {};
                    this.ultimaSincronizacao = dadosNuvem.ultimaAtualizacao;
                    this.isDataLoaded = true;
                    this.saveData();
                    this.renderAll();
                    this.atualizarStatusSincronizacao('📥 Dados atualizados da nuvem', 'success');
                } else {
                    // Dados locais são mais recentes, sincronizar com a nuvem
                    await this.sincronizarComNuvem();
                }
            } else {
                // Primeira vez usando, sincronizar dados locais
                await this.sincronizarComNuvem();
            }
        } catch (error) {
            console.error('Erro ao verificar dados da nuvem:', error);
        }
    }

    async sincronizarComNuvem() {
        if (!this.data || typeof this.data !== "object" || Object.keys(this.data).length === 0) {
            console.warn("⛔ Salvamento bloqueado: dados inválidos", this.data);
            return;
        }
        if (!this.isDataLoaded) {
            console.warn("⛔ Salvamento bloqueado: dados ainda não carregados");
            return;
        }
        try {
            this.atualizarStatusSincronizacao('🔄 Sincronizando...', 'syncing');
            this.desabilitarBotoesSincronizacao();

            // Usar a função que já existe
            await this.saveToFirestore();

            this.ultimaSincronizacao = new Date();
            this.atualizarStatusSincronizacao('✅ Sincronizado', 'success');
            this.atualizarUltimaSincronizacao();
            this.habilitarBotoesSincronizacao();

        } catch (error) {
            console.error('Erro na sincronização:', error);
            this.atualizarStatusSincronizacao('❌ Erro na sincronização', 'error');
            this.habilitarBotoesSincronizacao();
        }
    }

    async sincronizarAgora() {
        await this.sincronizarComNuvem();
    }

    async baixarDaNuvem() {
        try {
            this.atualizarStatusSincronizacao('📥 Baixando...', 'syncing');
            this.desabilitarBotoesSincronizacao();

            // Usar a função que já existe
            await this.loadUserData();
            this.atualizarStatusSincronizacao('✅ Dados baixados com sucesso', 'success');

            this.habilitarBotoesSincronizacao();
        } catch (error) {
            console.error('Erro ao baixar dados:', error);
            this.atualizarStatusSincronizacao('❌ Erro ao baixar dados', 'error');
            this.habilitarBotoesSincronizacao();
        }
    }

    configurarSincronizacaoAutomatica() {
        // Sincronizar automaticamente a cada 5 minutos
        setInterval(() => {
            if (this.userId && this.sincronizacaoAutomatica) {
                this.sincronizarComNuvem();
            }
        }, 5 * 60 * 1000);

        // Sincronizar quando a página voltar a ficar visível
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.userId && this.sincronizacaoAutomatica) {
                this.sincronizarComNuvem();
            }
        });
    }

    atualizarStatusSincronizacao(status, tipo) {
        const statusElement = document.getElementById('sync-status-text');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = `sync-status-${tipo}`;
        }
    }

    atualizarUltimaSincronizacao() {
        const timeElement = document.getElementById('last-sync-time');
        if (timeElement && this.ultimaSincronizacao) {
            timeElement.textContent = `Última sincronização: ${this.ultimaSincronizacao.toLocaleString('pt-BR')}`;
        }
    }

    habilitarBotoesSincronizacao() {
        const syncBtn = document.getElementById('sync-now-btn');
        const downloadBtn = document.getElementById('sync-download-btn');

        if (syncBtn) syncBtn.disabled = false;
        if (downloadBtn) downloadBtn.disabled = false;
    }

    desabilitarBotoesSincronizacao() {
        const syncBtn = document.getElementById('sync-now-btn');
        const downloadBtn = document.getElementById('sync-download-btn');

        if (syncBtn) syncBtn.disabled = true;
        if (downloadBtn) downloadBtn.disabled = true;
    }

    // Atualizar saldo do mês editável
    async atualizarSaldoMes() {
        const input = document.getElementById('month-balance-input');
        if (input) {
            const valorNumerico = this.extrairValorNumerico(input.value);
            const chave = `${this.currentYear}-${this.currentMonth}`;

            if (!this.data.monthBalance) {
                this.data.monthBalance = {};
            }
            this.data.monthBalance[chave] = valorNumerico;

            // Reformatar o campo para manter padrão "R$ 0,00"
            input.value = this.formatarMoeda(valorNumerico);

            await this.saveData();
            this.updateSummary();

            console.log(`💰 Saldo do mês ${chave} atualizado para: ${this.formatarMoeda(valorNumerico)}`);
        }
    }

    // Atualizar próximo pagamento editável
    async atualizarProximoPagamento() {
        const input = document.getElementById('next-payment-input');
        if (input) {
            const data = input.value;
            const chave = `${this.currentYear}-${this.currentMonth}`;

            // Salvar a data do próximo pagamento
            if (!this.data.nextPaymentDates) {
                this.data.nextPaymentDates = {};
            }
            this.data.nextPaymentDates[chave] = data;

            // Salvar dados e atualizar interface
            await this.saveData();
            this.updateSummary();

            console.log(`📅 Próximo pagamento ${chave} atualizado para: ${data}`);
        }
    }

    // Dashboard Rápido
    initializeQuickDashboard() {
        if (!this.isDataLoaded) {
            console.warn("⚠️ Render bloqueado: dados ainda não carregados");
            return;
        }
        console.log('🚀 Inicializando Dashboard Rápido...');

        const dateInput = document.getElementById("quick-date");
        if (dateInput && !dateInput.value) {
            const hoje = new Date();
            const yyyy = hoje.getFullYear();
            const mm = String(hoje.getMonth() + 1).padStart(2, "0");
            const dd = String(hoje.getDate()).padStart(2, "0");

            dateInput.value = `${yyyy}-${mm}-${dd}`;
        }

        // Definir data inicial no campo de data
        this.updateQuickDateField();

        // Atualizar data atual no display
        this.updateCurrentDateDisplay();

        // Verificar se já existem gastos renderizados antes de recarregar
        const container = document.getElementById('daily-expenses-list');
        const hasRenderedExpenses = container && container.querySelector('.expense-item');

        if (!hasRenderedExpenses) {
            console.log('📋 Carregando gastos iniciais no dashboard...');
            this.loadDailyExpenses();
        } else {
            console.log('📋 Gastos já renderizados, pulando carregamento inicial');
        }

        console.log('✅ Dashboard Rápido inicializado');
    }

    // Atualizar campo de data do formulário rápido
    updateQuickDateField() {
        const dateInput = document.getElementById('quick-date');
        if (!dateInput) return;

        if (!dateInput.value) {
            const hoje = new Date();
            const yyyy = hoje.getFullYear();
            const mm = String(hoje.getMonth() + 1).padStart(2, '0');
            const dd = String(hoje.getDate()).padStart(2, '0');

            dateInput.value = `${yyyy}-${mm}-${dd}`;
            console.log(`📅 Campo de data atualizado para: ${dateInput.value} (mês: ${this.currentMonth})`);
        }
    }

    // Atualizar data atual no display
    updateCurrentDateDisplay() {
        const currentDate = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        const formattedDate = currentDate.toLocaleDateString('pt-BR', options);
        document.getElementById('current-date-display').textContent = formattedDate;
    }

    // Validar data no formato YYYY-MM-DD e evitar rollover silencioso
    validarDataInput(dateString) {
        if (!dateString || typeof dateString !== 'string') {
            console.warn('⚠️ Data inválida (vazia ou não string):', dateString);
            return null;
        }

        const [year, month, day] = dateString.split('-').map(Number);
        if (!year || !month || !day) {
            console.warn('⚠️ Data inválida (partes ausentes):', dateString);
            return null;
        }
        if (month < 1 || month > 12) {
            console.warn('⚠️ Data inválida (mês fora do intervalo):', dateString);
            return null;
        }

        const selectedDate = new Date(year, month - 1, day);
        if (
            isNaN(selectedDate.getTime()) ||
            selectedDate.getFullYear() !== year ||
            selectedDate.getMonth() !== month - 1 ||
            selectedDate.getDate() !== day
        ) {
            console.warn('⚠️ Data inválida (rollover detectado):', dateString);
            return null;
        }

        return { year, month, day };
    }

    // Adicionar gasto rápido
    async adicionarGastoRapido() {
        const dateInput = document.getElementById('quick-date');
        const valueInput = document.getElementById('quick-value');

        const date = dateInput.value;
        const value = parseFloat(valueInput.value);

        console.log('📅 Data selecionada:', date);
        console.log('💰 Valor inserido:', value);

        if (!date || !value || value <= 0) {
            alert('Por favor, preencha a data e um valor válido!');
            return;
        }

        const parsedDate = this.validarDataInput(date);
        if (!parsedDate) {
            alert('Data inválida! Por favor, selecione uma data válida.');
            return;
        }

        // Adicionar ao array de gastos diários
        const newExpense = {
            id: Date.now(),
            date: date,
            value: value,
            month: parsedDate.month, // Usar o mês parseado diretamente
            year: parsedDate.year,   // Usar o ano parseado diretamente
            timestamp: new Date().toISOString()
        };

        console.log('🔍 Debug do mês calculado (CORRIGIDO):', {
            dateString: date,
            parsedYear: parsedDate.year,
            parsedMonth: parsedDate.month,
            parsedDay: parsedDate.day,
            selectedDate: new Date(parsedDate.year, parsedDate.month - 1, parsedDate.day),
            finalMonth: newExpense.month,
            finalYear: newExpense.year,
            currentMonth: this.currentMonth
        });

        console.log('📝 Novo gasto criado:', newExpense);
        console.log('📅 Data original:', date);
        console.log('📅 Data processada:', newExpense.date);

        // Garantir que os dados do mês existam
        this.ensureMonthDataExists();
        const monthData = this.getCurrentMonthData();

        console.log('🔍 Estrutura antes de adicionar:', {
            currentMonth: this.currentMonth,
            currentYear: this.currentYear,
            gastoMonth: newExpense.month,
            gastoYear: newExpense.year,
            monthDataPath: `${this.currentYear}.${this.currentMonth}`,
            dailyExpensesLength: monthData.dailyExpenses ? monthData.dailyExpenses.length : 0
        });

        // Adicionar ao array de gastos diários do mês
        monthData.dailyExpenses.push(newExpense);

        console.log('🔍 Estrutura depois de adicionar:', {
            dailyExpensesLength: monthData.dailyExpenses.length,
            ultimoGasto: monthData.dailyExpenses[monthData.dailyExpenses.length - 1]
        });

        // Salvar no localStorage
        await this.saveData();

        // Limpar campo de valor
        valueInput.value = '';

        // Recarregar gastos do dia
        this.loadDailyExpenses();

        // Atualizar resumo geral
        this.renderAll();

        console.log('✅ Gasto rápido adicionado:', newExpense);
    }

    // Carregar gastos do dia
    loadDailyExpenses() {
        console.log(`📊 Carregando gastos para o mês: ${this.currentMonth}, ano: ${this.currentYear}`);

        // Obter gastos diários do mês atual
        let dailyExpenses = [];
        if (this.currentMonth === 'total') {
            // Para total, somar todos os meses do ano
            Object.keys(this.data[this.currentYear] || {}).forEach(month => {
                if (this.data[this.currentYear][month] && this.data[this.currentYear][month].dailyExpenses) {
                    dailyExpenses = dailyExpenses.concat(this.data[this.currentYear][month].dailyExpenses);
                }
            });
            console.log(`📈 Total de gastos no ano ${this.currentYear}: ${dailyExpenses.length}`);
        } else {
            // Para mês específico
            const monthData = this.getCurrentMonthData();
            dailyExpenses = monthData.dailyExpenses || [];

            console.log('🔍 Dados antes do filtro:', {
                currentMonth: this.currentMonth,
                currentYear: this.currentYear,
                monthDataPath: `${this.currentYear}.${this.currentMonth}`,
                gastosEncontrados: dailyExpenses.length,
                gastosDetalhes: dailyExpenses.map(e => ({ date: e.date, month: e.month, year: e.year, value: e.value }))
            });

            // Log da estrutura completa para debug
            console.log('🔍 Estrutura completa dos dados:', {
                todosOsAnos: Object.keys(this.data).filter(key => !isNaN(key)),
                anoAtual: this.data[this.currentYear] ? Object.keys(this.data[this.currentYear]) : 'Ano não existe',
                dadosDoMesAtual: this.data[this.currentYear] && this.data[this.currentYear][this.currentMonth] ? 'Existe' : 'Não existe'
            });

            // CORREÇÃO DEFINITIVA: Usar os campos month e year do próprio gasto
            const gastosAntesFiltro = dailyExpenses.length;
            dailyExpenses = dailyExpenses.filter(expense => {
                // Usar diretamente os campos month e year que foram salvos corretamente
                const match = expense.month === this.currentMonth && expense.year === this.currentYear;

                console.log(`🔍 Filtro gasto (DEFINITIVO):`, {
                    date: expense.date,
                    gastoMonth: expense.month,
                    gastoYear: expense.year,
                    currentMonth: this.currentMonth,
                    currentYear: this.currentYear,
                    match
                });

                return match;
            });

            console.log(`📅 Gastos filtrados para ${this.getMonthName(this.currentMonth)} ${this.currentYear}: ${dailyExpenses.length} (de ${gastosAntesFiltro})`);
        }

        // Mostrar todos os gastos, não apenas do dia atual
        const allExpenses = dailyExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Calcular estatísticas gerais
        const totalValue = allExpenses.reduce((sum, expense) => sum + expense.value, 0);
        const count = allExpenses.length;

        // Atualizar contador de gastos
        const dailyCountElement = document.getElementById('daily-count');
        if (dailyCountElement) {
            dailyCountElement.textContent = `${count} ${count === 1 ? 'gasto' : 'gastos'}`;
        }

        // Atualizar total geral
        const dailyTotalElement = document.getElementById('daily-total');
        if (dailyTotalElement) {
            dailyTotalElement.textContent = `R$ ${totalValue.toFixed(2)}`;
        }

        console.log('📊 Gastos carregados:', {
            month: this.getMonthName(this.currentMonth),
            year: this.currentYear,
            count,
            totalValue: totalValue.toFixed(2),
            expenses: allExpenses.map(e => ({ date: e.date, value: e.value }))
        });

        // Renderizar lista de gastos
        this.renderDailyExpensesList(allExpenses);
    }

    // Renderizar lista de gastos do dia
    renderDailyExpensesList(expenses) {
        const container = document.getElementById('daily-expenses-list');

        console.log('🎨 Renderizando lista de gastos:', {
            containerExists: !!container,
            expensesCount: expenses.length,
            expenses: expenses
        });

        if (!container) {
            console.error('❌ Container daily-expenses-list não encontrado!');
            return;
        }

        if (expenses.length === 0) {
            console.log('📝 Nenhum gasto para renderizar - mostrando mensagem vazia');
            container.innerHTML = `
                <div class="no-expenses">
                    <i class="fas fa-coffee"></i>
                    <p>Nenhum gasto registrado</p>
                    <span>Adicione seu primeiro gasto acima!</span>
                </div>
            `;
            return;
        }

        console.log('📝 Gerando HTML para gastos:', expenses.map(e => ({
            id: e.id,
            date: e.date,
            value: e.value,
            formattedDate: this.formatDate(e.date)
        })));

        const expensesHTML = expenses.map(expense => `
            <div class="expense-item" data-id="${expense.id}">
                <div class="expense-info">
                    <span class="expense-date">${this.formatDate(expense.date)}</span>
                    <span class="expense-value">R$ ${expense.value.toFixed(2)}</span>
                </div>
                <div class="expense-actions">
                    <button class="btn btn-danger btn-small" onclick="app.removerGastoDiario(${expense.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        console.log('📝 HTML gerado:', expensesHTML);
        container.innerHTML = expensesHTML;
        console.log('✅ Lista de gastos renderizada com sucesso');
    }

    // Formatar data para exibição
    formatDate(dateString) {
        try {
            if (!dateString) {
                console.warn('⚠️ Data vazia recebida para formatação');
                return 'Data inválida';
            }

            // CORREÇÃO: Parsing manual consistente
            const [year, month, day] = dateString.split('-').map(Number);

            if (!year || !month || !day) {
                console.warn('⚠️ Formato de data inválido:', dateString);
                return dateString; // Retorna a string original se não conseguir parsear
            }

            // Formatar manualmente sem usar Date() para evitar timezone
            const dayFormatted = day.toString().padStart(2, '0');
            const monthFormatted = month.toString().padStart(2, '0');
            const formatted = `${dayFormatted}/${monthFormatted}`;

            console.log(`📅 Data formatada (CORRIGIDA): ${dateString} -> ${formatted}`);
            return formatted;
        } catch (error) {
            console.error('❌ Erro ao formatar data:', error, dateString);
            return dateString || 'Data inválida';
        }
    }

    // Remover gasto diário
    removerGastoDiario(id) {
        this.showConfirmModal(
            'Remover Gasto',
            'Tem certeza que deseja remover este gasto?',
            async () => {
                // Procurar e remover o gasto em todos os meses
                Object.keys(this.data).forEach(year => {
                    if (typeof this.data[year] === 'object' && this.data[year] !== null) {
                        Object.keys(this.data[year]).forEach(month => {
                            if (this.data[year][month] && this.data[year][month].dailyExpenses) {
                                this.data[year][month].dailyExpenses = this.data[year][month].dailyExpenses.filter(expense => expense.id !== id);
                            }
                        });
                    }
                });
                await this.saveData();
                this.loadDailyExpenses();
                this.renderAll();
                console.log('✅ Gasto removido:', id);
            }
        );
    }

    // Limpar gastos do dia
    limparGastosDia() {
        // Função para contar gastos atuais
        const contarGastosAtuais = () => {
            let dailyExpenses = [];
            if (this.currentMonth === 'total') {
                // Para total, somar todos os meses do ano
                Object.keys(this.data[this.currentYear] || {}).forEach(month => {
                    if (this.data[this.currentYear][month] && this.data[this.currentYear][month].dailyExpenses) {
                        dailyExpenses = dailyExpenses.concat(this.data[this.currentYear][month].dailyExpenses);
                    }
                });
            } else {
                // Para mês específico
                const monthData = this.getCurrentMonthData();
                dailyExpenses = monthData.dailyExpenses || [];
            }
            return dailyExpenses.length;
        };

        // Verificar se há gastos para limpar
        const quantidadeAtual = contarGastosAtuais();
        if (quantidadeAtual === 0) {
            alert('Não há gastos para limpar!');
            return;
        }

        // Mostrar modal com quantidade atual
        this.showConfirmModal(
            'Limpar Todos os Gastos',
            `Tem certeza que deseja remover todos os ${quantidadeAtual} gastos registrados?`,
            async () => {
                // Limpar gastos do mês atual
                if (this.currentMonth === 'total') {
                    // Limpar todos os meses do ano
                    Object.keys(this.data[this.currentYear] || {}).forEach(month => {
                        if (this.data[this.currentYear][month]) {
                            this.data[this.currentYear][month].dailyExpenses = [];
                        }
                    });
                } else {
                    // Limpar apenas o mês atual
                    const monthData = this.getCurrentMonthData();
                    monthData.dailyExpenses = [];
                }
                await this.saveData();
                this.loadDailyExpenses();
                this.renderAll();
                console.log('✅ Todos os gastos removidos');
            }
        );
    }

    // Copiar gastos do mês anterior
    copyPreviousMonthExpenses() {
        console.log('🔄 Botão clicado - iniciando cópia de gastos...');

        // Remover teste - função funcionando

        console.log('📅 Mês atual:', this.currentMonth, 'Ano atual:', this.currentYear);
        console.log('📊 Dados carregados:', this.isDataLoaded);
        console.log('📊 Dados disponíveis:', this.data ? 'Sim' : 'Não');

        // Verificar se os dados foram carregados
        if (!this.isDataLoaded || !this.data) {
            console.log('⚠️ Dados não carregados ainda');
            this.showNotification('Aguarde os dados carregarem completamente.', 'warning');
            return;
        }

        const previousMonth = this.currentMonth === 1 ? 12 : this.currentMonth - 1;
        const previousYear = this.currentMonth === 1 ? this.currentYear - 1 : this.currentYear;

        console.log('📅 Mês anterior:', previousMonth, 'Ano anterior:', previousYear);

        // Verificar se existem dados do mês anterior
        if (!this.data[previousYear] || !this.data[previousYear][previousMonth]) {
            console.log('⚠️ Não há dados do mês anterior');
            this.showNotification('Não há gastos no mês anterior para copiar.', 'warning');
            return;
        }

        const previousMonthData = this.data[previousYear][previousMonth];
        const currentMonthData = this.getCurrentMonthData();

        // Verificar que tipos de gastos existem no mês anterior
        console.log('🔍 Verificando tipos de gastos no mês anterior...');
        console.log('📋 Gastos mensais:', previousMonthData.expenses ? previousMonthData.expenses.length : 0);
        console.log('📋 Gastos com cartão:', previousMonthData.creditCard ? previousMonthData.creditCard.length : 0);

        let totalGastosAnterior = 0;
        if (previousMonthData.expenses) totalGastosAnterior += previousMonthData.expenses.length;
        if (previousMonthData.creditCard) totalGastosAnterior += previousMonthData.creditCard.length;

        if (totalGastosAnterior === 0) {
            this.showNotification('Não há gastos no mês anterior para copiar.', 'info');
            return;
        }

        // Verificar se já existem gastos no mês atual
        let totalGastosAtual = 0;
        if (currentMonthData.expenses) totalGastosAtual += currentMonthData.expenses.length;
        if (currentMonthData.creditCard) totalGastosAtual += currentMonthData.creditCard.length;

        // Criar mensagem de confirmação
        let mensagemConfirmacao = `Copiar ${totalGastosAnterior} gastos do mês anterior (${previousMonth}/${previousYear})?`;
        if (totalGastosAtual > 0) {
            mensagemConfirmacao += `\n\n⚠️ Já existem ${totalGastosAtual} gastos no mês atual. Eles serão substituídos.`;
        }

        // Mostrar modal de confirmação
        this.showConfirmModal(
            'Copiar Gastos do Mês Anterior',
            mensagemConfirmacao,
            async () => {
                // Função executada se confirmar
                await this.executarCopiadeGastos(previousMonthData, currentMonthData, previousMonth, previousYear);
            }
        );

    }

    // Função para executar a cópia dos gastos (chamada após confirmação)
    async executarCopiadeGastos(previousMonthData, currentMonthData, previousMonth, previousYear) {
        let gastosCopiados = 0;

        // Copiar gastos mensais do mês anterior
        if (previousMonthData.expenses && previousMonthData.expenses.length > 0) {
            console.log('📋 Copiando', previousMonthData.expenses.length, 'gastos mensais');

            currentMonthData.expenses = [];
            previousMonthData.expenses.forEach(expense => {
                // Criar nova cópia com ID único
                const newExpense = {
                    id: Date.now() + Math.random(), // ID único para o novo mês
                    description: expense.description,
                    value: expense.value,
                    category: expense.category,
                    paid: false, // Sempre não pago na cópia
                    month: this.currentMonth,
                    year: this.currentYear,
                    source: expense.source || 'manual'
                };
                currentMonthData.expenses.push(newExpense);
            });

            gastosCopiados += previousMonthData.expenses.length;
        }

        // Copiar gastos com cartão do mês anterior
        if (previousMonthData.creditCard && previousMonthData.creditCard.length > 0) {
            console.log('📋 Copiando', previousMonthData.creditCard.length, 'gastos com cartão');

            currentMonthData.creditCard = [];
            previousMonthData.creditCard.forEach(expense => {
                // Criar nova cópia com ID único
                const newExpense = {
                    id: Date.now() + Math.random(), // ID único para o novo mês
                    description: expense.description,
                    value: expense.value,
                    category: expense.category,
                    paid: false, // Sempre não pago na cópia
                    month: this.currentMonth,
                    year: this.currentYear,
                    source: expense.source || 'credit'
                };
                currentMonthData.creditCard.push(newExpense);
            });

            gastosCopiados += previousMonthData.creditCard.length;
        }

        if (gastosCopiados > 0) {
            await this.saveData();
            this.renderAll();
            console.log('✅ Gastos copiados com sucesso');
            this.showNotification(`Gastos copiados do mês anterior (${previousMonth}/${previousYear})! Total: ${gastosCopiados} gastos.`, 'success');
        } else {
            console.log('ℹ️ Não há gastos para copiar no mês anterior');
            this.showNotification('Não há gastos para copiar no mês anterior.', 'info');
        }
    }

    // Configurar botão flutuante para voltar ao topo
    setupBackToTop() {
        const backToTopBtn = document.getElementById('back-to-top');

        // Mostrar/ocultar botão baseado no scroll
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                backToTopBtn.classList.add('show');
            } else {
                backToTopBtn.classList.remove('show');
            }
        });

        // Função para voltar ao topo
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // Função para limpar todos os dados (útil para remover dados de exemplo)
    limparTodosDados() {
        if (confirm('⚠️ ATENÇÃO: Isso irá remover TODOS os dados salvos (gastos, receitas, etc). Esta ação não pode ser desfeita. Tem certeza?')) {
            // ❌ NÃO apagar automaticamente
            console.log('Logout realizado - dados preservados');
            location.reload(); // Recarregar a página para começar do zero
        }
    }

    // === RESUMO ANUAL ===

    // Mostrar/ocultar resumo anual e outras seções
    toggleAnnualSummary() {
        const annualSummary = document.getElementById('annual-summary');
        const resumoMes = document.getElementById('resumo-mes-section');
        const dashboardRapido = document.getElementById('dashboard-rapido-section');
        const rendaFamiliar = document.getElementById('renda-familiar-section');
        const cartaoCredito = document.getElementById('cartao-credito-section');
        const gastosMes = document.getElementById('gastos-mes-section');

        if (this.currentMonth === 'total') {
            // Mostrar resumo anual
            if (annualSummary) {
                annualSummary.style.display = 'block';
                this.renderAnnualSummary();
            }

            // Ocultar outras seções no modo Total
            if (resumoMes) resumoMes.style.display = 'none';
            if (dashboardRapido) dashboardRapido.style.display = 'none';
            if (rendaFamiliar) rendaFamiliar.style.display = 'none';
            if (cartaoCredito) cartaoCredito.style.display = 'none';
            if (gastosMes) gastosMes.style.display = 'none';

            console.log('📊 Modo Total: Resumo anual exibido, outras seções ocultadas');
        } else {
            // Ocultar resumo anual
            if (annualSummary) annualSummary.style.display = 'none';

            // Mostrar outras seções no modo mensal
            if (resumoMes) resumoMes.style.display = 'block';
            if (dashboardRapido) dashboardRapido.style.display = 'block';
            if (rendaFamiliar) rendaFamiliar.style.display = 'block';
            if (cartaoCredito) cartaoCredito.style.display = 'block';
            if (gastosMes) gastosMes.style.display = 'block';

            console.log('📊 Modo Mensal: Resumo anual ocultado, outras seções exibidas');
        }
    }

    // Renderizar resumo anual completo
    renderAnnualSummary() {
        console.log('📊 Gerando resumo anual...');

        // Inicializar filtro se necessário
        this.initializePeriodFilter();

        this.renderAnnualIncome();
        this.renderAnnualCredit();
        this.renderAnnualExpenses();

        // Atualizar título com o ano atual
        const titleElement = document.querySelector('.annual-summary h2');
        if (titleElement) {
            titleElement.innerHTML = `<i class="fas fa-calendar-alt"></i> Resumo Anual ${this.currentYear}`;
        }
    }

    // Inicializar filtro de período
    initializePeriodFilter() {
        // Definir valores padrão se não existirem
        if (!this.periodFilter) {
            this.periodFilter = {
                startMonth: 1,
                endMonth: 12
            };
        }

        // Atualizar interface
        const startSelect = document.getElementById('start-month');
        const endSelect = document.getElementById('end-month');

        if (startSelect) startSelect.value = this.periodFilter.startMonth;
        if (endSelect) endSelect.value = this.periodFilter.endMonth;

        this.updatePeriodDisplay();
    }

    // Atualizar filtro de período
    updatePeriodFilter() {
        const startMonth = parseInt(document.getElementById('start-month').value);
        const endMonth = parseInt(document.getElementById('end-month').value);

        if (
            isNaN(startMonth) || isNaN(endMonth) ||
            startMonth < 1 || startMonth > 12 ||
            endMonth < 1 || endMonth > 12
        ) {
            console.warn('⚠️ Filtro de período inválido:', { startMonth, endMonth });
            return;
        }

        // Validar que mês final não seja menor que inicial
        if (endMonth < startMonth) {
            document.getElementById('end-month').value = startMonth;
            return;
        }

        this.periodFilter = { startMonth, endMonth };

        console.log(`📅 Filtro atualizado: ${this.getMonthName(startMonth)} a ${this.getMonthName(endMonth)}`);

        // Atualizar display e recalcular dados
        this.updatePeriodDisplay();
        this.renderAnnualIncome();
        this.renderAnnualCredit();
        this.renderAnnualExpenses();

        // Atualizar valores do cabeçalho se estiver no modo "Total"
        if (this.currentMonth === 'total') {
            this.updateAnnualHeaderStats();
        }
    }

    // Resetar filtro para ano todo
    resetPeriodFilter() {
        this.periodFilter = { startMonth: 1, endMonth: 12 };

        document.getElementById('start-month').value = 1;
        document.getElementById('end-month').value = 12;

        this.updatePeriodDisplay();
        this.renderAnnualIncome();
        this.renderAnnualCredit();
        this.renderAnnualExpenses();

        // Atualizar valores do cabeçalho se estiver no modo "Total"
        if (this.currentMonth === 'total') {
            this.updateAnnualHeaderStats();
        }

        console.log('🔄 Filtro resetado para ano todo');
    }

    // Atualizar display do período selecionado
    updatePeriodDisplay() {
        const display = document.getElementById('period-display');
        if (!display) return;

        const startName = this.getMonthName(this.periodFilter.startMonth);
        const endName = this.getMonthName(this.periodFilter.endMonth);

        if (this.periodFilter.startMonth === this.periodFilter.endMonth) {
            display.textContent = `Apenas ${startName}`;
        } else if (this.periodFilter.startMonth === 1 && this.periodFilter.endMonth === 12) {
            display.textContent = 'Ano Todo';
        } else {
            display.textContent = `${startName} a ${endName}`;
        }
    }

    // Obter meses filtrados
    getFilteredMonths() {
        if (!this.periodFilter) {
            const allMonths = Object.keys(this.data[this.currentYear] || {});
            return allMonths;
        }

        const months = [];
        for (let month = this.periodFilter.startMonth; month <= this.periodFilter.endMonth; month++) {
            if (this.data[this.currentYear] && this.data[this.currentYear][month]) {
                months.push(month.toString());
            }
        }

        return months;
    }

    // Renderizar renda familiar anual (com filtro)
    renderAnnualIncome() {
        let mySalaryTotal = 0;
        let herSalaryTotal = 0;
        let transferredTotal = 0;

        // Usar meses filtrados
        const filteredMonths = this.getFilteredMonths();

        filteredMonths.forEach(month => {
            const monthData = this.data[this.currentYear][month];
            if (monthData && monthData.rendaFamiliar) {
                const renda = monthData.rendaFamiliar;
                const meuSalarioMes = renda.meuSalario || 0;
                const salarioDelaMes = renda.salarioJoceline || renda.salarioDela || 0;
                const transferidoMes = renda.totalTransferido || 0;

                console.log(`🔍 Mês ${month}:`, {
                    meuSalario: meuSalarioMes,
                    salarioDela: salarioDelaMes,
                    transferido: transferidoMes
                });

                mySalaryTotal += meuSalarioMes;
                herSalaryTotal += salarioDelaMes;
                transferredTotal += transferidoMes;
            }
        });

        console.log('🔍 SOMA FINAL:', {
            mySalaryTotal,
            herSalaryTotal,
            transferredTotal,
            expectedTransferred: 23049.40,
            difference: transferredTotal - 23049.40
        });

        const availableTotal = mySalaryTotal + transferredTotal;

        document.getElementById('annual-my-salary').textContent = this.formatarMoeda(mySalaryTotal);
        document.getElementById('annual-her-salary').textContent = this.formatarMoeda(herSalaryTotal);
        document.getElementById('annual-transferred').textContent = this.formatarMoeda(transferredTotal);
        document.getElementById('annual-available').textContent = this.formatarMoeda(availableTotal);

        console.log('💰 Renda do período calculada:', {
            mySalaryTotal,
            herSalaryTotal,
            transferredTotal,
            totalSobGestao: availableTotal,
            periodo: this.periodFilter ? `${this.getMonthName(this.periodFilter.startMonth)} a ${this.getMonthName(this.periodFilter.endMonth)}` : 'ANO TODO',
            mesesIncluidos: filteredMonths.length
        });
    }

    // Renderizar gastos de cartão anual (com filtro)
    renderAnnualCredit() {
        const creditSummary = {};

        // Usar meses filtrados
        const filteredMonths = this.getFilteredMonths();

        filteredMonths.forEach(month => {
            const monthData = this.data[this.currentYear][month];
            if (monthData && monthData.creditCard) {
                monthData.creditCard.forEach(item => {
                    if (!creditSummary[item.description]) {
                        creditSummary[item.description] = {
                            description: item.description,
                            total: 0,
                            category: item.category,
                            count: 0
                        };
                    }
                    creditSummary[item.description].total += item.value;
                    creditSummary[item.description].count++;
                });
            }
        });

        // Renderizar lista
        const container = document.getElementById('annual-credit-list');
        const items = Object.values(creditSummary);

        if (items.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Nenhum gasto de cartão registrado no ano</p>';
            return;
        }

        const html = items.map(item => `
            <div class="annual-summary-item">
                <h4>${item.description}</h4>
                <div class="category-badge category-${item.category}">${this.getCategoryName(item.category)}</div>
                <div class="total-value">${this.formatarMoeda(item.total)}</div>
                <p style="text-align: center; color: var(--text-muted); margin-top: 8px;">
                    ${item.count} ${item.count === 1 ? 'mês' : 'meses'}
                </p>
            </div>
        `).join('');

        container.innerHTML = html;
        console.log('💳 Gastos de cartão do período:', items);
    }

    // Renderizar gastos mensais anual (com filtro)
    renderAnnualExpenses() {
        const expensesSummary = {};

        // Usar meses filtrados
        const filteredMonths = this.getFilteredMonths();

        filteredMonths.forEach(month => {
            const monthData = this.data[this.currentYear][month];
            if (monthData && monthData.expenses) {
                monthData.expenses.forEach(item => {
                    if (!expensesSummary[item.description]) {
                        expensesSummary[item.description] = {
                            description: item.description,
                            total: 0,
                            category: item.category,
                            count: 0
                        };
                    }
                    expensesSummary[item.description].total += item.value;
                    expensesSummary[item.description].count++;
                });
            }
        });

        // Renderizar lista
        const container = document.getElementById('annual-expenses-list');
        const items = Object.values(expensesSummary);

        if (items.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Nenhum gasto mensal registrado no ano</p>';
            return;
        }

        const html = items.map(item => `
            <div class="annual-summary-item">
                <h4>${item.description}</h4>
                <div class="category-badge category-${item.category}">${this.getCategoryName(item.category)}</div>
                <div class="total-value">${this.formatarMoeda(item.total)}</div>
                <p style="text-align: center; color: var(--text-muted); margin-top: 8px;">
                    ${item.count} ${item.count === 1 ? 'mês' : 'meses'}
                </p>
            </div>
        `).join('');

        container.innerHTML = html;
        console.log('📅 Gastos mensais do período:', items);
    }

    // Obter nome da categoria
    getCategoryName(category) {
        const names = {
            'essential': 'Essencial',
            'desire': 'Desejo',
            'investment': 'Investimento'
        };
        return names[category] || category;
    }

    // Obter resumos do cartão para incluir no relatório
    getCreditSummaries() {
        const summaries = [];
        const creditSummaryStatus = this.data.creditSummaryStatus || {};

        // Verificar se há resumos de cartão ativos
        if (creditSummaryStatus['credit-essential']) {
            const essentialValue = this.calculateCreditCategoryTotal('essential');
            if (essentialValue > 0) {
                summaries.push({
                    description: 'Resumo Cartão - Essencial',
                    value: essentialValue,
                    category: 'essential',
                    paid: true,
                    isCredit: true
                });
            }
        }

        if (creditSummaryStatus['credit-desire']) {
            const desireValue = this.calculateCreditCategoryTotal('desire');
            if (desireValue > 0) {
                summaries.push({
                    description: 'Resumo Cartão - Desejo',
                    value: desireValue,
                    category: 'desire',
                    paid: true,
                    isCredit: true
                });
            }
        }

        if (creditSummaryStatus['credit-investment']) {
            const investmentValue = this.calculateCreditCategoryTotal('investment');
            if (investmentValue > 0) {
                summaries.push({
                    description: 'Resumo Cartão - Investimento',
                    value: investmentValue,
                    category: 'investment',
                    paid: true,
                    isCredit: true
                });
            }
        }

        return summaries;
    }

    // Calcular total de uma categoria do cartão
    calculateCreditCategoryTotal(category) {
        const monthData = this.getCurrentMonthData();
        const creditCards = monthData.creditCard || [];

        return creditCards
            .filter(item => item.category === category)
            .reduce((sum, item) => sum + item.value, 0);
    }

    // Formatar data sem problemas de timezone
    formatDateSafe(dateString) {
        try {
            // Se for uma string no formato YYYY-MM-DD, usar parsing manual
            if (typeof dateString === 'string' && dateString.includes('-')) {
                const [year, month, day] = dateString.split('-').map(Number);
                const date = new Date(year, month - 1, day); // month é 0-indexed
                return date.toLocaleDateString('pt-BR');
            }

            // Caso contrário, tentar parsing normal
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR');
        } catch (error) {
            console.error('Erro ao formatar data:', dateString, error);
            return dateString; // Retornar string original se der erro
        }
    }

    // === SISTEMA DE SUGESTÕES / AUTOCOMPLETE ===

    // Obter todas as descrições únicas de gastos existentes
    getAllExpenseNames() {
        const names = new Map(); // Usar Map para contar frequência

        // Percorrer todos os anos e meses
        Object.keys(this.data).forEach(year => {
            if (typeof this.data[year] === 'object') {
                Object.keys(this.data[year]).forEach(month => {
                    const monthData = this.data[year][month];
                    if (monthData) {
                        // Gastos mensais
                        if (monthData.expenses) {
                            monthData.expenses.forEach(expense => {
                                if (expense.description) {
                                    const key = expense.description.toLowerCase();
                                    if (names.has(key)) {
                                        const existing = names.get(key);
                                        existing.count++;
                                        existing.lastValue = expense.value;
                                    } else {
                                        names.set(key, {
                                            name: expense.description,
                                            category: expense.category,
                                            count: 1,
                                            lastValue: expense.value,
                                            type: 'expense'
                                        });
                                    }
                                }
                            });
                        }

                        // Gastos de cartão
                        if (monthData.creditCard) {
                            monthData.creditCard.forEach(credit => {
                                if (credit.description) {
                                    const key = credit.description.toLowerCase();
                                    if (names.has(key)) {
                                        const existing = names.get(key);
                                        existing.count++;
                                        existing.lastValue = credit.value;
                                    } else {
                                        names.set(key, {
                                            name: credit.description,
                                            category: credit.category,
                                            count: 1,
                                            lastValue: credit.value,
                                            type: 'credit'
                                        });
                                    }
                                }
                            });
                        }
                    }
                });
            }
        });

        // Converter Map para Array e ordenar por frequência
        return Array.from(names.values()).sort((a, b) => b.count - a.count);
    }

    // Filtrar sugestões baseado no texto digitado
    filterSuggestions(input, allNames) {
        if (!input || input.length < 1) return [];

        const searchTerm = input.toLowerCase();

        return allNames.filter(item =>
            item.name.toLowerCase().includes(searchTerm)
        ).slice(0, 8); // Limitar a 8 sugestões
    }

    // Criar elemento de autocomplete para um input
    setupAutocomplete(inputElement, onSelect) {
        const container = document.createElement('div');
        container.className = 'autocomplete-container';

        // Substituir o input pelo container
        inputElement.parentNode.insertBefore(container, inputElement);
        container.appendChild(inputElement);

        // Criar lista de sugestões
        const suggestionsList = document.createElement('div');
        suggestionsList.className = 'autocomplete-suggestions';
        container.appendChild(suggestionsList);

        let selectedIndex = -1;
        let currentSuggestions = [];

        // Evento de digitação
        inputElement.addEventListener('input', (e) => {
            const value = e.target.value;
            const allNames = this.getAllExpenseNames();
            currentSuggestions = this.filterSuggestions(value, allNames);

            this.renderSuggestions(suggestionsList, currentSuggestions, (suggestion) => {
                inputElement.value = suggestion.name;
                suggestionsList.classList.remove('show');
                if (onSelect) onSelect(suggestion);
            });

            selectedIndex = -1;
        });

        // Navegação por teclado
        inputElement.addEventListener('keydown', (e) => {
            if (!suggestionsList.classList.contains('show')) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    selectedIndex = Math.min(selectedIndex + 1, currentSuggestions.length - 1);
                    this.highlightSuggestion(suggestionsList, selectedIndex);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    selectedIndex = Math.max(selectedIndex - 1, -1);
                    this.highlightSuggestion(suggestionsList, selectedIndex);
                    break;
                case 'Enter':
                    if (selectedIndex >= 0 && currentSuggestions[selectedIndex]) {
                        e.preventDefault();
                        const suggestion = currentSuggestions[selectedIndex];
                        inputElement.value = suggestion.name;
                        suggestionsList.classList.remove('show');
                        if (onSelect) onSelect(suggestion);
                    }
                    break;
                case 'Escape':
                    suggestionsList.classList.remove('show');
                    break;
            }
        });

        // Ocultar sugestões quando clicar fora
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                suggestionsList.classList.remove('show');
            }
        });

        console.log('✅ Autocomplete configurado para input:', inputElement.id || inputElement.name);
    }

    // Renderizar lista de sugestões
    renderSuggestions(container, suggestions, onSelect) {
        if (suggestions.length === 0) {
            container.classList.remove('show');
            return;
        }

        const html = suggestions.map((suggestion, index) => `
            <div class="suggestion-item" data-index="${index}">
                <div class="suggestion-name">${suggestion.name}</div>
                <div class="suggestion-info">
                    <span class="suggestion-category ${suggestion.category}">${this.getCategoryName(suggestion.category)}</span>
                    <span class="suggestion-usage">${suggestion.count}x usado</span>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
        container.classList.add('show');

        // Adicionar eventos de clique
        container.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                onSelect(suggestions[index]);
            });
        });
    }

    // Destacar sugestão selecionada
    highlightSuggestion(container, index) {
        container.querySelectorAll('.suggestion-item').forEach((item, i) => {
            item.classList.toggle('highlighted', i === index);
        });
    }

    // === EFEITOS ESPECIAIS PARA SINCRONIZAÇÃO ===

    // Adicionar efeitos visuais aos botões de sync
    setupSyncEffects() {
        const syncButtons = document.querySelectorAll('.btn-sync');

        syncButtons.forEach(button => {
            // Efeito de partículas no clique
            button.addEventListener('click', (e) => {
                if (!button.disabled) {
                    this.createClickEffect(e);
                    this.addSyncingState(button);
                }
            });

            // Efeito hover com ondas
            button.addEventListener('mouseenter', () => {
                if (!button.disabled) {
                    this.createRippleEffect(button);
                }
            });
        });

        console.log('✨ Efeitos especiais de sincronização configurados');
    }

    // Criar efeito de clique com partículas
    createClickEffect(event) {
        const button = event.currentTarget;
        const rect = button.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Criar partículas
        for (let i = 0; i < 6; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: absolute;
                left: ${x}px;
                top: ${y}px;
                width: 4px;
                height: 4px;
                background: white;
                border-radius: 50%;
                pointer-events: none;
                z-index: 1000;
                animation: particle-burst 0.6s ease-out forwards;
            `;

            const angle = (360 / 6) * i;
            const distance = 20 + Math.random() * 15;
            particle.style.setProperty('--angle', `${angle}deg`);
            particle.style.setProperty('--distance', `${distance}px`);

            button.appendChild(particle);

            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 600);
        }

        // Adicionar CSS para animação de partículas se não existir
        if (!document.getElementById('particle-styles')) {
            const style = document.createElement('style');
            style.id = 'particle-styles';
            style.textContent = `
                @keyframes particle-burst {
                    0% {
                        transform: translate(0, 0) scale(1);
                        opacity: 1;
                    }
                    100% {
                        transform: translate(
                            calc(cos(var(--angle)) * var(--distance)),
                            calc(sin(var(--angle)) * var(--distance))
                        ) scale(0);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Criar efeito de ondas no hover
    createRippleEffect(button) {
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            transform: scale(0);
            animation: ripple-effect 0.6s linear;
            pointer-events: none;
            left: 50%;
            top: 50%;
            width: 100px;
            height: 100px;
            margin-left: -50px;
            margin-top: -50px;
        `;

        button.appendChild(ripple);

        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 600);

        // Adicionar CSS para animação de ripple se não existir
        if (!document.getElementById('ripple-styles')) {
            const style = document.createElement('style');
            style.id = 'ripple-styles';
            style.textContent = `
                @keyframes ripple-effect {
                    to {
                        transform: scale(2);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Adicionar estado de sincronização
    addSyncingState(button) {
        button.classList.add('syncing');
        const originalText = button.innerHTML;

        // Simular processo de sync
        setTimeout(() => {
            button.classList.remove('syncing');

            // Efeito de sucesso
            button.style.background = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
            button.innerHTML = '<i class="fas fa-check"></i> Sucesso!';

            setTimeout(() => {
                button.style.background = '';
                button.innerHTML = originalText;
            }, 2000);
        }, 3000);
    }
}

/* ===============================
   🔐 SINCRONIZAÇÃO SEGURA SPENDWIZE
   Protege contra sobrescrita acidental do Firestore
   =============================== */

async function sincronizarDados() {
    console.log("🔄 Iniciando sincronização...");

    if (!app.data || typeof app.data !== "object" || Object.keys(app.data).length === 0) {
        console.warn("⛔ Salvamento bloqueado: dados inválidos", app.data);
        alert("⚠️ Dados locais estão vazios! Faça o download (Baixar) antes de sincronizar.");
        return;
    }
    if (!app.isDataLoaded) {
        console.warn("⛔ Salvamento bloqueado: dados ainda não carregados");
        alert("⚠️ Dados ainda não carregados. Aguarde o carregamento antes de sincronizar.");
        return;
    }

    // 2️⃣ Verifica se há conteúdo real (anos, meses, gastos)
    const anos = Object.keys(app.data);
    const conteudoValido = anos.some(ano => {
        const meses = Object.keys(app.data[ano] || {});
        return meses.some(mes => {
            const dados = app.data[ano][mes];
            return (
                (dados?.expenses && dados.expenses.length > 0) ||
                (dados?.creditCard && dados.creditCard.length > 0) ||
                (dados?.dailyExpenses && dados.dailyExpenses.length > 0) ||
                (dados?.rendaFamiliar &&
                    (dados.rendaFamiliar.meuSalario > 0 ||
                        dados.rendaFamiliar.salarioDela > 0 ||
                        dados.rendaFamiliar.totalTransferido > 0))
            );
        });
    });

    if (!conteudoValido) {
        alert("⚠️ Nenhum dado real encontrado para enviar — sincronização cancelada.");
        console.warn("❌ Sincronização abortada: conteúdo vazio.");
        return;
    }

    // 3️⃣ Confirmação dupla
    const confirmar = confirm("☁️ Deseja realmente sincronizar os dados locais com o Firebase? Isso substituirá os dados da nuvem.");
    if (!confirmar) {
        console.log("🟡 Sincronização cancelada pelo usuário.");
        return;
    }

    // 4️⃣ Backup automático antes de enviar
    criarBackupLocal();

    try {
        await app.saveToFirestore();
        alert("✅ Dados sincronizados com sucesso!");
        console.log("✅ Sincronização concluída com sucesso!");
    } catch (e) {
        console.error("❌ Erro ao sincronizar com Firestore:", e);
        alert("⚠️ Falha ao sincronizar. Verifique sua conexão e tente novamente.");
    }
}

/* ===============================
   💾 BACKUP AUTOMÁTICO LOCAL
   Gera cópia antes de cada upload
   =============================== */

function criarBackupLocal() {
    const backup = {
        date: new Date().toLocaleString(),
        data: app.data
    };
    localStorage.setItem("backup_controleGastos", JSON.stringify(backup));
    console.log("💾 Backup local criado:", backup);
}

// Inicializar aplicação
let app;
document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 DOM carregado, iniciando aplicação...');

    try {
        app = new ControleGastos();
        console.log('✅ Aplicação criada:', app);

        // Configurar botão flutuante para voltar ao topo
        app.setupBackToTop();
        console.log('✅ Botão flutuante configurado');

        registerServiceWorker();
        console.log('✅ Service Worker registrado');

        setupPWA();
        console.log('✅ PWA configurado');

        console.log('🎉 Inicialização completa!');
    } catch (error) {
        console.error('❌ Erro na inicialização da aplicação:', error);
    }
});

// Registrar Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('Service Worker registrado com sucesso:', registration);
            })
            .catch(error => {
                console.log('Falha ao registrar Service Worker:', error);
            });
    }
}

// Configurar PWA
function setupPWA() {
    // Verificar se é PWA instalada
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('Aplicação rodando como PWA');
        document.body.classList.add('pwa-mode');
    }

    // Verificar se pode instalar
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;

        // Mostrar botão de instalação se desejar
        showInstallButton();
    });

    // Verificar se foi instalada
    window.addEventListener('appinstalled', () => {
        console.log('PWA instalada com sucesso!');
        hideInstallButton();
    });
}

// Mostrar botão de instalação
function showInstallButton() {
    // Implementar se desejar mostrar botão de instalação
    console.log('PWA pode ser instalada');
}

// Esconder botão de instalação
function hideInstallButton() {
    // Implementar se desejar esconder botão de instalação
    console.log('PWA foi instalada');
}

// Funções globais para uso nos onclick
function openModal(type) {
    console.log('🔍 openModal chamado com tipo:', type);
    if (app && app.openModal) {
        app.openModal(type);
    } else {
        console.error('❌ app não está disponível ou openModal não existe');
    }
}

function closeModal() {
    app.closeModal();
}

function closeConfirmModal() {
    document.getElementById('confirm-modal').style.display = 'none';
}

// ========================================
// CALCULADORA
// ========================================

let calculatorExpression = '';

function openCalculatorModal() {
    const modal = document.getElementById('calculator-modal');
    const display = document.getElementById('calculator-display');

    calculatorExpression = '';
    if (display) display.value = '0';
    if (modal) modal.style.display = 'flex';
}

function closeCalculatorModal() {
    const modal = document.getElementById('calculator-modal');
    if (modal) modal.style.display = 'none';
}

function appendCalculator(value) {
    const display = document.getElementById('calculator-display');
    if (!display) return;

    if (calculatorExpression === '0' && value !== '.') {
        calculatorExpression = value;
    } else {
        calculatorExpression += value;
    }

    display.value = calculatorExpression || '0';
}

function clearCalculator() {
    calculatorExpression = '';
    const display = document.getElementById('calculator-display');
    if (display) display.value = '0';
}

function deleteCalculator() {
    calculatorExpression = calculatorExpression.slice(0, -1);
    const display = document.getElementById('calculator-display');
    if (display) display.value = calculatorExpression || '0';
}

function calculateResult() {
    const display = document.getElementById('calculator-display');
    if (!display) return;

    try {
        let expression = calculatorExpression.replace(/%/g, '/100');
        let result = eval(expression);

        if (!isFinite(result)) {
            display.value = 'Erro';
            calculatorExpression = '';
            return;
        }

        result = Number(result.toFixed(2));
        calculatorExpression = result.toString();
        display.value = calculatorExpression;
    } catch (error) {
        display.value = 'Erro';
        calculatorExpression = '';
    }
}

// Fechar ao clicar fora
window.addEventListener('click', function (event) {
    const modal = document.getElementById('calculator-modal');
    if (event.target === modal) {
        closeCalculatorModal();
    }
});
