// Importar configuração do Firebase
import { auth, db } from '../assets/js/firebase-config.js';

// Importar funções necessárias do Firebase
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentUser = null;

// ==================== INICIALIZAÇÃO ====================

// Aguardar carregamento do DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Admin Panel iniciando...');
    initializeEventListeners();
});

// ==================== AUTENTICAÇÃO ====================

// Monitorar estado de autenticação
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'flex';
        document.getElementById('userEmail').textContent = user.email;
        
        if (document.getElementById('settingsEmail')) {
            document.getElementById('settingsEmail').textContent = user.email;
        }
        if (document.getElementById('firebaseStatus')) {
            document.getElementById('firebaseStatus').textContent = '✅ Conectado';
            document.getElementById('firebaseStatus').style.color = '#10b981';
        }
        
        loadDashboard();
    } else {
        currentUser = null;
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('dashboard').style.display = 'none';
    }
});

// Login
function initializeEventListeners() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const projectForm = document.getElementById('projectForm');
    if (projectForm) {
        projectForm.addEventListener('submit', handleSaveProject);
    }

    // Menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            if (section) {
                showSection(section);
            }
        });
    });

    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', toggleMobileMenu);
    }

    // Filtros e busca
    const filterStatus = document.getElementById('filterStatus');
    if (filterStatus) {
        filterStatus.addEventListener('change', filterOrcamentos);
    }

    const searchOrcamentos = document.getElementById('searchOrcamentos');
    if (searchOrcamentos) {
        searchOrcamentos.addEventListener('input', filterOrcamentos);
    }

    // Fechar modals ao clicar no overlay
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function() {
            this.closest('.modal').classList.remove('active');
        });
    });
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginButtonText');
    const loginAlert = document.getElementById('loginAlert');
    
    btn.textContent = 'Entrando...';
    loginAlert.style.display = 'none';

    try {
        await signInWithEmailAndPassword(auth, email, password);
        showAlert('loginAlert', '✅ Login realizado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro no login:', error);
        let errorMsg = '';
        
        switch (error.code) {
            case 'auth/invalid-credential':
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                errorMsg = '❌ Email ou senha incorretos';
                break;
            case 'auth/invalid-email':
                errorMsg = '❌ Email inválido';
                break;
            case 'auth/too-many-requests':
                errorMsg = '❌ Muitas tentativas. Tente novamente mais tarde';
                break;
            default:
                errorMsg = '❌ Erro ao fazer login. Tente novamente.';
        }
        
        showAlert('loginAlert', errorMsg, 'error');
    } finally {
        btn.textContent = 'Entrar';
    }
}

// Logout
function logout() {
    if (confirm('Deseja realmente sair?')) {
        signOut(auth).catch(error => {
            console.error('Erro ao fazer logout:', error);
            alert('Erro ao sair. Tente novamente.');
        });
    }
}

// Toggle senha
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('loginPassword');
    const icon = document.getElementById('togglePasswordIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// ==================== NAVEGAÇÃO ====================

function showSection(section) {
    // Remover active de todas as seções
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(li => li.classList.remove('active'));

    // Adicionar active na seção selecionada
    const sectionMap = {
        'overview': 'overviewSection',
        'projects': 'projectsSection',
        'orcamentos': 'orcamentosSection',
        'settings': 'settingsSection'
    };

    const sectionId = sectionMap[section];
    if (sectionId) {
        const sectionElement = document.getElementById(sectionId);
        if (sectionElement) {
            sectionElement.classList.add('active');
        }
    }

    // Atualizar item do menu
    const menuItem = document.querySelector(`.menu-item[data-section="${section}"]`);
    if (menuItem) {
        menuItem.classList.add('active');
    }

    // Atualizar título da página
    const titles = {
        'overview': 'Dashboard Administrativo',
        'projects': 'Gerenciar Portfólio',
        'orcamentos': 'Gerenciar Orçamentos',
        'settings': 'Configurações'
    };
    
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = titles[section] || 'Painel Administrativo';
    }

    // Carregar dados da seção
    if (section === 'overview') {
        loadDashboard();
    } else if (section === 'projects') {
        loadProjects();
    } else if (section === 'orcamentos') {
        loadOrcamentos();
    }

    // Fechar menu mobile se estiver aberto
    closeMobileMenu();
}

function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

function closeMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.remove('active');
    }
}

// ==================== DASHBOARD ====================

async function loadDashboard() {
    try {
        const [projectsSnap, orcamentosSnap] = await Promise.all([
            getDocs(collection(db, 'projects')),
            getDocs(collection(db, 'orcamentos'))
        ]);

        const projects = projectsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const orcamentos = orcamentosSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Atualizar estatísticas de projetos
        updateElement('totalPortfolio', projects.length);
        updateElement('inProgressProjects', projects.filter(p => p.status === 'progress').length);
        updateElement('completedProjects', projects.filter(p => p.status === 'completed').length);

        // Atualizar estatísticas de orçamentos
        updateElement('totalOrcamentos', orcamentos.length);
        
        const novosOrcamentos = orcamentos.filter(o => !o.lido).length;
        updateElement('novosOrcamentosCount', novosOrcamentos);
        
        const emAndamento = orcamentos.filter(o => 
            o.status === 'Em Andamento' || o.status === 'Aprovado'
        ).length;
        updateElement('emAndamentoCount', emAndamento);
        
        const concluidos = orcamentos.filter(o => 
            o.status === 'Concluído' || o.status === 'Entregue'
        ).length;
        updateElement('concluidosCount', concluidos);
        
        // Atualizar badge no menu
        const badge = document.getElementById('novosOrcamentosBadge');
        if (badge) {
            badge.textContent = novosOrcamentos;
            badge.style.display = novosOrcamentos > 0 ? 'inline-flex' : 'none';
        }

        // Mostrar atividades recentes
        displayRecentActivities(projects, orcamentos);
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        const container = document.getElementById('atividadesRecentes');
        if (container) {
            container.innerHTML = '<p class="text-center" style="color: var(--danger);">❌ Erro ao carregar dados.</p>';
        }
    }
}

function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function displayRecentActivities(projects, orcamentos) {
    const container = document.getElementById('atividadesRecentes');
    if (!container) return;

    const activities = [];

    // Adicionar projetos recentes
    projects.slice(-3).reverse().forEach(p => {
        activities.push({
            type: 'project',
            message: `Projeto "${p.name}" - ${getStatusText(p.status)}`,
            date: p.updatedAt || p.createdAt,
            icon: 'fa-folder'
        });
    });

    // Adicionar orçamentos recentes
    orcamentos.slice(-3).reverse().forEach(o => {
        activities.push({
            type: 'orcamento',
            message: `Orçamento de ${o.nome} - ${o.status || 'Novo'}`,
            date: o.dataEnvio?.toDate?.() || new Date(),
            icon: 'fa-file-invoice'
        });
    });

    // Ordenar por data
    activities.sort((a, b) => {
        const dateA = a.date ? (typeof a.date === 'string' ? new Date(a.date) : a.date) : new Date(0);
        const dateB = b.date ? (typeof b.date === 'string' ? new Date(b.date) : b.date) : new Date(0);
        return dateB - dateA;
    });

    if (activities.length === 0) {
        container.innerHTML = '<p class="text-center">Nenhuma atividade recente.</p>';
        return;
    }

    container.innerHTML = activities.slice(0, 5).map(a => `
        <div class="atividade-item">
            <i class="fas ${a.icon}"></i>
            <strong>${a.message}</strong>
            <span class="timestamp">${formatDate(a.date)}</span>
        </div>
    `).join('');
}

// ==================== PROJETOS ====================

async function loadProjects() {
    try {
        const snapshot = await getDocs(collection(db, 'projects'));
        const projects = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        projects.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB - dateA;
        });
        
        displayProjectsTable(projects);
    } catch (error) {
        console.error('Erro ao carregar projetos:', error);
        const container = document.getElementById('projectsTable');
        if (container) {
            container.innerHTML = '<p class="text-center" style="color: var(--danger);">❌ Erro ao carregar projetos</p>';
        }
    }
}

function displayProjectsTable(projects) {
    const container = document.getElementById('projectsTable');
    if (!container) return;

    if (projects.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>Nenhum projeto cadastrado</h3>
                <p>Clique em "Novo Projeto" para adicionar seu primeiro projeto ao portfólio!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Categoria</th>
                        <th>Status</th>
                        <th>Data</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${projects.map(p => `
                        <tr>
                            <td>${escapeHtml(p.name)}</td>
                            <td>${escapeHtml(p.category)}</td>
                            <td><span class="badge badge-${p.status}">${getStatusText(p.status)}</span></td>
                            <td>${formatDate(p.createdAt)}</td>
                            <td class="actions">
                                <button class="btn-icon" onclick="editProject('${p.id}')" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-icon" onclick="deleteProject('${p.id}')" title="Deletar">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ==================== ORÇAMENTOS ====================

let allOrcamentos = [];

async function loadOrcamentos() {
    try {
        const snapshot = await getDocs(collection(db, 'orcamentos'));
        allOrcamentos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        allOrcamentos.sort((a, b) => {
            const dateA = a.dataEnvio?.toDate?.() || new Date(0);
            const dateB = b.dataEnvio?.toDate?.() || new Date(0);
            return dateB - dateA;
        });
        
        displayOrcamentosTable(allOrcamentos);
    } catch (error) {
        console.error('Erro ao carregar orçamentos:', error);
        const container = document.getElementById('orcamentosTable');
        if (container) {
            container.innerHTML = '<p class="text-center" style="color: var(--danger);">❌ Erro ao carregar orçamentos</p>';
        }
    }
}

function filterOrcamentos() {
    const statusFilter = document.getElementById('filterStatus')?.value || '';
    const searchTerm = document.getElementById('searchOrcamentos')?.value.toLowerCase() || '';

    let filtered = allOrcamentos;

    if (statusFilter) {
        filtered = filtered.filter(o => o.status === statusFilter);
    }

    if (searchTerm) {
        filtered = filtered.filter(o => 
            o.nome?.toLowerCase().includes(searchTerm) ||
            o.servico?.toLowerCase().includes(searchTerm) ||
            o.email?.toLowerCase().includes(searchTerm)
        );
    }

    displayOrcamentosTable(filtered);
}

function displayOrcamentosTable(orcamentos) {
    const container = document.getElementById('orcamentosTable');
    if (!container) return;

    if (orcamentos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-invoice"></i>
                <h3>Nenhum orçamento encontrado</h3>
                <p>Os orçamentos enviados pelo site aparecerão aqui.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Serviço</th>
                        <th>Status</th>
                        <th>Data</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${orcamentos.map(o => `
                        <tr class="${!o.lido ? 'unread' : ''}">
                            <td>
                                ${escapeHtml(o.nome)} 
                                ${!o.lido ? '<span class="badge badge-warning">NOVO</span>' : ''}
                            </td>
                            <td>${escapeHtml(o.servico)}</td>
                            <td><span class="badge badge-info">${escapeHtml(o.status || 'Novo')}</span></td>
                            <td>${formatDate(o.dataEnvio?.toDate?.())}</td>
                            <td class="actions">
                                <button class="btn-icon" onclick="viewOrcamento('${o.id}')" title="Ver detalhes">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn-icon" onclick="deleteOrcamento('${o.id}')" title="Deletar">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function viewOrcamento(orcamentoId) {
    try {
        const orcamento = allOrcamentos.find(o => o.id === orcamentoId);
        
        if (!orcamento) {
            alert('❌ Orçamento não encontrado');
            return;
        }
        
        // Marcar como lido
        if (!orcamento.lido) {
            await updateDoc(doc(db, 'orcamentos', orcamentoId), { lido: true });
            orcamento.lido = true;
        }
        
        document.getElementById('detalhesOrcamento').innerHTML = `
            <p><strong>Nome:</strong> ${escapeHtml(orcamento.nome)}</p>
            <p><strong>Email:</strong> <a href="mailto:${escapeHtml(orcamento.email)}">${escapeHtml(orcamento.email)}</a></p>
            <p><strong>Telefone:</strong> <a href="https://wa.me/55${orcamento.telefone.replace(/\D/g, '')}" target="_blank">${escapeHtml(orcamento.telefone)}</a></p>
            <p><strong>Empresa:</strong> ${escapeHtml(orcamento.empresa || 'Não informado')}</p>
            <p><strong>Serviço:</strong> ${escapeHtml(orcamento.servico)}</p>
            <p><strong>Prazo:</strong> ${escapeHtml(orcamento.prazo || 'Não especificado')}</p>
            <p><strong>Orçamento:</strong> ${escapeHtml(orcamento.orcamento || 'Não especificado')}</p>
            <p><strong>Descrição:</strong></p>
            <p style="padding: 1rem; background: var(--bg-primary); border-radius: 8px; white-space: pre-wrap;">${escapeHtml(orcamento.descricao)}</p>
            <p><strong>Data de Envio:</strong> ${formatDate(orcamento.dataEnvio?.toDate?.())}</p>
            <p><strong>Status:</strong> <span class="badge badge-info">${escapeHtml(orcamento.status || 'Novo')}</span></p>
        `;
        
        document.getElementById('orcamentoModalId').value = orcamentoId;
        document.getElementById('novoStatusOrcamento').value = orcamento.status || 'Novo';
        document.getElementById('orcamentoModal').classList.add('active');
        
        // Atualizar listas
        loadOrcamentos();
        loadDashboard();
    } catch (error) {
        console.error('Erro ao visualizar orçamento:', error);
        alert('❌ Erro ao carregar detalhes do orçamento');
    }
}

async function updateOrcamentoStatus() {
    const orcamentoId = document.getElementById('orcamentoModalId').value;
    const novoStatus = document.getElementById('novoStatusOrcamento').value;
    
    if (!orcamentoId) {
        alert('❌ Erro: ID do orçamento não encontrado');
        return;
    }
    
    try {
        await updateDoc(doc(db, 'orcamentos', orcamentoId), { 
            status: novoStatus,
            atualizadoEm: new Date().toISOString()
        });
        
        alert('✅ Status atualizado com sucesso!');
        closeOrcamentoModal();
        loadOrcamentos();
        loadDashboard();
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        alert('❌ Erro ao atualizar status');
    }
}

async function deleteOrcamento(orcamentoId) {
    if (!confirm('⚠️ Tem certeza que deseja deletar este orçamento?\n\nEsta ação não pode ser desfeita.')) {
        return;
    }

    try {
        await deleteDoc(doc(db, 'orcamentos', orcamentoId));
        alert('✅ Orçamento deletado com sucesso!');
        loadOrcamentos();
        loadDashboard();
    } catch (error) {
        console.error('Erro ao deletar orçamento:', error);
        alert('❌ Erro ao deletar orçamento');
    }
}

function closeOrcamentoModal() {
    document.getElementById('orcamentoModal').classList.remove('active');
}

// ==================== MODAL DE PROJETO ====================

function openProjectModal(projectId = null) {
    const modal = document.getElementById('projectModal');
    const form = document.getElementById('projectForm');
    const preview = document.getElementById('imagePreview');
    const alertDiv = document.getElementById('modalAlert');
    
    form.reset();
    preview.style.display = 'none';
    alertDiv.innerHTML = '';
    alertDiv.style.display = 'none';

    if (projectId) {
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit"></i> Editar Projeto';
        loadProjectData(projectId);
    } else {
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-folder-plus"></i> Novo Projeto';
        document.getElementById('projectId').value = '';
    }
    
    modal.classList.add('active');
}

function closeProjectModal() {
    document.getElementById('projectModal').classList.remove('active');
}

async function loadProjectData(projectId) {
    try {
        const project = allProjects?.find(p => p.id === projectId);
        
        if (!project) {
            // Tentar buscar do Firebase
            const snapshot = await getDocs(collection(db, 'projects'));
            const projectDoc = snapshot.docs.find(d => d.id === projectId);
            
            if (!projectDoc) {
                throw new Error('Projeto não encontrado');
            }
            
            const data = projectDoc.data();
            fillProjectForm(projectId, data);
        } else {
            fillProjectForm(projectId, project);
        }
    } catch (error) {
        console.error('Erro ao carregar projeto:', error);
        showAlert('modalAlert', '❌ Erro ao carregar projeto', 'error');
    }
}

function fillProjectForm(projectId, data) {
    document.getElementById('projectId').value = projectId;
    document.getElementById('projectName').value = data.name || '';
    document.getElementById('projectCategory').value = data.category || '';
    document.getElementById('projectDescription').value = data.description || '';
    document.getElementById('projectStatus').value = data.status || 'progress';
    
    if (data.emoji) {
        document.getElementById('projectEmoji').value = data.emoji;
    }

    if (data.imageUrl) {
        const preview = document.getElementById('imagePreview');
        preview.src = data.imageUrl;
        preview.style.display = 'block';
    }
}

function previewImage(event) {
    const file = event.target.files[0];
    if (file) {
        // Validar tamanho (máx 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('❌ Imagem muito grande! Tamanho máximo: 5MB');
            event.target.value = '';
            return;
        }

        // Validar tipo
        if (!file.type.startsWith('image/')) {
            alert('❌ Por favor, selecione apenas arquivos de imagem');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('imagePreview');
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

// ==================== SALVAR PROJETO ====================

async function handleSaveProject(e) {
    e.preventDefault();

    const saveBtn = document.getElementById('saveButtonText');
    saveBtn.textContent = 'Salvando...';

    const projectId = document.getElementById('projectId').value;
    const name = document.getElementById('projectName').value.trim();
    const category = document.getElementById('projectCategory').value;
    const description = document.getElementById('projectDescription').value.trim();
    const status = document.getElementById('projectStatus').value;
    const emoji = document.getElementById('projectEmoji').value.trim();
    const imageFile = document.getElementById('projectImage').files[0];

    // Validações
    if (!name || !category || !status) {
        showAlert('modalAlert', '❌ Por favor, preencha todos os campos obrigatórios', 'error');
        saveBtn.textContent = 'Salvar Projeto';
        return;
    }

    try {
        let imageUrl = null;

        // Se há uma imagem nova, converter para base64
        if (imageFile) {
            imageUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('Erro ao ler imagem'));
                reader.readAsDataURL(imageFile);
            });
        }

        const projectData = {
            name,
            category,
            description,
            status,
            updatedAt: new Date().toISOString()
        };

        if (emoji) {
            projectData.emoji = emoji;
        }

        // Adicionar imagem apenas se houver uma nova
        if (imageUrl) {
            projectData.imageUrl = imageUrl;
        }

        if (projectId) {
            // Atualizar projeto existente
            await updateDoc(doc(db, 'projects', projectId), projectData);
            showAlert('modalAlert', '✅ Projeto atualizado com sucesso!', 'success');
        } else {
            // Criar novo projeto
            projectData.createdAt = new Date().toISOString();
            await addDoc(collection(db, 'projects'), projectData);
            showAlert('modalAlert', '✅ Projeto criado com sucesso!', 'success');
        }

        setTimeout(() => {
            closeProjectModal();
            loadProjects();
            loadDashboard();
        }, 1500);

    } catch (error) {
        console.error('Erro ao salvar projeto:', error);
        showAlert('modalAlert', '❌ Erro ao salvar projeto: ' + error.message, 'error');
    } finally {
        saveBtn.textContent = 'Salvar Projeto';
    }
}

// ==================== EDITAR E DELETAR ====================

let allProjects = [];

function editProject(projectId) {
    openProjectModal(projectId);
}

async function deleteProject(projectId) {
    if (!confirm('⚠️ Tem certeza que deseja deletar este projeto?\n\nEsta ação não pode ser desfeita.')) {
        return;
    }

    try {
        await deleteDoc(doc(db, 'projects', projectId));
        alert('✅ Projeto deletado com sucesso!');
        loadProjects();
        loadDashboard();
    } catch (error) {
        console.error('Erro ao deletar projeto:', error);
        alert('❌ Erro ao deletar projeto');
    }
}

// ==================== UTILITÁRIOS ====================

function getStatusText(status) {
    const texts = { 
        'progress': 'Em Andamento', 
        'completed': 'Concluído', 
        'cancelled': 'Cancelado' 
    };
    return texts[status] || status;
}

function showAlert(elementId, message, type) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const alertClass = type === 'success' ? 'success' : 'error';
    element.innerHTML = `<div class="alert alert-${alertClass}">${message}</div>`;
    element.style.display = 'block';
    
    setTimeout(() => {
        element.innerHTML = '';
        element.style.display = 'none';
    }, 5000);
}

function formatDate(date) {
    if (!date) return '-';
    
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        
        if (isNaN(d.getTime())) return '-';
        
        return d.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Erro ao formatar data:', error);
        return '-';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== EXPORTAR FUNÇÕES GLOBAIS ====================

// Expor funções para uso no HTML (onclick, etc)
window.logout = logout;
window.showSection = showSection;
window.openProjectModal = openProjectModal;
window.closeProjectModal = closeProjectModal;
window.editProject = editProject;
window.deleteProject = deleteProject;
window.previewImage = previewImage;
window.viewOrcamento = viewOrcamento;
window.updateOrcamentoStatus = updateOrcamentoStatus;
window.deleteOrcamento = deleteOrcamento;
window.closeOrcamentoModal = closeOrcamentoModal;
window.togglePasswordVisibility = togglePasswordVisibility;

console.log('✅ Admin Panel Nelly Tech inicializado!');