// Importar Firebase e configuração
import { auth, db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ===== UTILITÁRIOS =====
function showAlert(message, type) {
    const alertMessage = document.getElementById('alertMessage');
    if (!alertMessage) return;
    
    alertMessage.textContent = message;
    alertMessage.className = `alert ${type} show`;
    
    setTimeout(() => {
        alertMessage.classList.remove('show');
    }, 5000);
}

function validarTelefone(telefone) {
    const telefoneNumeros = telefone.replace(/\D/g, '');
    return telefoneNumeros.length >= 10 && telefoneNumeros.length <= 11;
}

function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// ===== MÁSCARA DE TELEFONE =====
const telefoneInput = document.getElementById('telefone');
if (telefoneInput) {
    telefoneInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        
        // Limita a 11 dígitos
        if (value.length > 11) {
            value = value.slice(0, 11);
        }
        
        // Aplica a máscara
        if (value.length > 10) {
            // Formato: (XX) XXXXX-XXXX
            value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
        } else if (value.length > 6) {
            // Formato: (XX) XXXX-XXXX
            value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
        } else if (value.length > 2) {
            // Formato: (XX) XXXX
            value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
        } else if (value.length > 0) {
            // Formato: (XX
            value = value.replace(/^(\d*)/, '($1');
        }
        
        e.target.value = value;
    });
}

// ===== FORMULÁRIO DE ORÇAMENTO =====
const orcamentoForm = document.getElementById('orcamentoForm');
const submitBtn = document.getElementById('submitBtn');

if (orcamentoForm && submitBtn) {
    orcamentoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validações
        const nome = document.getElementById('nome').value.trim();
        const email = document.getElementById('email').value.trim();
        const telefone = document.getElementById('telefone').value;
        const servico = document.getElementById('servico').value;
        const descricao = document.getElementById('descricao').value.trim();
        
        // Validar nome
        if (nome.length < 3) {
            showAlert('❌ Por favor, insira um nome válido (mínimo 3 caracteres).', 'error');
            document.getElementById('nome').focus();
            return;
        }
        
        // Validar email
        if (!validarEmail(email)) {
            showAlert('❌ Por favor, insira um e-mail válido.', 'error');
            document.getElementById('email').focus();
            return;
        }
        
        // Validar telefone
        if (!validarTelefone(telefone)) {
            showAlert('❌ Por favor, insira um telefone válido com DDD.', 'error');
            document.getElementById('telefone').focus();
            return;
        }
        
        // Validar serviço
        if (!servico) {
            showAlert('❌ Por favor, selecione um tipo de serviço.', 'error');
            document.getElementById('servico').focus();
            return;
        }
        
        // Validar descrição
        if (descricao.length < 10) {
            showAlert('❌ Por favor, descreva seu projeto com mais detalhes (mínimo 10 caracteres).', 'error');
            document.getElementById('descricao').focus();
            return;
        }
        
        // Desabilitar botão durante envio
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

        // Preparar dados
        const formData = {
            nome: nome,
            email: email,
            telefone: telefone,
            empresa: document.getElementById('empresa').value.trim() || 'Não informado',
            servico: servico,
            descricao: descricao,
            prazo: document.getElementById('prazo').value || 'Não especificado',
            orcamento: document.getElementById('orcamento').value || 'Não especificado',
            dataEnvio: serverTimestamp(),
            status: 'Novo',
            lido: false
        };

        try {
            // Salvar no Firebase
            const docRef = await addDoc(collection(db, 'orcamentos'), formData);
            console.log('✅ Documento salvo com ID:', docRef.id);
            
            // Mostrar mensagem de sucesso
            showAlert('✅ Solicitação enviada com sucesso! Entraremos em contato em breve.', 'success');
            
            // Resetar formulário
            orcamentoForm.reset();
            
            // Redirecionar para WhatsApp após 2 segundos
            setTimeout(() => {
                const whatsappMsg = `Olá! Acabei de enviar uma solicitação de orçamento através do site.\n\n*Serviço:* ${formData.servico}\n*Nome:* ${formData.nome}`;
                const whatsappURL = `https://wa.me/5515991563363?text=${encodeURIComponent(whatsappMsg)}`;
                window.open(whatsappURL, '_blank');
            }, 2000);
            
        } catch (error) {
            console.error('❌ Erro ao enviar:', error);
            showAlert('❌ Erro ao enviar solicitação. Por favor, tente novamente ou entre em contato via WhatsApp.', 'error');
        } finally {
            // Reabilitar botão
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Solicitação';
        }
    });
}

// ===== NAVEGAÇÃO MOBILE =====
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');

if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        const icon = menuToggle.querySelector('i');
        
        if (icon) {
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
        }
    });

    // Fechar menu ao clicar em um link
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            const icon = menuToggle.querySelector('i');
            
            if (icon) {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    });
}

// ===== ANIMAÇÃO DE SCROLL NAS SEÇÕES =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

document.querySelectorAll('section').forEach(section => {
    sectionObserver.observe(section);
});

// ===== BOTÃO VOLTAR AO TOPO =====
const backToTop = document.getElementById('backToTop');

if (backToTop) {
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });

    backToTop.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// ===== SCROLL SUAVE PARA ÂNCORAS =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        
        // Ignora links vazios ou apenas #
        if (!href || href === '#') {
            e.preventDefault();
            return;
        }
        
        const target = document.querySelector(href);
        
        if (target) {
            e.preventDefault();
            const offsetTop = target.offsetTop - 80; // 80px para compensar o header fixo
            
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// ===== ANIMAÇÃO DE EMOJI NO HERO =====
const heroIllustration = document.querySelector('.hero-illustration');

if (heroIllustration) {
    const emojis = ['💻', '🚀', '⚡', '🎨', '🤖', '☁️', '📱', '🌟'];
    let currentIndex = 0;
    
    setInterval(() => {
        currentIndex = (currentIndex + 1) % emojis.length;
        heroIllustration.textContent = emojis[currentIndex];
    }, 3000);
}

// ===== EFEITO PARALLAX NO HERO =====
let ticking = false;

function updateParallax() {
    const scrolled = window.pageYOffset;
    const parallaxElements = document.querySelectorAll('.hero-illustration');
    
    parallaxElements.forEach(el => {
        const speed = 0.3;
        const scale = 1 + (scrolled * 0.0001);
        el.style.transform = `translateY(${scrolled * speed}px) scale(${Math.min(scale, 1.1)})`;
    });
    
    ticking = false;
}

window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(updateParallax);
        ticking = true;
    }
});

// ===== HEADER STICKY COM SOMBRA =====
const header = document.querySelector('header');

if (header) {
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 50) {
            header.style.boxShadow = '0 4px 20px rgba(0, 212, 255, 0.1)';
        } else {
            header.style.boxShadow = 'none';
        }
    });
}

// ===== PREVENÇÃO DE SPAM NO FORMULÁRIO =====
let ultimoEnvio = 0;
const INTERVALO_MINIMO = 60000; // 1 minuto

if (orcamentoForm) {
    orcamentoForm.addEventListener('submit', (e) => {
        const agora = Date.now();
        
        if (agora - ultimoEnvio < INTERVALO_MINIMO) {
            e.preventDefault();
            const tempoRestante = Math.ceil((INTERVALO_MINIMO - (agora - ultimoEnvio)) / 1000);
            showAlert(`⏳ Por favor, aguarde ${tempoRestante} segundos antes de enviar outro formulário.`, 'error');
            return false;
        }
        
        ultimoEnvio = agora;
    }, true);
}

// ===== LOG DE INICIALIZAÇÃO =====
console.log('✅ Nelly Tech - Sistema carregado com sucesso!');
console.log('📧 Formulário:', orcamentoForm ? 'Ativo' : 'Não encontrado');
console.log('🔗 Firebase:', db ? 'Conectado' : 'Erro na conexão');
console.log('📱 Menu Mobile:', menuToggle ? 'Ativo' : 'Não encontrado');